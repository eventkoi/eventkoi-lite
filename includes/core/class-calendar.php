<?php
/**
 * Calendar.
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
 * Calendar.
 */
class Calendar {

	/**
	 * Calendar object.
	 *
	 * @var $calendar.
	 */
	private static $calendar = null;

	/**
	 * Calendar ID.
	 *
	 * @var $calendar_id.
	 */
	private static $calendar_id = 0;

	/**
	 * Construct.
	 *
	 * @param {object, number} $calendar A calendar object or calendar ID.
	 */
	public function __construct( $calendar = null ) {

		if ( is_numeric( $calendar ) ) {
			$calendar = get_term_by( 'id', $calendar, 'event_cal' );
		}

		self::$calendar    = $calendar;
		self::$calendar_id = ! empty( $calendar->term_id ) ? $calendar->term_id : 0;
	}

	/**
	 * Checks if calendar is invalid.
	 */
	public static function is_invalid() {
		if ( ! empty( self::$calendar_id ) ) {
			return false;
		}

		return true;
	}

	/**
	 * Get meta.
	 */
	public static function get_meta() {

		$meta = array(
			'id'        => self::get_id(),
			'name'      => self::get_name(),
			'slug'      => self::get_slug(),
			'url'       => self::get_url(),
			'count'     => self::get_count(),
			'display'   => self::get_display(),
			'timeframe' => self::get_timeframe(),
			'startday'  => self::get_startday(),
			'shortcode' => self::get_shortcode(),
			'color'     => self::get_color(),
		);

		return apply_filters( 'eventkoi_get_calendar_meta', $meta, self::$calendar_id, self::$calendar );
	}

	/**
	 * Get calendar ID.
	 */
	public static function get_id() {
		$id = self::$calendar_id;

		return apply_filters( 'eventkoi_get_calendar_id', $id, self::$calendar_id, self::$calendar );
	}

	/**
	 * Get name.
	 */
	public static function get_name() {
		$name = ! empty( self::$calendar->name ) ? self::$calendar->name : '';

		return apply_filters( 'eventkoi_get_calendar_name', $name, self::$calendar_id, self::$calendar );
	}

	/**
	 * Get slug.
	 */
	public static function get_slug() {
		$slug = ! empty( self::$calendar->slug ) ? self::$calendar->slug : '';

		return apply_filters( 'eventkoi_get_calendar_slug', $slug, self::$calendar_id, self::$calendar );
	}

	/**
	 * Get URL.
	 */
	public static function get_url() {
		$url = get_term_link( self::get_slug(), 'event_cal' );

		if ( is_wp_error( $url ) ) {
			$url = '';
		}

		return apply_filters( 'eventkoi_get_calendar_url', $url, self::$calendar_id, self::$calendar );
	}

	/**
	 * Get count.
	 */
	public static function get_count() {
		$count = isset( self::$calendar->count ) ? self::$calendar->count : 0;

		return apply_filters( 'eventkoi_get_calendar_count', $count, self::$calendar_id, self::$calendar );
	}

	/**
	 * Get display type.
	 */
	public static function get_display() {
		$display = get_term_meta( self::$calendar_id, 'display', true );

		if ( empty( $display ) ) {
			$display = 'calendar';
		}

		return apply_filters( 'eventkoi_get_calendar_display', $display, self::$calendar_id, self::$calendar );
	}

	/**
	 * Get timeframe display.
	 */
	public static function get_timeframe() {
		$timeframe = get_term_meta( self::$calendar_id, 'timeframe', true );

		if ( empty( $timeframe ) ) {
			$timeframe = 'month';
		}

		return apply_filters( 'eventkoi_get_calendar_timeframe', $timeframe, self::$calendar_id, self::$calendar );
	}

	/**
	 * Get week start day.
	 *
	 * @return string Start day key (e.g. 'monday', 'sunday', etc.).
	 */
	public static function get_startday() {
		$startday = get_term_meta( self::$calendar_id, 'startday', true );

		if ( empty( $startday ) ) {
			$settings = \EventKoi\Core\Settings::get();

			$ordered = array( 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday' );
			$index   = isset( $settings['week_starts_on'] ) ? absint( $settings['week_starts_on'] ) : 0;

			$startday = isset( $ordered[ $index ] ) ? $ordered[ $index ] : 'monday';
		}

		return apply_filters( 'eventkoi_get_calendar_startday', $startday, self::$calendar_id, self::$calendar );
	}

	/**
	 * Get color.
	 */
	public static function get_color() {
		$color = get_term_meta( self::$calendar_id, 'color', true );

		if ( empty( $color ) ) {
			$color = eventkoi_default_calendar_color();
		}

		return apply_filters( 'eventkoi_get_calendar_color', $color, self::$calendar_id, self::$calendar );
	}

	/**
	 * Get shortcode.
	 */
	public static function get_shortcode() {
		$shortcode = '[ek_calendar id=' . absint( self::get_id() ) . ']';

		return apply_filters( 'eventkoi_get_calendar_shortcode', $shortcode, self::$calendar_id, self::$calendar );
	}

	/**
	 * Update calendar.
	 *
	 * @param array $meta An array with calendar meta.
	 */
	public static function update( $meta = array() ) {

		$meta = apply_filters( 'eventkoi_pre_update_calendar_meta', $meta, $meta['id'] );

		$id   = $meta['id'];
		$name = $meta['name'];

		$slug = ! empty( $meta['slug'] ) ? sanitize_text_field( $meta['slug'] ) : '';

		if ( 0 === $id ) {
			return array(
				'message' => __( 'Calendar creation is a Pro feature.', 'eventkoi' ),
			);
		}

		$calendar = get_term_by( 'id', $id, 'event_cal' );

		$args = array(
			'name' => $name,
			'slug' => $slug,
		);

		$last_id = wp_update_term( $id, 'event_cal', $args );

		if ( is_wp_error( $last_id ) ) {
			$result = array(
				'error' => html_entity_decode( $last_id->get_error_message() ),
			);
			return $result;
		}

		self::$calendar    = get_term_by( 'id', $last_id['term_id'], 'event_cal' );
		self::$calendar_id = ! empty( $calendar->term_id ) ? $calendar->term_id : 0;
		self::update_meta( $meta );

		return array_merge(
			array(
				'message' => __( 'Calendar updated.', 'eventkoi' ),
			),
			self::get_meta(),
		);
	}

	/**
	 * Update calendar meta.
	 *
	 * @param array $meta An array with calendar meta.
	 */
	public static function update_meta( $meta = array() ) {
		// Hook to allow chnages to calendar metadata.
		$meta = apply_filters( 'eventkoi_update_event_meta', $meta, self::$calendar_id, self::$calendar );

		do_action( 'eventkoi_before_update_calendar_meta', $meta, self::$calendar_id, self::$calendar );

		$display   = ! empty( $meta['display'] ) ? sanitize_text_field( $meta['display'] ) : 'calendar';
		$timeframe = ! empty( $meta['timeframe'] ) ? sanitize_text_field( $meta['timeframe'] ) : 'month';
		$startday  = ! empty( $meta['startday'] ) ? sanitize_text_field( $meta['startday'] ) : 'monday';
		$color     = ! empty( $meta['color'] ) ? sanitize_text_field( $meta['color'] ) : eventkoi_default_calendar_color();

		update_term_meta( self::$calendar_id, 'display', (string) $display );
		update_term_meta( self::$calendar_id, 'timeframe', (string) $timeframe );
		update_term_meta( self::$calendar_id, 'startday', (string) $startday );
		update_term_meta( self::$calendar_id, 'color', (string) $color );

		do_action( 'eventkoi_after_update_calendar_meta', $meta, self::$calendar_id, self::$calendar );
	}

	/**
	 * Delete a single calendar.
	 *
	 * @param int $calendar_id ID of calendar.
	 */
	public static function delete_calendar( $calendar_id = 0 ) {

		if ( (int) get_option( 'default_event_cal', 0 ) === (int) $calendar_id ) {
			return;
		}

		wp_delete_term( $calendar_id, 'event_cal' );

		$result = array(
			'message' => __( 'Calendar deleted.', 'eventkoi' ),
		);

		return $result;
	}

	/**
	 * Duplicate a single calendar.
	 */
	public static function duplicate_calendar() {

		$meta = self::get_meta();

		$calendar = get_term_by( 'id', self::get_id(), 'event_cal' );

		/* translators: %s is calendar name */
		$name = sprintf( __( '[Duplicate] %s', 'eventkoi' ), $calendar->name );

		$args = array(
			'slug'        => wp_unique_term_slug( $calendar->name, $calendar ),
			'description' => $calendar->description,
		);

		$new_term = wp_insert_term( $name, 'event_cal', $args );
		$new_cal  = get_term_by( 'id', $new_term['term_id'], 'event_cal' );

		self::$calendar    = $new_cal;
		self::$calendar_id = ! empty( $new_cal->term_id ) ? $new_cal->term_id : 0;

		self::update_meta( $meta );

		$result = array_merge(
			array(
				'update_endpoint' => true,
				'message'         => __( 'Calendar duplicated.', 'eventkoi' ),
			),
			self::get_meta(),
		);

		return $result;
	}

	/**
	 * Normalize a date string to full UTC ISO-8601 with Z suffix.
	 *
	 * @param string|null $date Date string to normalize.
	 * @return string|null Normalized date string, or null if empty/invalid.
	 */
	public static function normalize_utc_iso( $date ) {
		if ( empty( $date ) ) {
			return null;
		}

		$date = trim( $date );

		try {
			// Only append Z if it doesn't already end with Z or an offset.
			if ( ! preg_match( '/Z$|[+\-]\d{2}:?\d{2}$/', $date ) ) {
				$date .= 'Z';
			}

			$dt = new \DateTimeImmutable( $date );

			return $dt->setTimezone( new \DateTimeZone( 'UTC' ) )
					->format( 'Y-m-d\TH:i:s\Z' );

		} catch ( \Exception $e ) {
			return null;
		}
	}

	/**
	 * Get all events in calendar.
	 *
	 * @param array $ids              Array of calendar IDs to get events from.
	 * @param bool  $expand_instances Whether to expand recurring instances or not.
	 * @return array Events array.
	 */
	public static function get_events( $ids = array(), $expand_instances = false ) {
		$results         = array();
		$timezone        = wp_timezone(); // Use site timezone.
		$plugin_settings = get_option( 'eventkoi_settings', array() );
		$working_days    = isset( $plugin_settings['working_days'] ) && is_array( $plugin_settings['working_days'] )
		? array_map( 'intval', $plugin_settings['working_days'] )
		: array( 0, 1, 2, 3, 4 ); // Default to Mon–Fri.

		$events = get_posts(
			array(
				'post_type'   => 'event',
				'numberposts' => -1,
				'tax_query'   => array( // phpcs:ignore WordPress.DB.SlowDBQuery
					array(
						'taxonomy' => 'event_cal',
						'field'    => 'term_id',
						'terms'    => ! empty( $ids ) ? $ids : self::get_id(),
					),
				),
			)
		);

		foreach ( $events as $item ) {
			$event = new \EventKoi\Core\Event( $item->ID );

			$overrides     = $event::get_recurrence_overrides();
			$instance_ts   = eventkoi_get_instance_id();
			$override_data = ( $instance_ts && isset( $overrides[ $instance_ts ] ) ) ? $overrides[ $instance_ts ] : array();

			// Use override locations if present.
			$locations = isset( $override_data['locations'] ) && is_array( $override_data['locations'] )
			? $override_data['locations']
			: $event::get_locations();

			$primary = ( is_array( $locations ) && ! empty( $locations[0] ) ) ? $locations[0] : array();

			$primary_type      = $primary['type'] ?? '';
			$virtual_url       = $primary['virtual_url'] ?? '';
			$link_text         = $primary['link_text'] ?? $virtual_url;
			$location_fallback = $virtual_url;

			if ( empty( $location_fallback ) ) {
				$location_parts = array_filter(
					array(
						$primary['name'] ?? '',
						$primary['address1'] ?? '',
						$primary['address2'] ?? '',
						$primary['city'] ?? '',
						$primary['state'] ?? '',
						$primary['zip'] ?? '',
						$primary['country'] ?? '',
					)
				);

				$location_fallback = implode( ', ', $location_parts );
			}

			if ( empty( $location_fallback ) ) {
				$location_fallback = $event::get_location_line();
			}

			if ( 'recurring' === $event::get_date_type() && true === $expand_instances ) {
				$rules = $event::get_recurrence_rules();

				foreach ( $rules as $rule ) {
					if ( empty( $rule['start_date'] ) || empty( $rule['frequency'] ) ) {
						continue;
					}

					try {
						// Now re-create as wall time (why? to avoid any internal offsetting).
						$start_wall = new \DateTimeImmutable( $rule['start_date'] );
						$dt_local   = $start_wall;

						$end_dt = ! empty( $rule['end_date'] )
						? new \DateTimeImmutable( $rule['end_date'] )
						: null;

						$duration = $end_dt ? $end_dt->getTimestamp() - $start_wall->getTimestamp() : 0;
						$count    = 0;

						$freq_map = array(
							'day'   => 'DAILY',
							'week'  => 'WEEKLY',
							'month' => 'MONTHLY',
							'year'  => 'YEARLY',
						);

						if ( ! isset( $freq_map[ $rule['frequency'] ] ) ) {
							continue;
						}

						$options = array(
							'FREQ'     => $freq_map[ $rule['frequency'] ],
							'DTSTART'  => $start_wall, // this is the *true* wall time.
							'INTERVAL' => isset( $rule['every'] ) ? absint( $rule['every'] ) : 1,
						);

						if ( isset( $rule['ends'] ) && 'after' === $rule['ends'] ) {
							$options['COUNT'] = absint( $rule['ends_after'] );
						} elseif ( isset( $rule['ends'] ) && 'on' === $rule['ends'] ) {
							$options['UNTIL'] = new \DateTimeImmutable( $rule['ends_on'] );
						}

						// Weekly BYDAY.
						if ( 'week' === $rule['frequency'] && ! empty( $rule['weekdays'] ) ) {
							$map              = array( 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU' );
							$options['BYDAY'] = implode(
								',',
								array_map(
									static function ( $i ) use ( $map ) {
										return $map[ (int) $i ] ?? '';
									},
									$rule['weekdays']
								)
							);
						}

						// Yearly BYMONTH.
						if ( 'year' === $rule['frequency'] && ! empty( $rule['months'] ) ) {
							$options['BYMONTH'] = array_map(
								static function ( $m ) {
									return (int) $m + 1;
								},
								$rule['months']
							);
						}

						if ( 'month' === $rule['frequency'] ) {
							$weekday_map = array( 'SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA' );

							if ( 'weekday-of-month' === $rule['month_day_rule'] ) {
								// Always derive from start date — ignore provided month_day_value or weekdays array.
								$js_day  = (int) $start_wall->format( 'w' ); // 0=Sun
								$ordinal = (int) ceil( (int) $start_wall->format( 'j' ) / 7 );

								$options['BYDAY']    = $weekday_map[ $js_day ];
								$options['BYSETPOS'] = $ordinal;

							} elseif ( 'day-of-month' === $rule['month_day_rule'] ) {
								$options['BYMONTHDAY'] = (int) $rule['month_day_value'];
							}
						}

						$rrule = new \EKLIB\RRule\RRule( $options );

						foreach ( $rrule as $dt ) {
							if ( $count++ >= 200 ) {
								break;
							}
							$results[] = self::format_event_instance(
								$event,
								$dt,
								$duration,
								$timezone,
								$primary,
								$primary_type,
								$virtual_url,
								$link_text,
								$location_fallback,
								$locations
							);
						}
					} catch ( \Exception $e ) {
						continue;
					}
				}
			} elseif ( 'recurring' === $event::get_date_type() && false === $expand_instances ) {
				$rules = $event::get_recurrence_rules();

				foreach ( $rules as $rule ) {
					if ( empty( $rule['start_date'] ) || empty( $rule['frequency'] ) ) {
						continue;
					}

					try {
						// Normalize start/end to UTC ISO with Z.
						$start_str = self::normalize_utc_iso( $rule['start_date'] );
						$end_str   = self::normalize_utc_iso( $rule['end_date'] ?? null );

						if ( ! $start_str ) {
							continue;
						}

						// Parse original UTC start/end.
						$orig_start = new \DateTimeImmutable( $start_str );
						$orig_end   = $end_str ? new \DateTimeImmutable( $end_str ) : null;

						// Duration in seconds.
						$duration = $orig_end ? $orig_end->getTimestamp() - $orig_start->getTimestamp() : 0;

						// Anchor DTSTART to midnight UTC for recurrence generation.
						$anchor_start = $orig_start->setTime( 0, 0, 0 );

						$freq_map = array(
							'day'   => 'DAILY',
							'week'  => 'WEEKLY',
							'month' => 'MONTHLY',
							'year'  => 'YEARLY',
						);

						if ( ! isset( $freq_map[ $rule['frequency'] ] ) ) {
							continue;
						}

						$options = array(
							'FREQ'     => $freq_map[ $rule['frequency'] ],
							'DTSTART'  => $anchor_start,
							'INTERVAL' => isset( $rule['every'] ) ? absint( $rule['every'] ) : 1,
						);

						if ( isset( $rule['ends'] ) && 'after' === $rule['ends'] ) {
							$options['COUNT'] = absint( $rule['ends_after'] );
						} elseif ( isset( $rule['ends'] ) && 'on' === $rule['ends'] ) {
							$options['UNTIL'] = new \DateTimeImmutable( $rule['ends_on'], new \DateTimeZone( 'UTC' ) );
						}

						// Weekly recurrence.
						if ( 'week' === $rule['frequency'] && ! empty( $rule['weekdays'] ) ) {
							$map              = array( 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU' );
							$options['BYDAY'] = implode(
								',',
								array_map(
									static function ( $i ) use ( $map ) {
										return $map[ (int) $i ] ?? '';
									},
									$rule['weekdays']
								)
							);
						}

						// Monthly recurrence.
						if ( 'month' === $rule['frequency'] ) {
							$weekday_map = array( 'SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA' );

							if ( 'weekday-of-month' === $rule['month_day_rule'] ) {
								// Always derive from start date — ignore month_day_value completely.
								$js_day  = (int) $anchor_start->format( 'w' ); // 0=Sun
								$ordinal = (int) ceil( (int) $anchor_start->format( 'j' ) / 7 );

								$options['BYDAY']    = $weekday_map[ $js_day ];
								$options['BYSETPOS'] = $ordinal;

							} elseif ( 'day-of-month' === $rule['month_day_rule'] ) {
								$options['BYMONTHDAY'] = (int) $rule['month_day_value'];
							}
						}

						// Create RRule.
						$rrule = new \EKLIB\RRule\RRule( $options );

						// Get the *next* logical occurrence in UTC (include today if matches).
						$now  = new \DateTimeImmutable( 'now', new \DateTimeZone( 'UTC' ) );
						$next = $rrule->getOccurrencesAfter( $now, true );

						// If the library returns an array, take the first item.
						if ( is_array( $next ) ) {
							$next = $next[0] ?? null;
						}

						if ( $next instanceof \DateTimeInterface ) {

							$next = $next->setTime(
								(int) $orig_start->format( 'H' ),
								(int) $orig_start->format( 'i' ),
								(int) $orig_start->format( 's' )
							);

							$results[] = self::format_event_instance(
								$event,
								$next,
								$duration,
								$timezone,
								$primary,
								$primary_type,
								$virtual_url,
								$link_text,
								$location_fallback,
								$locations
							);
						}
					} catch ( \Exception $e ) {
						continue;
					}
				}
			} elseif ( 'recurring' !== $event::get_date_type() ) {
				$days = $event::get_event_days();

				if ( 'continuous' === $event::get_standard_type() ) {
					$range_start = $event::get_start_date();
					$range_end   = $event::get_end_date();

					if ( ! empty( $range_start ) && ! empty( $range_end ) ) {
						$start_dt_utc    = new \DateTimeImmutable( $range_start, new \DateTimeZone( 'UTC' ) );
						$end_dt_utc      = new \DateTimeImmutable( $range_end, new \DateTimeZone( 'UTC' ) );
						$end_all_day_utc = $end_dt_utc->modify( '+1 day' )->setTime( 0, 0, 0 );

						$start_time_full = gmdate( 'g:ia', $start_dt_utc->getTimestamp() );
						$end_time_full   = gmdate( 'g:ia', $end_dt_utc->getTimestamp() );

						$start_minutes = gmdate( 'i', $start_dt_utc->getTimestamp() );
						$end_minutes   = gmdate( 'i', $end_dt_utc->getTimestamp() );

						$start_time = ( '00' === $start_minutes )
							? gmdate( 'ga', $start_dt_utc->getTimestamp() )
							: $start_time_full;

						$end_time = ( '00' === $end_minutes )
							? gmdate( 'ga', $end_dt_utc->getTimestamp() )
							: $end_time_full;

						$results[] = array(
							'id'            => $event::get_id() . '-span',
							'title'         => $event::get_title(),
							'date_type'     => $event::get_date_type(),
							'start'         => $start_dt_utc->format( 'Y-m-d\TH:i:s\Z' ),
							'end'           => $end_all_day_utc->format( 'Y-m-d\TH:i:s\Z' ),
							'end_real'      => $end_dt_utc->format( 'Y-m-d\TH:i:s\Z' ),
							'start_time'    => $start_time,
							'end_time'      => $end_time,
							'allDay'        => true,
							'url'           => $event::get_url(),
							'description'   => $event::get_summary(),
							'address1'      => $primary['address1'] ?? '',
							'address2'      => $primary['address2'] ?? '',
							'latitude'      => $event::get_latitude(),
							'longitude'     => $event::get_longitude(),
							'embed_gmap'    => $event::get_embed_gmap(),
							'gmap_link'     => $event::get_gmap_link(),
							'thumbnail'     => $event::get_image(),
							'type'          => ! empty( $primary_type ) ? $primary_type : $event::get_type(),
							'virtual_url'   => $virtual_url,
							'link_text'     => $link_text,
							'location_line' => $location_fallback,
							'locations'     => $locations,
							'timeline'      => $event::get_timeline(),
							'timezone'      => $event::get_timezone(),
						);
					}
				} elseif ( 'selected' === $event::get_standard_type() && false === $expand_instances && ! empty( $days ) ) {
					// Use the first day's start and the last day's end.
					$first = reset( $days );
					$last  = end( $days );

					$start = '';
					$end   = '';

					if ( ! empty( $first['start_date'] ) ) {
						$start_dt = new \DateTimeImmutable( $first['start_date'], new \DateTimeZone( 'UTC' ) );
						$start    = $start_dt->format( 'Y-m-d\TH:i:s\Z' );
					}

					if ( ! empty( $last['end_date'] ) ) {
						$end_dt = new \DateTimeImmutable( $last['end_date'], new \DateTimeZone( 'UTC' ) );

						if ( ! empty( $last['all_day'] ) ) {
							$end_dt = $end_dt->modify( '+1 day' )->setTime( 0, 0, 0 );
						}

						$end = $end_dt->format( 'Y-m-d\TH:i:s\Z' );
					}

					$results[] = array(
						'id'            => $event::get_id() . '-span',
						'title'         => $event::get_title(),
						'date_type'     => $event::get_date_type(),
						'start'         => $start,
						'end'           => $end,
						'allDay'        => ! empty( $first['all_day'] ),
						'url'           => $event::get_url(),
						'description'   => $event::get_summary(),
						'address1'      => $primary['address1'] ?? '',
						'address2'      => $primary['address2'] ?? '',
						'address3'      => '',
						'latitude'      => $event::get_latitude(),
						'longitude'     => $event::get_longitude(),
						'embed_gmap'    => $event::get_embed_gmap(),
						'gmap_link'     => $event::get_gmap_link(),
						'thumbnail'     => $event::get_image(),
						'type'          => ! empty( $primary_type ) ? $primary_type : $event::get_type(),
						'virtual_url'   => $virtual_url,
						'link_text'     => $link_text,
						'location_line' => $location_fallback,
						'locations'     => $locations,
						'timeline'      => $event::get_timeline(),
						'timezone'      => $event::get_timezone(),
					);
				} else {
					// Original loop for other cases.
					foreach ( $days as $i => $instance ) {
						$start = '';
						$end   = '';

						if ( ! empty( $instance['start_date'] ) ) {
							$start_dt = new \DateTimeImmutable( $instance['start_date'], new \DateTimeZone( 'UTC' ) );
							$start    = $start_dt->format( 'Y-m-d\TH:i:s\Z' );
						}

						if ( ! empty( $instance['end_date'] ) ) {
							$end_dt = new \DateTimeImmutable( $instance['end_date'], new \DateTimeZone( 'UTC' ) );

							if ( ! empty( $instance['all_day'] ) ) {
								$end_dt = $end_dt->modify( '+1 day' )->setTime( 0, 0, 0 );
							}

							$end = $end_dt->format( 'Y-m-d\TH:i:s\Z' );
						}

						$results[] = array(
							'id'            => $event::get_id() . '-day' . $i,
							'title'         => $event::get_title(),
							'date_type'     => $event::get_date_type(),
							'start'         => $start,
							'end'           => $end,
							'allDay'        => ! empty( $instance['all_day'] ),
							'url'           => $event::get_url(),
							'description'   => $event::get_summary(),
							'address1'      => $primary['address1'] ?? '',
							'address2'      => $primary['address2'] ?? '',
							'address3'      => '',
							'latitude'      => $event::get_latitude(),
							'longitude'     => $event::get_longitude(),
							'embed_gmap'    => $event::get_embed_gmap(),
							'gmap_link'     => $event::get_gmap_link(),
							'thumbnail'     => $event::get_image(),
							'type'          => ! empty( $primary_type ) ? $primary_type : $event::get_type(),
							'virtual_url'   => $virtual_url,
							'link_text'     => $link_text,
							'location_line' => $location_fallback,
							'locations'     => $locations,
							'timeline'      => $event::get_timeline(),
							'timezone'      => $event::get_timezone(),
						);
					}
				}
			}
		}

		return $results;
	}

	/**
	 * Helper to format an event instance into a calendar array.
	 *
	 * @param object             $event             Event object.
	 * @param \DateTimeImmutable $dt                Start datetime.
	 * @param int                $duration          Duration in seconds.
	 * @param \DateTimeZone      $timezone          Timezone object.
	 * @param array              $primary           Primary location array.
	 * @param string             $primary_type      Location type.
	 * @param string             $virtual_url       Virtual link.
	 * @param string             $link_text         Link text.
	 * @param string             $location_fallback Formatted location line.
	 * @param array              $locations         Full locations array.
	 * @return array
	 */
	protected static function format_event_instance( $event, $dt, $duration, $timezone, $primary, $primary_type, $virtual_url, $link_text, $location_fallback, $locations ) {
		$start = $dt->setTimezone( new \DateTimeZone( 'UTC' ) )
			->format( 'Y-m-d\TH:i:s\Z' );

		$end = '';
		if ( $duration > 0 ) {
			$end = $dt->add( new \DateInterval( 'PT' . $duration . 'S' ) )
				->setTimezone( new \DateTimeZone( 'UTC' ) )
				->format( 'Y-m-d\TH:i:s\Z' );
		}

		$utc_timestamp = gmmktime(
			(int) gmdate( 'H', strtotime( $start ) ),
			(int) gmdate( 'i', strtotime( $start ) ),
			(int) gmdate( 's', strtotime( $start ) ),
			(int) gmdate( 'm', strtotime( $start ) ),
			(int) gmdate( 'd', strtotime( $start ) ),
			(int) gmdate( 'Y', strtotime( $start ) )
		);

		$url = $event::get_url(); // Base permalink.

		if ( get_option( 'permalink_structure' ) ) {
			// Pretty permalinks — append instance timestamp.
			$url = trailingslashit( $url ) . $utc_timestamp . '/';
		} else {
			// Plain permalinks — use query arg.
			$url = add_query_arg( 'instance', $utc_timestamp, $url );
		}

		// Load instance override (if any).
		$overrides = $event::get_recurrence_overrides();
		$override  = $overrides[ $utc_timestamp ] ?? array();

		// Use override locations if available.
		$override_locations = isset( $override['locations'] ) && is_array( $override['locations'] ) ? $override['locations'] : $locations;
		$override_primary   = ! empty( $override_locations[0] ) ? $override_locations[0] : $primary;

		$override_primary_type = $override_primary['type'] ?? $primary_type;
		$override_virtual_url  = $override_primary['virtual_url'] ?? $virtual_url;
		$override_link_text    = $override_primary['link_text'] ?? $override_virtual_url;

		$override_location_line = $override_virtual_url;
		if ( empty( $override_location_line ) ) {
			$parts                  = array_filter(
				array(
					$override_primary['name'] ?? '',
					$override_primary['address1'] ?? '',
					$override_primary['address2'] ?? '',
					$override_primary['city'] ?? '',
					$override_primary['state'] ?? '',
					$override_primary['zip'] ?? '',
					$override_primary['country'] ?? '',
				)
			);
			$override_location_line = implode( ', ', $parts );
		}
		if ( empty( $override_location_line ) ) {
			$override_location_line = $event::get_location_line();
		}

		$data = array(
			'id'            => $event::get_id() . '-' . $dt->format( 'YmdHis' ),
			'title'         => $event::get_title(),
			'date_type'     => $event::get_date_type(),
			'start'         => $start,
			'end'           => $end,
			'allDay'        => ! empty( $event::get_first_instance()['all_day'] ),
			'url'           => $url,
			'description'   => $event::get_summary(),
			'address1'      => $override_primary['address1'] ?? '',
			'address2'      => $override_primary['address2'] ?? '',
			'address3'      => '',
			'latitude'      => $override_primary['latitude'] ?? $event::get_latitude(),
			'longitude'     => $override_primary['longitude'] ?? $event::get_longitude(),
			'embed_gmap'    => $override_primary['embed_gmap'] ?? $event::get_embed_gmap(),
			'gmap_link'     => $override_primary['gmap_link'] ?? $event::get_gmap_link(),
			'thumbnail'     => ! empty( $override['image'] ) ? esc_url_raw( $override['image'] ) : $event::get_image(),
			'type'          => ! empty( $override_primary_type ) ? $override_primary_type : $event::get_type(),
			'virtual_url'   => $override_virtual_url,
			'link_text'     => $override_link_text,
			'location_line' => $override_location_line,
			'locations'     => $override_locations,
			'timeline'      => $event::get_timeline(),
			'timezone'      => $event::get_timezone(),
		);

		// Merge top-level override keys.
		foreach ( $override as $key => $value ) {
			if ( 'summary' === $key ) {
				$data['description'] = trim( html_entity_decode( wp_strip_all_tags( $override['description'] ?? '' ) ) );
			}
			if ( array_key_exists( $key, $data ) ) {
				$data[ $key ] = $value;
			}
		}

		return $data;
	}
}
