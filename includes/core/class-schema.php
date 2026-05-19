<?php
/**
 * Schema.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Schema.
 */
class Schema {

	/**
	 * Init.
	 */
	public function __construct() {
		add_action( 'wp_head', array( __CLASS__, 'add_event_schema' ) );
	}

	/**
	 * Add event schema to wp_head.
	 */
	public static function add_event_schema() {
		if ( ! is_singular( 'eventkoi_event' ) ) {
			return;
		}

		$event     = new Event( get_the_ID() );
		$status    = $event->get_status();
		$locations = self::get_schema_locations( $event );

		// startDate is required by Google — skip schema entirely if missing.
		$dates     = self::get_schema_dates( $event );
		$start_iso = $dates['start'];
		if ( '' === $start_iso ) {
			return;
		}

		$schema = array(
			'@context'            => 'https://schema.org',
			'@type'               => 'Event',
			'name'                => self::get_schema_title( $event ),
			'startDate'           => $start_iso,
			'url'                 => self::get_schema_url( $event ),
			'eventAttendanceMode' => self::get_schema_attendance_mode( $event, $locations ),
			'eventStatus'         => self::get_schema_event_status( $event, $status ),
		);

		$end_iso = $dates['end'];
		if ( '' !== $end_iso ) {
			$schema['endDate'] = $end_iso;
		}

		if ( ! empty( $locations ) ) {
			$schema['location'] = $locations;
		}

		// Image — only include if non-empty.
		$image = $event::rendered_image_url();
		if ( ! empty( $image ) ) {
			$schema['image'] = $image;
		}

		// Description — only include if non-empty.
		$description = self::get_schema_description( $event );
		if ( ! empty( $description ) ) {
			$schema['description'] = $description;
		}

		$organizer = self::get_schema_organizer( $event );
		if ( ! empty( $organizer ) ) {
			$schema['organizer'] = $organizer;
		}

		$offers = self::get_schema_offers( $event );
		if ( ! empty( $offers ) ) {
			$schema['offers'] = $offers;
		}

		// Emit eventSchedule for recurring series so Google understands the
		// rule and doesn't flag the clamped endDate as inconsistent with the
		// long-running series.
		if ( 'recurring' === $event::get_date_type() ) {
			$schedules = self::get_schema_event_schedule( $event );
			if ( ! empty( $schedules ) ) {
				$schema['eventSchedule'] = $schedules;
			}
		}

		// Allow developers to modify the schema.
		$schema = apply_filters( 'eventkoi_get_event_schema', $schema );

		// Encode JSON — slashes are escaped (\/), preventing </script> injection.
		$json = wp_json_encode( $schema, JSON_UNESCAPED_UNICODE );
		if ( $json ) {
			// JSON-LD is machine-readable structured data, not HTML — wp_json_encode already
			// escapes forward slashes (\/) which prevents </script> injection.
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			echo '<script type="application/ld+json">' . $json . '</script>' . "\n";
		}
	}

	/**
	 * Get schema.org attendance mode from the same effective locations emitted.
	 *
	 * @param Event $event     Event model.
	 * @param array $locations Schema location payload.
	 * @return string
	 */
	private static function get_schema_attendance_mode( Event $event, $locations ) {
		$location_items = array();
		if ( is_array( $locations ) && isset( $locations['@type'] ) ) {
			$location_items = array( $locations );
		} elseif ( is_array( $locations ) ) {
			$location_items = $locations;
		}

		$has_physical = false;
		$has_virtual  = false;
		foreach ( $location_items as $location ) {
			if ( ! is_array( $location ) ) {
				continue;
			}

			if ( 'VirtualLocation' === ( $location['@type'] ?? '' ) ) {
				$has_virtual = true;
			} elseif ( 'Place' === ( $location['@type'] ?? '' ) ) {
				$has_physical = true;
			}
		}

		if ( $has_physical && $has_virtual ) {
			return 'https://schema.org/MixedEventAttendanceMode';
		}

		if ( $has_virtual ) {
			return 'https://schema.org/OnlineEventAttendanceMode';
		}

		if ( $has_physical ) {
			return 'https://schema.org/OfflineEventAttendanceMode';
		}

		$type = $event->get_type();
		if ( in_array( $type, array( 'online', 'virtual' ), true ) ) {
			return 'https://schema.org/OnlineEventAttendanceMode';
		}

		if ( 'mixed' === $type ) {
			return 'https://schema.org/MixedEventAttendanceMode';
		}

		return 'https://schema.org/OfflineEventAttendanceMode';
	}

	/**
	 * Get schema start/end dates in the WordPress timezone.
	 *
	 * @param Event $event Event model.
	 * @return array{start:string,end:string}
	 */
	/**
	 * Build schema.org Schedule entries for a recurring series so Google can
	 * interpret the rule (the single-Event payload only describes the first
	 * occurrence; the Schedule carries the full recurrence).
	 *
	 * @param Event $event Event model.
	 * @return array<int,array<string,mixed>>
	 */
	private static function get_schema_event_schedule( Event $event ) {
		$rules = $event::get_recurrence_rules();
		if ( ! is_array( $rules ) || empty( $rules ) ) {
			return array();
		}

		$tz       = self::get_schema_timezone();
		$tz_name  = ( $tz instanceof \DateTimeZone ) ? $tz->getName() : 'UTC';
		$schedules = array();

		$weekday_names = array(
			0 => 'https://schema.org/Sunday',
			1 => 'https://schema.org/Monday',
			2 => 'https://schema.org/Tuesday',
			3 => 'https://schema.org/Wednesday',
			4 => 'https://schema.org/Thursday',
			5 => 'https://schema.org/Friday',
			6 => 'https://schema.org/Saturday',
		);

		foreach ( $rules as $rule ) {
			if ( ! is_array( $rule ) || empty( $rule['start_date'] ) || empty( $rule['frequency'] ) ) {
				continue;
			}

			$interval = max( 1, absint( $rule['interval'] ?? 1 ) );

			switch ( (string) $rule['frequency'] ) {
				case 'day':
				case 'working_day':
					$repeat = 'P' . $interval . 'D';
					break;
				case 'week':
					$repeat = 'P' . $interval . 'W';
					break;
				case 'month':
					$repeat = 'P' . $interval . 'M';
					break;
				case 'year':
					$repeat = 'P' . $interval . 'Y';
					break;
				default:
					continue 2;
			}

			$entry = array(
				'@type'           => 'Schedule',
				'repeatFrequency' => $repeat,
				'scheduleTimezone' => $tz_name,
			);

			$start_local = self::utc_to_local_iso( (string) $rule['start_date'] );
			if ( '' !== $start_local ) {
				$entry['startDate'] = $start_local;
			}

			if ( ! empty( $rule['end_date'] ) ) {
				$end_local = self::utc_to_local_iso( (string) $rule['end_date'] );
				if ( '' !== $end_local ) {
					$entry['endDate'] = $end_local;
				}
			}

			if ( ! empty( $rule['ends_after'] ) ) {
				$entry['repeatCount'] = absint( $rule['ends_after'] );
			}

			if ( ! empty( $rule['ends_on'] ) ) {
				$entry['endDate'] = self::utc_to_local_iso( (string) $rule['ends_on'] );
			}

			$by_day = array();
			if ( 'working_day' === $rule['frequency'] ) {
				$by_day = array(
					$weekday_names[1],
					$weekday_names[2],
					$weekday_names[3],
					$weekday_names[4],
					$weekday_names[5],
				);
			} elseif ( ! empty( $rule['weekdays'] ) && is_array( $rule['weekdays'] ) ) {
				foreach ( $rule['weekdays'] as $w ) {
					$wi = (int) $w;
					if ( isset( $weekday_names[ $wi ] ) ) {
						$by_day[] = $weekday_names[ $wi ];
					}
				}
			}
			if ( ! empty( $by_day ) ) {
				$entry['byDay'] = array_values( array_unique( $by_day ) );
			}

			if ( ! empty( $rule['months'] ) && is_array( $rule['months'] ) ) {
				$months = array_values( array_filter( array_map( 'absint', $rule['months'] ) ) );
				if ( ! empty( $months ) ) {
					$entry['byMonth'] = $months;
				}
			}

			$schedules[] = $entry;
		}

		return $schedules;
	}

	private static function get_schema_dates( Event $event ) {
		$context   = self::get_schema_date_context( $event );
		$start_utc = (string) ( $context['start_date'] ?? '' );
		$end_utc   = (string) ( $context['end_date'] ?? '' );

		// Google rejects Event entries whose endDate is more than ~24h after
		// startDate without an eventSchedule. For a recurring series without a
		// specific instance selected, our stored end_date is the LAST
		// occurrence's end. Clamp to the FIRST occurrence's end and let
		// eventSchedule (emitted by add_event_schema) describe the rule.
		if ( 'recurring' === $event::get_date_type() ) {
			$rules = $event::get_recurrence_rules();
			if ( ! empty( $rules[0]['end_date'] ) ) {
				$end_utc = (string) $rules[0]['end_date'];
			} elseif ( ! empty( $rules[0]['start_date'] ) ) {
				$end_utc = (string) $rules[0]['start_date'];
			}
		}

		if ( ! empty( $context['all_day'] ) ) {
			return array(
				'start' => self::utc_to_all_day_schema_date( $start_utc, $context, false ),
				'end'   => self::utc_to_all_day_schema_date( $end_utc, $context, true ),
			);
		}

		return array(
			'start' => self::utc_to_local_iso( $start_utc ),
			'end'   => self::utc_to_local_iso( $end_utc ),
		);
	}

	/**
	 * Get the effective event date context for schema output.
	 *
	 * @param Event $event Event model.
	 * @return array
	 */
	private static function get_schema_date_context( Event $event ) {
		$context = array(
			'start_date' => $event->get_start_date_iso(),
			'end_date'   => $event->get_end_date_iso(),
			'all_day'    => false,
		);

		$instance_ts = function_exists( 'eventkoi_get_instance_id' ) ? absint( eventkoi_get_instance_id() ) : 0;
		if ( $instance_ts > 0 && 'recurring' === $event::get_date_type() && method_exists( $event, 'get_recurring_instance_payload' ) ) {
			$instance = $event::get_recurring_instance_payload( $instance_ts );
			if ( is_array( $instance ) && ! empty( $instance['start_date'] ) ) {
				return array_merge(
					$context,
					$instance,
					array(
						'start_date' => (string) $instance['start_date'],
						'end_date'   => ! empty( $instance['end_date'] ) ? (string) $instance['end_date'] : '',
					)
				);
			}
		}

		$selected_day = self::get_selected_standard_event_day_context( $event );
		if ( is_array( $selected_day ) && ! empty( $selected_day['start_date'] ) ) {
			return array_merge(
				$context,
				$selected_day,
				array(
					'start_date' => (string) $selected_day['start_date'],
					'end_date'   => ! empty( $selected_day['end_date'] ) ? (string) $selected_day['end_date'] : '',
				)
			);
		}

		$first = $event::get_first_instance();
		if ( is_array( $first ) && ! empty( $first['all_day'] ) ) {
			if ( 'recurring' === $event::get_date_type() ) {
				$rules = $event::get_recurrence_rules();
				if ( ! empty( $rules[0] ) && is_array( $rules[0] ) ) {
					$first = array_merge( $first, $rules[0] );
				}
			}

			return array_merge(
				$context,
				$first,
				array(
					'start_date' => (string) $context['start_date'],
					'end_date'   => (string) $context['end_date'],
					'all_day'    => true,
				)
			);
		}

		return $context;
	}

	/**
	 * Get selected standard event-day context from the frontend request.
	 *
	 * @param Event $event Event model.
	 * @return array|null
	 */
	private static function get_selected_standard_event_day_context( Event $event ) {
		if ( 'standard' !== $event::get_date_type() || 'selected' !== $event::get_standard_type() ) {
			return null;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only frontend occurrence selector.
		$raw = isset( $_GET['event_day'] ) ? wp_unslash( $_GET['event_day'] ) : null;
		if ( is_array( $raw ) ) {
			return null;
		}

		$raw = sanitize_text_field( (string) $raw );
		if ( '' === $raw || ! ctype_digit( $raw ) ) {
			return null;
		}

		$days  = $event::get_event_days();
		$index = absint( $raw );

		return isset( $days[ $index ] ) && is_array( $days[ $index ] ) ? $days[ $index ] : null;
	}

	/**
	 * Get the schema URL, preserving selected recurring/standard instance context.
	 *
	 * @param Event $event Event model.
	 * @return string
	 */
	private static function get_schema_url( Event $event ) {
		$url = $event::get_url();

		if ( '' === $url ) {
			$url = get_permalink( $event->get_id() );
		}

		return esc_url_raw( (string) $url );
	}

	/**
	 * Get the schema title, including recurring instance overrides.
	 *
	 * @param Event $event Event model.
	 * @return string
	 */
	private static function get_schema_title( Event $event ) {
		$title = $event::get_instance_field( 'title' );
		$title = self::schema_text( $title );

		if ( '' === $title ) {
			$title = __( 'Untitled event', 'eventkoi-lite' );
		}

		return $title;
	}

	/**
	 * Get the schema description as plain text.
	 *
	 * @param Event $event Event model.
	 * @return string
	 */
	private static function get_schema_description( Event $event ) {
		$description = self::schema_text( $event::get_instance_field( 'description' ) );

		if ( '' === $description ) {
			$description = self::schema_text( $event->get_summary() );
		}

		return $description;
	}

	/**
	 * Get schema.org event status, honoring the explicit event status meta.
	 *
	 * @param Event  $event  Event model.
	 * @param string $status Model status.
	 * @return string
	 */
	private static function get_schema_event_status( Event $event, $status ) {
		$manual_status = sanitize_key( (string) get_post_meta( $event->get_id(), 'status', true ) );
		if ( '' !== $manual_status ) {
			$status = $manual_status;
		}

		return match ( $status ) {
			'cancelled'                 => 'https://schema.org/EventCancelled',
			'postponed'                 => 'https://schema.org/EventPostponed',
			'rescheduled'               => 'https://schema.org/EventRescheduled',
			'moved_online',
			'movedonline',
			'moved-online'              => 'https://schema.org/EventMovedOnline',
			default                     => 'https://schema.org/EventScheduled',
		};
	}

	/**
	 * Get schema.org locations for all valid stored locations.
	 *
	 * @param Event $event Event model.
	 * @return array
	 */
	private static function get_schema_locations( Event $event ) {
		$locations = $event::get_instance_field( 'locations' );
		$has_instance_locations_override = false;
		$instance_ts                     = function_exists( 'eventkoi_get_instance_id' ) ? absint( eventkoi_get_instance_id() ) : 0;

		if ( $instance_ts > 0 && 'recurring' === $event::get_date_type() ) {
			$overrides = $event::get_recurrence_overrides();
			$has_instance_locations_override = isset( $overrides[ $instance_ts ] )
				&& is_array( $overrides[ $instance_ts ] )
				&& array_key_exists( 'locations', $overrides[ $instance_ts ] );
		}

		if ( ( ! is_array( $locations ) || empty( $locations ) ) && ! $has_instance_locations_override ) {
			$legacy_location = $event->get_location();
			$locations       = ! empty( $legacy_location ) && is_array( $legacy_location )
				? array( $legacy_location )
				: array();
		}

		if ( ! is_array( $locations ) ) {
			return array();
		}

		$output          = array();
		$has_virtual_url = false;

		foreach ( $locations as $location ) {
			if ( ! is_array( $location ) ) {
				continue;
			}

			$location_type = self::get_location_schema_type( $location );
			if ( in_array( $location_type, array( 'online', 'virtual' ), true ) ) {
				$virtual = self::build_virtual_location_schema( $location );
				if ( ! empty( $virtual ) ) {
					$output[]        = $virtual;
					$has_virtual_url = true;
				}
				continue;
			}

			$place = self::build_place_schema( $location );
			if ( ! empty( $place ) ) {
				$output[] = $place;
			}
		}

		$legacy_virtual_url = $has_instance_locations_override ? '' : trim( (string) $event->get_virtual_url() );
		if ( ! $has_virtual_url && '' !== $legacy_virtual_url ) {
			$output[] = array(
				'@type' => 'VirtualLocation',
				'url'   => esc_url_raw( $legacy_virtual_url ),
			);
		}

		if ( 1 === count( $output ) ) {
			return $output[0];
		}

		return $output;
	}

	/**
	 * Normalize EventKoi and Schema.org location types.
	 *
	 * @param array $location Location row.
	 * @return string
	 */
	private static function get_location_schema_type( array $location ) {
		$type = sanitize_key( (string) ( $location['type'] ?? '' ) );
		if ( 'physical' === $type ) {
			return 'inperson';
		}
		if ( 'virtual' === $type ) {
			return 'online';
		}
		if ( in_array( $type, array( 'inperson', 'online' ), true ) ) {
			return $type;
		}
		if ( str_contains( $type, 'virtuallocation' ) ) {
			return 'online';
		}
		if ( str_contains( $type, 'place' ) ) {
			return 'inperson';
		}

		$schema_types = isset( $location['@type'] ) && is_array( $location['@type'] ) ? $location['@type'] : array( $location['@type'] ?? '' );
		foreach ( $schema_types as $schema_type ) {
			$schema_type = preg_replace( '#^https?://schema\.org/#i', '', self::schema_text( $schema_type ) );
			$schema_type = strtolower( (string) $schema_type );
			if ( str_contains( $schema_type, 'virtuallocation' ) ) {
				return 'online';
			}

			if ( str_contains( $schema_type, 'place' ) ) {
				return 'inperson';
			}
		}

		return '';
	}

	/**
	 * Build a schema Place from a stored EventKoi location row.
	 *
	 * @param array $location Location row.
	 * @return array
	 */
	private static function build_place_schema( array $location ) {
		$nested_address = isset( $location['address'] ) && is_array( $location['address'] ) ? $location['address'] : array();
		$street_parts = array_filter(
			array(
				self::location_value( $location, 'address1' ),
				self::location_value( $location, 'address2' ),
				self::location_value( $location, 'address3' ),
			),
			static function ( $value ) {
				return '' !== $value;
			}
		);

		$street_address = ! empty( $street_parts )
			? implode( ', ', $street_parts )
			: '';
		if ( '' === $street_address && ! empty( $nested_address ) ) {
			$street_address = self::location_value( $nested_address, 'streetAddress' );
		}
		if ( '' === $street_address ) {
			$street_address = self::location_value( $location, 'address' );
		}

		$address = array_filter(
			array(
				'@type'           => 'PostalAddress',
				'streetAddress'   => $street_address,
				'addressLocality' => self::first_schema_text(
					self::location_value( $location, 'city' ),
					self::location_value( $nested_address, 'addressLocality' )
				),
				'addressRegion'   => self::first_schema_text(
					self::location_value( $location, 'state' ),
					self::location_value( $nested_address, 'addressRegion' )
				),
				'postalCode'      => self::first_schema_text(
					self::location_value( $location, 'zip' ),
					self::location_value( $nested_address, 'postalCode' )
				),
				'addressCountry'  => self::first_schema_text(
					self::location_value( $location, 'country' ),
					self::location_value( $nested_address, 'addressCountry' )
				),
			),
			static function ( $value ) {
				return '' !== (string) $value;
			}
		);

		$latitude  = self::location_value( $location, 'latitude' );
		$longitude = self::location_value( $location, 'longitude' );
		$nested_geo = isset( $location['geo'] ) && is_array( $location['geo'] ) ? $location['geo'] : array();
		if ( '' === $latitude ) {
			$latitude = self::location_value( $location, 'lat' );
		}
		if ( '' === $longitude ) {
			$longitude = self::location_value( $location, 'lng' );
		}
		if ( '' === $latitude && ! empty( $nested_geo ) ) {
			$latitude = self::location_value( $nested_geo, 'latitude' );
		}
		if ( '' === $longitude && ! empty( $nested_geo ) ) {
			$longitude = self::location_value( $nested_geo, 'longitude' );
		}

		$geo = array();
		if ( is_numeric( $latitude ) && is_numeric( $longitude ) ) {
			$geo = array(
				'@type'     => 'GeoCoordinates',
				'latitude'  => (float) $latitude,
				'longitude' => (float) $longitude,
			);
		}

		$place = array_filter(
			array(
				'@type'   => 'Place',
				'name'    => self::location_value( $location, 'name' ),
				'address' => count( $address ) > 1 ? $address : null,
				'geo'     => $geo,
			),
			static function ( $value ) {
				if ( null === $value ) {
					return false;
				}
				if ( is_array( $value ) ) {
					return ! empty( $value );
				}
				return '' !== (string) $value;
			}
		);

		return count( $place ) > 1 ? $place : array();
	}

	/**
	 * Build a schema VirtualLocation from a stored EventKoi location row.
	 *
	 * @param array $location Location row.
	 * @return array
	 */
	private static function build_virtual_location_schema( array $location ) {
		$url = self::location_value( $location, 'virtual_url' );
		if ( '' === $url ) {
			$url = self::location_value( $location, 'url' );
		}

		if ( '' === $url ) {
			return array();
		}

		return array(
			'@type' => 'VirtualLocation',
			'url'   => esc_url_raw( $url ),
		);
	}

	/**
	 * Get a plain string value from a location row.
	 *
	 * @param array  $location Location row.
	 * @param string $key      Field key.
	 * @return string
	 */
	private static function location_value( array $location, $key ) {
		if ( ! array_key_exists( $key, $location ) ) {
			return '';
		}

		$value = $location[ $key ];
		if ( is_object( $value ) ) {
			$value = get_object_vars( $value );
		}

		if ( is_array( $value ) ) {
			foreach ( array( 'name', 'text', 'url', '@id' ) as $nested_key ) {
				if ( array_key_exists( $nested_key, $value ) ) {
					$text = self::schema_text( $value[ $nested_key ] );
					if ( '' !== $text ) {
						return $text;
					}
				}
			}

			$texts = array();
			foreach ( $value as $nested_value ) {
				$text = self::schema_text( $nested_value );
				if ( '' !== $text ) {
					$texts[] = $text;
				}
			}

			return implode( ' ', array_unique( $texts ) );
		}

		return self::schema_text( $value );
	}

	/**
	 * Get organizer schema, preferring structured organizer meta from imports.
	 *
	 * @param Event $event Event model.
	 * @return array
	 */
	private static function get_schema_organizer( Event $event ) {
		$event_id = $event->get_id();
		$name     = self::schema_text( get_post_meta( $event_id, 'organizer_name', true ) );

		if ( '' !== $name ) {
			$organizer = array_filter(
				array(
					'@type'     => 'Organization',
					'name'      => $name,
					'url'       => esc_url_raw( (string) get_post_meta( $event_id, 'organizer_website', true ) ),
					'email'     => sanitize_email( (string) get_post_meta( $event_id, 'organizer_email', true ) ),
					'telephone' => self::schema_text( get_post_meta( $event_id, 'organizer_phone', true ) ),
				),
				static function ( $value ) {
					return '' !== (string) $value;
				}
			);

			return $organizer;
		}

		$site_name = get_bloginfo( 'name' );
		if ( empty( $site_name ) ) {
			return array();
		}

		return array(
			'@type' => 'Organization',
			'name'  => $site_name,
			'url'   => home_url(),
		);
	}

	/**
	 * Get ticket offer schema for active tickets.
	 *
	 * @param Event $event Event model.
	 * @return array
	 */
	private static function get_schema_offers( Event $event ) {
		if ( function_exists( 'eventkoi_is_tickets_feature_enabled' ) && ! eventkoi_is_tickets_feature_enabled() ) {
			return array();
		}

		if ( 'tickets' !== $event::get_attendance_mode() && ! $event::get_tickets_enabled() ) {
			return array();
		}

		global $wpdb;

		$event_id = absint( $event->get_id() );
		$table    = $wpdb->prefix . 'eventkoi_tickets';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$tickets = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT id, name, description, price, currency, quantity_available, quantity_sold, sale_start, sale_end, sort_order FROM {$table} WHERE event_id = %d AND status = %s ORDER BY sort_order ASC, id ASC", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$event_id,
				'active'
			)
		);

		if ( empty( $tickets ) || ! is_array( $tickets ) ) {
			return array();
		}

		$instance_ts       = ( 'recurring' === $event::get_date_type() && function_exists( 'eventkoi_get_instance_id' ) ) ? absint( eventkoi_get_instance_id() ) : 0;
		$instance_override = self::get_ticket_instance_override( $event_id, $instance_ts );
		$currency          = self::get_global_currency();
		$url               = self::get_schema_url( $event );
		$offers            = array();

		foreach ( $tickets as $ticket ) {
			$ticket_id = absint( $ticket->id ?? 0 );
			if ( $ticket_id <= 0 ) {
				continue;
			}

			$price = (float) ( $ticket->price ?? 0 );
			if ( $instance_ts > 0 && isset( $instance_override['ticket_price'][ $ticket_id ] ) ) {
				$override_price = $instance_override['ticket_price'][ $ticket_id ];
				if ( '' !== $override_price && null !== $override_price ) {
					$price = (float) $override_price;
				}
			}

			$inventory = self::get_ticket_inventory_snapshot( $event_id, $ticket, $instance_ts, $instance_override );
			$availability = self::get_ticket_schema_availability( $ticket, $inventory );
			$offer     = array_filter(
				array(
					'@type'         => 'Offer',
					'name'          => self::schema_text( $ticket->name ?? '' ),
					'description'   => self::schema_text( $ticket->description ?? '' ),
					'url'           => $url,
					'price'         => round( $price, 2 ),
					'priceCurrency' => $currency,
					'availability'  => $availability,
					'validFrom'     => self::utc_to_local_iso( (string) ( $ticket->sale_start ?? '' ) ),
					'validThrough'  => self::utc_to_local_iso( (string) ( $ticket->sale_end ?? '' ) ),
				),
				static function ( $value ) {
					return '' !== (string) $value;
				}
			);

			if ( null !== $inventory['remaining'] ) {
				$offer['inventoryLevel'] = array(
					'@type' => 'QuantitativeValue',
					'value' => $inventory['remaining'],
				);
			}

			$offers[] = $offer;
		}

		return $offers;
	}

	/**
	 * Resolve schema.org Offer availability for one ticket row.
	 *
	 * @param object $ticket    Ticket row.
	 * @param array  $inventory Inventory snapshot.
	 * @return string
	 */
	private static function get_ticket_schema_availability( $ticket, array $inventory ) {
		if ( null !== $inventory['remaining'] && 0 === $inventory['remaining'] ) {
			return 'https://schema.org/SoldOut';
		}

		$sale_start_ts = ! empty( $ticket->sale_start ) ? strtotime( (string) $ticket->sale_start . ' UTC' ) : 0;
		if ( $sale_start_ts && time() < $sale_start_ts ) {
			return '';
		}

		$sale_end_ts = ! empty( $ticket->sale_end ) ? strtotime( (string) $ticket->sale_end . ' UTC' ) : 0;
		if ( $sale_end_ts && time() > $sale_end_ts ) {
			return 'https://schema.org/SoldOut';
		}

		return 'https://schema.org/InStock';
	}

	/**
	 * Resolve ticket instance overrides.
	 *
	 * @param int $event_id    Event ID.
	 * @param int $instance_ts Recurring instance timestamp.
	 * @return array
	 */
	private static function get_ticket_instance_override( $event_id, $instance_ts ) {
		if ( $instance_ts <= 0 || ! function_exists( 'eventkoi_get_instance_override' ) ) {
			return array();
		}

		$override = eventkoi_get_instance_override( $event_id, $instance_ts );
		if ( ! is_array( $override ) ) {
			return array();
		}

		foreach ( array( 'ticket_capacity', 'ticket_price' ) as $key ) {
			if ( isset( $override[ $key ] ) && ! is_array( $override[ $key ] ) ) {
				$override[ $key ] = (array) $override[ $key ];
			}
		}

		return $override;
	}

	/**
	 * Get remaining inventory for one ticket.
	 *
	 * @param int    $event_id          Event ID.
	 * @param object $ticket            Ticket row.
	 * @param int    $instance_ts       Recurring instance timestamp.
	 * @param array  $instance_override Instance override payload.
	 * @return array{remaining:int|null}
	 */
	private static function get_ticket_inventory_snapshot( $event_id, $ticket, $instance_ts, array $instance_override ) {
		$ticket_id = absint( $ticket->id ?? 0 );
		$capacity  = null;

		if ( isset( $ticket->quantity_available ) && null !== $ticket->quantity_available && '' !== $ticket->quantity_available ) {
			$capacity = absint( $ticket->quantity_available );
		}

		if ( $instance_ts > 0 && isset( $instance_override['ticket_capacity'][ $ticket_id ] ) ) {
			$override_capacity = $instance_override['ticket_capacity'][ $ticket_id ];
			if ( '' !== $override_capacity && null !== $override_capacity ) {
				$capacity = absint( $override_capacity );
			}
		}

		if ( null === $capacity ) {
			return array( 'remaining' => null );
		}

		$sold = self::get_ticket_sold_quantity( $event_id, $ticket, $instance_ts );
		$held = self::get_ticket_held_quantity( $event_id, $ticket_id, $instance_ts );

		return array(
			'remaining' => max( $capacity - $sold - $held, 0 ),
		);
	}

	/**
	 * Get completed sold quantity for one ticket.
	 *
	 * @param int    $event_id    Event ID.
	 * @param object $ticket      Ticket row.
	 * @param int    $instance_ts Recurring instance timestamp.
	 * @return int
	 */
	private static function get_ticket_sold_quantity( $event_id, $ticket, $instance_ts ) {
		global $wpdb;

		$ticket_id    = absint( $ticket->id ?? 0 );
		$instance_ts  = absint( $instance_ts );
		$orders_table = $wpdb->prefix . 'eventkoi_ticket_orders';

		if ( $instance_ts > 0 ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			return absint(
				$wpdb->get_var(
					$wpdb->prepare(
						"SELECT COALESCE(SUM(quantity), 0) FROM {$orders_table} WHERE event_id = %d AND ticket_id = %d AND instance_ts = %d AND payment_status IN ('complete','completed','succeeded','paid','partially_refunded')", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
						$event_id,
						$ticket_id,
						$instance_ts
					)
				)
			);
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$remote_sold = absint(
			$wpdb->get_var(
				$wpdb->prepare(
					"SELECT COALESCE(SUM(quantity), 0) FROM {$orders_table} WHERE event_id = %d AND ticket_id = %d AND payment_status IN ('complete','completed','succeeded','paid','partially_refunded')", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					$event_id,
					$ticket_id
				)
			)
		);

		return max( absint( $ticket->quantity_sold ?? 0 ), $remote_sold );
	}

	/**
	 * Get currently held quantity for one ticket.
	 *
	 * @param int $event_id    Event ID.
	 * @param int $ticket_id   Ticket ID.
	 * @param int $instance_ts Recurring instance timestamp.
	 * @return int
	 */
	private static function get_ticket_held_quantity( $event_id, $ticket_id, $instance_ts ) {
		global $wpdb;

		$orders_table   = $wpdb->prefix . 'eventkoi_ticket_orders';
		$hold_duration  = defined( '\\EventKoi\\API\\Tickets::HOLD_DURATION' )
			? (int) constant( '\\EventKoi\\API\\Tickets::HOLD_DURATION' )
			: 15 * MINUTE_IN_SECONDS;
		$hold_threshold = gmdate( 'Y-m-d H:i:s', time() - $hold_duration );
		$instance_ts    = absint( $instance_ts );

		if ( $instance_ts > 0 ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			return absint(
				$wpdb->get_var(
					$wpdb->prepare(
						"SELECT COALESCE(SUM(quantity), 0) FROM {$orders_table} WHERE event_id = %d AND ticket_id = %d AND instance_ts = %d AND payment_status = 'hold' AND created_at > %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
						$event_id,
						$ticket_id,
						$instance_ts,
						$hold_threshold
					)
				)
			);
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		return absint(
			$wpdb->get_var(
				$wpdb->prepare(
					"SELECT COALESCE(SUM(quantity), 0) FROM {$orders_table} WHERE event_id = %d AND ticket_id = %d AND payment_status = 'hold' AND created_at > %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					$event_id,
					$ticket_id,
					$hold_threshold
				)
			)
		);
	}

	/**
	 * Resolve the ticket currency.
	 *
	 * @return string
	 */
	private static function get_global_currency() {
		if ( class_exists( WooCommerce_Checkout::class ) && WooCommerce_Checkout::is_active() && function_exists( 'get_woocommerce_currency' ) ) {
			return strtoupper( get_woocommerce_currency() );
		}

		$settings = Settings::get();
		$currency = strtoupper( sanitize_text_field( (string) ( $settings['currency'] ?? 'USD' ) ) );

		return preg_match( '/^[A-Z]{3}$/', $currency ) ? $currency : 'USD';
	}

	/**
	 * Normalize schema text to a compact plain string.
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	private static function schema_text( $value ) {
		if ( is_array( $value ) || is_object( $value ) ) {
			return '';
		}

		$text = wp_strip_all_tags( (string) $value );
		$text = html_entity_decode( $text, ENT_QUOTES, get_bloginfo( 'charset' ) ?: 'UTF-8' );
		$text = preg_replace( '/\s+/', ' ', $text );

		return trim( (string) $text );
	}

	/**
	 * Return the first non-empty schema text value.
	 *
	 * @param string ...$values Candidate values.
	 * @return string
	 */
	private static function first_schema_text( ...$values ) {
		foreach ( $values as $value ) {
			$text = self::schema_text( $value );
			if ( '' !== $text ) {
				return $text;
			}
		}

		return '';
	}

	/**
	 * Convert a UTC all-day boundary to a schema.org date-only value.
	 *
	 * @param string $utc_iso UTC ISO-8601 date.
	 * @param array  $context Effective date context.
	 * @param bool   $is_end  Whether the boundary is an end date.
	 * @return string
	 */
	private static function utc_to_all_day_schema_date( $utc_iso, array $context, $is_end ) {
		if ( empty( $utc_iso ) ) {
			return '';
		}

		try {
			$timezone = self::get_all_day_schema_timezone( $context );
			$date     = new \DateTimeImmutable( $utc_iso, new \DateTimeZone( 'UTC' ) );
			$date     = $date->setTimezone( $timezone );

			if ( $is_end && '00:00:00' === $date->format( 'H:i:s' ) ) {
				$start = ! empty( $context['start_date'] )
					? ( new \DateTimeImmutable( (string) $context['start_date'], new \DateTimeZone( 'UTC' ) ) )->setTimezone( $timezone )
					: null;
				if ( $start instanceof \DateTimeImmutable && $date->format( 'Y-m-d' ) > $start->format( 'Y-m-d' ) ) {
					$date = $date->modify( '-1 day' );
				}
			}

			return $date->format( 'Y-m-d' );
		} catch ( \Exception $e ) {
			return '';
		}
	}

	/**
	 * Resolve the source timezone used by all-day schema dates.
	 *
	 * @param array $context Effective date context.
	 * @return \DateTimeZone
	 */
	private static function get_all_day_schema_timezone( array $context ) {
		$start_raw = (string) ( $context['start_date'] ?? '' );
		$end_raw   = (string) ( $context['end_date'] ?? '' );
		$event_id  = absint( Event::get_id() );
		$stored    = $event_id > 0 ? self::schema_text( get_post_meta( $event_id, 'timezone', true ) ) : '';
		if ( '' === $stored ) {
			$stored = Event::get_timezone();
		}
		$inferred  = function_exists( 'eventkoi_infer_all_day_timezone_from_utc_range' )
			? eventkoi_infer_all_day_timezone_from_utc_range( $start_raw, $end_raw )
			: '';

		$candidates = array(
			self::schema_text( $context['all_day_timezone'] ?? '' ),
			function_exists( 'eventkoi_all_day_timezone_should_prefer_stored' ) && eventkoi_all_day_timezone_should_prefer_stored( $stored, $inferred, $start_raw, $end_raw ) ? $stored : '',
			$inferred,
			$stored,
		);

		foreach ( $candidates as $timezone ) {
			if ( '' === trim( (string) $timezone ) ) {
				continue;
			}

			try {
				return new \DateTimeZone( eventkoi_php_timezone( $timezone ) );
			} catch ( \Exception $e ) {
				continue;
			}
		}

		return wp_timezone();
	}

	/**
	 * Convert a UTC ISO-8601 date to local timezone with offset.
	 *
	 * Google recommends local time with offset (e.g. 2026-04-01T09:00:00+02:00)
	 * so users see the correct local time in search results.
	 *
	 * @param string $utc_iso UTC ISO-8601 date (e.g. 2026-04-01T07:00:00Z).
	 * @return string Local ISO-8601 date with offset, or empty string.
	 */
	private static function utc_to_local_iso( $utc_iso ) {
		if ( empty( $utc_iso ) ) {
			return '';
		}

		try {
			$dt = new \DateTime( $utc_iso, new \DateTimeZone( 'UTC' ) );
			$dt->setTimezone( self::get_schema_timezone() );
			return $dt->format( 'Y-m-d\TH:i:sP' );
		} catch ( \Exception $e ) {
			return '';
		}
	}

	/**
	 * Resolve the timezone used by JSON-LD dates.
	 *
	 * Structured data should match the visible event URL context: an explicit
	 * frontend ?tz= selection wins, otherwise dates are emitted in WP timezone.
	 *
	 * @return \DateTimeZone
	 */
	private static function get_schema_timezone() {
		$timezone = function_exists( 'eventkoi_get_frontend_timezone_query_arg' )
			? eventkoi_get_frontend_timezone_query_arg()
			: '';

		if ( '' !== $timezone && 'local' !== $timezone ) {
			try {
				return new \DateTimeZone( eventkoi_php_timezone( $timezone ) );
			} catch ( \Exception $e ) {
				return wp_timezone();
			}
		}

		return wp_timezone();
	}
}
