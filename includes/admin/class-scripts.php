<?php
/**
 * Admin scripts.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Admin
 */

namespace EventKoi\Admin;

use EventKoi\Core\Event;
use EventKoi\Core\Events;
use EventKoi\Core\Calendars;
use EventKoi\Core\Calendar;
use EventKoi\Core\Settings;
use EventKoi\API\REST;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Scripts.
 */
class Scripts {

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_scripts' ), 999 );
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_block_editor_assets' ) );
	}

	/**
	 * Enqueue admin scripts and styles.
	 */
	public function enqueue_admin_scripts() {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;

		if ( empty( $screen ) ) {
			return;
		}

		$asset_file = include EVENTKOI_PLUGIN_DIR . 'scripts/backend/build/index.asset.php';
		$build_url  = EVENTKOI_PLUGIN_URL . 'scripts/backend/build/';

		$default_cal_id = (int) get_option( 'eventkoi_default_event_cal', 0 );
		$default_cal    = get_term_by( 'id', $default_cal_id, 'event_cal' );
		$cal_url        = $default_cal ? get_term_link( $default_cal, 'event_cal' ) : '';
		$cal_url        = $default_cal ? str_replace( $default_cal->slug, '', $cal_url ) : '';

		$settings     = Settings::get();
		$current_user = wp_get_current_user();

		// Prepare parameters for JS.
		$eventkoi_params = array(
			'version'             => EVENTKOI_VERSION,
			'api'                 => EVENTKOI_API,
			'settings'            => Settings::get(),
			'general_options_url' => admin_url( 'options-general.php' ),
			'site_url'            => get_bloginfo( 'url' ),
			'theme'               => get_stylesheet(),
			'admin_email'         => get_bloginfo( 'admin_email' ),
			'ajax_url'            => admin_url( 'admin-ajax.php' ),
			'api_key'             => REST::get_api_key(),
			'is_admin'            => current_user_can( 'manage_options' ),
			'date_now'            => eventkoi_date( 'j M Y' ),
			'date_24h'            => eventkoi_date( 'j M Y', strtotime( '+1 day' ) ),
			'time_now'            => eventkoi_date( 'g:i A', strtotime( '+1 hour' ) ),
			'new_event'           => Event::get_meta(),
			'new_calendar'        => Calendar::get_meta(),
			'default_cal'         => $default_cal_id,
			'default_cal_url'     => trailingslashit( $cal_url ),
			'default_calendar'    => eventkoi_get_default_calendar_url(),
			'default_color'       => eventkoi_default_calendar_color(),
			'calendars'           => Calendars::get_calendars(),
			'timezone_string'     => wp_timezone_string(),
			'timezone'            => wp_timezone_string(),
			'timezone_offset'     => ( get_option( 'gmt_offset' ) ?? 0 ) * 3600,
			'time_format'         => $settings['time_format'] ?? '12',
			'day_start_time'      => $settings['day_start_time'] ?? '07:00',
			'locale'              => determine_locale(),
			'date_format'         => get_option( 'date_format' ),
			'time_format_string'  => \eventkoi_apply_time_preference( get_option( 'time_format' ) ),
			'demo_event_id'       => (int) get_option( 'eventkoi_demo_event_id', 0 ),
			'demo_event_image'    => trailingslashit( EVENTKOI_PLUGIN_URL ) . 'templates/assets/demo-event.png',
			'current_user'        => array(
				'first_name'   => $current_user->first_name,
				'display_name' => $current_user->display_name,
			),
		);

		// Load available custom templates (optional: filter by slug prefix or post type).
		$theme = wp_get_theme()->get_stylesheet();

		// Get all block templates in this theme.
		$templates        = get_block_templates( array( 'post_type' => 'wp_template' ), 'wp_template' );
		$custom_templates = array();

		foreach ( $templates as $template ) {
			if ( $template->theme === $theme ) {
				$custom_templates[] = array(
					'slug'  => $template->slug,
					'title' => $template->title->rendered ?? $template->title ?? $template->slug,
				);
			}
		}

		$elementor_templates = function_exists( 'eventkoi_get_template_ids_by_pattern' )
			? eventkoi_get_template_ids_by_pattern( 'include/singular/eventkoi_event' )
			: array();

		$eventkoi_params['custom_templates'] = array(
			array(
				'type'      => 'block',
				'label'     => __( 'Block', 'eventkoi-lite' ),
				'templates' => $custom_templates,
			),
			array(
				'type'      => 'elementor',
				'label'     => __( 'Elementor', 'eventkoi-lite' ),
				'templates' => $elementor_templates,
			),
		);

		wp_register_script(
			'eventkoi-admin',
			$build_url . 'index.js',
			$asset_file['dependencies'],
			$asset_file['version'],
			true
		);

		wp_enqueue_script( 'eventkoi-admin' );

		wp_localize_script(
			'eventkoi-admin',
			'eventkoi_params',
			apply_filters( 'eventkoi_admin_params', $eventkoi_params )
		);

		$quick_start_flag = get_option( 'eventkoi_show_quick_start_prompt' );
		$quick_start_done = (bool) get_option( 'eventkoi_quick_start_completed' );

		wp_localize_script(
			'eventkoi-admin',
			'eventkoiQuickStart',
			array(
				'show'           => (bool) $quick_start_flag && ! $quick_start_done,
				'onboarding_url' => esc_url_raw( admin_url( 'admin.php?page=eventkoi#/dashboard/onboarding' ) ),
				'dashboard_url'  => esc_url_raw( admin_url( 'admin.php?page=eventkoi#/dashboard' ) ),
				'restUrl'        => esc_url_raw( rest_url( EVENTKOI_API . '/onboarding/complete' ) ),
				'nonce'          => wp_create_nonce( 'wp_rest' ),
				'screen'         => $screen->base ?? '',
			)
		);

		if ( 'plugins' === $screen->base ) {
			wp_localize_script(
				'eventkoi-admin',
				'eventkoiAutoUpdate',
				array(
					'restUrl' => esc_url_raw( rest_url( EVENTKOI_API . '/auto-updates' ) ),
					'nonce'   => wp_create_nonce( 'wp_rest' ),
					'enabled' => (bool) ( \EventKoi\Core\Settings::get()['auto_updates_enabled'] ?? false ),
				)
			);
		}

		wp_enqueue_editor();
		wp_enqueue_media();

		wp_register_style(
			'eventkoi-admin',
			$build_url . 'index.css',
			array( 'wp-components' ),
			$asset_file['version']
		);

		wp_enqueue_style( 'eventkoi-admin' );

		// Load Tailwind CSS only on main plugin page or edit screens.
		if (
			'toplevel_page_eventkoi' === $screen->base
			|| ( isset( $_GET['action'] ) && 'edit' === $_GET['action'] ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		) {
			wp_register_style(
				'eventkoi-admin-tw',
				$build_url . 'tailwind.css',
				null,
				$asset_file['version']
			);

			wp_enqueue_style( 'eventkoi-admin-tw' );
		}
	}

	/**
	 * Enqueue Tailwind for block editor iframe.
	 */
	public function enqueue_block_editor_assets() {
		$asset_file = include EVENTKOI_PLUGIN_DIR . 'scripts/backend/build/index.asset.php';
		$build_url  = EVENTKOI_PLUGIN_URL . 'scripts/backend/build/';

		wp_register_style(
			'eventkoi-editor-tw',
			$build_url . 'tailwind.css',
			array(),
			$asset_file['version']
		);

		wp_enqueue_style( 'eventkoi-editor-tw' );
	}
}
