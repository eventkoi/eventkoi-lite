<?php
/**
 * REST API - Settings Endpoint.
 *
 * @package    EventKoi
 * @subpackage EventKoi\API
 */

namespace EventKoi\API;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use EventKoi\API\REST;
use EventKoi\Core\Settings as CoreSettings;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Class Settings.
 *
 * Handles get and update settings API endpoints.
 */
class Settings {

	/**
	 * Register REST routes.
	 *
	 * @return void
	 */
	public static function init() {
		register_rest_route(
			EVENTKOI_API,
			'/settings',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'get_settings' ),
				'permission_callback' => function () {
					return current_user_can( \EventKoi\Core\Permissions::ACCESS_CAP );
				},
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/settings',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'set_settings' ),
				'permission_callback' => function () {
					return current_user_can( \EventKoi\Core\Permissions::ACCESS_CAP );
				},
			)
		);

		// Live preview for custom PHP date/time format strings.
		register_rest_route(
			EVENTKOI_API,
			'/settings/preview-format',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'preview_format' ),
				'permission_callback' => REST::cap( 'eventkoi_settings_defaults' ),
				'args'                => array(
					'date' => array(
						'type'              => 'string',
						'required'          => false,
						'sanitize_callback' => 'sanitize_text_field',
					),
					'time' => array(
						'type'              => 'string',
						'required'          => false,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);
	}

	/**
	 * Render a sample of the requested PHP date and time format strings.
	 *
	 * @param WP_REST_Request $request The incoming REST request.
	 * @return WP_REST_Response
	 */
	public static function preview_format( WP_REST_Request $request ) {
		$date = trim( (string) $request->get_param( 'date' ) );
		$time = trim( (string) $request->get_param( 'time' ) );

		if ( '' === $date ) {
			$date = \eventkoi_resolved_date_format();
		}
		if ( '' === $time ) {
			$time = \eventkoi_resolved_time_format();
		}

		$now = time();
		return rest_ensure_response(
			array(
				'date'     => wp_date( $date, $now ),
				'time'     => wp_date( $time, $now ),
				'datetime' => wp_date( trim( $date . ', ' . $time, ', ' ), $now ),
			)
		);
	}

	/**
	 * Return the saved settings.
	 *
	 * @return WP_REST_Response Settings response.
	 */
	public static function get_settings() {
		$settings_api = new CoreSettings();
		$settings     = $settings_api::get();

		// When WooCommerce checkout is active, override currency with WC's currency.
		if ( class_exists( '\EventKoi\Core\WooCommerce_Checkout' )
			&& \EventKoi\Core\WooCommerce_Checkout::is_active()
			&& function_exists( 'get_woocommerce_currency' )
		) {
			$settings['currency'] = strtoupper( get_woocommerce_currency() );
		}

		// Strip Pro-only [qr_code] tag from any saved email templates so the
		// Lite settings UI never surfaces it (templates from a previous Pro
		// install can carry it; Lite cannot render it anyway).
		$template_keys = array(
			'rsvp_email_template',
			'ticket_email_template',
			'refund_email_template',
			'admin_rsvp_email_template',
			'admin_ticket_email_template',
		);
		foreach ( $template_keys as $tk ) {
			if ( ! empty( $settings[ $tk ] ) && is_string( $settings[ $tk ] ) && false !== strpos( $settings[ $tk ], '[qr_code]' ) ) {
				$settings[ $tk ] = preg_replace( '#<p>\s*\[qr_code\]\s*</p>\s*\n?#', '', $settings[ $tk ] );
				$settings[ $tk ] = str_replace( '[qr_code]', '', $settings[ $tk ] );
			}
		}

		// The private REST api_key is only needed by settings screens that
		// sign requests with it (see SettingsGoogleMaps). Keep it out of the
		// response for any viewer who isn't a site administrator.
		if ( ! current_user_can( 'manage_options' ) ) {
			unset( $settings['api_key'] );
		}

		return rest_ensure_response( $settings );
	}

	/**
	 * Save settings via API request.
	 *
	 * @param WP_REST_Request $request The incoming REST request.
	 * @return WP_REST_Response|WP_Error Response object.
	 */
	public static function set_settings( WP_REST_Request $request ) {
		$body = $request->get_body();

		if ( empty( $body ) ) {
			return new WP_REST_Response(
				array(
					'success' => false,
					'message' => __( 'Request body is empty.', 'eventkoi-lite' ),
				),
				400
			);
		}

		$data = json_decode( $body, true );

		if ( ! is_array( $data ) ) {
			return new WP_REST_Response(
				array(
					'success' => false,
					'message' => __( 'Invalid data format. Expected a JSON object.', 'eventkoi-lite' ),
				),
				400
			);
		}

		// Drop keys the current user is not permitted to write.
		$data = \EventKoi\Core\Permissions::filter_settings_payload( $data );

		$settings_api = new CoreSettings();
		$settings     = $settings_api::get();
		if ( ! is_array( $settings ) ) {
			$settings = array();
		}

		// Handle secure API key regeneration.
		if ( isset( $data['api_key'] ) && 'refresh' === $data['api_key'] ) {
			$new_api_key = 'eventkoi_' . strtolower( preg_replace( '/[^a-z0-9]/i', '', wp_generate_password( 20, false, false ) ) );
			update_option( 'eventkoi_api_key', $new_api_key );

			return rest_ensure_response(
				array(
					'success' => true,
					'message' => __( 'API key regenerated successfully.', 'eventkoi-lite' ),
					'api_key' => $new_api_key,
				)
			);
		}

		// Fallback: Update settings normally.
		// Admin notification templates are rich HTML too; without them the save
		// flattens the template to plain text (all formatting/paragraphs lost).
		$html_keys = array( 'rsvp_email_template', 'ticket_email_template', 'refund_email_template', 'admin_sale_email_template', 'admin_rsvp_email_template', 'admin_ticket_email_template' );

		foreach ( $data as $key => $value ) {
			if ( in_array( $key, array( 'api_key' ), true ) ) {
				continue;
			}

			if ( 'permalinks' === $key ) {
				$settings['permalinks'] = self::save_permalink_settings( $value );
				continue;
			}

			if ( 'currency' === $key ) {
				$currency = strtoupper( sanitize_text_field( (string) $value ) );
				if ( ! preg_match( '/^[A-Z]{3}$/', $currency ) ) {
					return new WP_REST_Response(
						array(
							'success' => false,
							'message' => __( 'Invalid currency code.', 'eventkoi-lite' ),
						),
						400
					);
				}
				$sanitized = $currency;
			} elseif ( in_array( $key, $html_keys, true ) ) {
				$sanitized = wp_kses( $value, \EventKoi\Core\Settings::get_email_template_allowed_tags() );
			} elseif ( \EventKoi\Core\Permissions::SETTINGS_KEY === $key ) {
				$sanitized = self::sanitize_user_permissions( $value );
			} else {
				$sanitized = is_array( $value )
				? array_map( 'sanitize_text_field', $value )
				: sanitize_text_field( $value );
			}

			$settings[ $key ] = apply_filters(
				'eventkoi_pre_setting_value',
				$sanitized,
				$key
			);
		}

		$settings_api::set( $settings );

		// When WooCommerce checkout is active, override currency with WC's currency.
		if ( class_exists( '\EventKoi\Core\WooCommerce_Checkout' )
			&& 'woocommerce' === ( $settings['ticket_checkout_method'] ?? '' )
			&& function_exists( 'get_woocommerce_currency' )
		) {
			$settings['currency'] = strtoupper( get_woocommerce_currency() );
		}
		$settings['permalinks'] = \eventkoi_get_permalink_structure();

		return rest_ensure_response(
			array(
				'success'  => true,
				'message'  => __( 'Settings updated successfully.', 'eventkoi-lite' ),
				'settings' => $settings,
			)
		);
	}

	/**
	 * Sanitize the user_permissions payload: a role-keyed map of capability
	 * booleans. Strip anything outside the canonical cap catalog and never
	 * persist administrator overrides.
	 *
	 * @param mixed $value Raw payload value.
	 * @return array<string, array<string, bool>>
	 */
	private static function sanitize_user_permissions( $value ): array {
		if ( ! is_array( $value ) ) {
			return array();
		}
		$known = array_flip( \EventKoi\Core\Permissions::cap_keys() );
		$out   = array();
		foreach ( $value as $role => $caps ) {
			$role = sanitize_key( (string) $role );
			if ( '' === $role || 'administrator' === $role ) {
				continue;
			}
			if ( ! is_array( $caps ) ) {
				continue;
			}
			$role_caps = array();
			foreach ( $caps as $cap => $granted ) {
				$cap = sanitize_key( (string) $cap );
				if ( ! isset( $known[ $cap ] ) ) {
					continue;
				}
				$role_caps[ $cap ] = (bool) filter_var( $granted, FILTER_VALIDATE_BOOLEAN );
			}
			$out[ $role ] = $role_caps;
		}
		return $out;
	}

	/**
	 * Save EventKoi permalink bases outside the main settings option.
	 *
	 * @param mixed $value Raw permalink payload.
	 * @return array Saved permalink structure.
	 */
	private static function save_permalink_settings( $value ): array {
		$current = \eventkoi_get_permalink_structure();
		$value   = is_array( $value ) ? $value : array();

		$event_base    = self::sanitize_permalink_base( $value['event_base'] ?? $current['event_base'], 'event' );
		$category_base = self::sanitize_permalink_base( $value['category_base'] ?? $current['category_base'], 'calendar' );

		$next = array(
			'event_base'             => $event_base,
			'category_base'          => $category_base,
			'use_verbose_page_rules' => false,
		);

		if ( $next !== array_intersect_key( $current, $next ) ) {
			update_option( 'eventkoi_permalinks', $next );
			update_option( 'eventkoi_queue_flush_rewrite_rules', 'yes' );
		}

		return \eventkoi_get_permalink_structure();
	}

	/**
	 * Sanitize a permalink base.
	 *
	 * @param mixed  $value    Raw value.
	 * @param string $fallback Fallback slug.
	 * @return string
	 */
	private static function sanitize_permalink_base( $value, $fallback ): string {
		// Sanitize each path segment separately so nested bases like
		// "agenda/calendar" keep their slashes.
		$segments = array_filter( array_map( 'sanitize_title_with_dashes', explode( '/', (string) $value ) ) );
		$slug     = implode( '/', $segments );

		if ( '' === $slug ) {
			$slug = sanitize_title_with_dashes( $fallback );
		}

		return $slug;
	}
}
