<?php
/**
 * REST API - Calendar Endpoints.
 *
 * @package    EventKoi
 * @subpackage EventKoi\API
 */

namespace EventKoi\API;

use EventKoi\API\REST;
use EventKoi\Core\Calendar as SingleCal;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Class Calendar
 *
 * Handles REST API routes for individual calendars.
 */
class Calendar {

	/**
	 * Register calendar-related REST API routes.
	 */
	public static function init() {
		register_rest_route(
			EVENTKOI_API,
			'/calendar',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'get_calendar' ),
				'permission_callback' => array( REST::class, 'public_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/calendar_events',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'get_calendar_events' ),
				'permission_callback' => array( REST::class, 'public_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/update_calendar',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'update_calendar' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/duplicate_calendar',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'duplicate_calendar' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/delete_calendar',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'delete_calendar' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);
	}

	/**
	 * Retrieve calendar data.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response|WP_Error The REST response.
	 */
	public static function get_calendar( WP_REST_Request $request ) {
		$calendar_id = absint( $request->get_param( 'id' ) );

		if ( empty( $calendar_id ) ) {
			return new WP_Error( 'eventkoi_invalid_id', __( 'Invalid calendar ID.', 'eventkoi' ), array( 'status' => 400 ) );
		}

		$calendar = new SingleCal( $calendar_id );
		$response = $calendar::get_meta();

		return rest_ensure_response( $response );
	}

	/**
	 * Retrieve calendar and its events.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response The REST response.
	 */
	public static function get_calendar_events( WP_REST_Request $request ) {
		$ids = array();
		$id  = sanitize_text_field( $request->get_param( 'id' ) );

		if ( empty( $id ) ) {
			return new WP_Error( 'eventkoi_missing_id', __( 'Calendar ID is required.', 'eventkoi' ), array( 'status' => 400 ) );
		}

		if ( strpos( $id, ',' ) !== false ) {
			$ids = array_map( 'absint', explode( ',', $id ) );
			$id  = $ids[0];
		} else {
			$ids = array( absint( $id ) );
		}

		$calendar = new SingleCal( $id );

		$display          = sanitize_text_field( $request->get_param( 'display' ) );
		$expand_instances = ( 'calendar' === $display ); // Expand only if display is calendar.

		$response = array(
			'calendar' => $calendar::get_meta(),
			'events'   => $calendar::get_events( $ids, $expand_instances ),
		);

		return rest_ensure_response( $response );
	}

	/**
	 * Update a calendar.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response The REST response.
	 */
	public static function update_calendar( WP_REST_Request $request ) {
		$data = json_decode( $request->get_body(), true );

		if ( empty( $data['calendar'] ) || ! is_array( $data['calendar'] ) ) {
			return new WP_Error( 'eventkoi_invalid_data', __( 'Invalid calendar data.', 'eventkoi' ), array( 'status' => 400 ) );
		}

		$calendar = $data['calendar'];

		$query    = new SingleCal( absint( $calendar['id'] ) );
		$response = $query::update( $calendar );

		return rest_ensure_response( $response );
	}

	/**
	 * Duplicate a calendar.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response The REST response.
	 */
	public static function duplicate_calendar( WP_REST_Request $request ) {
		$data        = json_decode( $request->get_body(), true );
		$calendar_id = ! empty( $data['calendar_id'] ) ? absint( $data['calendar_id'] ) : 0;

		if ( ! $calendar_id ) {
			return new WP_Error( 'eventkoi_invalid_id', __( 'Calendar ID is required.', 'eventkoi' ), array( 'status' => 400 ) );
		}

		$calendar = new SingleCal( $calendar_id );
		$response = $calendar::duplicate_calendar();

		return rest_ensure_response( $response );
	}

	/**
	 * Delete a calendar.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response The REST response.
	 */
	public static function delete_calendar( WP_REST_Request $request ) {
		$data        = json_decode( $request->get_body(), true );
		$calendar_id = ! empty( $data['calendar_id'] ) ? absint( $data['calendar_id'] ) : 0;

		if ( ! $calendar_id ) {
			return new WP_Error( 'eventkoi_invalid_id', __( 'Calendar ID is required.', 'eventkoi' ), array( 'status' => 400 ) );
		}

		$response = SingleCal::delete_calendar( $calendar_id );

		return rest_ensure_response( $response );
	}
}
