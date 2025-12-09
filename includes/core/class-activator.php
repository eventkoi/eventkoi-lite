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
	 * Activate the plugin and register instance with Supabase.
	 *
	 * @return void
	 */
	public static function activate() {
		// Generate and store a developer-friendly API key.
		if ( ! get_option( 'eventkoi_api_key' ) ) {
			update_option( 'eventkoi_api_key', 'eventkoi_' . strtolower( preg_replace( '/[^a-z0-9]/i', '', wp_generate_password( 20, false, false ) ) ) );
		}

		// Flag that the plugin was just activated so we can show the quick start prompt.
		if ( ! get_option( 'eventkoi_quick_start_completed' ) ) {
			update_option( 'eventkoi_show_quick_start_prompt', 'yes' );
		}

		// Queue a one-time rewrite rules flush after activation.
		update_option( 'eventkoi_flush_needed', 'yes' );
	}
}
