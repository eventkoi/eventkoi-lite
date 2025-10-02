<?php
/**
 * Fires during plugin activation.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Activator.
 */
class Activator {

	/**
	 * Activate the plugin and register instance.
	 *
	 * @return void
	 */
	public static function activate() {
		// Generate and store a developer-friendly API key.
		if ( ! get_option( 'eventkoi_api_key' ) ) {
			update_option( 'eventkoi_api_key', 'eventkoi_' . strtolower( preg_replace( '/[^a-z0-9]/i', '', wp_generate_password( 20, false, false ) ) ) );
		}

		// Queue a one-time rewrite rules flush after activation.
		update_option( 'eventkoi_flush_needed', 'yes' );
	}
}
