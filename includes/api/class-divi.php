<?php
/**
 * Divi 5 builder preview endpoint.
 *
 * The visual builder cannot run PHP, so each EventKoi module asks this
 * route for its markup whenever its settings change and drops the result
 * into the canvas.
 *
 * @package    EventKoi
 * @subpackage EventKoi\API
 */

namespace EventKoi\API;

use EventKoi\Core\Divi5_Modules;
use WP_REST_Request;

defined( 'ABSPATH' ) || exit;

/**
 * Class Divi
 */
class Divi {

	/**
	 * Register the REST route.
	 *
	 * @return void
	 */
	public static function init() {
		register_rest_route(
			'eventkoi/v1',
			'/divi/render',
			array(
				'methods'             => 'POST',
				'permission_callback' => function () {
					return current_user_can( 'edit_posts' );
				},
				'args'                => array(
					'module' => array(
						'type'     => 'string',
						'required' => true,
						'enum'     => Divi5_Modules::MODULES,
					),
					'attrs'  => array(
						'type'    => 'object',
						'default' => array(),
					),
					'post'   => array(
						'type'    => 'integer',
						'default' => 0,
					),
				),
				'callback'            => array( __CLASS__, 'render' ),
			)
		);
	}

	/**
	 * Render a module preview.
	 *
	 * Every setting is validated by the renderer itself (IDs are cast,
	 * choices are checked against their allowed values), so the attribute
	 * tree is passed through untouched.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public static function render( WP_REST_Request $request ) {
		$module  = sanitize_key( (string) $request->get_param( 'module' ) );
		$attrs   = $request->get_param( 'attrs' );
		$post_id = absint( $request->get_param( 'post' ) );

		if ( ! in_array( $module, Divi5_Modules::MODULES, true ) ) {
			return rest_ensure_response( array( 'html' => '' ) );
		}

		// A chosen event that is not public may only be previewed by someone allowed to read it.
		if ( 'event' === $module && is_array( $attrs ) ) {
			$event_id = absint( Divi5_Modules::attr_value( $attrs, 'event', 0 ) );
			if ( $event_id && ( 'eventkoi_event' !== get_post_type( $event_id ) || ( 'publish' !== get_post_status( $event_id ) && ! current_user_can( 'read_post', $event_id ) ) ) ) {
				return new \WP_Error( 'rest_forbidden', __( 'You cannot preview this event.', 'eventkoi-lite' ), array( 'status' => 403 ) );
			}
		}

		// The event module falls back to "the current event", which is the
		// post being edited in the builder.
		if ( $post_id && 'eventkoi_event' === get_post_type( $post_id ) && current_user_can( 'edit_post', $post_id ) ) {
			$event_post = get_post( $post_id );
			if ( $event_post ) {
				$GLOBALS['post'] = $event_post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Scope the preview to the edited event.
				setup_postdata( $event_post );
			}
		}

		$html = Divi5_Modules::render( $module, is_array( $attrs ) ? $attrs : array() );

		if ( $post_id ) {
			wp_reset_postdata();
		}

		return rest_ensure_response( array( 'html' => $html ) );
	}
}
