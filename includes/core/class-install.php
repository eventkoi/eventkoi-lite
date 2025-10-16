<?php
/**
 * Handles installation, updates, and migration for the EventKoi plugin.
 *
 * Responsible for:
 * - Creating default terms
 * - Storing plugin version
 * - Deferring rewrite flush
 * - Migrating legacy post types
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

	private const META_KEYS = array(
		'start_date',
		'end_date',
		'date_type',
		'event_days',
		'recurrence_rules',
	);

	/**
	 * Constructor: Hooks version check early.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'maybe_install' ), 6 );
		add_action( 'init', array( $this, 'maybe_flush_rewrite_rules' ), 20 );
		add_action( 'init', array( $this, 'maybe_migrate_eventkoi_events' ), 25 );
	}

	/**
	 * Checks if plugin needs installation or update.
	 */
	public function maybe_install() {
		$stored  = get_option( 'eventkoi_version', '' );
		$current = defined( 'EVENTKOI_VERSION' ) ? EVENTKOI_VERSION : '';

		if ( ! $current || defined( 'IFRAME_REQUEST' ) ) {
			return;
		}

		if ( ! $stored || $stored !== $current ) {
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

		set_transient( 'eventkoi_installing', 'yes', MINUTE_IN_SECONDS * 10 );

		self::maybe_define_constant( 'EVENTKOI_INSTALLING', true );

		self::install_core();

		// Flag for rewrite flush on next init after all rewrites are registered.
		update_option( 'eventkoi_flush_needed', 'yes' );

		do_action( 'eventkoi_installed' );
		do_action( 'eventkoi_admin_installed' );
	}

	/**
	 * Returns whether installation is running.
	 */
	private static function is_installing() {
		return get_transient( 'eventkoi_installing' ) === 'yes';
	}

	/**
	 * Core install tasks.
	 */
	private static function install_core() {
		self::create_terms();
		self::update_version();

		// Clear install flag.
		delete_transient( 'eventkoi_installing' );
	}

	/**
	 * Create default calendar taxonomy term if missing.
	 */
	private static function create_terms() {
		$option_key    = 'eventkoi_default_event_cal';
		$existing_term = get_term( get_option( $option_key ), 'event_cal' );

		if ( $existing_term && ! is_wp_error( $existing_term ) ) {
			return;
		}

		/* translators: default calendar term name */
		$term_name = esc_html_x( 'Default calendar', 'Default calendar term', 'eventkoi-lite' );
		$slug      = sanitize_title( $term_name );

		$existing = get_term_by( 'slug', $slug, 'event_cal' );

		if ( $existing && ! is_wp_error( $existing ) ) {
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

	/**
	 * Migrate old EventKoi posts
	 *
	 * Detects EventKoi posts by checking for unique EventKoi meta keys.
	 * Runs once and stores a flag to prevent repeat execution.
	 *
	 * @return void
	 */
	public function maybe_migrate_eventkoi_events() {
		// Only run once.
		if ( get_option( 'eventkoi_migrated_event_posts' ) ) {
			return;
		}

		global $wpdb;

		// EventKoi-specific meta keys used to detect our events.
		$meta_keys = self::META_KEYS;

		// Bail early if list is empty.
		if ( empty( $meta_keys ) ) {
			return;
		}

		$postmeta_table = $wpdb->postmeta;
		$posts_table    = $wpdb->posts;

		// Build a comma-separated list of meta keys, each escaped individually.
		$in_meta = implode(
			"', '",
			array_map( 'esc_sql', $meta_keys )
		);

		// Build query — PHPCS-safe, with no dynamic placeholders injected directly.
		$sql = "
		SELECT DISTINCT pm.post_id
		FROM {$postmeta_table} AS pm
		INNER JOIN {$posts_table} AS p ON p.ID = pm.post_id
		WHERE pm.meta_key IN ( '{$in_meta}' )
		  AND p.post_type = %s
	";

		// Prepare safely the variable part (post_type).
		$prepared_sql = $wpdb->prepare( $sql, 'event' ); // phpcs:ignore.

		// Fetch IDs to migrate.
		$post_ids = $wpdb->get_col( $prepared_sql ); // phpcs:ignore.

		if ( empty( $post_ids ) ) {
			update_option( 'eventkoi_migrated_event_posts', 'none_found' );
			return;
		}

		$post_ids = array_map( 'absint', $post_ids );

		if ( ! empty( $post_ids ) ) {
			$ids_in = implode( ',', $post_ids );

			$wpdb->query( "UPDATE {$wpdb->posts} SET post_type = 'eventkoi_event' WHERE ID IN ($ids_in)" ); // phpcs:ignore

			foreach ( $post_ids as $post_id ) {
				clean_post_cache( $post_id );
			}
		}

		// Mark as completed and request permalink flush.
		update_option( 'eventkoi_migrated_event_posts', gmdate( 'Y-m-d H:i:s' ) );
		update_option( 'eventkoi_flush_needed', 'yes' );

		/**
		 * Fires after EventKoi post type migration completes.
		 *
		 * @param int $count Number of migrated posts.
		 */
		do_action( 'eventkoi_event_posts_migrated', count( $post_ids ) );
	}
}
