<?php
/**
 * Instance helpers.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Helpers
 */

use EKLIB\StellarWP\DB\DB;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Get override data for a specific instance timestamp.
 *
 * @param int $event_id Event post ID.
 * @param int $timestamp Instance start timestamp.
 * @return array|null Array of overrides or null.
 */
function eventkoi_get_instance_override( $event_id, $timestamp ) {
	$row = DB::table( 'ek_recurrence_overrides' )
		->where( 'event_id', $event_id )
		->where( 'timestamp', $timestamp )
		->get();

	return $row ? maybe_unserialize( $row->data ) : null;
}

/**
 * Merge event data with instance override.
 *
 * @param array $event_data Raw event array.
 * @param array $override   Override array.
 * @return array Merged data.
 */
function eventkoi_merge_instance_data( $event_data, $override ) {
	foreach ( $override as $key => $value ) {
		if ( null !== $value ) {
			$event_data[ $key ] = $value;
		}
	}

	return $event_data;
}
