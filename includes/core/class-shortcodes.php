<?php
/**
 * Shortcodes.
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
 * Shortcodes.
 */
class Shortcodes {

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_shortcode( 'ek_calendar', array( __CLASS__, 'render_calendar' ) );
		add_shortcode( 'eventkoi', array( __CLASS__, 'render_event_data' ) );
	}

	/**
	 * Render a calendar.
	 *
	 * @param array  $user_attributes Shortcode attributes.
	 * @param string $content         Shortcode content.
	 * @param string $shortcode_name  Shortcode name.
	 * @return string Rendered calendar HTML.
	 */
	public static function render_calendar( $user_attributes, $content, $shortcode_name ) {
		$attributes = shortcode_atts(
			array(
				'id'      => (int) get_option( 'default_event_cal', 0 ),
				'display' => 'calendar',
			),
			$user_attributes,
			$shortcode_name
		);

		$cal_id  = absint( $attributes['id'] );
		$display = sanitize_text_field( $attributes['display'] );

		$calendar = new \EventKoi\Core\Calendar( $cal_id );

		if ( true === $calendar::is_invalid() ) {
			return ''; // Return empty string if calendar is invalid.
		}

		ob_start();

		$html = eventkoi_get_calendar_content( $cal_id, $display );

		if ( ! empty( $html ) ) {
			echo wp_kses_post( $html );
		}

		?>
		<style type="text/css">
			:root {
				--fc-event-bg-color: <?php echo esc_attr( $calendar::get_color() ); ?>;
				--fc-event-border-color: <?php echo esc_attr( $calendar::get_color() ); ?>;
			}
		</style>
		<?php

		return ob_get_clean();
	}

	/**
	 * Render event meta via shortcode.
	 *
	 * @param array  $user_attributes Shortcode attributes.
	 * @param string $content         Shortcode content.
	 * @param string $shortcode_name  Shortcode name.
	 * @return string Rendered output.
	 */
	public static function render_event_data( $user_attributes, $content, $shortcode_name ) {
		$attributes = shortcode_atts(
			array(
				'id'   => 0,
				'data' => '',
			),
			$user_attributes,
			$shortcode_name
		);

		$event_id = absint( $attributes['id'] );
		if ( 0 === $event_id || empty( $attributes['data'] ) ) {
			return '';
		}

		$event = new \EventKoi\Core\Event( $event_id );

		$keys  = array_map( 'trim', explode( ',', $attributes['data'] ) );
		$parts = array();

		foreach ( $keys as $key ) {
			$normalized_key = strtolower( str_replace( '-', '_', $key ) );
			$normalized_key = preg_replace( '/[^a-z0-9_]/', '', $normalized_key );

			if ( ! empty( $normalized_key ) ) {

				if ( 'datetime' === $normalized_key ) {
					\EventKoi\Core\Event::suppress_inline_rulesummary( true );
				}

				$parts[] = \EventKoi\Core\Event::render_meta( $normalized_key );
			}
		}

		$output = implode(
			'',
			array_map(
				function ( $item ) {
					return '<div class="eventkoi-data">' . wp_kses_post( $item ) . '</div>';
				},
				array_filter( $parts )
			)
		);

		if ( ! empty( $output ) ) {
			return '<div class="eventkoi-shortcode">' . wp_kses_post( $output ) . '</div>';
		}

		return '';
	}
}
