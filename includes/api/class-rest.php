<?php
/**
 * REST API handler for EventKoi.
 *
 * @package    EventKoi
 * @subpackage EventKoi\API
 */

namespace EventKoi\API;

use EventKoi\API\Events;
use EventKoi\API\Event;
use EventKoi\API\Settings;
use EventKoi\API\Uploads;
use EventKoi\API\Calendars;
use EventKoi\API\Orders;
use EventKoi\API\Order;
use EventKoi\API\Stats;
use EventKoi\API\Calendar;
use EventKoi\Core\Settings as CoreSettings;
use WP_REST_Request;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Class REST
 *
 * Handles REST API routes and authentication.
 */
class REST {

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'init', array( __CLASS__, 'register_api_key' ), 1 );
		add_action( 'rest_api_init', array( __CLASS__, 'create_rest_routes' ) );
	}

	/**
	 * Register API key if not set.
	 *
	 * @return void
	 */
	public static function register_api_key() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$settings_api = new CoreSettings();
		$settings     = $settings_api::get();

		if ( empty( $settings['api_key'] ) ) {
			$settings['api_key'] = self::generate_api_key();
			$settings_api::set( $settings );
		}
	}

	/**
	 * Generate a secure API key.
	 *
	 * @return string
	 */
	public static function generate_api_key() {
		return 'ek_' . wp_generate_password( 32, false, false );
	}

	/**
	 * Register REST API routes from all classes.
	 *
	 * @return void
	 */
	public static function create_rest_routes() {
		$api_classes = array(
			Events::class,
			Event::class,
			Settings::class,
			Uploads::class,
			Calendars::class,
			Calendar::class,
			Orders::class,
			Order::class,
			Stats::class,
		);

		foreach ( $api_classes as $api_class ) {
			if ( class_exists( $api_class ) && method_exists( $api_class, 'init' ) ) {
				call_user_func( array( $api_class, 'init' ) );
			}
		}
	}

	/**
	 * Retrieve the stored API key.
	 *
	 * @return string
	 */
	public static function get_api_key() {
		$settings_api = new CoreSettings();
		$settings     = $settings_api::get();
		$api_key      = $settings['api_key'] ?? '';

		return apply_filters( 'eventkoi_get_private_api_key', esc_attr( $api_key ) );
	}

	/**
	 * Check if the current REST request is public.
	 *
	 * @param WP_REST_Request $request The current request.
	 * @return bool
	 */
	public static function public_api( WP_REST_Request $request ) {
		// This can be extended to check for GET method, etc.
		return ( $request instanceof WP_REST_Request );
	}

	/**
	 * Authenticate a private REST API request using API key.
	 *
	 * @param WP_REST_Request $request The current request.
	 * @return bool
	 */
	public static function private_api( WP_REST_Request $request ) {
		$headers = $request->get_headers();

		$api_key       = isset( $headers['eventkoi_api_key'][0] ) ? sanitize_text_field( $headers['eventkoi_api_key'][0] ) : '';
		$saved_api_key = self::get_api_key();

		if ( empty( $api_key ) || empty( $saved_api_key ) ) {
			return false;
		}

		return current_user_can( 'manage_options' ) && hash_equals( strtolower( $saved_api_key ), strtolower( $api_key ) );
	}
}
