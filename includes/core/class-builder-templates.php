<?php
/**
 * Shared behaviour for the ready-made page builder templates.
 *
 * Each builder (Beaver Builder, Divi) imports the same three layouts into its
 * own library as ordinary, editable templates, remembers which library posts
 * are ours, and points the default template settings at them (or back at the
 * built-in block templates). This mirrors Elementor_Templates step for step.
 *
 * @package EventKoi
 */

namespace EventKoi\Core;

use WP_Error;
use WP_Post;

defined( 'ABSPATH' ) || exit;

/**
 * Class Builder_Templates.
 */
abstract class Builder_Templates {

	/**
	 * Short builder key used in option, meta and filter names.
	 *
	 * @return string
	 */
	abstract public static function builder();

	/**
	 * Builder name as shown to site owners.
	 *
	 * @return string
	 */
	abstract public static function label();

	/**
	 * Library post type the templates are stored as.
	 *
	 * @return string
	 */
	abstract public static function post_type();

	/**
	 * Whether the builder is active so templates can be imported and rendered.
	 *
	 * @return bool
	 */
	abstract protected static function builder_is_active();

	/**
	 * Create one library template.
	 *
	 * @param string $key        Template key.
	 * @param array  $definition Title and slug.
	 * @return int|WP_Error
	 */
	abstract protected static function create_template( $key, array $definition );

	/**
	 * The builder editor URL for a library post.
	 *
	 * @param int $id Post id.
	 * @return string
	 */
	abstract protected static function edit_url( $id );

	/**
	 * Prefix that marks a default template setting as one of this builder's
	 * library posts.
	 *
	 * @return string
	 */
	abstract public static function slug_prefix();

	/**
	 * Option holding the imported library post ids, keyed by template key.
	 *
	 * @return string
	 */
	public static function option_name() {
		return 'eventkoi_' . static::builder() . '_templates';
	}

	/**
	 * Post meta linking a library post back to its template key.
	 *
	 * @return string
	 */
	public static function relation_meta() {
		return '_eventkoi_' . static::builder() . '_template';
	}

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
	 * Whether the builder is active so templates can be imported and rendered.
	 *
	 * @return bool
	 */
	public static function is_available() {
		/**
		 * Filter whether the ready-made templates of a builder can be used.
		 *
		 * The dynamic part is the builder key: `beaver` or `divi`.
		 *
		 * @param bool $available True when the builder is active.
		 */
		return (bool) apply_filters( 'eventkoi_' . static::builder() . '_templates_available', static::builder_is_active() );
	}

	/**
	 * Whether the builder has everything loaded that creating a template
	 * needs. A builder can be active without that on some requests.
	 *
	 * @return bool
	 */
	protected static function ready_to_import() {
		return true;
	}

	/**
	 * The value a default template setting holds for a library post.
	 *
	 * @param WP_Post $post Library post.
	 * @return string
	 */
	public static function setting_value( WP_Post $post ) {
		return '' === $post->post_name ? '' : static::slug_prefix() . $post->post_name;
	}

	/**
	 * The imported library post for a template key, if it still exists.
	 *
	 * @param string $key Template key.
	 * @return WP_Post|null
	 */
	public static function get_template( $key ) {
		$stored = get_option( static::option_name(), array() );
		$id     = is_array( $stored ) ? absint( $stored[ $key ] ?? 0 ) : 0;

		if ( $id > 0 ) {
			$post = get_post( $id );
			if ( static::is_our_template( $post, $key ) ) {
				return $post;
			}
		}

		// The option can lag behind (a restored backup, a site clone): the
		// relationship meta on the post itself is the source of truth.
		$found = get_posts(
			array(
				'post_type'      => static::post_type(),
				'post_status'    => 'publish',
				'posts_per_page' => 1,
				'meta_key'       => static::relation_meta(), // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				'meta_value'     => $key, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
				'orderby'        => 'ID',
				'order'          => 'ASC',
			)
		);

		if ( ! empty( $found[0] ) && static::is_our_template( $found[0], $key ) ) {
			static::remember( $key, $found[0]->ID );
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
	protected static function is_our_template( $post, $key ) {
		return $post instanceof WP_Post
			&& static::post_type() === $post->post_type
			&& 'publish' === $post->post_status
			&& (string) get_post_meta( $post->ID, static::relation_meta(), true ) === $key;
	}

	/**
	 * Store the library post id for a template key.
	 *
	 * @param string $key Template key.
	 * @param int    $id  Post id.
	 */
	protected static function remember( $key, $id ) {
		$stored = get_option( static::option_name(), array() );
		$stored = is_array( $stored ) ? $stored : array();

		$stored[ $key ] = absint( $id );

		update_option( static::option_name(), $stored, false );
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
		if ( ! static::is_available() ) {
			return new WP_Error(
				'eventkoi_' . static::builder() . '_missing',
				/* translators: %s: page builder name. */
				sprintf( __( '%s is not active.', 'eventkoi-lite' ), static::label() )
			);
		}

		if ( ! static::ready_to_import() ) {
			return new WP_Error(
				'eventkoi_' . static::builder() . '_not_ready',
				/* translators: %s: page builder name. */
				sprintf( __( '%s has not finished loading, so its templates cannot be created yet.', 'eventkoi-lite' ), static::label() )
			);
		}

		$ids = array();

		foreach ( static::definitions() as $key => $definition ) {
			$existing = static::get_template( $key );

			if ( $existing instanceof WP_Post ) {
				$ids[ $key ] = $existing->ID;
				continue;
			}

			$id = static::create_template( $key, $definition );

			if ( is_wp_error( $id ) ) {
				return $id;
			}

			update_post_meta( $id, static::relation_meta(), $key );
			static::remember( $key, $id );
			$ids[ $key ] = $id;
		}

		if ( class_exists( '\EventKoi\Admin\Scripts' ) ) {
			\EventKoi\Admin\Scripts::flush_template_cache();
		}

		return $ids;
	}

	/**
	 * Import the templates and make them the site defaults.
	 *
	 * @return array|WP_Error Status after applying.
	 */
	public static function apply() {
		$ids = static::import();

		if ( is_wp_error( $ids ) ) {
			return $ids;
		}

		$settings = Settings::get();
		$previous = array();

		foreach ( static::setting_keys() as $key => $setting ) {
			$post = get_post( $ids[ $key ] ?? 0 );

			if ( $post instanceof WP_Post && '' !== $post->post_name ) {
				$value = static::setting_value( $post );
				$was   = sanitize_key( (string) ( $settings[ $setting ] ?? '' ) );
				if ( $was !== $value ) {
					$previous[ $setting ] = $was;
				}
				$settings[ $setting ] = $value;
			}
		}

		// Remember what the site used before, so switching back returns to it
		// rather than to the built-in templates.
		$stored = get_option( static::option_name(), array() );
		$stored = is_array( $stored ) ? $stored : array();
		if ( ! empty( $previous ) ) {
			$stored['previous'] = $previous;
			update_option( static::option_name(), $stored, false );
		}

		Settings::set( $settings );

		return static::status();
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
		$stored   = get_option( static::option_name(), array() );
		$stored   = is_array( $stored ) ? $stored : array();
		$previous = is_array( $stored['previous'] ?? null ) ? $stored['previous'] : array();
		// Another builder's ready-made templates are not a choice to go back
		// to either: "default" has to mean the built-in templates.
		$ours = self::ready_made_setting_values();

		foreach ( static::setting_keys() as $setting ) {
			$restore = sanitize_key( (string) ( $previous[ $setting ] ?? '' ) );
			// The previous value is only worth restoring when it was a real
			// choice and not one of these templates.
			$settings[ $setting ] = ( '' !== $restore && ! in_array( $restore, $ours, true ) ) ? $restore : 'default';
		}

		unset( $stored['previous'] );
		update_option( static::option_name(), $stored, false );

		Settings::set( $settings );

		return static::status();
	}

	/**
	 * The setting values of every ready-made template on this site, across
	 * Elementor, Beaver Builder and Divi.
	 *
	 * @return string[]
	 */
	public static function ready_made_setting_values() {
		$values = array();

		foreach ( array( Beaver_Templates::class, Divi_Templates::class ) as $templates ) {
			foreach ( array_keys( $templates::definitions() ) as $key ) {
				$post = $templates::get_template( $key );
				if ( $post instanceof WP_Post ) {
					$values[] = $templates::setting_value( $post );
				}
			}
		}

		if ( Elementor_Templates::is_available() ) {
			foreach ( array_keys( Elementor_Templates::definitions() ) as $key ) {
				$post = Elementor_Templates::get_template( $key );
				if ( $post instanceof WP_Post ) {
					$values[] = $post->post_name;
				}
			}
		}

		return array_values( array_filter( array_unique( $values ) ) );
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
		$available = static::is_available();

		foreach ( static::definitions() as $key => $definition ) {
			$post    = $available ? static::get_template( $key ) : null;
			$setting = static::setting_keys()[ $key ];
			$current = sanitize_key( (string) ( $settings[ $setting ] ?? '' ) );
			$value   = $post instanceof WP_Post ? static::setting_value( $post ) : '';
			$in_use  = '' !== $value && $current === $value;

			$templates[ $key ] = array(
				'title'       => $definition['title'],
				'description' => $definition['description'],
				'id'          => $post instanceof WP_Post ? $post->ID : 0,
				'slug'        => $value,
				'edit_url'    => $post instanceof WP_Post ? static::edit_url( $post->ID ) : '',
				'active'      => $in_use,
			);

			$imported = $imported && $post instanceof WP_Post;
			$active   = $active && $in_use;
		}

		return array(
			'builder'   => static::builder(),
			'label'     => static::label(),
			'available' => $available,
			'imported'  => $imported,
			'active'    => $active,
			'templates' => $templates,
		);
	}
}
