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
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/settings',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'set_settings' ),
				'permission_callback' => array( REST::class, 'private_api' ),
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
					'message' => __( 'Request body is empty.', 'eventkoi' ),
				),
				400
			);
		}

		$data = json_decode( $body, true );

		if ( ! is_array( $data ) ) {
			return new WP_REST_Response(
				array(
					'success' => false,
					'message' => __( 'Invalid data format. Expected a JSON object.', 'eventkoi' ),
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
			$new_api_key = 'ek_' . strtolower( preg_replace( '/[^a-z0-9]/i', '', wp_generate_password( 32, false, false ) ) );
			update_option( 'eventkoi_api_key', $new_api_key );

			// Resend to Supabase.
			$instance_id   = get_option( 'eventkoi_site_instance_id' );
			$shared_secret = get_option( 'eventkoi_shared_secret' );
			$site_url      = home_url();

			$config_res = wp_remote_get( EVENTKOI_CONFIG );
			if ( ! is_wp_error( $config_res ) ) {
				$config_body = wp_remote_retrieve_body( $config_res );
				$config      = json_decode( $config_body, true );

				if ( ! empty( $config['supabase_edge'] ) ) {
					$register_url = trailingslashit( $config['supabase_edge'] ) . 'register-instance';

					wp_remote_post(
						$register_url,
						array(
							'method'  => 'POST',
							'headers' => array(
								'Content-Type' => 'application/json',
							),
							'body'    => wp_json_encode(
								array(
									'instance_id'   => $instance_id,
									'shared_secret' => $shared_secret,
									'api_key'       => $new_api_key,
									'site_url'      => $site_url,
								)
							),
							'timeout' => 10,
						)
					);
				}
			}

			return rest_ensure_response(
				array(
					'success' => true,
					'message' => __( 'API key regenerated successfully.', 'eventkoi' ),
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
				'message'  => __( 'Settings updated successfully.', 'eventkoi' ),
				'settings' => $settings,
			)
		);
	}
}
