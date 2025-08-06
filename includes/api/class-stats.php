<?php
/**
 * REST API - Stats Endpoint.
 *
 * @package    EventKoi
 * @subpackage EventKoi\API
 */

namespace EventKoi\API;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use EventKoi\API\REST;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Class Stats
 *
 * Handles REST API endpoint for returning stats data.
 */
class Stats {

	/**
	 * Register REST endpoint for stats.
	 *
	 * @return void
	 */
	public static function init() {
		register_rest_route(
			EVENTKOI_API,
			'/stats',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'get_stats' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);
	}

	/**
	 * Handle the stats endpoint request.
	 *
	 * @param WP_REST_Request $request The REST API request object.
	 * @return WP_REST_Response|WP_Error Response data or error.
	 */
	public static function get_stats( $request ) {
		if ( ! ( $request instanceof WP_REST_Request ) ) {
			return new WP_Error(
				'eventkoi_invalid_request',
				__( 'Invalid request.', 'eventkoi' ),
				array( 'status' => 400 )
			);
		}

		$stats   = new \EventKoi\Core\Stats();
		$results = $stats->get();

		return rest_ensure_response( $results );
	}
}
