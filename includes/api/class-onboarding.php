<?php
/**
 * REST API - Onboarding endpoints.
 *
 * @package    EventKoi
 * @subpackage EventKoi\API
 */

namespace EventKoi\API;

use WP_REST_Request;
use WP_REST_Response;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Class Onboarding.
 *
 * Handles quick start completion/dismissal.
 */
class Onboarding {

	/**
	 * Register REST routes.
	 *
	 * @return void
	 */
	public static function init() {
		register_rest_route(
			EVENTKOI_API,
			'/onboarding/complete',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'complete' ),
				'permission_callback' => array( self::class, 'permission_check' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/onboarding/demo-event',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'store_demo_event' ),
				'permission_callback' => array( self::class, 'permission_check' ),
			)
		);
	}

	/**
	 * Permission callback for onboarding routes.
	 *
	 * @param WP_REST_Request $request Request instance.
	 * @return bool
	 */
	public static function permission_check( WP_REST_Request $request ) {
		$nonce = $request->get_header( 'x_wp_nonce' );

		if ( ! $nonce ) {
			$nonce = $request->get_param( '_wpnonce' );
		}

		if ( ! $nonce || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return false;
		}

		return current_user_can( 'manage_options' );
	}

	/**
	 * Mark onboarding as complete/dismissed.
	 *
	 * @return WP_REST_Response
	 */
	public static function complete() {
		update_option( 'eventkoi_quick_start_completed', 'yes' );
		delete_option( 'eventkoi_show_quick_start_prompt' );

		return rest_ensure_response(
			array(
				'success' => true,
			)
		);
	}

	/**
	 * Store demo event ID so the onboarding flow can reuse it.
	 *
	 * @param WP_REST_Request $request Request instance.
	 * @return WP_REST_Response
	 */
	public static function store_demo_event( WP_REST_Request $request ) {
		$event_id = absint( $request->get_param( 'event_id' ) );

		if ( $event_id > 0 ) {
			update_option( 'eventkoi_demo_event_id', $event_id );
		} else {
			delete_option( 'eventkoi_demo_event_id' );
		}

		return rest_ensure_response(
			array(
				'success'  => true,
				'event_id' => $event_id,
			)
		);
	}
}
