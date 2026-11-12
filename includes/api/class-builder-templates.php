<?php
/**
 * Beaver Builder and Divi templates API.
 *
 * @package    EventKoi
 * @subpackage EventKoi\API
 */

namespace EventKoi\API;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use EventKoi\Admin\Scripts;
use EventKoi\API\Settings;
use EventKoi\Core\Beaver_Templates;
use EventKoi\Core\Divi_Templates;

defined( 'ABSPATH' ) || exit;

/**
 * Class Builder_Templates.
 *
 * Reports the state of the ready-made Beaver Builder and Divi templates and
 * switches the site between them and the built-in block templates. Each
 * builder has its own route, shaped like the Elementor one.
 */
class Builder_Templates {

	/**
	 * Template classes keyed by the route they answer on.
	 *
	 * @return array<string, string>
	 */
	private static function builders() {
		return array(
			'beaver-templates' => Beaver_Templates::class,
			'divi-templates'   => Divi_Templates::class,
		);
	}

	/**
	 * Register REST routes.
	 *
	 * @return void
	 */
	public static function init() {
		foreach ( array_keys( self::builders() ) as $route ) {
			register_rest_route(
				EVENTKOI_API,
				'/' . $route,
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
	 * The template class a request is for.
	 *
	 * @param WP_REST_Request $request Request instance.
	 * @return string
	 */
	private static function templates_for( WP_REST_Request $request ) {
		$route = basename( (string) $request->get_route() );

		return self::builders()[ $route ] ?? '';
	}

	/**
	 * Current template state.
	 *
	 * @param WP_REST_Request $request Request instance.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function status( WP_REST_Request $request ) {
		$templates = self::templates_for( $request );

		if ( '' === $templates ) {
			return new WP_Error( 'eventkoi_invalid_builder', __( 'Unknown page builder.', 'eventkoi-lite' ), array( 'status' => 404 ) );
		}

		return rest_ensure_response( $templates::status() );
	}

	/**
	 * Apply a builder's templates or go back to the block templates.
	 *
	 * @param WP_REST_Request $request Request instance.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function update( WP_REST_Request $request ) {
		$templates = self::templates_for( $request );

		if ( '' === $templates ) {
			return new WP_Error( 'eventkoi_invalid_builder', __( 'Unknown page builder.', 'eventkoi-lite' ), array( 'status' => 404 ) );
		}

		$action = sanitize_key( (string) $request->get_param( 'action' ) );

		if ( 'apply' === $action ) {
			if ( ! $templates::is_available() ) {
				return new WP_Error(
					'eventkoi_' . $templates::builder() . '_missing',
					sprintf(
						/* translators: %s: page builder name. */
						__( '%s needs to be active before its templates can be used.', 'eventkoi-lite' ),
						$templates::label()
					),
					array( 'status' => 409 )
				);
			}

			$status = $templates::apply();
		} elseif ( 'reset' === $action ) {
			$status = $templates::reset();
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
				'success'           => true,
				'status'            => $status,
				'settings'          => $settings,
				// The pickers list templates from a page-load snapshot; hand back
				// the current list so freshly imported templates show up at once.
				'custom_templates'  => Scripts::get_custom_templates(),
				// Applying one builder's templates takes the others out of use.
				'builder_templates' => Scripts::get_builder_template_statuses(),
			)
		);
	}
}
