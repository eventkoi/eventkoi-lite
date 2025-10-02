<?php
/**
 * REST API - Calendars Endpoints.
 *
 * @package    EventKoi
 * @subpackage EventKoi\API
 */

namespace EventKoi\API;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use EventKoi\API\REST;
use EventKoi\Core\Calendars as Query;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Class Calendars
 *
 * Handles calendar collection endpoints.
 */
class Calendars {

	/**
	 * Register calendar-related REST API routes.
	 */
	public static function init() {
		register_rest_route(
			EVENTKOI_API,
			'/calendars',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'get_calendars' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/delete_calendars',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'delete_calendars' ),
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);
	}

	/**
	 * Get a list of calendars.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response The response object containing calendar data.
	 */
	public static function get_calendars( WP_REST_Request $request ) {
		unset( $request ); // Prevent unused parameter warning.

		$response = Query::get_calendars();

		return rest_ensure_response( $response );
	}

	/**
	 * Delete multiple calendars.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error The REST response.
	 */
	public static function delete_calendars( WP_REST_Request $request ) {
		$data = json_decode( $request->get_body(), true );
		$ids  = isset( $data['ids'] ) ? array_map( 'absint', (array) $data['ids'] ) : array();

		if ( empty( $ids ) ) {
			// translators: %s: Parameter name.
			return new WP_Error( 'eventkoi_no_ids', sprintf( __( 'No %s provided.', 'eventkoi-lite' ), 'calendar IDs' ), array( 'status' => 400 ) );
		}

		$response = Query::delete_calendars( $ids );

		return rest_ensure_response( $response );
	}
}
