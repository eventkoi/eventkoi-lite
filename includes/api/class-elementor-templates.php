<?php
/**
 * REST API - Elementor templates.
 *
 * @package    EventKoi
 * @subpackage EventKoi\API
 */

namespace EventKoi\API;

use EventKoi\Admin\Scripts;
use EventKoi\Core\Elementor_Templates as Templates;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * Class Elementor_Templates.
 *
 * Reports the state of the ready-made Elementor templates and switches the
 * site between them and the built-in block templates.
 */
class Elementor_Templates {

	/**
	 * Register REST routes.
	 *
	 * @return void
	 */
	public static function init() {
		register_rest_route(
			EVENTKOI_API,
			'/elementor-templates',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'status' ),
					'permission_callback' => array( self::class, 'permission_check' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( self::class, 'update' ),
					'permission_callback' => array( self::class, 'permission_check' ),
					'args'                => array(
						'action' => array(
							'required' => true,
							'type'     => 'string',
							'enum'     => array( 'apply', 'reset' ),
						),
					),
				),
			)
		);
	}

	/**
	 * Only site administrators may create library templates and change the
	 * site-wide defaults.
	 *
	 * @param WP_REST_Request $request Request instance.
	 * @return bool
	 */
	public static function permission_check( WP_REST_Request $request ) {
		$nonce = $request->get_header( 'x_wp_nonce' );

		if ( ! $nonce ) {
			$nonce = $request->get_param( '_wpnonce' );
		}

		if ( ! $nonce || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return false;
		}

		return current_user_can( 'manage_options' );
	}

	/**
	 * Current template state.
	 *
	 * @return WP_REST_Response
	 */
	public static function status() {
		return rest_ensure_response( Templates::status() );
	}

	/**
	 * Apply the Elementor templates or go back to the block templates.
	 *
	 * @param WP_REST_Request $request Request instance.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function update( WP_REST_Request $request ) {
		$action = sanitize_key( (string) $request->get_param( 'action' ) );

		if ( 'apply' === $action ) {
			if ( ! Templates::is_available() ) {
				return new WP_Error(
					'eventkoi_elementor_missing',
					__( 'Elementor needs to be active before its templates can be used.', 'eventkoi-lite' ),
					array( 'status' => 409 )
				);
			}

			$status = Templates::apply();
		} elseif ( 'reset' === $action ) {
			$status = Templates::reset();
		} else {
			return new WP_Error( 'eventkoi_invalid_action', __( 'Unknown action.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		if ( is_wp_error( $status ) ) {
			$status->add_data( array( 'status' => 500 ) );
			return $status;
		}

		// The same client-safe settings the settings endpoint returns, so the
		// admin can swap its settings state in one go.
		$settings = rest_ensure_response( Settings::get_settings() )->get_data();

		return rest_ensure_response(
			array(
				'success'          => true,
				'status'           => $status,
				'settings'         => $settings,
				// The pickers list templates from a page-load snapshot; hand back
				// the current list so freshly imported templates show up at once.
				'custom_templates' => Scripts::get_custom_templates(),
			)
		);
	}
}
