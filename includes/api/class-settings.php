<?php
/**
 * REST API - Settings Endpoint.
 *
 * @package    EventKoi
 * @subpackage EventKoi\API
 */

namespace EventKoi\API;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use EventKoi\API\REST;
use EventKoi\Core\Settings as CoreSettings;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Class Settings.
 *
 * Handles get and update settings API endpoints.
 */
class Settings {

	/**
	 * Register REST routes.
	 *
	 * @return void
	 */
	public static function init() {
		register_rest_route(
			EVENTKOI_API,
			'/settings',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'get_settings' ),
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/settings',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'set_settings' ),
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);
	}

	/**
	 * Return the saved settings.
	 *
	 * @return WP_REST_Response Settings response.
	 */
	public static function get_settings() {
		$settings_api = new CoreSettings();
		$settings     = $settings_api::get();

		return rest_ensure_response( $settings );
	}

	/**
	 * Save settings via API request.
	 *
	 * @param WP_REST_Request $request The incoming REST request.
	 * @return WP_REST_Response|WP_Error Response object.
	 */
	public static function set_settings( WP_REST_Request $request ) {
		$body = $request->get_body();

		if ( empty( $body ) ) {
			return new WP_REST_Response(
				array(
					'success' => false,
					'message' => __( 'Request body is empty.', 'eventkoi-lite' ),
				),
				400
			);
		}

		$data = json_decode( $body, true );

		if ( ! is_array( $data ) ) {
			return new WP_REST_Response(
				array(
					'success' => false,
					'message' => __( 'Invalid data format. Expected a JSON object.', 'eventkoi-lite' ),
				),
				400
			);
		}

		$settings_api = new CoreSettings();
		$settings     = $settings_api::get();
		if ( ! is_array( $settings ) ) {
			$settings = array();
		}

		// Handle secure API key regeneration.
		if ( isset( $data['api_key'] ) && 'refresh' === $data['api_key'] ) {
			$new_api_key = 'eventkoi_' . strtolower( preg_replace( '/[^a-z0-9]/i', '', wp_generate_password( 20, false, false ) ) );
			update_option( 'eventkoi_api_key', $new_api_key );

			return rest_ensure_response(
				array(
					'success' => true,
					'message' => __( 'API key regenerated successfully.', 'eventkoi-lite' ),
					'api_key' => $new_api_key,
				)
			);
		}

		// Fallback: Update settings normally.
		foreach ( $data as $key => $value ) {
			if ( in_array( $key, array( 'api_key' ), true ) ) {
				continue;
			}

			$settings[ $key ] = apply_filters(
				'eventkoi_pre_setting_value',
				is_array( $value )
				? array_map( 'sanitize_text_field', $value )
				: sanitize_text_field( $value ),
				$key
			);
		}

		$settings_api::set( $settings );

		return rest_ensure_response(
			array(
				'success'  => true,
				'message'  => __( 'Settings updated successfully.', 'eventkoi-lite' ),
				'settings' => $settings,
			)
		);
	}
}
