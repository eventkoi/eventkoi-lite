<?php
/**
 * REST API - Single Order Operations.
 *
 * @package    EventKoi
 * @subpackage EventKoi\API
 */

namespace EventKoi\API;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use EventKoi\Core\Order as SingleOrder;
use EventKoi\API\REST;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Order API class.
 */
class Order {

	/**
	 * Register REST endpoints for order operations.
	 *
	 * @return void
	 */
	public static function init() {
		register_rest_route(
			EVENTKOI_API,
			'/order',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'get_result' ),
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);
	}

	/**
	 * Get a single order by row ID.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response|WP_Error The order data or error.
	 */
	public static function get_result( WP_REST_Request $request ) {
		$order_id = absint( $request->get_param( 'id' ) );

		if ( empty( $order_id ) ) {
			return new WP_Error(
				'eventkoi_invalid_id',
				__( 'Invalid order ID.', 'eventkoi-lite' ),
				array( 'status' => 400 )
			);
		}

		$order = new \EventKoi\Core\Order();
		$data  = $order->get( $order_id, true );

		if ( empty( $data ) ) {
			return new WP_Error(
				'eventkoi_not_found',
				__( 'Order not found.', 'eventkoi-lite' ),
				array( 'status' => 404 )
			);
		}

		// Wrap it in an array and apply the filter.
		$filtered = apply_filters( 'eventkoi_prepare_raw_db_data', array( (object) $data ), 'order' );

		// Unwrap and return.
		return rest_ensure_response( $filtered[0] );
	}
}
