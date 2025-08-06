<?php
/**
 * Auto Updater for EventKoi.
 *
 * @package EventKoi\Core
 */

namespace EventKoi\Core;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Auto_Updater.
 */
class Auto_Updater {

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_filter( 'cron_schedules', array( $this, 'register_schedule' ) );
		add_action( 'eventkoi_check_for_updates', array( $this, 'check_for_updates' ) );

		register_activation_hook( EVENTKOI_PLUGIN_FILE, array( $this, 'activate_schedule' ) );
		register_deactivation_hook( EVENTKOI_PLUGIN_FILE, array( $this, 'deactivate_schedule' ) );

		// Register plugin update filters for UI notifications.
		$this->init_plugin_update_hooks();
	}

	/**
	 * Register a custom 4-hour cron interval.
	 *
	 * @param array $schedules The existing cron schedules.
	 * @return array Modified cron schedules.
	 */
	public function register_schedule( $schedules ) {
		$schedules['every_4_hours'] = array(
			'interval' => 4 * HOUR_IN_SECONDS,
			'display'  => __( 'Every 4 Hours', 'eventkoi' ),
		);
		return $schedules;
	}

	/**
	 * Schedule the cron on activation.
	 */
	public function activate_schedule() {
		if ( ! wp_next_scheduled( 'eventkoi_check_for_updates' ) ) {
			wp_schedule_event( time(), 'every_4_hours', 'eventkoi_check_for_updates' );
		}
	}

	/**
	 * Remove the scheduled cron.
	 */
	public function deactivate_schedule() {
		wp_clear_scheduled_hook( 'eventkoi_check_for_updates' );
	}

	/**
	 * Perform update check and install if version is newer.
	 */
	public function check_for_updates() {
		if ( defined( 'WP_INSTALLING' ) && WP_INSTALLING ) {
			return;
		}

		$settings    = \EventKoi\Core\Settings::get();
		$enabled     = isset( $settings['auto_updates_enabled'] ) && filter_var( $settings['auto_updates_enabled'], FILTER_VALIDATE_BOOLEAN );
		$license_key = isset( $settings['license_key'] ) ? trim( $settings['license_key'] ) : '';
		$item_name   = EVENTKOI_PRO;

		if ( ! $enabled || empty( $license_key ) ) {
			return;
		}

		$endpoint = add_query_arg(
			array(
				'license_key' => rawurlencode( $license_key ),
				'item_name'   => rawurlencode( $item_name ),
			),
			'https://zgxjadedaiqnjfhxxnjs.supabase.co/functions/v1/check-update'
		);

		$response = wp_remote_get( $endpoint, array( 'timeout' => 15 ) );

		if ( is_wp_error( $response ) ) {
			error_log( '[EventKoi] Update check failed: ' . $response->get_error_message() ); // phpcs:ignore.
			return;
		}

		$data = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( ! is_array( $data ) || empty( $data['new_version'] ) || empty( $data['download_link'] ) ) {
			error_log( '[EventKoi] Invalid update data.' ); // phpcs:ignore.
			return;
		}

		$current         = get_file_data( EVENTKOI_PLUGIN_FILE, array( 'Version' => 'Version' ) );
		$current_version = $current['Version'] ?? EVENTKOI_VERSION;

		if ( version_compare( $data['new_version'], $current_version, '>' ) ) {
			error_log( '[EventKoi] Updating from ' . $current_version . ' to ' . $data['new_version'] ); // phpcs:ignore.

			if ( file_exists( plugin_dir_path( EVENTKOI_PLUGIN_FILE ) . '.git' ) ) {
				error_log( '[EventKoi] Skipping update (dev mode).' ); // phpcs:ignore.
				return;
			}

			$this->download_and_install( esc_url_raw( $data['download_link'] ) );
		}
	}

	/**
	 * Download and install the plugin update.
	 *
	 * @param string $url The URL of the plugin ZIP file.
	 */
	private function download_and_install( $url ) {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/misc.php';
		require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';

		WP_Filesystem();

		add_filter(
			'upgrader_package_options',
			function ( $options ) {
				$options['clear_destination'] = true;
				return $options;
			}
		);

		$skin     = new \Automatic_Upgrader_Skin();
		$upgrader = new \Plugin_Upgrader( $skin );
		$result   = $upgrader->install( $url );

		if ( is_wp_error( $result ) ) {
			error_log( '[EventKoi] Install failed: ' . $result->get_error_message() ); // phpcs:ignore.
		} elseif ( false === $result ) {
			error_log( '[EventKoi] Install failed: Unknown error.' ); // phpcs:ignore.
		} else {
			error_log( '[EventKoi] Update complete.' ); // phpcs:ignore.

			if ( ! is_plugin_active( plugin_basename( EVENTKOI_PLUGIN_FILE ) ) ) {
				activate_plugin( plugin_basename( EVENTKOI_PLUGIN_FILE ) );
			}
		}
	}

	/**
	 * Register plugin update filters.
	 */
	public function init_plugin_update_hooks() {
		add_filter( 'pre_set_site_transient_update_plugins', array( $this, 'inject_plugin_update_info' ) );
		add_filter( 'plugins_api', array( $this, 'filter_plugin_api_response' ), 10, 3 );
	}

	/**
	 * Inject version info into update_plugins transient for WordPress UI.
	 *
	 * @param object $transient Update transient object.
	 * @return object
	 */
	public function inject_plugin_update_info( $transient ) {
		if ( defined( 'WP_INSTALLING' ) && WP_INSTALLING ) {
			return $transient;
		}

		$settings    = \EventKoi\Core\Settings::get();
		$license_key = trim( $settings['license_key'] ?? '' );
		$item_name   = EVENTKOI_PRO;

		if ( empty( $license_key ) ) {
			return $transient;
		}

		$response = wp_remote_get(
			add_query_arg(
				array(
					'license_key' => rawurlencode( $license_key ),
					'item_name'   => rawurlencode( $item_name ),
				),
				'https://zgxjadedaiqnjfhxxnjs.supabase.co/functions/v1/check-update'
			),
			array( 'timeout' => 15 )
		);

		if ( is_wp_error( $response ) ) {
			return $transient;
		}

		$data = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( empty( $data['new_version'] ) || empty( $data['download_link'] ) ) {
			return $transient;
		}

		$current         = get_file_data( EVENTKOI_PLUGIN_FILE, array( 'Version' => 'Version' ) );
		$current_version = $current['Version'] ?? EVENTKOI_VERSION;

		if ( version_compare( $data['new_version'], $current_version, '>' ) ) {
			$plugin_slug = plugin_basename( EVENTKOI_PLUGIN_FILE );

			$transient->response[ $plugin_slug ] = (object) array(
				'slug'        => plugin_basename( dirname( EVENTKOI_PLUGIN_FILE ) ),
				'new_version' => $data['new_version'],
				'package'     => esc_url_raw( $data['download_link'] ),
				'url'         => $data['homepage'] ?? 'https://eventkoi.com',
			);
		}

		return $transient;
	}

	/**
	 * Provide plugin details to the WP plugin popup.
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

		$settings    = \EventKoi\Core\Settings::get();
		$license_key = trim( $settings['license_key'] ?? '' );
		$item_name   = EVENTKOI_PRO;

		if ( empty( $license_key ) ) {
			return $result;
		}

		$response = wp_remote_get(
			add_query_arg(
				array(
					'license_key' => rawurlencode( $license_key ),
					'item_name'   => rawurlencode( $item_name ),
				),
				'https://zgxjadedaiqnjfhxxnjs.supabase.co/functions/v1/check-update'
			),
			array( 'timeout' => 15 )
		);

		if ( is_wp_error( $response ) ) {
			return $result;
		}

		$data = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( empty( $data['new_version'] ) || empty( $data['download_link'] ) ) {
			return $result;
		}

		$sections = array(
			'description' => '',
			'changelog'   => '',
		);

		if ( ! empty( $data['sections'] ) && is_string( $data['sections'] ) ) {
			$maybe_sections = maybe_unserialize( $data['sections'] );
			if ( is_array( $maybe_sections ) ) {
				$sections = array_merge( $sections, $maybe_sections );
			}
		}

		if ( ! empty( $sections['changelog'] ) ) {
			$sections['changelog'] = preg_replace_callback(
				'#<p>(.*?)<br\s*/?>\s*(\d+\.\d+\.\d+\s*–.*?)(<br\s*/?>)#s',
				function ( $matches ) {
					return sprintf(
						'<p>%s<br/><strong>%s</strong>%s',
						$matches[1],
						$matches[2],
						$matches[3]
					);
				},
				$sections['changelog']
			);
		}

		$sections['changelog'] .= sprintf(
			'<p><a href="%1$s" target="_blank" rel="noopener noreferrer">%2$s</a></p>',
			esc_url( 'https://eventkoi.com/changelog/' ),
			esc_html__( 'View full changelog →', 'eventkoi' )
		);

		return (object) array(
			'name'          => $data['name'],
			'slug'          => $data['slug'],
			'version'       => $data['new_version'],
			'author'        => '<a href="https://eventkoi.com">EventKoi</a>',
			'homepage'      => $data['homepage'],
			'download_link' => esc_url_raw( $data['download_link'] ),
			'last_updated'  => $data['last_updated'],
			'requires'      => $data['requires'],
			'tested'        => $data['tested'],
			'sections'      => array(
				'changelog' => wp_kses_post( $sections['changelog'] ?? '' ),
			),
		);
	}
}
