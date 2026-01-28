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
		$cache_key     = 'eventkoi_events_v3_' . $cache_version . '_' . md5( wp_json_encode( $args ) );

		// Attempt to load from cache first.
		$cached = get_transient( $cache_key );
		if ( false !== $cached ) {
			return $cached;
		}

		$calendar = ! empty( $args['calendar'] ) ? array_map( 'absint', explode( ',', $args['calendar'] ) ) : array();
		$statuses = ! empty( $args['event_status'] ) ? array_map( 'sanitize_text_field', explode( ',', $args['event_status'] ) ) : array();
		$from     = ! empty( $args['from'] ) ? sanitize_text_field( $args['from'] ) : '';
		$to       = ! empty( $args['to'] ) ? sanitize_text_field( $args['to'] ) : '';
		$number   = isset( $args['number'] ) ? absint( $args['number'] ) : -1;

		$query_args = array(
			'post_type'      => 'eventkoi_event',
			'orderby'        => 'modified',
			'order'          => 'DESC',
			'posts_per_page' => $number,
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
			$date_filter = array();

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

			// Apply date range filter.
			if ( $from || $to ) {
				$date_filter = array(
					'key'  => 'start_timestamp',
					'type' => 'NUMERIC',
				);

				if ( $from && $to ) {
					$date_filter['value']   = array( strtotime( $from ), strtotime( $to . ' +23 hours 59 minutes' ) );
					$date_filter['compare'] = 'BETWEEN';
				} elseif ( $from ) {
					$date_filter['value']   = strtotime( $from );
					$date_filter['compare'] = '>=';
				} elseif ( $to ) {
					$date_filter['value']   = strtotime( $to . ' +23 hours 59 minutes' );
					$date_filter['compare'] = '<=';
				}
			}

			$query_args['meta_query'] = array(
				'relation' => 'AND',
				array_merge( array( 'relation' => 'OR' ), $meta_status ),
				$date_filter,
			);
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

		// Return count if requested.
		if ( ! empty( $args['counts_only'] ) ) {
			set_transient( $cache_key, (int) $query->found_posts, HOUR_IN_SECONDS );
			return (int) $query->found_posts;
		}

		// Preload post meta to reduce individual lookups.
		update_postmeta_cache( wp_list_pluck( $query->posts, 'ID' ) );

		$event_ids   = wp_list_pluck( $query->posts, 'ID' );
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

		$results = array();

		foreach ( $query->posts as $post ) {
			$event     = new Event( $post );
			$meta      = $event::get_meta();
			$meta['rsvp_used'] = isset( $rsvp_counts[ $post->ID ] ) ? $rsvp_counts[ $post->ID ] : 0;
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
