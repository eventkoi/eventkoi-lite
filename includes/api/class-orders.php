<?php
/**
 * API.
 *
 * @package    EventKoi
 * @subpackage EventKoi\API
 */

namespace EventKoi\API;

use EventKoi\API\REST;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Orders.
 */
class Orders {

	/**
	 * Init.
	 */
	public static function init() {

		register_rest_route(
			EVENTKOI_API,
			'/orders',
			array(
				'methods'             => 'get',
				'callback'            => array( __CLASS__, 'get_orders' ),
				'permission_callback' => array( '\EventKoi\API\REST', 'private_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/add_order_note',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'add_order_note' ),
				'permission_callback' => array( '\EventKoi\API\REST', 'private_api' ),
			)
		);
	}

	/**
	 * Get orders.
	 *
	 * @param WP_REST_Request $request The API request.
	 * @return WP_REST_Response|WP_Error JSON response.
	 */
	public static function get_orders( $request ) {
		if ( ! ( $request instanceof \WP_REST_Request ) ) {
			return new \WP_Error( 'invalid_request', __( 'Invalid request object.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$orders = new \EventKoi\Core\Orders();

		try {
			$response = $orders->get( true );
			return rest_ensure_response( $response );
		} catch ( Exception $e ) {
			return new \WP_Error( 'orders_fetch_error', __( 'Error retrieving orders.', 'eventkoi-lite' ), array( 'status' => 500 ) );
		}
	}

	/**
	 * Add a note to an order.
	 *
	 * @param \WP_REST_Request $request The REST request.
	 * @return \WP_REST_Response|WP_Error
	 */
	public static function add_order_note( $request ) {
		if ( ! ( $request instanceof \WP_REST_Request ) ) {
			return new \WP_Error( 'invalid_request', __( 'Invalid request object.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$order_id = absint( $request->get_param( 'order_id' ) );
		$note_key = sanitize_key( $request->get_param( 'note_key' ) );
		$note     = $request->get_param( 'note' );

		if ( empty( $order_id ) || empty( $note_key ) || ! isset( $note ) ) {
			return new \WP_Error( 'missing_params', __( 'Missing required parameters.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$orders = new \EventKoi\Core\Orders();

		try {
			$orders->add_note( $order_id, $note_key, $note, 'admin' );

			return rest_ensure_response( array( 'success' => true ) );
		} catch ( \Exception $e ) {
			return new \WP_Error(
				'note_add_failed',
				__( 'Failed to add note.', 'eventkoi-lite' ),
				array(
					'status'  => 500,
					'message' => $e->getMessage(),
				)
			);
		}
	}
}
