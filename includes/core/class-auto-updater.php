<?php
/**
 * Auto Updater for EventKoi Lite.
 *
 * @package EventKoi\Core
 */

namespace EventKoi\Core;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles automatic updates for the EventKoi Lite plugin.
 */
class Auto_Updater {

	/**
	 * JSON endpoint URL for update info.
	 *
	 * @var string
	 */
	private $endpoint = 'https://pro.eventkoi.com/edd-free-update.php';

	/**
	 * Constructor: hooks everything up.
	 */
	public function __construct() {
		add_filter( 'cron_schedules', array( $this, 'register_schedule' ) );
		add_action( 'eventkoi_lite_check_for_updates', array( $this, 'check_for_updates' ) );

		register_activation_hook( EVENTKOI_PLUGIN_FILE, array( $this, 'activate_schedule' ) );
		register_activation_hook( EVENTKOI_PLUGIN_FILE, array( $this, 'clear_update_cache' ) );
		register_deactivation_hook( EVENTKOI_PLUGIN_FILE, array( $this, 'deactivate_schedule' ) );

		$this->init_plugin_update_hooks();
	}

	/**
	 * Clear cached update info so WP always re-fetches.
	 *
	 * @return void
	 */
	public function clear_update_cache() {
		delete_site_transient( 'update_plugins' );
		wp_cache_flush();
	}

	/**
	 * Register a custom 6-hour cron interval.
	 *
	 * @param array $schedules Existing cron schedules.
	 * @return array Modified cron schedules.
	 */
	public function register_schedule( $schedules ) {
		$schedules['every_6_hours'] = array(
			'interval' => 6 * HOUR_IN_SECONDS,
			'display'  => 'Every 6 Hours',
		);
		return $schedules;
	}

	/**
	 * Schedule the cron on activation.
	 *
	 * @return void
	 */
	public function activate_schedule() {
		if ( ! wp_next_scheduled( 'eventkoi_lite_check_for_updates' ) ) {
			wp_schedule_event( time(), 'every_6_hours', 'eventkoi_lite_check_for_updates' );
		}
	}

	/**
	 * Remove scheduled cron on deactivation.
	 *
	 * @return void
	 */
	public function deactivate_schedule() {
		wp_clear_scheduled_hook( 'eventkoi_lite_check_for_updates' );
	}

	/**
	 * Perform background update check.
	 *
	 * @return void
	 */
	public function check_for_updates() {
		if ( defined( 'WP_INSTALLING' ) && WP_INSTALLING ) {
			return;
		}

		$data = $this->fetch_update_data();
		if ( empty( $data ) ) {
			return;
		}

		$current         = get_file_data( EVENTKOI_PLUGIN_FILE, array( 'Version' => 'Version' ) );
		$current_version = isset( $current['Version'] ) ? $current['Version'] : EVENTKOI_VERSION;

		if ( version_compare( $data['new_version'], $current_version, '>' ) ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			error_log( '[EventKoi Lite] Update available: ' . $current_version . ' → ' . $data['new_version'] );
			// Do not auto-install, let WP show it in the UI.
		}
	}

	/**
	 * Download and install plugin update.
	 *
	 * @param string $url The URL of the plugin ZIP file.
	 * @return void
	 */
	private function download_and_install( $url ) {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/misc.php';
		require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';

		WP_Filesystem();

		// Ensure destination is cleared before installing.
		add_filter(
			'upgrader_package_options',
			static function ( $options ) {
				$options['clear_destination'] = true;
				return $options;
			}
		);

		$skin     = new \Automatic_Upgrader_Skin();
		$upgrader = new \Plugin_Upgrader( $skin );
		$result   = $upgrader->install( $url );

		if ( is_wp_error( $result ) ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			error_log( '[EventKoi Lite] Install failed: ' . $result->get_error_message() );
		} elseif ( false === $result ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			error_log( '[EventKoi Lite] Install failed: Unknown error.' );
		} else {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			error_log( '[EventKoi Lite] Update complete.' );
			if ( ! is_plugin_active( plugin_basename( EVENTKOI_PLUGIN_FILE ) ) ) {
				activate_plugin( plugin_basename( EVENTKOI_PLUGIN_FILE ) );
			}
		}
	}

	/**
	 * Setup hooks for WP plugin updater UI.
	 *
	 * @return void
	 */
	public function init_plugin_update_hooks() {
		add_filter( 'pre_set_site_transient_update_plugins', array( $this, 'inject_plugin_update_info' ) );
		add_filter( 'plugins_api', array( $this, 'filter_plugin_api_response' ), 10, 3 );
	}

	/**
	 * Inject version info into update_plugins transient.
	 *
	 * @param object $transient Update transient object.
	 * @return object
	 */
	public function inject_plugin_update_info( $transient ) {
		if ( defined( 'WP_INSTALLING' ) && WP_INSTALLING ) {
			return $transient;
		}

		$data = $this->fetch_update_data();
		if ( empty( $data ) ) {
			return $transient;
		}

		$current         = get_file_data( EVENTKOI_PLUGIN_FILE, array( 'Version' => 'Version' ) );
		$current_version = isset( $current['Version'] ) ? $current['Version'] : EVENTKOI_VERSION;

		if ( version_compare( $data['new_version'], $current_version, '>' ) ) {
			$plugin_slug = plugin_basename( EVENTKOI_PLUGIN_FILE );

			$transient->response[ $plugin_slug ] = (object) array(
				'slug'        => $data['slug'],
				'new_version' => $data['new_version'],
				'package'     => esc_url_raw( $data['download_link'] ),
				'url'         => $data['homepage'],
			);
		}

		return $transient;
	}

	/**
	 * Provide plugin details to WP plugin info popup.
	 *
	 * @param false|object|array $result Existing API result.
	 * @param string             $action The action requested.
	 * @param object             $args   Plugin info request args.
	 * @return object|false
	 */
	public function filter_plugin_api_response( $result, $action, $args ) {
		if ( 'plugin_information' !== $action || empty( $args->slug ) || 'eventkoi' !== $args->slug ) {
			return $result;
		}

		$data = $this->fetch_update_data();
		if ( empty( $data ) ) {
			return $result;
		}

		return (object) array(
			'name'          => $data['name'],
			'slug'          => $data['slug'],
			'version'       => $data['new_version'],
			'author'        => '<a href="https://eventkoi.com">EventKoi</a>',
			'homepage'      => $data['homepage'],
			'download_link' => esc_url_raw( $data['download_link'] ),
			'last_updated'  => isset( $data['last_updated'] ) ? $data['last_updated'] : '',
			'requires'      => isset( $data['requires'] ) ? $data['requires'] : '',
			'tested'        => isset( $data['tested'] ) ? $data['tested'] : '',
			'sections'      => array(
				'changelog' => wp_kses_post( html_entity_decode( $data['sections']['changelog'] ?? '' ) ),
			),
		);
	}

	/**
	 * Fetch update data from endpoint.
	 *
	 * @return array|null Decoded update data, or null on failure.
	 */
	private function fetch_update_data() {
		$response = wp_remote_get( $this->endpoint, array( 'timeout' => 15 ) );
		if ( is_wp_error( $response ) ) {
			return null;
		}

		$decoded = json_decode( wp_remote_retrieve_body( $response ), true );
		return is_array( $decoded ) ? $decoded : null;
	}
}
