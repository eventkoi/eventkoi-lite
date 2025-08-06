<?php
/**
 * REST API - License Endpoint.
 *
 * @package    EventKoi
 * @subpackage EventKoi\API
 */

namespace EventKoi\API;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use EventKoi\API\REST;
use EventKoi\Core\Settings;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Class License
 */
class License {

	/**
	 * Register REST routes.
	 *
	 * @return void
	 */
	public static function init() {
		register_rest_route(
			EVENTKOI_API,
			'/license',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'handle_license' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/check-updates',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'handle_check_updates' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);
	}

	/**
	 * Handle license activation/deactivation.
	 *
	 * @param WP_REST_Request $request The incoming request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function handle_license( WP_REST_Request $request ) {
		$data           = $request->get_json_params();
		$license_key    = isset( $data['license_key'] ) ? sanitize_text_field( $data['license_key'] ) : '';
		$license_action = isset( $data['license_action'] ) ? sanitize_text_field( $data['license_action'] ) : '';

		if ( empty( $license_key ) || ! in_array( $license_action, array( 'activate', 'deactivate' ), true ) ) {
			return new WP_Error( 'invalid_request', __( 'Invalid license request.', 'eventkoi' ), array( 'status' => 400 ) );
		}

		$api_url          = 'https://pro.eventkoi.com'; // Update to your actual EDD site.
		$edd_api_endpoint = add_query_arg(
			array(
				'edd_action' => 'activate_license',
				'license'    => $license_key,
				'item_name'  => rawurlencode( EVENTKOI_PRO ), // Must match exact EDD item name.
				'url'        => home_url(),
			),
			$api_url
		);

		if ( 'deactivate' === $license_action ) {
			$edd_api_endpoint = add_query_arg( 'edd_action', 'deactivate_license', $edd_api_endpoint );
		}

		$response = wp_remote_get( $edd_api_endpoint, array( 'timeout' => 15 ) );

		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'license_failed', $response->get_error_message(), array( 'status' => 500 ) );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( empty( $body ) || ! isset( $body['license'] ) ) {
			return new WP_Error( 'license_invalid', __( 'Invalid license response.', 'eventkoi' ), array( 'status' => 500 ) );
		}

		// Update settings.
		$settings                    = Settings::get();
		$settings['license_key']     = $license_key;
		$settings['license_status']  = $body['license'];
		$settings['license_expires'] = isset( $body['expires'] ) ? sanitize_text_field( $body['expires'] ) : '';

		Settings::set( $settings );

		return rest_ensure_response(
			array(
				'success' => true,
				'status'  => $body['license'],
				'message' => ( 'valid' === $body['license'] )
				? __( 'License successfully activated.', 'eventkoi' )
				: __( 'License is invalid.', 'eventkoi' ),
			)
		);
	}

	/**
	 * Trigger a plugin update check and return version info.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function handle_check_updates( WP_REST_Request $request ) {
		$settings    = Settings::get();
		$license_key = isset( $settings['license_key'] ) ? trim( $settings['license_key'] ) : '';
		$item_name   = EVENTKOI_PRO;

		if ( empty( $license_key ) ) {
			return new WP_Error( 'missing_license', __( 'License key is missing.', 'eventkoi' ), array( 'status' => 400 ) );
		}

		// Call Supabase Edge Function to fetch update info.
		$endpoint = add_query_arg(
			array(
				'license_key' => rawurlencode( $license_key ),
				'item_name'   => rawurlencode( $item_name ),
			),
			'https://zgxjadedaiqnjfhxxnjs.supabase.co/functions/v1/check-update'
		);

		$response = wp_remote_get( $endpoint, array( 'timeout' => 15 ) );

		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'update_check_failed', $response->get_error_message(), array( 'status' => 500 ) );
		}

		$data = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( empty( $data['new_version'] ) || empty( $data['download_link'] ) ) {
			return new WP_Error( 'invalid_update_data', __( 'No update data found.', 'eventkoi' ), array( 'status' => 500 ) );
		}

		// Clear cached plugin updates and trigger re-check.
		delete_site_transient( 'update_plugins' );

		return rest_ensure_response(
			array(
				'success'      => true,
				'message'      => __( 'Update check triggered.', 'eventkoi' ),
				'new_version'  => $data['new_version'],
				'download_url' => esc_url_raw( $data['download_link'] ),
				'changelog'    => $data['changelog'] ?? '',
				'last_updated' => $data['last_updated'] ?? '',
				'requires'     => $data['requires'] ?? '',
				'tested'       => $data['tested'] ?? '',
			)
		);
	}
}
