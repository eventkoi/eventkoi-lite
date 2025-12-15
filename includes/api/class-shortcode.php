<?php
/**
 * Shortcode helper REST endpoints.
 *
 * @package    EventKoi
 * @subpackage EventKoi\API
 */

namespace EventKoi\API;

use WP_REST_Request;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Class Shortcode
 */
class Shortcode {
	/**
	 * Register REST routes.
	 */
	public static function init() {
		register_rest_route(
			'eventkoi/v1',
			'/shortcode/resolve',
			array(
				'methods'             => 'POST',
				'permission_callback' => function () {
					return current_user_can( 'edit_posts' );
				},
				'args'                => array(
					'code' => array(
						'type'              => 'string',
						'required'          => true,
						'sanitize_callback' => 'wp_kses_post',
					),
				),
				'callback'            => array( __CLASS__, 'resolve_shortcode' ),
			)
		);
	}

	/**
	 * Resolve shortcode content and return the plain value.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return array
	 */
	public static function resolve_shortcode( WP_REST_Request $request ) {
		$code = $request->get_param( 'code' );

		if ( empty( $code ) ) {
			return array( 'value' => '' );
		}

		$rendered = do_shortcode( $code );
		$value    = trim( wp_strip_all_tags( $rendered ) );

		return array( 'value' => $value );
	}
}
