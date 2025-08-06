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
	 * Init.
	 *
	 * @param array $args Array of arguments to pass.
	 */
	public static function get_events( $args = array() ) {

		$calendar     = ! empty( $args['calendar'] ) ? explode( ',', $args['calendar'] ) : '';
		$event_status = ! empty( $args['event_status'] ) ? explode( ',', $args['event_status'] ) : array();
		$from         = ! empty( $args['from'] ) ? $args['from'] : '';
		$to           = ! empty( $args['to'] ) ? $args['to'] : '';
		$number       = ! empty( $args['number'] ) ? absint( $args['number'] ) : -1;

		$query_args = array(
			'post_type'      => 'event',
			'orderby'        => 'modified',
			'order'          => 'DESC',
			'posts_per_page' => $number,
			'post_status'    => array( 'publish', 'draft' ),
		);

		// Apply WP/core post status filter.
		if ( ! empty( $args['status'] ) ) {
			if ( in_array( $args['status'], array( 'draft', 'trash', 'future', 'publish' ), true ) ) {
				$query_args['post_status'] = array( $args['status'] );
			}

			if ( 'recurring' === $args['status'] ) {
				$query_args['meta_query'][] = array(
					'key'     => 'date_type',
					'value'   => 'recurring',
					'compare' => '=',
				);
			}
		}

		// Event status filter.
		if ( ! empty( $event_status ) || ! empty( $from ) || ! empty( $to ) ) {
			$completed = false;
			$live      = false;
			$tbc       = false;
			$upcoming  = false;
			$date      = false;

			if ( in_array( 'completed', $event_status, true ) ) {
				$completed = array(
					'relation' => 'OR',
					array(
						'key'     => 'end_timestamp',
						'value'   => time(),
						'compare' => '<',
						'type'    => 'numeric',
					),
				);
			}

			if ( in_array( 'live', $event_status, true ) ) {
				$live = array(
					'relation' => 'AND',
					array(
						'key'     => 'date_type',
						'value'   => 'standard',
						'compare' => '=',
					),
					array(
						'key'     => 'start_timestamp',
						'value'   => time(),
						'compare' => '<=',
						'type'    => 'numeric',
					),
					array(
						'key'     => 'end_timestamp',
						'value'   => time(),
						'compare' => '>=',
						'type'    => 'numeric',
					),
					array(
						'key'     => 'tbc',
						'value'   => true,
						'compare' => '!=',
					),
				);
			}

			if ( in_array( 'upcoming', $event_status, true ) ) {
				$query_args['post_status'] = array( 'publish' );
				$upcoming                  = array(
					'relation' => 'OR',
					array(
						'key'     => 'start_timestamp',
						'value'   => time(),
						'compare' => '>',
						'type'    => 'numeric',
					),
					array(
						'key'     => 'start_date',
						'compare' => 'NOT EXISTS',
					),
				);
			}

			if ( in_array( 'tbc', $event_status, true ) ) {
				$tbc = array(
					'relation' => 'AND',
					array(
						'key'     => 'tbc',
						'value'   => true,
						'compare' => 'EQUALS',
					),
				);
			}

			if ( $from || $to ) {
				if ( $from && ! $to ) {
					$date = array(
						'relation' => 'AND',
						array(
							'key'     => 'start_timestamp',
							'value'   => strtotime( $from ),
							'compare' => '>',
							'type'    => 'numeric',
						),
					);
				}
				if ( $from && $to ) {
					$date = array(
						'relation' => 'AND',
						array(
							'key'     => 'start_timestamp',
							'value'   => array( strtotime( $from ), strtotime( $to . '+24 hours - 1 minute' ) ),
							'compare' => 'between',
							'type'    => 'numeric',
						),
					);
				}
			}

			$query_args['meta_query'] = array( // phpcs:ignore
				'relation' => 'AND',
				array(
					'relation' => 'OR',
					$completed,
					$upcoming,
					$live,
					$tbc,
				),
				$date,
			);
		}

		if ( $calendar ) {
			$query_args['tax_query'] = array( // phpcs:ignore
				array(
					'taxonomy' => 'event_cal',
					'field'    => 'term_id',
					'terms'    => $calendar,
				),
			);
		}

		$query = new \WP_Query( $query_args );

		// Return counts only.
		if ( ! empty( $args['counts_only'] ) ) {
			return $query->found_posts;
		}

		// Return all events including their meta.
		$results = array();

		foreach ( $query->posts as $post ) {
			$event     = new Event( $post );
			$results[] = $event::get_meta();
		}

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
			'success' => _n( 'Event moved to trash.', 'Events moved to trash.', count( $ids ), 'eventkoi' ),
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
			'success' => _n( 'Event removed permanently.', 'Events removed permanently.', count( $ids ), 'eventkoi' ),
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
			'success' => _n( 'Event restored successfully.', 'Events restored successfully.', count( $ids ), 'eventkoi' ),
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
		$post_counts = wp_count_posts( 'event' );

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
					'event',
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
			'success' => _n( 'Event duplicated successfully.', 'Events duplicated successfully.', count( $results ), 'eventkoi' ),
		);

		return $response;
	}
}
