<?php
/**
 * Plugin Name:       EventKoi Lite
 * Plugin URI:        https://eventkoi.com
 * Description:       Event and calendar management for WordPress. (Free)
 * Version:           1.0.0
 * Author:            EventKoi
 * Author URI:        https://eventkoi.com
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       eventkoi
 * Domain Path:       /languages
 * Requires at least: 6.7
 * Requires PHP:      8.0
 *
 * @package EventKoi
 */

namespace EventKoi;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Define constants for the plugin.
define( 'EVENTKOI_VERSION', '1.0.0' );
define( 'EVENTKOI_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'EVENTKOI_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'EVENTKOI_PLUGIN_FILE', __FILE__ );
define( 'EVENTKOI_API', 'eventkoi/v1' );
define( 'EVENTKOI_PRO', 'EventKoi Pro' );
define( 'EVENTKOI_CONFIG', 'https://zgxjadedaiqnjfhxxnjs.supabase.co/functions/v1/config' );

// Load the necessary autoloader files.
require_once EVENTKOI_PLUGIN_DIR . 'autoload.php';
require_once EVENTKOI_PLUGIN_DIR . 'vendor-prefixed/autoload.php';

// Hooks for activation and deactivation.
register_activation_hook( __FILE__, array( __NAMESPACE__ . '\\Core\\Activator', 'activate' ) );
register_deactivation_hook( __FILE__, array( __NAMESPACE__ . '\\Core\\Deactivator', 'deactivate' ) );

/**
 * Initialize the plugin.
 *
 * This function will instantiate the Init class to set up the plugin.
 */
function eventkoi() {
	// Initialize the core plugin setup.
	new \EventKoi\Init();
}

// Initialize the plugin on every page load.
eventkoi();
