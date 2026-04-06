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

		// Invalidate template cache when templates change.
		foreach ( array( 'elementor_library' ) as $pt ) {
			add_action( "save_post_{$pt}", array( self::class, 'flush_template_cache' ) );
		}
		add_action( 'delete_post', array( self::class, 'flush_template_cache' ) );
		add_action( 'switch_theme', array( self::class, 'flush_template_cache' ) );
	}

	/**
	 * Flush the custom-templates transient.
	 */
	public static function flush_template_cache() {
		delete_transient( 'eventkoi_custom_templates' );
	}

	/**
	 * Get custom templates, cached in a 30-minute transient.
	 *
	 * @return array
	 */
	public static function get_custom_templates() {
		$cached = get_transient( 'eventkoi_custom_templates' );
		if ( false !== $cached ) {
			return $cached;
		}

		$theme = wp_get_theme()->get_stylesheet();

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

		$result = array(
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

		set_transient( 'eventkoi_custom_templates', $result, 30 * MINUTE_IN_SECONDS );

		return $result;
	}

	/**
	 * Enqueue admin scripts and styles.
	 */
	public function enqueue_admin_scripts() {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;

		if ( empty( $screen ) ) {
			return;
		}

		$build_dir  = EVENTKOI_PLUGIN_DIR . 'scripts/backend/build/';
		$asset_file = include $build_dir . 'index.asset.php';
		$build_url  = EVENTKOI_PLUGIN_URL . 'scripts/backend/build/';
		$hot_file   = $build_dir . '.vite-hot';
		$is_dev     = file_exists( $hot_file );

		$default_cal_id = (int) get_option( 'eventkoi_default_event_cal', 0 );
		$default_cal    = get_term_by( 'id', $default_cal_id, 'event_cal' );
		$cal_url        = $default_cal ? get_term_link( $default_cal, 'event_cal' ) : '';
		$cal_url        = $default_cal ? str_replace( $default_cal->slug, '', $cal_url ) : '';

		$settings      = Settings::get();
		$safe_settings = self::get_client_safe_settings( $settings );
		$current_user  = wp_get_current_user();

		// Prepare parameters for JS.
		$remote_config = get_transient( 'eventkoi_remote_config' );
		if ( ! is_array( $remote_config ) && defined( 'EVENTKOI_CONFIG' ) ) {
			$config_res = wp_remote_get( EVENTKOI_CONFIG, array( 'timeout' => 3 ) );
			if ( ! is_wp_error( $config_res ) ) {
				$remote_config = json_decode( (string) wp_remote_retrieve_body( $config_res ), true );
				if ( is_array( $remote_config ) ) {
					set_transient( 'eventkoi_remote_config', $remote_config, 5 * MINUTE_IN_SECONDS );
				}
			}
		}

		$eventkoi_params = array(
			'version'             => EVENTKOI_VERSION,
			'api'                 => EVENTKOI_API,
			'rest_url'            => esc_url_raw( rest_url( EVENTKOI_API ) ),
			'supabase_config_url' => defined( 'EVENTKOI_CONFIG' ) ? EVENTKOI_CONFIG : '',
			'supabase_config'     => is_array( $remote_config ) ? $remote_config : null,
			'plugin_url'          => trailingslashit( EVENTKOI_PLUGIN_URL ),
			'settings'            => $safe_settings,
			'general_options_url' => admin_url( 'options-general.php' ),
			'site_url'            => get_bloginfo( 'url' ),
			'theme'               => get_stylesheet(),
			'admin_email'         => get_bloginfo( 'admin_email' ),
			'instance_id'         => get_option( 'eventkoi_site_instance_id' ),
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

		$eventkoi_params['custom_templates'] = self::get_custom_templates();

		if ( $is_dev ) {
			$vite_url = trim( file_get_contents( $hot_file ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			wp_register_script(
				'eventkoi-admin',
				$vite_url . '/src/index.js',
				$asset_file['dependencies'],
				null,
				true
			);
			add_filter(
				'script_loader_tag',
				function ( $tag, $handle ) use ( $vite_url ) {
					if ( 'eventkoi-admin' !== $handle ) {
						return $tag;
					}
					$client = '<script type="module" src="' . esc_url( $vite_url . '/@vite/client' ) . '"></script>' . "\n";
					$tag    = str_replace( array( " type='text/javascript'", ' type="text/javascript"' ), '', $tag );
					$tag    = str_replace( '<script ', '<script type="module" ', $tag );
					return $client . $tag;
				},
				10,
				2
			);
		} else {
			wp_register_script(
				'eventkoi-admin',
				$build_url . 'index.js',
				$asset_file['dependencies'],
				$asset_file['version'],
				true
			);
		}

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

		if ( ! $is_dev ) {
			wp_register_style(
				'eventkoi-admin',
				$build_url . 'index.css',
				array( 'wp-components' ),
				$asset_file['version']
			);

			wp_enqueue_style( 'eventkoi-admin' );
		}

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
	 * Strip secrets before sending settings to the client.
	 *
	 * @param array $settings Full settings array.
	 * @return array Filtered settings safe for the browser.
	 */
	private static function get_client_safe_settings( array $settings ) {
		if ( isset( $settings['stripe'] ) && is_array( $settings['stripe'] ) ) {
			unset( $settings['stripe']['secret_key'] );
		}

		if ( isset( $settings['stripe_webhook'] ) ) {
			unset( $settings['stripe_webhook'] );
		}

		// When WooCommerce checkout is active, override currency with WC's currency.
		if ( class_exists( '\EventKoi\Core\WooCommerce_Checkout' )
			&& \EventKoi\Core\WooCommerce_Checkout::is_active()
			&& function_exists( 'get_woocommerce_currency' )
		) {
			$settings['currency'] = strtoupper( get_woocommerce_currency() );
		}

		return $settings;
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
