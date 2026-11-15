<?php
/**
 * Ready-made Divi templates for event, series and calendar pages.
 *
 * Imports the layouts from Divi_Layouts into the Divi Library as ordinary,
 * editable layouts, remembers which ones are ours, and points the default
 * template settings at them (or back at the built-in block templates).
 *
 * @package EventKoi
 */

namespace EventKoi\Core;

use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Class Divi_Templates.
 */
class Divi_Templates extends Builder_Templates {

	/**
	 * Short builder key used in option, meta and filter names.
	 *
	 * @return string
	 */
	public static function builder() {
		return 'divi';
	}

	/**
	 * Builder name as shown to site owners.
	 *
	 * @return string
	 */
	public static function label() {
		return __( 'Divi', 'eventkoi-lite' );
	}

	/**
	 * Layouts live in the Divi Library post type.
	 *
	 * @return string
	 */
	public static function post_type() {
		return 'et_pb_layout';
	}

	/**
	 * Prefix that marks a default template setting as a Divi Library layout.
	 *
	 * @return string
	 */
	public static function slug_prefix() {
		return 'divi__';
	}

	/**
	 * The Divi theme or the Divi Builder plugin is running.
	 *
	 * @return bool
	 */
	protected static function builder_is_active() {
		return defined( 'ET_BUILDER_VERSION' )
			|| defined( 'ET_BUILDER_PLUGIN_VERSION' )
			|| in_array( get_template(), array( 'Divi', 'Extra' ), true );
	}

	/**
	 * Divi leaves its builder unloaded on most wp-admin screens. Layouts can
	 * only be created, and converted for Divi 5, once it is loaded.
	 *
	 * @return bool
	 */
	protected static function ready_to_import() {
		return defined( 'ET_BUILDER_VERSION' ) && post_type_exists( self::post_type() );
	}

	/**
	 * Ask Divi to load its builder on the EventKoi admin screen, where the
	 * template pickers list the Divi Library and import the layouts.
	 *
	 * @param bool $should_load Whether Divi loads its builder for this request.
	 * @return bool
	 */
	public static function load_builder_on_eventkoi_screen( $should_load ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only check of the admin page being opened.
		$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : '';

		return ( is_admin() && 'eventkoi' === $page ) ? true : $should_load;
	}

	/**
	 * Whether this site runs Divi 5, which stores layouts in its own format.
	 *
	 * @return bool
	 */
	public static function is_divi_5() {
		return class_exists( '\ET\Builder\Packages\Conversion\Conversion' );
	}

	/**
	 * Create one library layout.
	 *
	 * @param string $key        Template key.
	 * @param array  $definition Title and slug.
	 * @return int|WP_Error
	 */
	protected static function create_template( $key, array $definition ) {
		$layouts = new Divi_Layouts();
		$content = $layouts->build( $key );

		if ( '' === $content ) {
			return new WP_Error( 'eventkoi_divi_layout', __( 'The template layout is empty.', 'eventkoi-lite' ) );
		}

		$divi_5 = false;

		// Divi 5 converts classic layouts to its own format with the same
		// routine it runs on a site upgrade, so the layout opens natively in
		// the Divi 5 builder.
		if ( self::is_divi_5() && method_exists( '\ET\Builder\Packages\Conversion\Conversion', 'maybeConvertContent' ) ) {
			// Divi only loads each module's conversion rules in wp-admin; this
			// is its own signal to load them before a conversion elsewhere
			// (the import also runs from a REST request).
			do_action( 'divi_visual_builder_before_d4_conversion' ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Divi's hook.

			$converted = \ET\Builder\Packages\Conversion\Conversion::maybeConvertContent( $content );

			if ( is_string( $converted ) && '' !== trim( $converted ) && false !== strpos( $converted, '<!-- wp:divi/' ) ) {
				$content = $converted;
				$divi_5  = true;
			}
		}

		// Layout content is builder markup, not user text: saving it through
		// the content filters would strip its attributes for users without
		// unfiltered_html, the same reason Divi suspends them on import.
		$filters_active = has_filter( 'content_save_pre', 'wp_filter_post_kses' );
		if ( $filters_active ) {
			kses_remove_filters();
		}

		$id = wp_insert_post(
			array(
				'post_type'      => self::post_type(),
				'post_title'     => $definition['title'],
				'post_name'      => $definition['slug'],
				'post_status'    => 'publish',
				'post_content'   => wp_slash( $content ),
				'ping_status'    => 'closed',
				'comment_status' => 'closed',
			),
			true
		);

		if ( $filters_active ) {
			kses_init_filters();
		}

		if ( is_wp_error( $id ) ) {
			return $id;
		}

		$id = (int) $id;

		if ( $id <= 0 ) {
			return new WP_Error( 'eventkoi_divi_create', __( 'The template could not be created.', 'eventkoi-lite' ) );
		}

		update_post_meta( $id, '_et_pb_use_builder', 'on' );
		update_post_meta( $id, '_et_pb_built_for_post_type', 'page' );

		if ( $divi_5 ) {
			update_post_meta( $id, '_et_pb_use_divi_5', 'on' );
		}

		// The Divi Library lists layouts by these terms.
		$terms = array(
			'layout_type'  => 'layout',
			'scope'        => 'non_global',
			'module_width' => 'regular',
		);

		foreach ( $terms as $taxonomy => $term ) {
			if ( taxonomy_exists( $taxonomy ) ) {
				wp_set_object_terms( $id, $term, $taxonomy );
			}
		}

		return $id;
	}

	/**
	 * The Divi builder URL for a library layout.
	 *
	 * @param int $id Post id.
	 * @return string
	 */
	protected static function edit_url( $id ) {
		$link = (string) get_permalink( absint( $id ) );

		if ( function_exists( 'et_fb_get_vb_url' ) && '' !== $link ) {
			return (string) et_fb_get_vb_url( $link );
		}

		return add_query_arg(
			array(
				'post'   => absint( $id ),
				'action' => 'edit',
			),
			admin_url( 'post.php' )
		);
	}
}
