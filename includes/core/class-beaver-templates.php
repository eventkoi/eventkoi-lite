<?php
/**
 * Ready-made Beaver Builder templates for event, series and calendar pages.
 *
 * Imports the layouts from Beaver_Layouts as ordinary, editable saved
 * templates, remembers which ones are ours, and points the default template
 * settings at them (or back at the built-in block templates).
 *
 * @package EventKoi
 */

namespace EventKoi\Core;

use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Class Beaver_Templates.
 */
class Beaver_Templates extends Builder_Templates {

	/**
	 * Short builder key used in option, meta and filter names.
	 *
	 * @return string
	 */
	public static function builder() {
		return 'beaver';
	}

	/**
	 * Builder name as shown to site owners.
	 *
	 * @return string
	 */
	public static function label() {
		return __( 'Beaver Builder', 'eventkoi-lite' );
	}

	/**
	 * Saved templates live in Beaver Builder's own template post type.
	 *
	 * @return string
	 */
	public static function post_type() {
		return 'fl-builder-template';
	}

	/**
	 * The prefix the template picker already uses for saved Beaver templates.
	 *
	 * @return string
	 */
	public static function slug_prefix() {
		return 'bb__';
	}

	/**
	 * Saved templates and the shortcode that renders them come with Beaver
	 * Builder's paid editions; the free one has neither.
	 *
	 * @return bool
	 */
	protected static function builder_is_active() {
		return class_exists( '\FLBuilderModel' )
			&& post_type_exists( self::post_type() )
			&& shortcode_exists( 'fl_builder_insert_layout' );
	}

	/**
	 * Create one saved template from a node list.
	 *
	 * @param string $key        Template key.
	 * @param array  $definition Title and slug.
	 * @return int|WP_Error
	 */
	protected static function create_template( $key, array $definition ) {
		$layouts = new Beaver_Layouts();
		$nodes   = $layouts->build( $key );

		if ( empty( $nodes ) ) {
			return new WP_Error( 'eventkoi_beaver_layout', __( 'The template layout is empty.', 'eventkoi-lite' ) );
		}

		$id = wp_insert_post(
			array(
				'post_type'      => self::post_type(),
				'post_title'     => $definition['title'],
				'post_name'      => $definition['slug'],
				'post_status'    => 'publish',
				'ping_status'    => 'closed',
				'comment_status' => 'closed',
			),
			true
		);

		if ( is_wp_error( $id ) ) {
			return $id;
		}

		$id = (int) $id;

		if ( $id <= 0 ) {
			return new WP_Error( 'eventkoi_beaver_create', __( 'The template could not be created.', 'eventkoi-lite' ) );
		}

		// Published and draft copies are both written, the way the builder
		// leaves a template after its first save.
		update_post_meta( $id, '_fl_builder_data', $nodes );
		update_post_meta( $id, '_fl_builder_draft', $nodes );
		update_post_meta( $id, '_fl_builder_data_settings', new \stdClass() );
		update_post_meta( $id, '_fl_builder_draft_settings', new \stdClass() );
		update_post_meta( $id, '_fl_builder_enabled', true );
		update_post_meta( $id, '_fl_builder_template_id', Beaver_Layouts::id() );
		update_post_meta( $id, '_fl_builder_template_global', 0 );

		// The Templates screen lists saved layouts by this term.
		if ( taxonomy_exists( 'fl-builder-template-type' ) ) {
			wp_set_object_terms( $id, 'layout', 'fl-builder-template-type' );
		}

		return $id;
	}

	/**
	 * The Beaver Builder editor URL for a saved template.
	 *
	 * @param int $id Post id.
	 * @return string
	 */
	protected static function edit_url( $id ) {
		if ( class_exists( '\FLBuilderModel' ) && method_exists( '\FLBuilderModel', 'get_edit_url' ) ) {
			return (string) \FLBuilderModel::get_edit_url( absint( $id ) );
		}

		return add_query_arg( 'fl_builder', '', (string) get_permalink( absint( $id ) ) );
	}
}
