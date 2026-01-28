<?php
/**
 * Settings handler.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Settings.
 */
class Settings {

	/**
	 * Get plugin settings.
	 *
	 * @return array Plugin settings.
	 */
	public static function get(): array {
		$settings = get_option( 'eventkoi_settings', array() );

		return apply_filters( 'eventkoi_get_settings', $settings );
	}

	/**
	 * Update plugin settings.
	 *
	 * @param array $settings Array of settings to be saved.
	 * @return void
	 */
	public static function set( array $settings = array() ): void {
		do_action( 'eventkoi_before_save_settings', $settings );

		$settings = self::deep_sanitize( $settings );

		update_option( 'eventkoi_settings', apply_filters( 'eventkoi_set_settings', $settings ) );
	}

	/**
	 * Recursively sanitize settings array.
	 *
	 * @param mixed $data Data to sanitize.
	 * @return mixed Sanitized data.
	 */
	protected static function deep_sanitize( $data, $key = '' ) {
		$rich_text_keys = array(
			'rsvp_email_template',
		);

		if ( is_array( $data ) ) {
			foreach ( $data as $key => $value ) {
				$data[ $key ] = self::deep_sanitize( $value, (string) $key );
			}
			return $data;
		}

		if ( is_scalar( $data ) ) {
			if ( in_array( $key, $rich_text_keys, true ) ) {
				return wp_kses( $data, self::get_email_template_allowed_tags() );
			}

			return sanitize_text_field( $data );
		}

		return $data;
	}

	/**
	 * Allowed tags for email templates.
	 *
	 * @return array
	 */
	public static function get_email_template_allowed_tags() {
		return array(
			'a'      => array(
				'href'   => true,
				'rel'    => true,
				'target' => true,
			),
			'br'     => array(),
			'div'    => array(),
			'em'     => array(),
			'h1'     => array(),
			'h2'     => array(),
			'h3'     => array(),
			'h4'     => array(),
			'p'      => array(),
			'span'   => array(),
			'strong' => array(),
			'ul'     => array(),
			'ol'     => array(),
			'li'     => array(),
			'img'    => array(
				'src'    => true,
				'alt'    => true,
				'width'  => true,
				'height' => true,
			),
		);
	}
}
