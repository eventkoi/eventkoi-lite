<?php
/**
 * REST API - Single Event Operations.
 *
 * @package    EventKoi
 * @subpackage EventKoi\API
 */

namespace EventKoi\API;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use EventKoi\Core\Event as SingleEvent;
use EventKoi\API\REST;
use EKLIB\StellarWP\DB\DB;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Class Event
 *
 * Handles single event-related REST API endpoints.
 */
class Event {

	/**
	 * Register REST endpoints for single event operations.
	 *
	 * @return void
	 */
	public static function init() {
		register_rest_route(
			EVENTKOI_API,
			'/event',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'get_result' ),
				'permission_callback' => array( REST::class, 'public_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/update_event',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'update_event' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/restore_event',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'restore_event' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/duplicate_event',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'duplicate_event' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/delete_event',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'delete_event' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/instance_data',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'get_instance_data' ),
				'permission_callback' => array( REST::class, 'public_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/edit_instance',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'edit_instance' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/reset_instance',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'reset_instance' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);
	}

	/**
	 * Get a single event by ID.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response|WP_Error The event data or error.
	 */
	public static function get_result( WP_REST_Request $request ) {
		$event_id = absint( $request->get_param( 'id' ) );

		if ( empty( $event_id ) ) {
			return new WP_Error( 'eventkoi_invalid_id', __( 'Invalid event ID.', 'eventkoi' ), array( 'status' => 400 ) );
		}

		$event    = new SingleEvent( $event_id );
		$response = $event::get_meta();

		return rest_ensure_response( $response );
	}

	/**
	 * Update a single event.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response|WP_Error The result of the update.
	 */
	public static function update_event( WP_REST_Request $request ) {
		$data = json_decode( $request->get_body(), true );

		if ( empty( $data['event'] ) || ! is_array( $data['event'] ) ) {
			return new WP_Error( 'eventkoi_invalid_event', __( 'Invalid event data.', 'eventkoi' ), array( 'status' => 400 ) );
		}

		$event  = $data['event'];
		$status = isset( $data['status'] )
		? sanitize_text_field( $data['status'] )
		: ( isset( $event['wp_status'] ) ? sanitize_text_field( $event['wp_status'] ) : 'draft' );

		$event_id = absint( $event['id'] ?? 0 );

		// If no ID → create new event (auto-draft).
		if ( ! $event_id ) {
			$postarr = array(
				'post_title'  => ! empty( $event['title'] ) ? sanitize_text_field( $event['title'] ) : 'Untitled event',
				'post_status' => ! empty( $status ) ? $status : 'draft',
				'post_type'   => 'event',
			);

			$new_id = wp_insert_post( $postarr, true );

			if ( is_wp_error( $new_id ) ) {
				return $new_id;
			}

			$query    = new SingleEvent( $new_id );
			$response = $query::get_meta();

			return rest_ensure_response( $response );
		}

		$query    = new SingleEvent( $event_id );
		$response = $query::update( $event, $status );

		return rest_ensure_response( $response );
	}

	/**
	 * Restore a soft-deleted event.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response The restoration result.
	 */
	public static function restore_event( WP_REST_Request $request ) {
		$data     = json_decode( $request->get_body(), true );
		$event_id = absint( $data['event_id'] ?? 0 );

		if ( empty( $event_id ) ) {
			return new WP_Error( 'eventkoi_missing_id', __( 'Missing event ID.', 'eventkoi' ), array( 'status' => 400 ) );
		}

		$response = SingleEvent::restore_event( $event_id );

		return rest_ensure_response( $response );
	}

	/**
	 * Duplicate an event.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response The duplication result.
	 */
	public static function duplicate_event( WP_REST_Request $request ) {
		$data     = json_decode( $request->get_body(), true );
		$event_id = absint( $data['event_id'] ?? 0 );

		if ( empty( $event_id ) ) {
			return new WP_Error( 'eventkoi_missing_id', __( 'Missing event ID.', 'eventkoi' ), array( 'status' => 400 ) );
		}

		$event    = new SingleEvent( $event_id );
		$response = $event::duplicate_event();

		return rest_ensure_response( $response );
	}

	/**
	 * Delete an event permanently.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response The deletion result.
	 */
	public static function delete_event( WP_REST_Request $request ) {
		$data     = json_decode( $request->get_body(), true );
		$event_id = absint( $data['event_id'] ?? 0 );

		if ( empty( $event_id ) ) {
			return new WP_Error( 'eventkoi_missing_id', __( 'Missing event ID.', 'eventkoi' ), array( 'status' => 400 ) );
		}

		$response = SingleEvent::delete_event( $event_id );

		return rest_ensure_response( $response );
	}

	/**
	 * Get instance override and merged data.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function get_instance_data( WP_REST_Request $request ) {
		$event_id  = absint( $request->get_param( 'id' ) );
		$timestamp = absint( $request->get_param( 'timestamp' ) );

		if ( ! $event_id || ! $timestamp ) {
			return new \WP_Error( 'eventkoi_missing_param', __( 'Missing event ID or timestamp.', 'eventkoi' ) );
		}

		$event = new \EventKoi\Core\Event( $event_id );
		$raw   = $event::get_meta();

		$override = eventkoi_get_instance_override( $event_id, $timestamp );
		$merged   = is_array( $override )
		? eventkoi_merge_instance_data( $raw, $override )
		: $raw;

		return rest_ensure_response(
			array(
				'event_id'  => $event_id,
				'timestamp' => $timestamp,
				'raw_event' => $raw,
				'override'  => $override,
				'merged'    => $merged,
			)
		);
	}

	/**
	 * Save override data for a specific instance.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function edit_instance( WP_REST_Request $request ) {
		$data = json_decode( $request->get_body(), true );

		$event_id  = absint( $data['event_id'] ?? 0 );
		$timestamp = absint( $data['timestamp'] ?? 0 );
		$overrides = $data['overrides'] ?? array();
		$delete    = $data['deleteKeys'] ?? array();

		if ( ! $event_id || ! $timestamp || ! is_array( $overrides ) ) {
			return new \WP_Error(
				'eventkoi_invalid_instance_data',
				__( 'Missing or invalid instance override data.', 'eventkoi' )
			);
		}

		$existing = eventkoi_get_instance_override( $event_id, $timestamp );
		$existing = is_array( $existing ) ? $existing : array();

		$allowed_keys = array(
			'title',
			'description',
			'summary',
			'image',
			'image_id',
			'template',
			'locations',
			'modified_at',
			'status',
		);

		$filtered = array_filter(
			$overrides,
			static fn( $key ) => in_array( $key, $allowed_keys, true ),
			ARRAY_FILTER_USE_KEY
		);

		if ( empty( $filtered['modified_at'] ) ) {
			$filtered['modified_at'] = gmdate( 'c' );
		}

		$merged = array_merge( $existing, $filtered );

		if ( is_array( $delete ) ) {
			foreach ( $delete as $key ) {
				unset( $merged[ $key ] );
			}
		}

		// Upsert into custom table.
		DB::table( 'ek_recurrence_overrides' )->upsert(
			array(
				'event_id'    => $event_id,
				'timestamp'   => $timestamp,
				'data'        => maybe_serialize( $merged ),
				'modified_at' => current_time( 'mysql', true ),
			),
			array( 'event_id', 'timestamp' )
		);

		return rest_ensure_response(
			array(
				'success'   => true,
				'event_id'  => $event_id,
				'timestamp' => $timestamp,
				'override'  => $merged,
			)
		);
	}

	/**
	 * Remove all override data for a specific instance.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function reset_instance( WP_REST_Request $request ) {
		$data      = json_decode( $request->get_body(), true );
		$event_id  = absint( $data['event_id'] ?? 0 );
		$timestamp = absint( $data['timestamp'] ?? 0 );

		if ( ! $event_id || ! $timestamp ) {
			return new \WP_Error( 'eventkoi_invalid_reset', __( 'Missing event ID or timestamp.', 'eventkoi' ) );
		}

		DB::table( 'ek_recurrence_overrides' )
		->where( 'event_id', $event_id )
		->where( 'timestamp', $timestamp )
		->delete();

		return rest_ensure_response(
			array(
				'success'   => true,
				'event_id'  => $event_id,
				'timestamp' => $timestamp,
				'message'   => __( 'Instance overrides reset to defaults.', 'eventkoi' ),
			)
		);
	}
}
