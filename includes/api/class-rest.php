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
use EventKoi\API\Onboarding;
use EventKoi\API\Shortcode;
use EventKoi\API\Rsvps;
use EventKoi\API\Tickets;
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
		add_action( 'rest_api_init', array( __CLASS__, 'shield_rest_output' ), 1 );
		add_filter( 'rest_pre_serve_request', array( __CLASS__, 'flush_stray_output' ), 0, 3 );
	}

	/**
	 * Prevent PHP notices/warnings from polluting EventKoi REST JSON responses.
	 *
	 * WP_DEBUG_DISPLAY=true on dev environments (and noisy third-party plugins
	 * like The Events Calendar that emit deprecation warnings on first class
	 * load) will print HTML before the JSON body and trigger an `invalid_json`
	 * client error on the first request after a cold PHP process.
	 *
	 * @return void
	 */
	public static function shield_rest_output() {
		$uri = isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '';
		if ( false === strpos( $uri, '/' . EVENTKOI_API . '/' ) ) {
			return;
		}

		// phpcs:ignore WordPress.PHP.IniSet.display_errors_Disallowed
		@ini_set( 'display_errors', '0' );

		if ( 0 === ob_get_level() ) {
			ob_start();
		}
	}

	/**
	 * Discard any stray output captured before the JSON body is written.
	 *
	 * @param mixed            $served  Whether the request has been served.
	 * @param mixed            $result  Result of dispatch.
	 * @param \WP_REST_Request $request Current REST request.
	 * @return mixed
	 */
	public static function flush_stray_output( $served, $result, $request ) {
		if ( ! ( $request instanceof \WP_REST_Request ) ) {
			return $served;
		}
		if ( false === strpos( (string) $request->get_route(), '/' . EVENTKOI_API ) ) {
			return $served;
		}
		while ( ob_get_level() > 0 ) {
			ob_end_clean();
		}
		return $served;
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
		return 'eventkoi_' . wp_generate_password( 20, false, false );
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
			Onboarding::class,
			Shortcode::class,
			Rsvps::class,
			Tickets::class,
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
		return ( $request instanceof WP_REST_Request );
	}

	/**
	 * Permission callback for private REST endpoints.
	 *
	 * Ensures:
	 * - The current user has manage_options capability.
	 * - A valid EventKoi API key header is present and matches.
	 *
	 * Always returns a boolean true/false.
	 *
	 * @param \WP_REST_Request $request
	 * @return bool
	 */
	public static function private_api( \WP_REST_Request $request ) {
		$headers = $request->get_headers();

		$api_key = '';
		if ( isset( $headers['eventkoi_api_key'][0] ) ) {
			$api_key = sanitize_text_field( $headers['eventkoi_api_key'][0] );
		}

		if ( ! $api_key ) {
			$api_key = sanitize_text_field( $request->get_header( 'eventkoi-api-key' ) );
		}

		if ( ! $api_key ) {
			$api_key = sanitize_text_field( $request->get_header( 'eventkoi_api_key' ) );
		}

		$saved_api_key = self::get_api_key();

		if ( empty( $api_key ) || empty( $saved_api_key ) ) {
			return false;
		}

		return current_user_can( 'manage_options' )
		&& hash_equals( strtolower( $saved_api_key ), strtolower( $api_key ) );
	}
}
