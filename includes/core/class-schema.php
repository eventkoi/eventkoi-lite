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
		$type      = $event->get_type();
		$is_online = in_array( $type, array( 'online', 'virtual' ), true );
		$is_mixed  = ( 'mixed' === $type );

		// startDate is required by Google — skip schema entirely if missing.
		$start_iso = self::utc_to_local_iso( $event->get_start_date_iso() );
		if ( '' === $start_iso ) {
			return;
		}

		$schema = array(
			'@context'            => 'https://schema.org',
			'@type'               => 'Event',
			'name'                => $event->get_title(),
			'startDate'           => $start_iso,
			'url'                 => get_permalink( $event->get_id() ),
			'eventAttendanceMode' => $is_online
				? 'https://schema.org/OnlineEventAttendanceMode'
				: ( $is_mixed ? 'https://schema.org/MixedEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode' ),
			'eventStatus'         => match ( $status ) {
				'completed' => 'https://schema.org/EventCompleted',
				'cancelled' => 'https://schema.org/EventCancelled',
				'live'      => 'https://schema.org/EventInProgress',
				default     => 'https://schema.org/EventScheduled',
			},
		);

		$end_iso = self::utc_to_local_iso( $event->get_end_date_iso() );
		if ( '' !== $end_iso ) {
			$schema['endDate'] = $end_iso;
		}

		// Location.
		$location      = $event->get_location();
		$virtual_url   = trim( (string) $event->get_virtual_url() );
		$all_locations = $event->get_locations();

		if ( '' === $virtual_url && is_array( $all_locations ) ) {
			foreach ( $all_locations as $location_row ) {
				if ( ! is_array( $location_row ) ) {
					continue;
				}

				$location_type = sanitize_key( (string) ( $location_row['type'] ?? '' ) );
				if ( ! in_array( $location_type, array( 'online', 'virtual' ), true ) ) {
					continue;
				}

				$candidate_virtual_url = trim( (string) ( $location_row['virtual_url'] ?? '' ) );
				if ( '' !== $candidate_virtual_url ) {
					$virtual_url = $candidate_virtual_url;
					break;
				}
			}
		}

		$place_name    = isset( $location['name'] ) ? trim( (string) $location['name'] ) : '';
		$street_parts  = array_filter(
			array(
				isset( $location['address1'] ) ? trim( (string) $location['address1'] ) : '',
				isset( $location['address2'] ) ? trim( (string) $location['address2'] ) : '',
			)
		);
		$street_address = ! empty( $street_parts ) ? implode( ', ', $street_parts ) : '';

		$address = array_filter(
			array(
				'@type'           => 'PostalAddress',
				'streetAddress'   => $street_address,
				'addressLocality' => isset( $location['city'] ) ? trim( (string) $location['city'] ) : '',
				'addressRegion'   => isset( $location['state'] ) ? trim( (string) $location['state'] ) : '',
				'postalCode'      => isset( $location['zip'] ) ? trim( (string) $location['zip'] ) : '',
				'addressCountry'  => isset( $location['country'] ) ? trim( (string) $location['country'] ) : '',
			),
			static function ( $value ) {
				return '' !== (string) $value;
			}
		);

		$place = array_filter(
			array(
				'@type'   => 'Place',
				'name'    => $place_name,
				'address' => ( count( $address ) > 1 ? $address : null ),
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
		$place_valid = ( count( $place ) > 1 );

		$virtual_location = array();
		if ( '' !== $virtual_url ) {
			$virtual_location = array(
				'@type' => 'VirtualLocation',
				'url'   => $virtual_url,
			);
		}

		$has_virtual_location = ! empty( $virtual_location );
		$has_both_locations   = ( $place_valid && $has_virtual_location );

		if ( $is_mixed || $has_both_locations ) {
			$locations = array();
			if ( $place_valid ) {
				$locations[] = $place;
			}
			if ( $has_virtual_location ) {
				$locations[] = $virtual_location;
			}
			if ( 1 === count( $locations ) ) {
				$schema['location'] = $locations[0];
			} elseif ( count( $locations ) > 1 ) {
				$schema['location'] = $locations;
			}
		} elseif ( $is_online ) {
			if ( $has_virtual_location ) {
				$schema['location'] = $virtual_location;
			}
		} elseif ( $place_valid ) {
			$schema['location'] = $place;
		}

		// Image — only include if non-empty.
		$image = $event->get_image();
		if ( ! empty( $image ) ) {
			$schema['image'] = $image;
		}

		// Description — only include if non-empty.
		$description = $event->get_summary();
		if ( ! empty( $description ) ) {
			$schema['description'] = $description;
		}

		// Organizer — use site name as default.
		$site_name = get_bloginfo( 'name' );
		if ( ! empty( $site_name ) ) {
			$schema['organizer'] = array(
				'@type' => 'Organization',
				'name'  => $site_name,
				'url'   => home_url(),
			);
		}

		// Allow developers to modify the schema.
		$schema = apply_filters( 'eventkoi_get_event_schema', $schema );

		// Encode JSON — slashes are escaped (\/), preventing </script> injection.
		$json = wp_json_encode( $schema, JSON_UNESCAPED_UNICODE );
		if ( $json ) {
			echo '<script type="application/ld+json">' . $json . '</script>' . "\n";
		}
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
			$dt->setTimezone( wp_timezone() );
			return $dt->format( 'Y-m-d\TH:i:sP' );
		} catch ( \Exception $e ) {
			return $utc_iso;
		}
	}
}
