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
	 * Get the current frontend display timezone query arg, when valid.
	 *
	 * @return string
	 */
	private static function get_frontend_timezone_query_arg() {
		if ( empty( $_GET['tz'] ) || is_array( $_GET['tz'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only frontend display state.
			return '';
		}

		$timezone = (string) wp_unslash( $_GET['tz'] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only frontend display state.
		$timezone = self::restore_decoded_timezone_offset( $timezone );
		$timezone = sanitize_text_field( $timezone );
		if ( '' === $timezone ) {
			return '';
		}

		if ( 'local' === $timezone ) {
			return $timezone;
		}

		try {
			new \DateTimeZone( eventkoi_php_timezone( $timezone ) );
		} catch ( \Exception $e ) {
			return '';
		}

		return $timezone;
	}

	/**
	 * Restore offset timezones when a raw plus in the query string was decoded as a space.
	 *
	 * @param string $timezone Timezone query arg.
	 * @return string
	 */
	private static function restore_decoded_timezone_offset( $timezone ) {
		$timezone = (string) $timezone;

		if ( preg_match( '/^\s+\d{1,2}(?::?\d{2})?$/', $timezone ) ) {
			return '+' . ltrim( $timezone );
		}

		if ( preg_match( '/^UTC\s+\d{1,2}(?::?\d{2})?$/i', $timezone ) ) {
			return preg_replace( '/^UTC\s+/i', 'UTC+', $timezone );
		}

		return $timezone;
	}

	/**
	 * Add a query arg using RFC3986 encoding so plus signs are not decoded as spaces.
	 *
	 * @param string $url   URL to update.
	 * @param string $key   Query arg key.
	 * @param string $value Query arg value.
	 * @return string
	 */
	private static function add_encoded_query_arg( $url, $key, $value ) {
		$fragment = '';
		$hash_pos = strpos( $url, '#' );

		if ( false !== $hash_pos ) {
			$fragment = substr( $url, $hash_pos );
			$url      = substr( $url, 0, $hash_pos );
		}

		$url       = remove_query_arg( $key, $url );
		$separator = false === strpos( $url, '?' ) ? '?' : '&';

		return $url . $separator . rawurlencode( $key ) . '=' . rawurlencode( $value ) . $fragment;
	}

	/**
	 * Preserve the selected standard event-day row on occurrence links.
	 *
	 * @param string   $url       Event URL.
	 * @param int|null $event_day Selected event_days index.
	 * @return string
	 */
	private static function append_event_day_arg( $url, $event_day ) {
		if ( empty( $url ) || null === $event_day ) {
			return $url;
		}

		$event_day = absint( $event_day );

		return self::add_encoded_query_arg( $url, 'event_day', (string) $event_day );
	}

	/**
	 * Preserve the active frontend display timezone on event links.
	 *
	 * @param string $url Event URL.
	 * @return string
	 */
	private static function append_frontend_timezone_arg( $url ) {
		if ( empty( $url ) ) {
			return '';
		}

		$timezone = self::get_frontend_timezone_query_arg();
		if ( '' === $timezone ) {
			return $url;
		}

		return self::add_encoded_query_arg( $url, 'tz', $timezone );
	}

	/**
	 * Get meta.
	 */
	public static function get_meta() {

		$meta = array(
			'id'            => self::get_id(),
			'name'          => self::get_name(),
			'slug'          => self::get_slug(),
			'url'           => self::get_url(),
			'count'         => self::get_count(),
			'display'       => self::get_display(),
			'timeframe'     => self::get_timeframe(),
			'startday'      => self::get_startday(),
			'day_start_time' => self::get_day_start_time(),
			'shortcode'     => self::get_shortcode(),
			'color'         => self::get_color(),
			'default_month' => self::get_default_month(),
			'default_year'  => self::get_default_year(),
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
		$name = ! empty( self::$calendar->name ) ? eventkoi_decode_term_name( self::$calendar->name ) : '';

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
	 * Get default month to display.
	 *
	 * @return string Default month value (e.g. 'january').
	 */
	public static function get_default_month() {
		$month = get_term_meta( self::$calendar_id, 'default_month', true );

		if ( empty( $month ) ) {
			// Sensible fallback if no value is stored.
			$month = '';
		}

		/**
		 * Filters the default month for the calendar.
		 *
		 * @param string     $month        Default month value.
		 * @param int        $calendar_id  Calendar term ID.
		 * @param \WP_Term   $calendar     Calendar term object.
		 */
		return apply_filters( 'eventkoi_get_calendar_default_month', $month, self::$calendar_id, self::$calendar );
	}

	/**
	 * Get default year to display.
	 *
	 * @return string Default year value (e.g. '2025').
	 */
	public static function get_default_year() {
		$year = get_term_meta( self::$calendar_id, 'default_year', true );

		if ( empty( $year ) ) {
			// Sensible fallback if no value is stored.
			$year = '';
		}

		/**
		 * Filters the default year for the calendar.
		 *
		 * @param string     $year         Default year value.
		 * @param int        $calendar_id  Calendar term ID.
		 * @param \WP_Term   $calendar     Calendar term object.
		 */
		return apply_filters( 'eventkoi_get_calendar_default_year', $year, self::$calendar_id, self::$calendar );
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
	 * Get calendar day start time.
	 *
	 * @return string
	 */
	public static function get_day_start_time() {
		$start_time = get_term_meta( self::$calendar_id, 'day_start_time', true );

		if ( empty( $start_time ) ) {
			$settings   = \EventKoi\Core\Settings::get();
			$start_time = ! empty( $settings['day_start_time'] ) ? $settings['day_start_time'] : '07:00';
		}

		return apply_filters( 'eventkoi_get_calendar_day_start_time', $start_time, self::$calendar_id, self::$calendar );
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
		$shortcode = '[eventkoi_calendar id=' . absint( self::get_id() ) . ']';

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
			$args = array(
				'slug' => ! empty( $slug ) ? $slug : '',
			);

			$last_id           = wp_insert_term( $name, 'event_cal', $args );
			$calendar          = get_term_by( 'id', $last_id['term_id'], 'event_cal' );
			self::$calendar    = $calendar;
			self::$calendar_id = ! empty( $calendar->term_id ) ? $calendar->term_id : 0;

			self::update_meta( $meta );

			return array_merge(
				array(
					'update_endpoint' => true,
					'message'         => __( 'Calendar created.', 'eventkoi-lite' ),
				),
				self::get_meta(),
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
				'message' => __( 'Calendar updated.', 'eventkoi-lite' ),
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

		$display        = ! empty( $meta['display'] ) ? sanitize_text_field( $meta['display'] ) : 'calendar';
		$timeframe      = ! empty( $meta['timeframe'] ) ? sanitize_text_field( $meta['timeframe'] ) : 'month';
		$startday       = ! empty( $meta['startday'] ) ? sanitize_text_field( $meta['startday'] ) : 'monday';
		$day_start_time = ! empty( $meta['day_start_time'] ) ? sanitize_text_field( $meta['day_start_time'] ) : '';
		$color          = ! empty( $meta['color'] ) ? sanitize_text_field( $meta['color'] ) : eventkoi_default_calendar_color();
		$default_month  = ! empty( $meta['default_month'] ) ? sanitize_text_field( $meta['default_month'] ) : '';
		$default_year   = ! empty( $meta['default_year'] ) ? sanitize_text_field( $meta['default_year'] ) : '';

		update_term_meta( self::$calendar_id, 'display', (string) $display );
		update_term_meta( self::$calendar_id, 'timeframe', (string) $timeframe );
		update_term_meta( self::$calendar_id, 'startday', (string) $startday );
		if ( '' !== $day_start_time ) {
			update_term_meta( self::$calendar_id, 'day_start_time', (string) $day_start_time );
		}
		update_term_meta( self::$calendar_id, 'color', (string) $color );
		update_term_meta( self::$calendar_id, 'default_month', (string) $default_month );
		update_term_meta( self::$calendar_id, 'default_year', (string) $default_year );

		do_action( 'eventkoi_after_update_calendar_meta', $meta, self::$calendar_id, self::$calendar );
	}

	/**
	 * Delete a single calendar.
	 *
	 * @param int $calendar_id ID of calendar.
	 */
	public static function delete_calendar( $calendar_id = 0 ) {

		if ( \eventkoi_resolve_calendar_id( (int) get_option( 'eventkoi_default_event_cal', 0 ) ) === (int) $calendar_id ) {
			return;
		}

		wp_delete_term( $calendar_id, 'event_cal' );

		$result = array(
			'message' => __( 'Calendar deleted.', 'eventkoi-lite' ),
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
		$name = sprintf( __( '[Duplicate] %s', 'eventkoi-lite' ), $calendar->name );

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
				'message'         => __( 'Calendar duplicated.', 'eventkoi-lite' ),
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
	 * Get all events in calendar with optional paging and sorting.
	 *
	 * @param array $ids              Array of calendar IDs.
	 * @param bool  $expand_instances Whether to expand recurring instances.
	 * @param array $args             Optional query arguments:
	 *                                - per_page (int)
	 *                                - page (int)
	 *                                - order ('asc'|'desc')
	 *                                - orderby ('date'|'modified'|'title').
	 * @return array Paged & sorted events.
	 */
	public static function get_events( $ids = array(), $expand_instances = false, $args = array() ) {
		$results         = array();
		$timezone        = wp_timezone(); // Use site timezone.
		$plugin_settings = get_option( 'eventkoi_settings', array() );
		$working_days    = isset( $plugin_settings['working_days'] ) && is_array( $plugin_settings['working_days'] )
		? array_map( 'intval', $plugin_settings['working_days'] )
		: array( 0, 1, 2, 3, 4 ); // Default to Mon–Fri.

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$raw_start_param = isset( $_GET['start'] ) ? sanitize_text_field( wp_unslash( $_GET['start'] ) ) : '';
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$raw_end_param = isset( $_GET['end'] ) ? sanitize_text_field( wp_unslash( $_GET['end'] ) ) : '';

		// Merge optional args for pagination & sorting.
		$args = wp_parse_args(
			$args ?? array(),
			array(
				'per_page'    => -1,
				'include'     => array(),
				'page'        => 1,
				'orderby'     => 'modified',
				'order'       => 'DESC',
				'max_results' => 0,
				'display'     => '',
				'window_start' => '',
				'window_end'  => '',
				'post_status' => array( 'publish' ),
			)
		);

		$start_param = ! empty( $args['window_start'] ) ? sanitize_text_field( $args['window_start'] ) : $raw_start_param;
		$end_param   = ! empty( $args['window_end'] ) ? sanitize_text_field( $args['window_end'] ) : $raw_end_param;

		try {
			$window_start = $start_param ? new \DateTimeImmutable( $start_param, new \DateTimeZone( 'UTC' ) ) : null;
		} catch ( \Exception $e ) {
			$window_start = null;
		}

		try {
			$window_end = $end_param ? new \DateTimeImmutable( $end_param, new \DateTimeZone( 'UTC' ) ) : null;
		} catch ( \Exception $e ) {
			$window_end = null;
		}

		// Extract optional date filters from REST args.
		$start_date = ! empty( $args['start_date'] ) ? sanitize_text_field( $args['start_date'] ) : '';
		$end_date   = ! empty( $args['end_date'] ) ? sanitize_text_field( $args['end_date'] ) : '';

		if ( $start_date && strpos( $start_date, 'T' ) !== false ) {
			$start_date = substr( $start_date, 0, 10 );
		}
		if ( $end_date && strpos( $end_date, 'T' ) !== false ) {
			$end_date = substr( $end_date, 0, 10 );
		}

		// Normalize query vars.
		$per_page    = isset( $args['per_page'] ) ? (int) $args['per_page'] : -1;
		$per_page    = ( 0 === $per_page ) ? -1 : $per_page;
		$paged       = max( 1, (int) $args['page'] );
		$orderby     = sanitize_key( $args['orderby'] );
		$order       = strtoupper( $args['order'] );
		$max_results = max( 0, (int) $args['max_results'] );
		$display_context = sanitize_key( (string) $args['display'] );
		$post_status = isset( $args['post_status'] ) ? (array) $args['post_status'] : array( 'publish' );

		$allowed_orderby = array( 'modified', 'date_modified', 'date', 'publish_date', 'title', 'start_date', 'event_start', 'upcoming', 'past', 'past_events' );
		if ( ! in_array( $orderby, $allowed_orderby, true ) ) {
			$orderby = 'modified';
		}

		if ( 'date_modified' === $orderby ) {
			$orderby = 'modified';
		}
		if ( 'publish_date' === $orderby ) {
			$orderby = 'date';
		}
		if ( 'start_date' === $orderby ) {
			$orderby = 'event_start';
		}
		if ( 'past_events' === $orderby ) {
			$orderby = 'past';
		}
		if ( 'past' === $orderby ) {
			$order = 'DESC';
		}

		// Map custom orderby values to valid WP_Query keys.
		$post_orderby = $orderby;
		if ( in_array( $orderby, array( 'start_date', 'event_start', 'past' ), true ) ) {
			$post_orderby = 'date';
		}

		// Build query arguments.
		$query_args = array(
			'post_type'      => 'eventkoi_event',
			'post_status'    => $post_status,
			// Fetch all base events; pagination occurs after recurrence expansion.
			'posts_per_page' => -1,
			'orderby'        => $post_orderby,
			'order'          => $order,
			'no_found_rows'  => true,
		);

		// Handle include mode.
		if ( ! empty( $args['include'] ) ) {
			$query_args['post__in'] = array_map( 'absint', (array) $args['include'] );
			$query_args['orderby']  = 'post__in';
		} else {
			// Only filter by calendars when explicit IDs are provided.
			$term_ids = ! empty( $ids ) ? $ids : array();

			// Default: taxonomy filter, but only when specific calendars are provided.
			if ( ! empty( $term_ids ) ) {
				$query_args['tax_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- Tax query required to filter events by calendar assignment.
					array(
						'taxonomy' => 'event_cal',
						'field'    => 'term_id',
						'terms'    => $term_ids,
					),
				);
			}
		}

		$events = get_posts( $query_args );

		foreach ( $events as $item ) {
			$event = new \EventKoi\Core\Event( $item->ID );

			$overrides     = $event::get_recurrence_overrides();
			$instance_ts   = eventkoi_get_instance_id();
			$override_data = ( $instance_ts && isset( $overrides[ $instance_ts ] ) ) ? $overrides[ $instance_ts ] : array();

			// Use override locations if present.
			$locations = isset( $override_data['locations'] ) && is_array( $override_data['locations'] )
			? $override_data['locations']
			: $event::get_locations();

				$primary           = self::get_primary_location_row( $locations );
					$primary_type      = self::get_location_type( $primary );
				$virtual_url       = self::get_location_virtual_url( $primary );
				$link_text         = $primary['link_text'] ?? $virtual_url;
				$location_fallback = self::format_location_line( $primary );

			if ( empty( $location_fallback ) ) {
				$location_fallback = $event::get_location_line();
			}

			if ( 'recurring' === $event::get_date_type() && true === $expand_instances ) {
				// Recurring expansion omitted in lite for now.
				continue;
			} elseif ( 'recurring' === $event::get_date_type() && false === $expand_instances ) {
				continue;
			} elseif ( 'recurring' !== $event::get_date_type() ) {
				$days = $event::get_event_days();

				if ( 'continuous' === $event::get_standard_type() ) {
					$range_start = $event::get_start_date();
					$range_end   = $event::get_end_date();

					if ( ! empty( $range_start ) && ! empty( $range_end ) ) {
						$start_dt_utc    = new \DateTimeImmutable( $range_start, new \DateTimeZone( 'UTC' ) );
						$end_dt_utc      = new \DateTimeImmutable( $range_end, new \DateTimeZone( 'UTC' ) );
						$end_all_day_utc = $end_dt_utc->modify( '+1 day' )->setTime( 0, 0, 0 );

						// Authoritative all-day flag: per-day flag wins; fall back
						// to legacy top-level meta only when no day item exists.
						$first_day  = ! empty( $days ) && is_array( $days ) ? $days[0] : array();
						$is_all_day = array_key_exists( 'all_day', (array) $first_day )
							? (bool) $first_day['all_day']
							: rest_sanitize_boolean( get_post_meta( $event::get_id(), 'all_day', true ) );

						// FullCalendar wants exclusive +1 day end ONLY for all-day
						// events; timed events must keep the real end timestamp.
						$fc_end_dt = $is_all_day ? $end_all_day_utc : $end_dt_utc;

						// Calendar grid tiles use a compact time label.
						// Honor the EK 12/24-hour toggle so 24h sites see "13"
						// instead of "1pm". Keep the format short so tiles
						// don't overflow.
						$cal_settings    = \EventKoi\Core\Settings::get();
						$cal_uses_24h    = ! empty( $cal_settings['time_format'] ) && '24' === $cal_settings['time_format'];
						$full_fmt        = $cal_uses_24h ? 'H:i' : 'g:ia';
						$round_fmt       = $cal_uses_24h ? 'H' : 'ga';
						$start_time_full = gmdate( $full_fmt, $start_dt_utc->getTimestamp() );
						$end_time_full   = gmdate( $full_fmt, $end_dt_utc->getTimestamp() );

						$start_minutes = gmdate( 'i', $start_dt_utc->getTimestamp() );
						$end_minutes   = gmdate( 'i', $end_dt_utc->getTimestamp() );

						$start_time = ( '00' === $start_minutes )
							? gmdate( $round_fmt, $start_dt_utc->getTimestamp() )
							: $start_time_full;

						$end_time = ( '00' === $end_minutes )
							? gmdate( $round_fmt, $end_dt_utc->getTimestamp() )
							: $end_time_full;

					$record = array(
						'id'            => $event::get_id() . '-span',
						'event_id'      => $event::get_id(),
						'title'         => $event::get_title(),
						'date_type'     => $event::get_date_type(),
						'standard_type' => $event::get_standard_type(),
						'start'         => $start_dt_utc->format( 'Y-m-d\TH:i:s\Z' ),
						'start_real'    => $start_dt_utc->format( 'Y-m-d\TH:i:s\Z' ),
						'end'           => $fc_end_dt->format( 'Y-m-d\TH:i:s\Z' ),
						'end_real'      => $end_dt_utc->format( 'Y-m-d\TH:i:s\Z' ),
						'start_time'    => $start_time,
						'end_time'      => $end_time,
						'allDay'        => $is_all_day,
						'url'           => self::append_frontend_timezone_arg( $event::get_url() ),
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
						'event_days'    => $days,
					);

					if ( ! empty( $args['exclude'] ) && in_array( $record['id'], (array) $args['exclude'], true ) ) {
						continue;
					}

						$record['timeline']  = $event::get_datetime() ? $event::get_datetime() : $event::get_timeline();
						$record['datetime']  = $record['timeline'];
						$results[]           = $record;
					}
				} elseif ( 'selected' === $event::get_standard_type() && false === $expand_instances && ! empty( $days ) ) {
					// Use the first day's start and the last day's end.
					$first = reset( $days );
					$last  = end( $days );

					$start    = '';
					$end      = '';
					$end_real = '';

					if ( ! empty( $first['start_date'] ) ) {
						$start_dt = new \DateTimeImmutable( $first['start_date'], new \DateTimeZone( 'UTC' ) );
						$start    = $start_dt->format( 'Y-m-d\TH:i:s\Z' );
					}

					if ( ! empty( $last['end_date'] ) ) {
						$end_dt = new \DateTimeImmutable( $last['end_date'], new \DateTimeZone( 'UTC' ) );
						$end_real = $end_dt->format( 'Y-m-d\TH:i:s\Z' );

						if ( ! empty( $last['all_day'] ) ) {
							$end_dt = $end_dt->modify( '+1 day' )->setTime( 0, 0, 0 );
						}

						$end = $end_dt->format( 'Y-m-d\TH:i:s\Z' );
					}

					$record = array(
						'id'            => $event::get_id() . '-span',
						'event_id'      => $event::get_id(),
						'title'         => $event::get_title(),
						'date_type'     => $event::get_date_type(),
						'standard_type' => $event::get_standard_type(),
						'start'         => $start,
						'end'           => $end,
						'end_real'      => $end_real,
						'end_all_day'   => ! empty( $last['all_day'] ),
						'allDay'        => ! empty( $first['all_day'] ),
						'url'           => self::append_frontend_timezone_arg( $event::get_url() ),
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

					if ( ! empty( $args['exclude'] ) && in_array( $record['id'], (array) $args['exclude'], true ) ) {
						continue;
					}

					$record['timeline']  = $event::get_datetime() ? $event::get_datetime() : $event::get_timeline();
					$record['datetime']  = $record['timeline'];
					$results[]           = $record;
				} else {
					// Original loop for other cases.
					foreach ( $days as $i => $instance ) {
						$start    = '';
						$end      = '';
						$end_real = '';

						if ( ! empty( $instance['start_date'] ) ) {
							$start_dt = new \DateTimeImmutable( $instance['start_date'], new \DateTimeZone( 'UTC' ) );
							$start    = $start_dt->format( 'Y-m-d\TH:i:s\Z' );
						}

						if ( ! empty( $instance['end_date'] ) ) {
							$end_dt = new \DateTimeImmutable( $instance['end_date'], new \DateTimeZone( 'UTC' ) );
							$end_real = $end_dt->format( 'Y-m-d\TH:i:s\Z' );

							if ( ! empty( $instance['all_day'] ) ) {
								$end_dt = $end_dt->modify( '+1 day' )->setTime( 0, 0, 0 );
							}

							$end = $end_dt->format( 'Y-m-d\TH:i:s\Z' );
						}

						$record = array(
							'id'            => $event::get_id() . '-day' . $i,
							'event_id'      => $event::get_id(),
							'event_day'     => (int) $i,
							'title'         => $event::get_title(),
							'date_type'     => $event::get_date_type(),
							'standard_type' => $event::get_standard_type(),
							'start'         => $start,
							'end'           => $end,
							'end_real'      => $end_real,
							'end_all_day'   => ! empty( $instance['all_day'] ),
							'allDay'        => ! empty( $instance['all_day'] ),
							'url'           => self::append_event_day_arg( self::append_frontend_timezone_arg( $event::get_url() ), $i ),
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

						if ( ! empty( $args['exclude'] ) && in_array( $record['id'], (array) $args['exclude'], true ) ) {
							continue;
						}

						$record['timeline']  = $event::get_datetime() ? $event::get_datetime() : $event::get_timeline();
						$record['datetime']  = $record['timeline'];
						$results[]           = $record;
					}
				}
			}
		}

		// Apply optional start/end date filters (YYYY-MM-DD).
		if ( $start_date || $end_date ) {
			$results = array_filter(
				$results,
				static function ( $item ) use ( $start_date, $end_date ) {
					if ( empty( $item['start'] ) ) {
						return false;
					}

					$date_only = substr( $item['start'], 0, 10 );

					if ( $start_date && $date_only < $start_date ) {
						return false;
					}

					if ( $end_date && $date_only > $end_date ) {
						return false;
					}

					return true;
				}
			);
		}

		$results = array_values( $results );

		if ( 'upcoming' === $orderby ) {
			$now     = time();
			$results = array_filter(
				$results,
				static function ( $item ) use ( $now ) {
					$start_ts = ! empty( $item['start'] ) ? strtotime( (string) $item['start'] ) : 0;

					return $start_ts >= $now;
				}
			);
			$results = array_values( $results );
		}

		if ( 'past' === $orderby ) {
			$now     = time();
			$results = array_filter(
				$results,
				static function ( $item ) use ( $now ) {
					$start_ts = ! empty( $item['start'] ) ? strtotime( (string) $item['start'] ) : 0;

					return $start_ts > 0 && $start_ts < $now;
				}
			);
			$results = array_values( $results );
		}

		if ( 'upcoming' === $orderby || 'past' === $orderby ) {
			usort(
				$results,
				static function ( $a, $b ) use ( $order ) {
					$a_ts = ! empty( $a['start'] ) ? strtotime( $a['start'] ) : 0;
					$b_ts = ! empty( $b['start'] ) ? strtotime( $b['start'] ) : 0;
					if ( $a_ts === $b_ts ) {
						return 0;
					}
					if ( 'ASC' === $order ) {
						return ( $a_ts < $b_ts ) ? -1 : 1;
					}
					return ( $a_ts > $b_ts ) ? -1 : 1;
				}
			);
		}

		if ( $max_results > 0 ) {
			$results = array_slice( $results, 0, $max_results );
		}

		$total   = count( $results );

		if ( $per_page > -1 ) {
			$offset  = max( 0, ( $paged - 1 ) * $per_page );
			$results = array_slice( $results, $offset, $per_page );
		}

		if ( ! empty( $results ) ) {
			foreach ( $results as &$evt ) {
				$evt      = self::prepare_all_day_display_dates( $evt, wp_timezone() );
				$datetime = self::format_calendar_row_datetime( $evt );
				if ( '' !== $datetime ) {
					$evt['datetime'] = $datetime;
				}
				if ( 'calendar' === $display_context ) {
					$evt = self::prepare_fullcalendar_row( $evt );
				}
			}
			unset( $evt );
		}

		return array(
			'items' => $results,
			'total' => $total,
		);
	}

	/**
	 * Format a calendar response row using its concrete start/end metadata.
	 *
	 * @param array $row Calendar response row.
	 * @return string
	 */
	protected static function format_calendar_row_datetime( array $row ) {
		$event_id = isset( $row['event_id'] ) ? absint( $row['event_id'] ) : absint( $row['id'] ?? 0 );

		if ( $event_id > 0 ) {
			static $tbc_cache = array();

			if ( ! array_key_exists( $event_id, $tbc_cache ) ) {
				$tbc_cache[ $event_id ] = rest_sanitize_boolean( get_post_meta( $event_id, 'tbc', true ) );
			}

			if ( ! empty( $tbc_cache[ $event_id ] ) ) {
				return isset( $row['datetime'] ) ? (string) $row['datetime'] : '';
			}
		}

		if ( 'recurring' === ( $row['date_type'] ?? '' ) && empty( $row['next_occurrence_ts'] ) ) {
			return isset( $row['datetime'] ) ? (string) $row['datetime'] : '';
		}

		$timezone = wp_timezone();

		if (
			'standard' === ( $row['date_type'] ?? '' )
			&& 'selected' === ( $row['standard_type'] ?? '' )
			&& ! empty( $row['event_days'] )
			&& is_array( $row['event_days'] )
		) {
			$selected_datetime = self::format_selected_event_days_datetime(
				$row['event_days'],
				$timezone,
				self::calendar_row_all_day_timezone( $row, $timezone )
			);
			if ( '' !== $selected_datetime ) {
				return $selected_datetime;
			}
		}

		$start    = self::parse_calendar_row_datetime( $row['start'] ?? '', $timezone );

		if ( ! $start ) {
			return isset( $row['datetime'] ) ? (string) $row['datetime'] : '';
		}

		$end_real = self::parse_calendar_row_datetime( $row['end_real'] ?? '', $timezone );
		$end      = self::parse_calendar_row_datetime( $row['end'] ?? '', $timezone );
		$all_day  = self::calendar_row_flag( $row['allDay'] ?? ( $row['all_day'] ?? false ) );

		$date_format = eventkoi_resolved_date_format();
		$time_format = eventkoi_resolved_time_format();
		$separator   = ' – ';

		if ( $all_day ) {
			$all_day_timezone = self::calendar_row_all_day_timezone( $row, $timezone );
			$all_day_dates    = self::calendar_row_all_day_display_dates( $row, $all_day_timezone );

			if ( ! empty( $all_day_dates['start'] ) ) {
				$start       = $all_day_dates['start'];
				$display_end = $all_day_dates['end'] ?? null;
			} else {
				$display_end = self::calendar_row_display_end( $start, $end_real, $end );
			}

			if (
				! $display_end ||
				$start->format( 'Y-m-d' ) === $display_end->format( 'Y-m-d' ) ||
				eventkoi_is_single_all_day_span( $start->getTimestamp(), $display_end->getTimestamp() )
			) {
				return wp_date( $date_format, $start->getTimestamp(), $all_day_timezone );
			}

			return wp_date( $date_format, $start->getTimestamp(), $all_day_timezone )
				. $separator
				. wp_date( $date_format, $display_end->getTimestamp(), $all_day_timezone );
		}

		$end_all_day = self::calendar_row_flag( $row['end_all_day'] ?? ( $row['endAllDay'] ?? false ) );

		if ( $end_all_day ) {
			$display_end = self::calendar_row_display_end( $start, $end_real, $end );
			$start_str   = wp_date( $date_format . ', ' . $time_format, $start->getTimestamp(), $timezone );

			if ( ! $display_end || $start->format( 'Y-m-d' ) === $display_end->format( 'Y-m-d' ) ) {
				return $start_str;
			}

			return $start_str
				. $separator
				. wp_date( $date_format, $display_end->getTimestamp(), $timezone );
		}

		return eventkoi_format_datetime_range(
			$start->getTimestamp(),
			$end ? $end->getTimestamp() : null,
			false,
			array(
				'separator' => $separator,
				'timezone'  => $timezone,
			)
		);
	}

	/**
	 * Format selected standard-event dates independently for collapsed list rows.
	 *
	 * @param array         $event_days Selected event day rows.
	 * @param \DateTimeZone $timezone   Display timezone.
	 * @return string
	 */
	protected static function format_selected_event_days_datetime( array $event_days, \DateTimeZone $timezone, $all_day_timezone = null ) {
		$lines = array();

		foreach ( $event_days as $day ) {
			if ( ! is_array( $day ) || empty( $day['start_date'] ) ) {
				continue;
			}

			$start = self::parse_calendar_row_datetime( $day['start_date'], $timezone );
			if ( ! $start ) {
				continue;
			}

			$end = self::parse_calendar_row_datetime( $day['end_date'] ?? '', $timezone );
			if ( $end && $end->getTimestamp() < $start->getTimestamp() ) {
				$end = null;
			}

			$day_all_day = self::calendar_row_flag( $day['all_day'] ?? false );
			$day_timezone = $timezone;
			if ( $day_all_day ) {
				$day_timezone = self::calendar_row_all_day_timezone(
					$day,
					$all_day_timezone instanceof \DateTimeZone ? $all_day_timezone : $timezone
				);
			}

			$lines[] = eventkoi_format_datetime_range(
				$start->getTimestamp(),
				$end ? $end->getTimestamp() : null,
				$day_all_day,
				array(
					'separator' => ' – ',
					'timezone'  => $day_timezone,
				)
			);
		}

		$lines = array_values( array_filter( $lines ) );

		return implode( "\n", $lines );
	}

	/**
	 * Parse a calendar row date value as UTC and convert it to WP timezone.
	 *
	 * @param mixed         $value    Date value.
	 * @param \DateTimeZone $timezone Target timezone.
	 * @return \DateTimeImmutable|null
	 */
	protected static function parse_calendar_row_datetime( $value, \DateTimeZone $timezone ) {
		if ( empty( $value ) ) {
			return null;
		}

		try {
			return ( new \DateTimeImmutable( (string) $value, new \DateTimeZone( 'UTC' ) ) )->setTimezone( $timezone );
		} catch ( \Exception $e ) {
			return null;
		}
	}

	/**
	 * Resolve a boolean-ish calendar row flag.
	 *
	 * @param mixed $value Flag value.
	 * @return bool
	 */
	protected static function calendar_row_flag( $value ) {
		if ( is_bool( $value ) ) {
			return $value;
		}

		if ( is_numeric( $value ) ) {
			return 0 !== (int) $value;
		}

		if ( is_string( $value ) ) {
			return in_array( strtolower( trim( $value ) ), array( '1', 'true', 'yes', 'on' ), true );
		}

		return false;
	}

	/**
	 * Get the inclusive display end for calendar row timeline strings.
	 *
	 * @param \DateTimeImmutable      $start    Start datetime.
	 * @param \DateTimeImmutable|null $end_real Inclusive real end, if present.
	 * @param \DateTimeImmutable|null $end      Row display end.
	 * @return \DateTimeImmutable|null
	 */
	protected static function calendar_row_display_end( \DateTimeImmutable $start, $end_real, $end ) {
		if ( $end_real instanceof \DateTimeImmutable ) {
			if ( eventkoi_is_single_all_day_span( $start->getTimestamp(), $end_real->getTimestamp() ) ) {
				return $start;
			}

			return $end_real;
		}

		if ( ! $end instanceof \DateTimeImmutable ) {
			return null;
		}

		if ( $end->format( 'H:i:s' ) === '00:00:00' && $end->format( 'Y-m-d' ) !== $start->format( 'Y-m-d' ) ) {
			return $end->modify( '-1 day' );
		}

		return $end;
	}

	/**
	 * Add stable source-date fields for all-day calendar rows.
	 *
	 * @param array         $row               Calendar response row.
	 * @param \DateTimeZone $fallback_timezone Site timezone fallback.
	 * @return array
	 */
	protected static function prepare_all_day_display_dates( array $row, \DateTimeZone $fallback_timezone ) {
		$all_day = self::calendar_row_flag( $row['allDay'] ?? ( $row['all_day'] ?? false ) );

		if ( ! $all_day ) {
			return $row;
		}

		$timezone = self::calendar_row_all_day_timezone( $row, $fallback_timezone );
		$dates    = self::calendar_row_all_day_display_dates( $row, $timezone );

		if ( empty( $dates['start'] ) ) {
			return $row;
		}

		$display_end = $dates['end'] ?? $dates['start'];
		$row['all_day_timezone']           = $timezone->getName();
		$row['all_day_start_date']         = $dates['start']->format( 'Y-m-d' );
		$row['all_day_end_date']           = $display_end->format( 'Y-m-d' );
		$row['all_day_end_exclusive_date'] = $display_end->setTime( 0, 0, 0 )->modify( '+1 day' )->format( 'Y-m-d' );

		return $row;
	}

	/**
	 * Resolve the timezone used for all-day date boundaries.
	 *
	 * @param array         $row               Calendar response row.
	 * @param \DateTimeZone $fallback_timezone Fallback timezone.
	 * @return \DateTimeZone
	 */
	protected static function calendar_row_all_day_timezone( array $row, \DateTimeZone $fallback_timezone ) {
		$candidates = array();

		if ( ! empty( $row['all_day_timezone'] ) ) {
			$candidates[] = (string) $row['all_day_timezone'];
		}

		$event_id = isset( $row['event_id'] ) ? absint( $row['event_id'] ) : absint( $row['id'] ?? 0 );
		$stored   = '';
		if ( $event_id > 0 ) {
			static $event_timezone_cache = array();

			if ( ! array_key_exists( $event_id, $event_timezone_cache ) ) {
				$event_timezone_cache[ $event_id ] = (string) get_post_meta( $event_id, 'timezone', true );
			}

			$stored = $event_timezone_cache[ $event_id ];
		}

		$start_raw = $row['start_real'] ?? ( $row['start'] ?? ( $row['start_date'] ?? '' ) );
		$end_raw   = $row['end_real'] ?? ( $row['end'] ?? ( $row['end_date'] ?? '' ) );

		$inferred = '';
		if ( function_exists( 'eventkoi_infer_all_day_timezone_from_utc_range' ) ) {
			$inferred = eventkoi_infer_all_day_timezone_from_utc_range(
				$start_raw,
				$end_raw
			);
		}

		if ( function_exists( 'eventkoi_all_day_timezone_should_prefer_stored' ) && eventkoi_all_day_timezone_should_prefer_stored( $stored, $inferred, $start_raw, $end_raw ) ) {
			$candidates[] = $stored;
		}

		if ( '' !== $inferred ) {
			$candidates[] = $inferred;
		}

		if ( '' !== $stored ) {
			$candidates[] = $stored;
		}

		foreach ( $candidates as $candidate ) {
			try {
				return new \DateTimeZone( eventkoi_php_timezone( $candidate ) );
			} catch ( \Exception $e ) {
				continue;
			}
		}

		return $fallback_timezone;
	}

	/**
	 * Resolve inclusive all-day display date boundaries from a row.
	 *
	 * @param array         $row      Calendar response row.
	 * @param \DateTimeZone $timezone Source timezone.
	 * @return array{start:\DateTimeImmutable|null,end:\DateTimeImmutable|null}
	 */
	protected static function calendar_row_all_day_display_dates( array $row, \DateTimeZone $timezone ) {
		$start_raw = (string) ( $row['start_real'] ?? ( $row['start'] ?? '' ) );
		$end_raw   = (string) ( $row['end_real'] ?? ( $row['end'] ?? '' ) );

		if ( empty( $start_raw ) ) {
			return array(
				'start' => null,
				'end'   => null,
			);
		}

		$start = self::parse_fullcalendar_all_day_boundary( $start_raw, $timezone );
		if ( ! $start ) {
			return array(
				'start' => null,
				'end'   => null,
			);
		}

		$end         = self::parse_fullcalendar_all_day_boundary( $end_raw, $timezone );
		$display_end = self::calendar_row_display_end( $start, $end, $end );

		if ( ! $display_end || $display_end < $start ) {
			$display_end = $start;
		}

		return array(
			'start' => $start->setTime( 0, 0, 0 ),
			'end'   => $display_end->setTime( 0, 0, 0 ),
		);
	}

	/**
	 * Shape all-day rows for FullCalendar without changing saved UTC metadata.
	 *
	 * @param array $row Calendar response row.
	 * @return array
	 */
	protected static function prepare_fullcalendar_row( array $row ) {
		$all_day = self::calendar_row_flag( $row['allDay'] ?? ( $row['all_day'] ?? false ) );

		if ( ! $all_day ) {
			return $row;
		}

		$timezone  = self::calendar_row_all_day_timezone( $row, wp_timezone() );
		$start_raw = (string) ( $row['start_real'] ?? ( $row['start'] ?? '' ) );
		$end_raw   = (string) ( $row['end_real'] ?? ( $row['end'] ?? '' ) );

		if ( empty( $start_raw ) ) {
			return $row;
		}

		if ( empty( $row['start_real'] ) && ! empty( $row['start'] ) && false !== strpos( (string) $row['start'], 'T' ) ) {
			$row['start_real'] = (string) $row['start'];
		}

		if ( empty( $row['end_real'] ) && ! empty( $row['end'] ) && false !== strpos( (string) $row['end'], 'T' ) ) {
			$row['end_real'] = (string) $row['end'];
		}

		$start = ! empty( $row['all_day_start_date'] )
			? self::parse_fullcalendar_all_day_boundary( (string) $row['all_day_start_date'], $timezone )
			: self::parse_fullcalendar_all_day_boundary( $start_raw, $timezone );
		$end   = ! empty( $row['all_day_end_date'] )
			? self::parse_fullcalendar_all_day_boundary( (string) $row['all_day_end_date'], $timezone )
			: self::parse_fullcalendar_all_day_boundary( $end_raw, $timezone );

		if ( ! $start ) {
			return $row;
		}

		$exclusive_end = ! empty( $row['all_day_end_exclusive_date'] )
			? self::parse_fullcalendar_all_day_boundary( (string) $row['all_day_end_exclusive_date'], $timezone )
			: self::fullcalendar_all_day_exclusive_end( $start, $end );

		if ( ! $exclusive_end ) {
			$exclusive_end = self::fullcalendar_all_day_exclusive_end( $start, $end );
		}

		$row['start'] = $start->format( 'Y-m-d' );
		$row['end']   = $exclusive_end->format( 'Y-m-d' );

		return $row;
	}

	/**
	 * Parse an all-day boundary into the WordPress timezone.
	 *
	 * @param string        $value    Date value.
	 * @param \DateTimeZone $timezone Target timezone.
	 * @return \DateTimeImmutable|null
	 */
	protected static function parse_fullcalendar_all_day_boundary( $value, \DateTimeZone $timezone ) {
		if ( empty( $value ) ) {
			return null;
		}

		try {
			if ( preg_match( '/^\d{4}-\d{2}-\d{2}$/', (string) $value ) ) {
				return new \DateTimeImmutable( (string) $value . ' 00:00:00', $timezone );
			}

			return ( new \DateTimeImmutable( (string) $value, new \DateTimeZone( 'UTC' ) ) )->setTimezone( $timezone );
		} catch ( \Exception $e ) {
			return null;
		}
	}

	/**
	 * Convert stored all-day end metadata into FullCalendar's exclusive end date.
	 *
	 * @param \DateTimeImmutable      $start Start boundary in site timezone.
	 * @param \DateTimeImmutable|null $end   End boundary in site timezone.
	 * @return \DateTimeImmutable
	 */
	protected static function fullcalendar_all_day_exclusive_end( \DateTimeImmutable $start, $end ) {
		$start_day = $start->setTime( 0, 0, 0 );

		if ( ! $end instanceof \DateTimeImmutable || $end->getTimestamp() <= $start->getTimestamp() ) {
			return $start_day->modify( '+1 day' );
		}

		if ( eventkoi_is_single_all_day_span( $start->getTimestamp(), $end->getTimestamp() ) ) {
			return $start_day->modify( '+1 day' );
		}

		$end_day = $end->setTime( 0, 0, 0 );

		if ( $end_day <= $start_day ) {
			return $start_day->modify( '+1 day' );
		}

		if ( '00:00:00' === $end->format( 'H:i:s' ) ) {
			return $end_day;
		}

		return $end_day->modify( '+1 day' );
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

		$url = self::append_frontend_timezone_arg( $url );

		// Load instance override (if any).
		$overrides = $event::get_recurrence_overrides();
		$override  = $overrides[ $utc_timestamp ] ?? array();

		// Use override locations if available.
			$override_locations = isset( $override['locations'] ) && is_array( $override['locations'] ) ? $override['locations'] : $locations;
			$override_primary   = self::get_primary_location_row( $override_locations );
			if ( empty( $override_primary ) ) {
				$override_primary = $primary;
			}

				$override_primary_type = ! empty( $override_primary ) ? self::get_location_type( $override_primary ) : $primary_type;
			$override_virtual_url  = ! empty( $override_primary ) ? self::get_location_virtual_url( $override_primary ) : $virtual_url;
			$override_link_text    = $override_primary['link_text'] ?? $override_virtual_url;

			$override_location_line = self::format_location_line( $override_primary );
			if ( empty( $override_location_line ) ) {
				$override_location_line = $event::get_location_line();
			}

		$data = array(
			'id'            => $event::get_id() . '-' . $dt->format( 'YmdHis' ),
			'title'         => $event::get_title(),
			'date_type'     => $event::get_date_type(),
			'standard_type' => $event::get_standard_type(),
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

		/**
		 * Get the first usable location row from a locations array.
		 *
		 * @param array $locations Locations.
		 * @return array
		 */
		protected static function get_primary_location_row( $locations ) {
			if ( ! is_array( $locations ) ) {
				return array();
			}

			foreach ( $locations as $location ) {
				if ( ! is_array( $location ) || empty( $location ) ) {
					continue;
				}

				if ( '' !== self::format_location_line( $location ) ) {
					return $location;
				}
			}

			return array();
		}

		/**
		 * Format one location row for calendar payloads.
		 *
		 * @param array $location Location row.
		 * @return string
		 */
		protected static function format_location_line( $location ) {
			if ( ! is_array( $location ) || empty( $location ) ) {
				return '';
			}

			$virtual_url = self::get_location_virtual_url( $location );
			if ( '' !== $virtual_url ) {
				return $virtual_url;
			}

			$address = isset( $location['address'] ) && is_array( $location['address'] ) ? $location['address'] : array();
			$city_line = implode(
				', ',
				array_filter(
					array(
						self::first_location_text(
							self::location_text_value( $location, 'city' ),
							self::location_text_value( $address, 'addressLocality' )
						),
						self::first_location_text(
							self::location_text_value( $location, 'state' ),
							self::location_text_value( $address, 'addressRegion' )
						),
						self::first_location_text(
							self::location_text_value( $location, 'zip' ),
							self::location_text_value( $address, 'postalCode' )
						),
					)
				)
			);

			return implode(
				', ',
				array_unique(
					array_filter(
						array(
							self::location_text_value( $location, 'name' ),
							self::first_location_text(
								self::location_text_value( $location, 'address1' ),
								self::location_text_value( $address, 'streetAddress' )
							),
							self::location_text_value( $location, 'address2' ),
							self::location_text_value( $location, 'address3' ),
							$city_line,
							self::first_location_text(
								self::location_text_value( $location, 'country' ),
								self::location_text_value( $address, 'addressCountry' )
							),
						)
					)
				)
			);
		}

		/**
		 * Return the first non-empty location text.
		 *
		 * @param string ...$values Values.
		 * @return string
		 */
		protected static function first_location_text( ...$values ) {
			foreach ( $values as $value ) {
				$value = trim( (string) $value );
				if ( '' !== $value ) {
					return $value;
				}
			}

			return '';
		}

		/**
		 * Get sanitized text from a location row.
		 *
		 * @param array  $location Location row.
		 * @param string $key      Field key.
		 * @return string
		 */
	protected static function location_text_value( array $location, $key ) {
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
					$text = self::location_scalar_text( $value[ $nested_key ] );
					if ( '' !== $text ) {
						return $text;
					}
				}
			}

			$texts = array();
			foreach ( $value as $nested_value ) {
				$text = self::location_scalar_text( $nested_value );
				if ( '' !== $text ) {
					$texts[] = $text;
				}
			}

			return implode( ' ', array_unique( $texts ) );
		}

		return self::location_scalar_text( $value );
	}

	/**
	 * Normalize a scalar location value to text.
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	protected static function location_scalar_text( $value ) {
		if ( is_array( $value ) || is_object( $value ) ) {
			return '';
		}

		return sanitize_text_field( (string) $value );
	}

		/**
		 * Get the virtual URL from supported location shapes.
		 *
		 * @param array $location Location row.
		 * @return string
		 */
	protected static function get_location_virtual_url( array $location ) {
		return self::first_location_text(
			self::location_text_value( $location, 'virtual_url' ),
			self::location_text_value( $location, 'url' )
		);
	}

	/**
	 * Normalize EventKoi and raw Schema.org location types.
	 *
	 * @param array  $location Location row.
	 * @param string $default  Optional default normalized type.
	 * @return string
	 */
	protected static function get_location_type( array $location, $default = '' ) {
		$type = sanitize_key( self::location_text_value( $location, 'type' ) );
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

		$schema_type = strtolower( self::location_text_value( $location, '@type' ) );
		if ( str_contains( $schema_type, 'virtuallocation' ) ) {
			return 'online';
		}
		if ( str_contains( $schema_type, 'place' ) ) {
			return 'inperson';
		}

		return sanitize_key( $default );
	}
	}
