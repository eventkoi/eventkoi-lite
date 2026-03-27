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
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_scripts' ), 999 );
	}

	/**
	 * Enqueue frontend assets.
	 */
	public function enqueue_scripts() {
		self::enqueue_frontend_assets();
	}

	/**
	 * Register and enqueue frontend assets, so they can also be reused elsewhere (Elementor).
	 */
	public static function enqueue_frontend_assets() {
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
		$calendar = Calendar::get_meta();
		$settings = Settings::get();

		$current_user = wp_get_current_user();
		$rsvp_user    = array();

		if ( $current_user && $current_user->ID ) {
			$first_name = isset( $current_user->first_name ) ? sanitize_text_field( $current_user->first_name ) : '';
			$last_name  = isset( $current_user->last_name ) ? sanitize_text_field( $current_user->last_name ) : '';
			$full_name  = trim( $first_name . ' ' . $last_name );

			$rsvp_user = array(
				'id'    => (int) $current_user->ID,
				'name'  => $full_name,
				'email' => sanitize_email( $current_user->user_email ),
			);
		}

		$params = array(
			'is_admin'          => current_user_can( 'manage_options' ),
			'admin_page'        => admin_url( 'admin.php?page=eventkoi' ),
			'demo_event_id'     => (int) get_option( 'eventkoi_demo_event_id', 0 ),
			'default_cal_id'    => (int) get_option( 'eventkoi_default_event_cal', 0 ),
			'version'           => EVENTKOI_VERSION,
			'api'               => EVENTKOI_API,
			'rest_url'          => esc_url_raw( rest_url( EVENTKOI_API ) ),
			'event'             => $event ? $event::get_meta() : array(),
			'ical'              => $event ? $event::get_ical() : '',
			'no_events'         => __( 'No events were found.', 'eventkoi-lite' ),
			'timezone'          => wp_timezone_string(),
			'timezone_offset'   => ( get_option( 'gmt_offset' ) ?? 0 ) * 3600,
			'date_format'       => get_option( 'date_format' ),
			'time_format_string'=> \eventkoi_apply_time_preference( get_option( 'time_format' ) ),
			'gmap'              => array(
				'api_key'   => $settings['gmap_api_key'] ?? '',
				'connected' => ! empty( $settings['gmap_connection_status'] ),
			),
			'time_format'       => $settings['time_format'] ?? '12',
			'day_start_time'    => $settings['day_start_time'] ?? '07:00',
			'locale'            => determine_locale(),
			'startday'          => empty( $calendar['startday'] ) ? $settings['week_starts_on'] : $calendar['startday'],
			'auto_detect_timezone' => ! empty( $settings['auto_detect_timezone'] ),
			'nonce'             => wp_create_nonce( 'wp_rest' ),
			'rsvp_user'         => $rsvp_user,
		);

		wp_localize_script(
			'eventkoi-frontend',
			'eventkoi_params',
			apply_filters( 'eventkoi_frontend_params', $params )
		);

		wp_set_script_translations(
			'eventkoi-frontend',
			'eventkoi-lite',
			WP_LANG_DIR . '/plugins'
		);

		// Enqueue styles.
		wp_register_style( 'eventkoi-frontend-tw', $build_url . 'tailwind.css', array(), $asset_file['version'] );
		wp_register_style( 'eventkoi-frontend', $build_url . 'index.css', array(), $asset_file['version'] );

		wp_enqueue_style( 'eventkoi-frontend-tw' );
		wp_enqueue_style( 'eventkoi-frontend' );

		// Inline css.
		if ( is_tax( 'event_cal' ) ) {
			$term = get_queried_object();
			if ( $term && ! is_wp_error( $term ) && isset( $term->term_id ) ) {
				$calendar = new Calendar( $term->term_id );
				$color    = $calendar::get_color();

				$css = sprintf(
					':root { --fc-event-bg-color: %1$s; --fc-event-border-color: %1$s; }',
					esc_attr( $color )
				);

				wp_add_inline_style( 'eventkoi-frontend', $css );
			}
		}
	}
}
