<?php
/**
 * Public developer API.
 *
 * A stable, documented front door to EventKoi's event query engine. Everything
 * EventKoi renders (blocks, shortcodes, the calendar archive, the page-builder
 * modules and the REST endpoint) is fed by the same engine these functions wrap,
 * so third-party code gets identical results without reaching into internals.
 *
 * @package EventKoi
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'eventkoi_query_events' ) ) {
	/**
	 * Query events, with recurring events optionally expanded to one row per
	 * occurrence.
	 *
	 * Unlike the internal engine, this never reads the current request: the
	 * date window comes from `start`/`end` only, so the same arguments return
	 * the same events on any URL.
	 *
	 * @param array $args {
	 *     Optional. Query arguments.
	 *
	 *     @type int[]|int    $calendars        Calendar term IDs to scope to. Empty means all calendars.
	 *     @type bool         $expand           Expand recurring events into one row per occurrence. Default false.
	 *     @type string       $start            Window start, any date string PHP understands (parsed as UTC).
	 *     @type string       $end              Window end, same format as `start`.
	 *     @type string       $orderby          upcoming, past, event_start, title, publish_date or date_modified.
	 *     @type string       $order            ASC or DESC.
	 *     @type int          $per_page         Results per page. -1 for all. Default -1.
	 *     @type int          $page             Page number when `per_page` is positive. Default 1.
	 *     @type int[]        $include          Restrict to these event post IDs.
	 *     @type int[]        $exclude          Skip these event post IDs.
	 *     @type string|array $post_status      Post status(es). Default publish.
	 *     @type bool         $include_completed Include events that already finished. Default false.
	 *     @type string       $search           Match event titles.
	 *     @type array        $tax_query        WP_Query tax_query, for filtering by your own taxonomies.
	 *     @type array        $meta_query       WP_Query meta_query, for filtering by your own custom fields.
	 *     @type bool         $with_total       Return array{items: array[], total: int} instead of a plain
	 *                                          list, for paginated UIs. Default false.
	 * }
	 * @return array[]|array A list of event rows, or array{items: array[], total: int} when `with_total` is set.
	 */
	function eventkoi_query_events( $args = array() ) {
		if ( ! is_array( $args ) ) {
			$args = array();
		}

		$calendars = array();
		if ( isset( $args['calendars'] ) ) {
			$calendars = array_values( array_filter( array_map( 'absint', (array) $args['calendars'] ) ) );
		}

		$expand = ! empty( $args['expand'] );

		// The engine keeps two separate date concepts: the window bounds how far
		// recurring events are expanded, while start_date/end_date is what
		// actually narrows the result set. A caller giving one date range means
		// both, so set both from the same input.
		$window_start = isset( $args['start'] ) ? trim( (string) $args['start'] ) : '';
		$window_end   = isset( $args['end'] ) ? trim( (string) $args['end'] ) : '';

		// An unparseable date is dropped rather than silently becoming 1970.
		$to_day = static function ( $value ) {
			if ( '' === $value ) {
				return '';
			}

			$ts = strtotime( $value );

			return false === $ts ? '' : gmdate( 'Y-m-d', $ts );
		};

		$start_day = $to_day( $window_start );
		$end_day   = $to_day( $window_end );

		if ( '' === $start_day ) {
			$window_start = '';
		}
		if ( '' === $end_day ) {
			$window_end = '';
		}

		$engine_args = array(
			'window_start'      => $window_start,
			'window_end'        => $window_end,
			'start_date'        => $start_day,
			'end_date'          => $end_day,
			'per_page'          => isset( $args['per_page'] ) ? (int) $args['per_page'] : -1,
			'page'              => isset( $args['page'] ) ? max( 1, (int) $args['page'] ) : 1,
			'orderby'           => isset( $args['orderby'] ) ? sanitize_key( (string) $args['orderby'] ) : 'upcoming',
			'order'             => isset( $args['order'] ) && 'ASC' === strtoupper( (string) $args['order'] ) ? 'ASC' : 'DESC',
			'include'           => isset( $args['include'] ) ? array_values( array_filter( array_map( 'absint', (array) $args['include'] ) ) ) : array(),
			'exclude'           => isset( $args['exclude'] ) ? array_values( array_filter( array_map( 'absint', (array) $args['exclude'] ) ) ) : array(),
			'include_completed' => ! empty( $args['include_completed'] ),
			'post_status'       => isset( $args['post_status'] ) ? $args['post_status'] : 'publish',
		);

		if ( isset( $args['search'] ) && '' !== trim( (string) $args['search'] ) ) {
			$engine_args['search'] = (string) $args['search'];
		}

		// Ordering by start date is meaningless unless the caller asked for a
		// default; 'upcoming' matches what our own lists show.
		if ( isset( $args['max_results'] ) ) {
			$engine_args['max_results'] = absint( $args['max_results'] );
		}

		if ( isset( $args['recurrence_limit'] ) ) {
			$engine_args['recurrence_limit'] = absint( $args['recurrence_limit'] );
		}

		if ( isset( $args['display_timezone'] ) ) {
			$engine_args['display_timezone'] = $args['display_timezone'];
			$engine_args['timezone_mode']    = 'display';
		}

		// Caller-supplied taxonomy/meta constraints ride in on the documented
		// query-args filter, added only for this call so nothing else on the
		// request inherits them.
		$tax_query  = ( isset( $args['tax_query'] ) && is_array( $args['tax_query'] ) ) ? $args['tax_query'] : array();
		$meta_query = ( isset( $args['meta_query'] ) && is_array( $args['meta_query'] ) ) ? $args['meta_query'] : array();

		$injector = null;
		if ( ! empty( $tax_query ) || ! empty( $meta_query ) ) {
			$injector = static function ( $query_args ) use ( $tax_query, $meta_query ) {
				if ( ! empty( $tax_query ) ) {
					$existing = isset( $query_args['tax_query'] ) && is_array( $query_args['tax_query'] ) ? $query_args['tax_query'] : array();

					// Preserve the calendar constraint the engine already set.
					$query_args['tax_query'] = $existing // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- Caller-supplied taxonomy filter.
						? array(
							'relation' => 'AND',
							$existing,
							$tax_query,
						)
						: $tax_query;
				}

				if ( ! empty( $meta_query ) ) {
					$existing = isset( $query_args['meta_query'] ) && is_array( $query_args['meta_query'] ) ? $query_args['meta_query'] : array();

					$query_args['meta_query'] = $existing // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- Caller-supplied meta filter.
						? array(
							'relation' => 'AND',
							$existing,
							$meta_query,
						)
						: $meta_query;
				}

				return $query_args;
			};

			add_filter( 'eventkoi_events_query_args', $injector, 5 );
		}

		// Shield the call from ?start/?end when the caller set no window. The
		// stashed values are never read or output, only put back byte for byte
		// in the finally below, so unslashing or sanitizing them here would
		// corrupt the request we are borrowing.
		$saved_get     = array();
		$shield_needed = ( '' === $window_start && '' === $window_end );
		if ( $shield_needed ) {
			foreach ( array( 'start', 'end' ) as $key ) {
				if ( isset( $_GET[ $key ] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
					// phpcs:ignore WordPress.Security.NonceVerification.Recommended, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash -- Stored verbatim and restored unchanged; sanitizing would mutate the caller's request.
					$saved_get[ $key ] = $_GET[ $key ];
					unset( $_GET[ $key ] );
				}
			}
		}

		try {
			$results = \EventKoi\Core\Calendar::get_events( $calendars, $expand, $engine_args );
		} finally {
			foreach ( $saved_get as $key => $value ) {
				$_GET[ $key ] = $value;
			}

			if ( $injector ) {
				remove_filter( 'eventkoi_events_query_args', $injector, 5 );
			}
		}

		// The engine answers with array{items, total}. Callers get a plain list
		// unless they asked for the count, so a result is always foreach-able
		// and indexable without unwrapping anything.
		$items = array();
		$total = 0;

		if ( is_array( $results ) ) {
			$items = isset( $results['items'] ) && is_array( $results['items'] ) ? array_values( $results['items'] ) : array();
			$total = isset( $results['total'] ) ? (int) $results['total'] : count( $items );
		}

		$payload = ! empty( $args['with_total'] )
			? array(
				'items' => $items,
				'total' => $total,
			)
			: $items;

		/**
		 * Filter the result of eventkoi_query_events().
		 *
		 * @param array[]|array $payload List of event rows, or array{items, total} when `with_total` is set.
		 * @param array         $args    Arguments the caller passed in.
		 */
		return apply_filters( 'eventkoi_query_events_results', $payload, $args );
	}
}

if ( ! function_exists( 'eventkoi_get_event_occurrences' ) ) {
	/**
	 * Get a single event's occurrences, one row per date.
	 *
	 * For a non-recurring event this returns its single date, so callers can
	 * treat every event the same way.
	 *
	 * @param int   $event_id Event post ID.
	 * @param array $args     Optional. Same arguments as eventkoi_query_events(),
	 *                        minus `calendars` and `include`. A `start`/`end`
	 *                        window is recommended for events that repeat
	 *                        indefinitely.
	 * @return array[] Occurrence rows, empty when the ID is not an event.
	 */
	function eventkoi_get_event_occurrences( $event_id, $args = array() ) {
		$event_id = absint( $event_id );

		if ( ! $event_id || 'eventkoi_event' !== get_post_type( $event_id ) ) {
			return array();
		}

		if ( ! is_array( $args ) ) {
			$args = array();
		}

		unset( $args['calendars'], $args['include'], $args['exclude'], $args['search'], $args['with_total'] );

		$args['include'] = array( $event_id );
		$args['expand']  = true;

		if ( ! isset( $args['orderby'] ) ) {
			$args['orderby'] = 'event_start';
			$args['order']   = isset( $args['order'] ) ? $args['order'] : 'ASC';
		}

		// An occurrence list that silently hid past dates would surprise callers
		// asking about one specific event.
		if ( ! isset( $args['include_completed'] ) ) {
			$args['include_completed'] = true;
		}

		return eventkoi_query_events( $args );
	}
}
