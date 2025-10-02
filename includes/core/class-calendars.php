<?php
/**
 * Calendars.
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
 * Calendars.
 */
class Calendars {

	/**
	 * Get calendars.
	 *
	 * @param bool $include_all Whether to include an "all" option in front of results.
	 */
	public static function get_calendars( $include_all = false ) {

		$terms = get_terms(
			array(
				'taxonomy'   => 'event_cal',
				'hide_empty' => false,
			)
		);

		// Get array of calendars as terms.
		$results = array();

		if ( $include_all ) {
			$results[] = array(
				'id'   => 0,
				'name' => __( 'All', 'eventkoi-lite' ),
			);
		}

		foreach ( $terms as $term ) {
			$results[] = array(
				'id'        => $term->term_id,
				'slug'      => $term->slug,
				'name'      => $term->name,
				'count'     => $term->count,
				'url'       => get_term_link( $term->slug, 'event_cal' ),
				'shortcode' => '[eventkoi_calendar id=' . $term->term_id . ']',
			);
		}

		return $results;
	}

	/**
	 * Remove calendars permanently.
	 *
	 * @param array $ids An array of events IDs to delete.
	 */
	public static function delete_calendars( $ids = array() ) {

		$eventkoi_default_calendar = (int) get_option( 'eventkoi_default_event_cal', 0 );

		foreach ( $ids as $id ) {
			// Do not delete default calendar.
			if ( $eventkoi_default_calendar === $id ) {
				continue;
			}

			wp_delete_term( $id, 'event_cal' );
		}

		$result = array(
			'ids'     => $ids,
			'success' => _n( 'Calendar removed permanently.', 'Calendars removed permanently.', count( $ids ), 'eventkoi-lite' ),
		);

		return $result;
	}
}
