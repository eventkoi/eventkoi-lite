<?php
/**
 * Plugin Name:       EventKoi Lite
 * Plugin URI:        https://eventkoi.com
 * Description:       Event and calendar management for WordPress.
 * Version:           1.3.9.4
 * Author:            EventKoi
 * Author URI:        https://eventkoi.com/
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       eventkoi-lite
 * Domain Path:       /languages
 * Requires at least: 6.7
 * Requires PHP:      8.0
 *
 * @package EventKoi
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

// Only compatibility code here!
if ( is_admin() && ! function_exists( 'is_plugin_active' ) ) {
	require_once ABSPATH . 'wp-admin/includes/plugin.php';
}

// Deactivate PRO if active.
if ( is_plugin_active( 'eventkoi/eventkoi.php' ) ) {
	deactivate_plugins( 'eventkoi/eventkoi.php', true );
	return;
}

// Define constants for the plugin.
define( 'EVENTKOI_VERSION', '1.3.9.4' );
define( 'EVENTKOI_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'EVENTKOI_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'EVENTKOI_PLUGIN_FILE', __FILE__ );
define( 'EVENTKOI_API', 'eventkoi/v1' );

if ( ! function_exists( 'eventkoi_is_tickets_feature_enabled' ) ) {
	/**
	 * Determine whether Tickets feature is enabled.
	 *
	 * @return bool
	 */
	function eventkoi_is_tickets_feature_enabled() {
		return true;
	}
}

add_filter(
	'eventkoi_admin_params',
	static function ( $params ) {
		if ( ! is_array( $params ) ) {
			$params = array();
		}

		$params['tickets_feature_enabled'] = eventkoi_is_tickets_feature_enabled();
		$params['woocommerce_active']      = class_exists( 'WooCommerce' );

		$params['ticket_checkout_method'] = 'woocommerce';

		return $params;
	}
);

add_filter(
	'eventkoi_admin_menu_items',
	static function ( $menu_items ) {
		if ( ! is_array( $menu_items ) ) {
			return $menu_items;
		}

		if ( ! eventkoi_is_tickets_feature_enabled() && isset( $menu_items['tickets'] ) ) {
			unset( $menu_items['tickets'] );
		}

		return $menu_items;
	}
);

add_filter(
	'eventkoi_get_event_attendance_mode',
	static function ( $mode, $event_id, $event ) {
		unset( $event_id, $event );

		if ( 'tickets' === $mode && ! eventkoi_is_tickets_feature_enabled() ) {
			return 'none';
		}

		return $mode;
	},
	10,
	3
);

// Lite: force WooCommerce as the only checkout method and derive currency from WC.
add_filter(
	'option_eventkoi_settings',
	static function ( $settings ) {
		if ( is_array( $settings ) ) {
			$settings['ticket_checkout_method'] = 'woocommerce';

			if ( function_exists( 'get_woocommerce_currency' ) ) {
				$settings['currency'] = strtoupper( get_woocommerce_currency() );
			} else {
				unset( $settings['currency'] );
			}
		}
		return $settings;
	}
);

require_once plugin_dir_path( __FILE__ ) . 'bootstrap.php';
