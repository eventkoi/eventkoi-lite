<?php
/**
 * Frontend scripts and styles loader.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles frontend scripts and inline styles.
 */
class Scripts {

	/**
	 * Constructor: Hooks into front-end actions.
	 */
	public function __construct() {
		add_action( 'wp_head', array( $this, 'add_head_meta' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_scripts' ), 999 );
	}

	/**
	 * Add calendar meta colors to head.
	 */
	public function add_head_meta() {
		if ( is_tax( 'event_cal' ) ) {
			$term = get_queried_object();
			if ( ! empty( $term ) && ! is_wp_error( $term ) && isset( $term->term_id ) ) {
				$calendar = new Calendar( $term->term_id );
				$color    = $calendar::get_color();

				echo '<style type="text/css">';
				echo ':root {';
				echo '--fc-event-bg-color: ' . esc_attr( $color ) . ';';
				echo '--fc-event-border-color: ' . esc_attr( $color ) . ';';
				echo '}';
				echo '</style>';
			}
		}
	}

	/**
	 * Enqueue frontend assets.
	 */
	public function enqueue_scripts() {
		$asset_path = EVENTKOI_PLUGIN_DIR . 'scripts/frontend/build/index.asset.php';

		if ( ! file_exists( $asset_path ) ) {
			return;
		}

		$asset_file = include $asset_path;
		$build_url  = EVENTKOI_PLUGIN_URL . 'scripts/frontend/build/';

		// Register and enqueue JS.
		wp_register_script(
			'eventkoi-frontend',
			$build_url . 'index.js',
			$asset_file['dependencies'],
			$asset_file['version'],
			true
		);
		wp_enqueue_script( 'eventkoi-frontend' );

		// Prepare localized variables.
		$event_id = get_the_ID();
		$event    = $event_id ? new Event( $event_id ) : null;
		$settings = Settings::get();

		$params = array(
			'version'     => EVENTKOI_VERSION,
			'api'         => EVENTKOI_API,
			'event'       => $event ? $event::get_meta() : array(),
			'ical'        => $event ? $event::get_ical() : '',
			'no_events'   => __( 'No events were found.', 'eventkoi' ),
			'timezone'    => wp_timezone_string(),
			'gmap'        => array(
				'api_key'   => $settings['gmap_api_key'] ?? '',
				'connected' => ! empty( $settings['gmap_connection_status'] ),
			),
			'time_format' => $settings['time_format'] ?? '12',
		);

		wp_localize_script(
			'eventkoi-frontend',
			'eventkoi_params',
			apply_filters( 'eventkoi_frontend_params', $params )
		);

		// Enqueue styles.
		wp_register_style( 'eventkoi-frontend-tw', $build_url . 'tailwind.css', array(), $asset_file['version'] );
		wp_register_style( 'eventkoi-frontend', $build_url . 'index.css', array(), $asset_file['version'] );

		wp_enqueue_style( 'eventkoi-frontend-tw' );
		wp_enqueue_style( 'eventkoi-frontend' );
	}
}
