<?php
/**
 * Events.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

use EventKoi\Core\Event;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Events.
 */
class Events {

	/**
	 * Normalize an admin date filter value to a date-only key.
	 *
	 * @param string $date Date filter value.
	 * @return string
	 */
	private static function normalize_admin_filter_date( $date ) {
		$date = trim( (string) $date );
		if ( '' === $date ) {
			return '';
		}

		if ( preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date ) ) {
			return $date;
		}

		$timestamp = strtotime( $date );
		return $timestamp ? gmdate( 'Y-m-d', (int) $timestamp ) : '';
	}

	/**
	 * Resolve the source timezone for an all-day filter row.
	 *
	 * @param array $day  Event day row.
	 * @param array $meta Event meta.
	 * @return \DateTimeZone
	 */
	private static function resolve_all_day_filter_timezone( array $day, array $meta ) {
		$start_raw = $day['start_date'] ?? ( $meta['start_date'] ?? '' );
		$end_raw   = $day['end_date'] ?? ( $meta['end_date'] ?? '' );
		$stored    = (string) ( $meta['timezone'] ?? '' );
		$inferred  = function_exists( 'eventkoi_infer_all_day_timezone_from_utc_range' )
			? eventkoi_infer_all_day_timezone_from_utc_range( $start_raw, $end_raw )
			: '';

		$candidates = array(
			$day['all_day_timezone'] ?? '',
			$meta['all_day_timezone'] ?? '',
			function_exists( 'eventkoi_all_day_timezone_should_prefer_stored' ) && eventkoi_all_day_timezone_should_prefer_stored( $stored, $inferred, $start_raw, $end_raw ) ? $stored : '',
			$inferred,
			$meta['timezone'] ?? '',
			function_exists( 'eventkoi_timezone' ) ? eventkoi_timezone() : '',
			wp_timezone_string(),
			'UTC',
		);

		foreach ( $candidates as $candidate ) {
			$candidate = trim( (string) $candidate );
			if ( '' === $candidate ) {
				continue;
			}

			try {
				return new \DateTimeZone( function_exists( 'eventkoi_php_timezone' ) ? eventkoi_php_timezone( $candidate ) : $candidate );
			} catch ( \Exception $e ) {
				continue;
			}
		}

		return wp_timezone();
	}

	/**
	 * Resolve inclusive display end date for an all-day range.
	 *
	 * @param \DateTimeImmutable      $start Start date in source timezone.
	 * @param \DateTimeImmutable|null $end   End date in source timezone.
	 * @return \DateTimeImmutable
	 */
	private static function get_all_day_filter_display_end( \DateTimeImmutable $start, $end ) {
		if ( ! $end instanceof \DateTimeImmutable ) {
			return $start;
		}

		if ( function_exists( 'eventkoi_is_single_all_day_span' ) && eventkoi_is_single_all_day_span( $start->getTimestamp(), $end->getTimestamp() ) ) {
			return $start;
		}

		if ( '00:00:00' === $end->format( 'H:i:s' ) && $end->format( 'Y-m-d' ) !== $start->format( 'Y-m-d' ) ) {
			return $end->modify( '-1 day' );
		}

		return $end;
	}

	/**
	 * Get all-day source calendar ranges from event meta.
	 *
	 * @param array $meta Event meta.
	 * @return array<int,array{start:string,end:string}>
	 */
	private static function get_all_day_filter_ranges( array $meta ) {
		$ranges = array();
		$days   = ! empty( $meta['event_days'] ) && is_array( $meta['event_days'] ) ? $meta['event_days'] : array();

		if ( ! empty( $meta['all_day'] ) ) {
			$days[] = array(
				'all_day'                    => true,
				'start_date'                 => $meta['start_date'] ?? ( $meta['start_date_iso'] ?? ( isset( $meta['start_timestamp'] ) ? gmdate( 'c', (int) $meta['start_timestamp'] ) : '' ) ),
				'end_date'                   => $meta['end_date'] ?? ( $meta['end_date_iso'] ?? ( isset( $meta['end_timestamp'] ) ? gmdate( 'c', (int) $meta['end_timestamp'] ) : '' ) ),
				'all_day_timezone'           => $meta['all_day_timezone'] ?? '',
				'all_day_start_date'         => $meta['all_day_start_date'] ?? '',
				'all_day_end_date'           => $meta['all_day_end_date'] ?? '',
				'all_day_end_exclusive_date' => $meta['all_day_end_exclusive_date'] ?? '',
			);
		}

		foreach ( $days as $day ) {
			if ( ! is_array( $day ) || empty( $day['all_day'] ) ) {
				continue;
			}

			$start_date = ! empty( $day['all_day_start_date'] ) ? self::normalize_admin_filter_date( $day['all_day_start_date'] ) : '';
			$end_date   = ! empty( $day['all_day_end_date'] ) ? self::normalize_admin_filter_date( $day['all_day_end_date'] ) : '';

			if ( '' === $start_date && ! empty( $day['start_date'] ) ) {
				$start_ts = strtotime( (string) $day['start_date'] );
				if ( $start_ts ) {
					$timezone = self::resolve_all_day_filter_timezone( $day, $meta );
					$start    = ( new \DateTimeImmutable( '@' . (int) $start_ts ) )->setTimezone( $timezone );
					$end      = null;

					if ( ! empty( $day['end_date'] ) ) {
						$end_ts = strtotime( (string) $day['end_date'] );
						if ( $end_ts && $end_ts >= $start_ts ) {
							$end = ( new \DateTimeImmutable( '@' . (int) $end_ts ) )->setTimezone( $timezone );
						}
					}

					$display_end = self::get_all_day_filter_display_end( $start, $end );
					$start_date  = $start->setTime( 0, 0, 0 )->format( 'Y-m-d' );
					$end_date    = $display_end->setTime( 0, 0, 0 )->format( 'Y-m-d' );
				}
			}

			if ( '' === $start_date ) {
				continue;
			}

			if ( '' === $end_date ) {
				$end_date = $start_date;
			}

			if ( $end_date < $start_date ) {
				$end_date = $start_date;
			}

			$ranges[] = array(
				'start' => $start_date,
				'end'   => $end_date,
			);
		}

		return $ranges;
	}

	/**
	 * Whether event meta matches the admin date range filter.
	 *
	 * Timed events retain the existing timestamp comparison. All-day events
	 * compare source calendar dates so UTC storage boundaries do not shift them
	 * out of the selected admin day.
	 *
	 * @param array  $meta      Event meta.
	 * @param int    $from_ts   Timestamp lower bound.
	 * @param int    $to_ts     Timestamp upper bound.
	 * @param string $from_date Date-only lower bound.
	 * @param string $to_date   Date-only upper bound.
	 * @return bool
	 */
	private static function event_matches_admin_date_filter( array $meta, $from_ts, $to_ts, $from_date, $to_date ) {
		$all_day_ranges = self::get_all_day_filter_ranges( $meta );

		if ( ! empty( $all_day_ranges ) && ( '' !== $from_date || '' !== $to_date ) ) {
			foreach ( $all_day_ranges as $range ) {
				if ( '' !== $from_date && $range['end'] < $from_date ) {
					continue;
				}

				if ( '' !== $to_date && $range['start'] > $to_date ) {
					continue;
				}

				return true;
			}

			return false;
		}

		$start_value = $meta['start_timestamp'] ?? ( $meta['start_date_iso'] ?? ( $meta['start_date'] ?? '' ) );
		$start_ts    = is_numeric( $start_value ) ? (int) $start_value : strtotime( (string) $start_value );
		$start_ts    = $start_ts ? (int) $start_ts : 0;

		if ( $start_ts <= 0 ) {
			return false;
		}

		if ( $from_ts && $start_ts < (int) $from_ts ) {
			return false;
		}

		if ( $to_ts && $start_ts > (int) $to_ts ) {
			return false;
		}

		return true;
	}

	/**
	 * Retrieve events based on parameters.
	 *
	 * Builds a WP_Query with meta and taxonomy filters, optimized for
	 * performance and readability.
	 *
	 * @param array $args Optional. Arguments for filtering events.
	 * @return array|int Array of event data or count if 'counts_only' is set.
	 */
	public static function get_events( $args = array() ) {
		$now = time();

		// Create a unique cache key for this filter combination.
		// Bumpable cache key to refresh metrics (RSVP usage, etc.).
		$cache_version = absint( get_option( 'eventkoi_events_cache_version', 1 ) );
		$cache_key     = 'eventkoi_events_v4_' . $cache_version . '_' . md5( wp_json_encode( $args ) );

		// Attempt to load from cache first.
		$cached = get_transient( $cache_key );
		if ( false !== $cached ) {
			return $cached;
		}

		$calendar                  = ! empty( $args['calendar'] ) ? array_map( 'absint', explode( ',', $args['calendar'] ) ) : array();
		$statuses                  = ! empty( $args['event_status'] ) ? array_map( 'sanitize_text_field', explode( ',', $args['event_status'] ) ) : array();
		$from                      = ! empty( $args['from'] ) ? sanitize_text_field( $args['from'] ) : '';
		$to                        = ! empty( $args['to'] ) ? sanitize_text_field( $args['to'] ) : '';
		$from_date                 = self::normalize_admin_filter_date( $from );
		$to_date                   = self::normalize_admin_filter_date( $to );
		$from_ts                   = $from ? strtotime( $from ) : 0;
		$to_ts                     = $to ? strtotime( $to . ' +23 hours 59 minutes' ) : 0;
		$requires_post_date_filter = ( '' !== $from || '' !== $to );
		$number                    = isset( $args['number'] ) ? absint( $args['number'] ) : -1;

		$query_args = array(
			'post_type'      => 'eventkoi_event',
			'orderby'        => 'modified',
			'order'          => 'DESC',
			'posts_per_page' => $requires_post_date_filter ? -1 : $number,
			'post_status'    => array( 'publish', 'draft' ),
		);

		// Filter by core post status.
		if ( ! empty( $args['status'] ) ) {
			$status = sanitize_text_field( $args['status'] );

			if ( in_array( $status, array( 'draft', 'trash', 'future', 'publish' ), true ) ) {
				$query_args['post_status'] = array( $status );
			}

			if ( 'recurring' === $status ) {
				$query_args['meta_query'][] = array(
					'key'     => 'date_type',
					'value'   => 'recurring',
					'compare' => '=',
				);
			}
		}

		// Build meta queries for event status.
		if ( ! empty( $statuses ) || $from || $to ) {
			$meta_status = array();

			foreach ( $statuses as $status_item ) {
				switch ( $status_item ) {
					case 'completed':
						$meta_status[] = array(
							'key'     => 'end_timestamp',
							'value'   => $now,
							'compare' => '<',
							'type'    => 'NUMERIC',
						);
						break;

					case 'live':
						$meta_status[] = array(
							'relation' => 'AND',
							array(
								'key'     => 'date_type',
								'value'   => 'standard',
								'compare' => '=',
							),
							array(
								'key'     => 'start_timestamp',
								'value'   => $now,
								'compare' => '<=',
								'type'    => 'NUMERIC',
							),
							array(
								'key'     => 'end_timestamp',
								'value'   => $now,
								'compare' => '>=',
								'type'    => 'NUMERIC',
							),
							array(
								'key'     => 'tbc',
								'value'   => true,
								'compare' => '!=',
							),
						);
						break;

					case 'upcoming':
						$query_args['post_status'] = array( 'publish' );
						$meta_status[]             = array(
							'relation' => 'OR',
							array(
								'key'     => 'start_timestamp',
								'value'   => $now,
								'compare' => '>',
								'type'    => 'NUMERIC',
							),
							array(
								'key'     => 'start_date',
								'compare' => 'NOT EXISTS',
							),
						);
						break;

					case 'tbc':
						$meta_status[] = array(
							array(
								'key'     => 'tbc',
								'value'   => true,
								'compare' => 'EQUALS',
							),
						);
						break;
				}
			}

			$status_meta_query = array();

			if ( ! empty( $meta_status ) ) {
				$status_meta_query[] = array_merge( array( 'relation' => 'OR' ), $meta_status );
			}

			if ( ! empty( $status_meta_query ) ) {
				if ( ! empty( $query_args['meta_query'] ) && is_array( $query_args['meta_query'] ) ) {
					$query_args['meta_query'] = array(
						'relation' => 'AND',
						$query_args['meta_query'],
						$status_meta_query,
					);
				} else {
					$query_args['meta_query'] = $status_meta_query;
				}
			}
		}

		// Filter by calendar taxonomy.
		if ( ! empty( $calendar ) ) {
			$query_args['tax_query'] = array(
				array(
					'taxonomy' => 'event_cal',
					'field'    => 'term_id',
					'terms'    => $calendar,
				),
			);
		}

		// Execute query.
		$query = new \WP_Query( $query_args );

		// Preload post meta to reduce individual lookups.
		update_postmeta_cache( wp_list_pluck( $query->posts, 'ID' ) );

		$posts       = $query->posts;
		$metas_by_id = array();

		if ( $requires_post_date_filter ) {
			$filtered_posts = array();

			foreach ( $posts as $post ) {
				$event = new Event( $post );
				$meta  = $event::get_meta();

				if ( ! self::event_matches_admin_date_filter( $meta, (int) $from_ts, (int) $to_ts, $from_date, $to_date ) ) {
					continue;
				}

				$filtered_posts[]               = $post;
				$metas_by_id[ (int) $post->ID ] = $meta;
			}

			$posts = $filtered_posts;
		}

		// Return count if requested.
		if ( ! empty( $args['counts_only'] ) ) {
			$count = $requires_post_date_filter ? count( $posts ) : (int) $query->found_posts;
			set_transient( $cache_key, $count, HOUR_IN_SECONDS );
			return $count;
		}

		if ( $requires_post_date_filter && $number > 0 ) {
			$posts = array_slice( $posts, 0, $number );
		}

		$event_ids   = wp_list_pluck( $posts, 'ID' );
		$rsvp_counts = array();

		if ( ! empty( $event_ids ) ) {
			global $wpdb;
			$table_name   = $wpdb->prefix . 'eventkoi_rsvps';
			$placeholders = implode( ',', array_fill( 0, count( $event_ids ), '%d' ) );
			$sql          = "SELECT event_id, SUM(CASE WHEN status = 'going' THEN 1 + COALESCE(guests, 0) ELSE 0 END) AS used
				FROM {$table_name}
				WHERE event_id IN ({$placeholders})
				GROUP BY event_id";
			$prepared     = call_user_func_array( array( $wpdb, 'prepare' ), array_merge( array( $sql ), $event_ids ) );
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Bulk lookup for event list metrics.
			$rows         = $wpdb->get_results( $prepared );

			if ( ! empty( $rows ) ) {
				foreach ( $rows as $row ) {
					$rsvp_counts[ absint( $row->event_id ) ] = absint( $row->used );
				}
			}
		}

		$tickets_total     = array();
		$tickets_sold      = array();
		$tickets_unlimited = array();

		if ( ! empty( $event_ids ) ) {
			global $wpdb;
			$tickets_table = $wpdb->prefix . 'eventkoi_tickets';
			$placeholders  = implode( ',', array_fill( 0, count( $event_ids ), '%d' ) );

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $tickets_table ) ) === $tickets_table ) {
				$tickets_sql = "SELECT event_id, quantity_available
					FROM {$tickets_table}
					WHERE event_id IN ({$placeholders}) AND status = 'active'";
				// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- Dynamic placeholder list is flattened before prepare().
				$prepared    = call_user_func_array( array( $wpdb, 'prepare' ), array_merge( array( $tickets_sql ), $event_ids ) );
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.NotPrepared
				$ticket_rows = $wpdb->get_results( $prepared );

				if ( ! empty( $ticket_rows ) ) {
					foreach ( $ticket_rows as $row ) {
						$eid = absint( $row->event_id );
						if ( is_null( $row->quantity_available ) ) {
							$tickets_unlimited[ $eid ] = true;
							continue;
						}
						if ( ! isset( $tickets_total[ $eid ] ) ) {
							$tickets_total[ $eid ] = 0;
						}
						$tickets_total[ $eid ] += absint( $row->quantity_available );
					}
				}
			}

			// Sold counts come from the orders table (WC-only in Lite) so the
			// events list stays in lock-step with Sales History.
			$orders_table = $wpdb->prefix . 'eventkoi_ticket_orders';
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $orders_table ) ) === $orders_table ) {
				$currency = function_exists( 'get_woocommerce_currency' )
					? strtoupper( get_woocommerce_currency() )
					: '';
				$currency_clause = '' !== $currency
					? $wpdb->prepare( ' AND UPPER(currency) = %s', $currency )
					: '';
				$orders_sql = "SELECT event_id, SUM(quantity) AS sold
					FROM {$orders_table}
					WHERE event_id IN ({$placeholders})
					  AND payment_status IN ('complete','completed','succeeded','partially_refunded')
					  AND order_id LIKE 'wc\\_%'{$currency_clause}
					GROUP BY event_id";
				// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- Dynamic placeholder list is flattened before prepare().
				$orders_prepared = call_user_func_array( array( $wpdb, 'prepare' ), array_merge( array( $orders_sql ), $event_ids ) );
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.NotPrepared
				$orders_rows = $wpdb->get_results( $orders_prepared );
				if ( ! empty( $orders_rows ) ) {
					foreach ( $orders_rows as $row ) {
						$tickets_sold[ absint( $row->event_id ) ] = absint( $row->sold );
					}
				}
			}
		}

		$results = array();

		foreach ( $posts as $post ) {
			if ( isset( $metas_by_id[ (int) $post->ID ] ) ) {
				$meta = $metas_by_id[ (int) $post->ID ];
			} else {
				$event = new Event( $post );
				$meta  = $event::get_meta();
			}

			$meta['rsvp_used']              = isset( $rsvp_counts[ $post->ID ] ) ? $rsvp_counts[ $post->ID ] : 0;
			$meta['tickets_total']          = isset( $tickets_total[ $post->ID ] ) ? $tickets_total[ $post->ID ] : 0;
			$meta['tickets_sold']           = isset( $tickets_sold[ $post->ID ] ) ? $tickets_sold[ $post->ID ] : 0;
			$meta['tickets_unlimited']      = ! empty( $tickets_unlimited[ $post->ID ] );
			$results[] = $meta;
		}

		// Cache the final results.
		set_transient( $cache_key, $results, HOUR_IN_SECONDS );

		return $results;
	}

	/**
	 * Delete events.
	 *
	 * @param array $ids An array of events IDs to delete.
	 */
	public static function delete_events( $ids = array() ) {

		foreach ( $ids as $id ) {
			wp_trash_post( $id );
		}

		$result = array(
			'ids'     => $ids,
			'success' => _n( 'Event moved to trash.', 'Events moved to trash.', count( $ids ), 'eventkoi-lite' ),
		);

		return $result;
	}

	/**
	 * Remove events permanently.
	 *
	 * @param array $ids An array of events IDs to delete.
	 */
	public static function remove_events( $ids = array() ) {

		foreach ( $ids as $id ) {
			wp_delete_post( $id, true );
		}

		$result = array(
			'ids'     => $ids,
			'success' => _n( 'Event removed permanently.', 'Events removed permanently.', count( $ids ), 'eventkoi-lite' ),
		);

		return $result;
	}

	/**
	 * Permanently delete every trashed eventkoi_event the current user can delete.
	 *
	 * Mirrors core's "Empty Trash" behaviour. Skips IDs the user does not have
	 * permission to delete so partial empties stay safe.
	 *
	 * @return array {ids: int[], removed: int, skipped: int, success: string}
	 */
	public static function empty_trash() {
		$trashed = get_posts(
			array(
				'post_type'      => 'eventkoi_event',
				'post_status'    => 'trash',
				'posts_per_page' => -1,
				'fields'         => 'ids',
				'no_found_rows'  => true,
				'cache_results'  => false,
			)
		);

		$removed = array();
		$skipped = 0;

		foreach ( $trashed as $id ) {
			if ( ! current_user_can( 'delete_post', $id ) ) {
				++$skipped;
				continue;
			}
			if ( wp_delete_post( (int) $id, true ) ) {
				$removed[] = (int) $id;
			} else {
				++$skipped;
			}
		}

		return array(
			'ids'     => $removed,
			'removed' => count( $removed ),
			'skipped' => $skipped,
			'success' => sprintf(
				/* translators: %d: number of events permanently removed. */
				_n( '%d event permanently removed.', '%d events permanently removed.', count( $removed ), 'eventkoi-lite' ),
				count( $removed )
			),
		);
	}

	/**
	 * Restore events.
	 *
	 * @param array $ids An array of events IDs to restore.
	 */
	public static function restore_events( $ids = array() ) {

		foreach ( $ids as $id ) {
			delete_post_meta( $id, 'start_date' );
			delete_post_meta( $id, 'end_date' );

			wp_untrash_post( $id );
		}

		$result = array(
			'ids'     => $ids,
			'success' => _n( 'Event restored successfully.', 'Events restored successfully.', count( $ids ), 'eventkoi-lite' ),
		);

		return $result;
	}

	/**
	 * Get events counts.
	 *
	 * @return array Event status counts.
	 */
	public static function get_counts() {
		global $wpdb;

		// Query counts using plugin logic.
		$upcoming = self::get_events(
			array(
				'status'      => 'upcoming',
				'counts_only' => true,
			)
		);

		$live = self::get_events(
			array(
				'status'      => 'live',
				'counts_only' => true,
			)
		);

		$completed = self::get_events(
			array(
				'status'      => 'completed',
				'counts_only' => true,
			)
		);

		// Get basic WordPress post counts.
		$post_counts = wp_count_posts( 'eventkoi_event' );

		// Efficient recurring count with caching.
		$cache_key   = 'eventkoi_recurring_event_count';
		$cache_group = 'eventkoi_counts';

		$recurring_count = wp_cache_get( $cache_key, $cache_group );

		if ( false === $recurring_count ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$recurring_count = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$wpdb->posts} p
				 INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
				 WHERE p.post_type = %s
				   AND p.post_status IN ('publish', 'draft', 'future')
				   AND pm.meta_key = %s
				   AND pm.meta_value = %s",
					'eventkoi_event',
					'date_type',
					'recurring'
				)
			);

			wp_cache_set( $cache_key, $recurring_count, $cache_group, 60 ); // Cache for 60 seconds.
		}

		$counts = array(
			'upcoming'  => absint( $upcoming ),
			'live'      => absint( $live ),
			'completed' => absint( $completed ),
			'draft'     => absint( $post_counts->draft ?? 0 ),
			'trash'     => absint( $post_counts->trash ?? 0 ),
			'publish'   => absint( $post_counts->publish ?? 0 ),
			'future'    => absint( $post_counts->future ?? 0 ),
			'recurring' => absint( $recurring_count ),
		);

		/**
		 * Filters the event status counts.
		 *
		 * @param array $counts Event count data.
		 */
		return apply_filters( 'eventkoi_get_event_counts', $counts );
	}

	/**
	 * Duplicate events.
	 *
	 * @param array $ids An array of event IDs to duplicate.
	 * @return array Duplication results.
	 */
	public static function duplicate_events( $ids = array() ) {
		$results = array();

		foreach ( $ids as $id ) {
			$event  = new Event( $id );
			$result = $event::duplicate_event();

			if ( isset( $result['id'] ) ) {
				$results[] = $result['id'];
			}
		}

		$response = array(
			'ids'     => $results,
			'success' => _n( 'Event duplicated successfully.', 'Events duplicated successfully.', count( $results ), 'eventkoi-lite' ),
		);

		return $response;
	}
}
