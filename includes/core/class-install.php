<?php
/**
 * Handles the plugin installation and updates.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Install
 */
class Install {

	/**
	 * Constructor: Hooks version check early.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'maybe_install' ), 6 );
		add_action( 'init', array( $this, 'maybe_flush_rewrite_rules' ), 20 );
	}

	/**
	 * Checks if plugin needs installation or update.
	 */
	public function maybe_install() {
		$stored  = get_option( 'eventkoi_version', '' );
		$current = defined( 'EVENTKOI_VERSION' ) ? EVENTKOI_VERSION : '';

		if ( $stored !== $current && ! defined( 'IFRAME_REQUEST' ) ) {
			self::install();
			do_action( 'eventkoi_updated', $stored, $current );
		}
	}

	/**
	 * Run the installation process.
	 */
	public static function install() {
		if ( ! is_blog_installed() || self::is_installing() ) {
			return;
		}

		set_transient( 'ek_installing', 'yes', MINUTE_IN_SECONDS * 10 );

		self::maybe_define_constant( 'EK_INSTALLING', true );

		self::install_core();

		if ( ! has_action( 'eventkoi_flush_rewrite_rules' ) ) {
			flush_rewrite_rules();
		}

		do_action( 'eventkoi_flush_rewrite_rules' );
		do_action( 'eventkoi_installed' );
		do_action( 'eventkoi_admin_installed' );
	}

	/**
	 * Returns whether installation is running.
	 */
	private static function is_installing() {
		return get_transient( 'ek_installing' ) === 'yes';
	}

	/**
	 * Core install tasks.
	 */
	private static function install_core() {
		self::create_terms();
		self::update_version();

		// Clear install flag.
		delete_transient( 'ek_installing' );
	}

	/**
	 * Create default calendar taxonomy term if missing.
	 */
	private static function create_terms() {
		$option_key = 'default_event_cal';
		$current_id = (int) get_option( $option_key, 0 );

		if ( $current_id && term_exists( $current_id, 'event_cal' ) ) {
			return;
		}

		$term_name = esc_html_x( 'Default calendar', 'Default category slug', 'eventkoi-lite' );
		$slug      = sanitize_title( $term_name );

		$existing = get_term_by( 'slug', $slug, 'event_cal' );

		if ( $existing ) {
			update_option( $option_key, (int) $existing->term_taxonomy_id );
			return;
		}

		$result = wp_insert_term(
			$term_name,
			'event_cal',
			array( 'slug' => $slug )
		);

		if ( ! is_wp_error( $result ) && ! empty( $result['term_taxonomy_id'] ) ) {
			update_option( $option_key, (int) $result['term_taxonomy_id'] );
		}
	}

	/**
	 * Update the plugin version stored in DB.
	 */
	private static function update_version() {
		$current = defined( 'EVENTKOI_VERSION' ) ? EVENTKOI_VERSION : '';
		update_option( 'eventkoi_version', $current );
	}

	/**
	 * Define a constant if it isn't already defined.
	 *
	 * @param string $name  Constant name.
	 * @param mixed  $value Constant value.
	 */
	private static function maybe_define_constant( $name, $value ) {
		if ( ! defined( $name ) ) {
			define( $name, $value );
		}
	}

	/**
	 * Flush rewrite rules once if flagged.
	 */
	public function maybe_flush_rewrite_rules() {
		if ( 'yes' === get_option( 'eventkoi_flush_needed' ) ) {
			delete_option( 'eventkoi_flush_needed' );

			// Let all custom rewrite rules register first.
			do_action( 'eventkoi_register_rewrites' );

			flush_rewrite_rules();
		}
	}
}
