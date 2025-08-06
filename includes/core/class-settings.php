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
	protected static function deep_sanitize( $data ) {
		if ( is_array( $data ) ) {
			foreach ( $data as $key => $value ) {
				$data[ $key ] = self::deep_sanitize( $value );
			}
			return $data;
		}

		return is_scalar( $data ) ? sanitize_text_field( $data ) : $data;
	}
}
