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
		// Generate and store a persistent site instance ID.
		if ( ! get_option( 'eventkoi_site_instance_id' ) ) {
			update_option( 'eventkoi_site_instance_id', wp_generate_uuid4() );
		}

		// Generate and store a secure random shared secret for HMAC signing.
		if ( ! get_option( 'eventkoi_shared_secret' ) ) {
			update_option( 'eventkoi_shared_secret', bin2hex( random_bytes( 32 ) ) );
		}

		// Generate and store a developer-friendly API key.
		if ( ! get_option( 'eventkoi_api_key' ) ) {
			update_option( 'eventkoi_api_key', 'ek_' . strtolower( preg_replace( '/[^a-z0-9]/i', '', wp_generate_password( 32, false, false ) ) ) );
		}

		$instance_id   = get_option( 'eventkoi_site_instance_id' );
		$shared_secret = get_option( 'eventkoi_shared_secret' );
		$api_key       = get_option( 'eventkoi_api_key' );

		// Fetch the remote configuration from Supabase storage.
		$config_res = wp_remote_get( EVENTKOI_CONFIG );
		if ( is_wp_error( $config_res ) ) {
			return;
		}

		$config_body = wp_remote_retrieve_body( $config_res );
		$config      = json_decode( $config_body, true );
		if ( empty( $config['supabase_edge'] ) ) {
			return;
		}

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
						'api_key'       => $api_key,
						'site_url'      => home_url(),
					)
				),
				'timeout' => 10,
			)
		);

		// Queue a one-time rewrite rules flush after activation.
		update_option( 'eventkoi_flush_needed', 'yes' );
	}
}
