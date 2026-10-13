<?php
/**
 * Ready-made Elementor templates for event, series and calendar pages.
 *
 * Imports the layouts from Elementor_Layouts into the Elementor library as
 * ordinary, editable page templates, remembers which library posts are ours,
 * and points the default template settings at them (or back at the built-in
 * block templates).
 *
 * @package EventKoi
 */

namespace EventKoi\Core;

use WP_Error;
use WP_Post;

defined( 'ABSPATH' ) || exit;

/**
 * Class Elementor_Templates.
 */
class Elementor_Templates {

	/**
	 * Option holding the imported library post ids, keyed by template key.
	 */
	const OPTION = 'eventkoi_elementor_templates';

	/**
	 * Post meta linking a library post back to its template key.
	 */
	const RELATION_META = '_eventkoi_elementor_template';

	/**
	 * Library document type the templates import as.
	 */
	const DOCUMENT_TYPE = 'page';

	/**
	 * Page template the library posts open with in the editor: the theme's
	 * header and footer without a post title, since the design is the page.
	 */
	const PAGE_TEMPLATE = 'elementor_header_footer';

	/**
	 * Settings keys the templates are applied to, keyed by template key.
	 *
	 * @return array<string, string>
	 */
	public static function setting_keys() {
		return array(
			'event'    => 'default_event_template',
			'series'   => 'default_series_template',
			'calendar' => 'default_calendar_template',
		);
	}

	/**
	 * The templates this plugin ships.
	 *
	 * @return array<string, array{title: string, slug: string, description: string}>
	 */
	public static function definitions() {
		return array(
			'event'    => array(
				'title'       => __( 'EventKoi Event Page', 'eventkoi-lite' ),
				'slug'        => 'eventkoi-event-page',
				'description' => __( 'The page a single event opens on.', 'eventkoi-lite' ),
			),
			'series'   => array(
				'title'       => __( 'EventKoi Event Series Page', 'eventkoi-lite' ),
				'slug'        => 'eventkoi-event-series-page',
				'description' => __( 'The overview page of a recurring event, listing its dates.', 'eventkoi-lite' ),
			),
			'calendar' => array(
				'title'       => __( 'EventKoi Calendar Page', 'eventkoi-lite' ),
				'slug'        => 'eventkoi-calendar-page',
				'description' => __( 'The page each calendar opens on.', 'eventkoi-lite' ),
			),
		);
	}

	/**
	 * Whether Elementor is active so templates can be imported and rendered.
	 *
	 * @return bool
	 */
	public static function is_available() {
		$available = defined( 'ELEMENTOR_VERSION' ) && class_exists( '\Elementor\Plugin' );

		/**
		 * Filter whether the ready-made Elementor templates can be used.
		 *
		 * @param bool $available True when Elementor is active.
		 */
		return (bool) apply_filters( 'eventkoi_elementor_templates_available', $available );
	}

	/**
	 * The imported library post for a template key, if it still exists.
	 *
	 * @param string $key Template key.
	 * @return WP_Post|null
	 */
	public static function get_template( $key ) {
		$stored = get_option( self::OPTION, array() );
		$id     = is_array( $stored ) ? absint( $stored[ $key ] ?? 0 ) : 0;

		if ( $id > 0 ) {
			$post = get_post( $id );
			if ( self::is_our_template( $post, $key ) ) {
				return $post;
			}
		}

		// The option can lag behind (a restored backup, a site clone): the
		// relationship meta on the post itself is the source of truth.
		$found = get_posts(
			array(
				'post_type'      => 'elementor_library',
				'post_status'    => 'publish',
				'posts_per_page' => 1,
				'meta_key'       => self::RELATION_META, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				'meta_value'     => $key, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
				'orderby'        => 'ID',
				'order'          => 'ASC',
			)
		);

		if ( ! empty( $found[0] ) && self::is_our_template( $found[0], $key ) ) {
			self::remember( $key, $found[0]->ID );
			return $found[0];
		}

		return null;
	}

	/**
	 * Whether a post is a live library template of ours for the given key.
	 *
	 * @param mixed  $post Post.
	 * @param string $key  Template key.
	 * @return bool
	 */
	private static function is_our_template( $post, $key ) {
		return $post instanceof WP_Post
			&& 'elementor_library' === $post->post_type
			&& 'publish' === $post->post_status
			&& (string) get_post_meta( $post->ID, self::RELATION_META, true ) === $key;
	}

	/**
	 * Store the library post id for a template key.
	 *
	 * @param string $key Template key.
	 * @param int    $id  Post id.
	 */
	private static function remember( $key, $id ) {
		$stored = get_option( self::OPTION, array() );
		$stored = is_array( $stored ) ? $stored : array();

		$stored[ $key ] = absint( $id );

		update_option( self::OPTION, $stored, false );
	}

	/**
	 * Import every template that is not already in the library.
	 *
	 * Existing templates are kept as they are, edits included; only missing
	 * ones are created.
	 *
	 * @return array<string, int>|WP_Error Library post ids keyed by template key.
	 */
	public static function import() {
		if ( ! self::is_available() ) {
			return new WP_Error( 'eventkoi_elementor_missing', __( 'Elementor is not active.', 'eventkoi-lite' ) );
		}

		$ids     = array();
		$layouts = new Elementor_Layouts( Elementor_Layouts::site_uses_containers() );

		foreach ( self::definitions() as $key => $definition ) {
			$existing = self::get_template( $key );

			if ( $existing instanceof WP_Post ) {
				$ids[ $key ] = $existing->ID;
				continue;
			}

			$id = self::create_template( $key, $definition, $layouts->build( $key ) );

			if ( is_wp_error( $id ) ) {
				return $id;
			}

			self::remember( $key, $id );
			$ids[ $key ] = $id;
		}

		if ( class_exists( '\EventKoi\Admin\Scripts' ) ) {
			\EventKoi\Admin\Scripts::flush_template_cache();
		}

		return $ids;
	}

	/**
	 * Create one library template from an element tree.
	 *
	 * @param string $key        Template key.
	 * @param array  $definition Title and slug.
	 * @param array  $elements   Element tree.
	 * @return int|WP_Error
	 */
	private static function create_template( $key, array $definition, array $elements ) {
		if ( empty( $elements ) ) {
			return new WP_Error( 'eventkoi_elementor_layout', __( 'The template layout is empty.', 'eventkoi-lite' ) );
		}

		$document = \Elementor\Plugin::$instance->documents->create(
			self::DOCUMENT_TYPE,
			array(
				'post_title'  => $definition['title'],
				'post_name'   => $definition['slug'],
				'post_status' => 'publish',
			)
		);

		if ( is_wp_error( $document ) ) {
			return $document;
		}

		$id = (int) $document->get_main_id();

		if ( $id <= 0 ) {
			return new WP_Error( 'eventkoi_elementor_create', __( 'The template could not be created.', 'eventkoi-lite' ) );
		}

		update_post_meta( $id, self::RELATION_META, $key );

		// Elementor's own save path also refreshes its caches. It refuses
		// callers Elementor does not consider editors (WP-CLI, cron), so the
		// data is written directly in that case; the editor reads it the same.
		$saved = false;
		if ( method_exists( $document, 'is_editable_by_current_user' ) && $document->is_editable_by_current_user() ) {
			$saved = false !== $document->save(
				array(
					'elements' => $elements,
					'settings' => array( 'template' => self::PAGE_TEMPLATE ),
				)
			);
		}

		if ( ! $saved ) {
			update_post_meta( $id, '_elementor_data', wp_slash( wp_json_encode( $elements ) ) );
			update_post_meta( $id, '_elementor_edit_mode', 'builder' );
			update_post_meta( $id, '_elementor_template_type', self::DOCUMENT_TYPE );
			update_post_meta( $id, '_elementor_version', defined( 'ELEMENTOR_VERSION' ) ? ELEMENTOR_VERSION : '' );
			update_post_meta( $id, '_elementor_page_settings', array( 'template' => self::PAGE_TEMPLATE ) );
			update_post_meta( $id, '_wp_page_template', self::PAGE_TEMPLATE );
		}

		// The library lists templates by this term, which Elementor's own
		// save path sets from the type meta; make sure it is there either way.
		if ( taxonomy_exists( 'elementor_library_type' ) ) {
			wp_set_object_terms( $id, self::DOCUMENT_TYPE, 'elementor_library_type' );
		}

		return $id;
	}

	/**
	 * Import the templates and make them the site defaults.
	 *
	 * @return array|WP_Error Status after applying.
	 */
	public static function apply() {
		$ids = self::import();

		if ( is_wp_error( $ids ) ) {
			return $ids;
		}

		$settings = Settings::get();
		$previous = array();

		foreach ( self::setting_keys() as $key => $setting ) {
			$post = get_post( $ids[ $key ] ?? 0 );

			if ( $post instanceof WP_Post && '' !== $post->post_name ) {
				$was = sanitize_key( (string) ( $settings[ $setting ] ?? '' ) );
				if ( $was !== $post->post_name ) {
					$previous[ $setting ] = $was;
				}
				$settings[ $setting ] = $post->post_name;
			}
		}

		// Remember what the site used before, so switching back returns to it
		// rather than to the built-in templates.
		$stored = get_option( self::OPTION, array() );
		$stored = is_array( $stored ) ? $stored : array();
		if ( ! empty( $previous ) ) {
			$stored['previous'] = $previous;
			update_option( self::OPTION, $stored, false );
		}

		Settings::set( $settings );

		return self::status();
	}

	/**
	 * Point the defaults back at the built-in block templates.
	 *
	 * The imported library templates are left in place so any edits survive
	 * and the site can switch back later.
	 *
	 * @return array Status after resetting.
	 */
	public static function reset() {
		$settings = Settings::get();
		$stored   = get_option( self::OPTION, array() );
		$stored   = is_array( $stored ) ? $stored : array();
		$previous = is_array( $stored['previous'] ?? null ) ? $stored['previous'] : array();
		$ours     = array();

		foreach ( self::definitions() as $key => $definition ) {
			$post = self::get_template( $key );
			if ( $post instanceof WP_Post ) {
				$ours[] = $post->post_name;
			}
		}

		foreach ( self::setting_keys() as $setting ) {
			$restore = sanitize_key( (string) ( $previous[ $setting ] ?? '' ) );
			// The previous value is only worth restoring when it was a real
			// choice and not one of these templates.
			$settings[ $setting ] = ( '' !== $restore && ! in_array( $restore, $ours, true ) ) ? $restore : 'default';
		}

		unset( $stored['previous'] );
		update_option( self::OPTION, $stored, false );

		Settings::set( $settings );

		return self::status();
	}

	/**
	 * Where things stand: availability, what is imported and what is in use.
	 *
	 * @return array
	 */
	public static function status() {
		$settings  = Settings::get();
		$templates = array();
		$imported  = true;
		$active    = true;

		foreach ( self::definitions() as $key => $definition ) {
			$post    = self::is_available() ? self::get_template( $key ) : null;
			$setting = self::setting_keys()[ $key ];
			$current = sanitize_key( (string) ( $settings[ $setting ] ?? '' ) );
			$in_use  = $post instanceof WP_Post && '' !== $current && $current === $post->post_name;

			$templates[ $key ] = array(
				'title'       => $definition['title'],
				'description' => $definition['description'],
				'id'          => $post instanceof WP_Post ? $post->ID : 0,
				'slug'        => $post instanceof WP_Post ? $post->post_name : '',
				'edit_url'    => $post instanceof WP_Post ? self::edit_url( $post->ID ) : '',
				'active'      => $in_use,
			);

			$imported = $imported && $post instanceof WP_Post;
			$active   = $active && $in_use;
		}

		return array(
			'available' => self::is_available(),
			'imported'  => $imported,
			'active'    => $active,
			'templates' => $templates,
		);
	}

	/**
	 * The Elementor editor URL for a library post.
	 *
	 * @param int $id Post id.
	 * @return string
	 */
	private static function edit_url( $id ) {
		return add_query_arg(
			array(
				'post'   => absint( $id ),
				'action' => 'elementor',
			),
			admin_url( 'post.php' )
		);
	}
}
