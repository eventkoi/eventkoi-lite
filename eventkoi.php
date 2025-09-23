<?php
/**
 * Plugin Name:       EventKoi Lite
 * Plugin URI:        https://eventkoi.com
 * Description:       Event and calendar management for WordPress.
 * Version:           1.0.0
 * Author:            EventKoi
 * Author URI:        https://eventkoi.com
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       eventkoi
 * Domain Path:       /languages
 * Requires at least: 6.7
 * Requires PHP:      8.0
 *
 * @package EventKoi
 */

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
define( 'EVENTKOI_VERSION', '1.0.0' );
define( 'EVENTKOI_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'EVENTKOI_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'EVENTKOI_PLUGIN_FILE', __FILE__ );
define( 'EVENTKOI_API', 'eventkoi/v1' );
define( 'EVENTKOI_CONFIG', 'https://zgxjadedaiqnjfhxxnjs.supabase.co/functions/v1/config' );

require_once plugin_dir_path( __FILE__ ) . 'bootstrap.php';
