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
		$screen = get_current_screen();

		// Allow loading for block editor screens too.
		$is_block_editor = function_exists( 'get_current_screen' )
			&& $screen
			&& method_exists( $screen, 'is_block_editor' )
			&& $screen->is_block_editor();

		if ( empty( $screen ) || ( strpos( $screen->base, 'eventkoi' ) === false && ! $is_block_editor && 'plugins' !== $screen->base ) ) {
			return;
		}

		$asset_file = include EVENTKOI_PLUGIN_DIR . 'scripts/backend/build/index.asset.php';
		$build_url  = EVENTKOI_PLUGIN_URL . 'scripts/backend/build/';

		$default_cal_id = (int) get_option( 'default_event_cal', 0 );
		$default_cal    = get_term_by( 'id', $default_cal_id, 'event_cal' );
		$cal_url        = $default_cal ? get_term_link( $default_cal, 'event_cal' ) : '';
		$cal_url        = $default_cal ? str_replace( $default_cal->slug, '', $cal_url ) : '';

		$settings = Settings::get();

		// Prepare parameters for JS.
		$eventkoi_params = array(
			'version'             => EVENTKOI_VERSION,
			'api'                 => EVENTKOI_API,
			'supabase_config_url' => EVENTKOI_CONFIG,
			'settings'            => Settings::get(),
			'general_options_url' => admin_url( 'options-general.php' ),
			'site_url'            => get_bloginfo( 'url' ),
			'theme'               => get_stylesheet(),
			'admin_email'         => get_bloginfo( 'admin_email' ),
			'instance_id'         => get_option( 'eventkoi_site_instance_id' ),
			'ajax_url'            => admin_url( 'admin-ajax.php' ),
			'api_key'             => REST::get_api_key(),
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

		$eventkoi_params['custom_templates'] = $custom_templates;

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
