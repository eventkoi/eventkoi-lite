<?php
/**
 * Bootstrap.
 *
 * @package EventKoi
 */

namespace EventKoi;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Load the necessary autoloader files.
require_once EVENTKOI_PLUGIN_DIR . 'autoload.php';
require_once EVENTKOI_PLUGIN_DIR . 'vendor-prefixed/autoload.php';

// Hooks for activation and deactivation.
register_activation_hook( EVENTKOI_PLUGIN_FILE, array( __NAMESPACE__ . '\\Core\\Activator', 'activate' ) );
register_deactivation_hook( EVENTKOI_PLUGIN_FILE, array( __NAMESPACE__ . '\\Core\\Deactivator', 'deactivate' ) );

/**
 * Initialize the plugin.
 */
function eventkoi() {
	new \EventKoi\Init();
}

// Initialize the plugin on every page load.
eventkoi();
