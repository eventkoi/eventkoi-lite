<?php
/**
 * Bindings API.
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
 * Bindings.
 */
class Bindings {

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'register_block_bindings' ) );
		add_filter( 'block_bindings_source_value', array( $this, 'filter_event_meta_values' ), 10, 5 );
	}

	/**
	 * Return the full list of allowed binding keys.
	 *
	 * @return array Associative array of key => label.
	 */
	public static function get_allowed_keys() {
		return array(
			'event_title'                 => __( 'Event title', 'eventkoi-lite' ),
			'event_details'               => __( 'Event details', 'eventkoi-lite' ),
			'event_timezone'              => __( 'Event timezone', 'eventkoi-lite' ),
			'event_gmap'                  => __( 'Event Google Map', 'eventkoi-lite' ),
			'event_image'                 => __( 'Event image', 'eventkoi-lite' ),
			'event_image_url'             => __( 'Event image URL', 'eventkoi-lite' ),
			'event_calendar_url'          => __( 'Event calendar URL', 'eventkoi-lite' ),
			'event_calendar'              => __( 'Event calendar', 'eventkoi-lite' ),
			'event_calendar_link'         => __( 'Event calendar link', 'eventkoi-lite' ),
			'event_location'              => __( 'Event location', 'eventkoi-lite' ),
			'event_datetime_with_summary' => __( 'Event date time with summary', 'eventkoi-lite' ),
			'event_datetime'              => __( 'Event date time', 'eventkoi-lite' ),
			'event_date_type'             => __( 'Event date type', 'eventkoi-lite' ),
			'event_rulesummary'           => __( 'Recurring rule summary', 'eventkoi-lite' ),
		);
	}

	/**
	 * Register block bindings.
	 */
	public function register_block_bindings() {
		$keys = self::get_allowed_keys();

		foreach ( $keys as $key => $label ) {
			// Only register meta if this key maps to actual post_meta.
			if ( ! in_array( $key, array( 'event_calendar', 'event_calendar_url' ), true ) ) {
				$post_types = array( 'event', 'wp_template', 'wp_template_part', 'wp_block', 'page', 'post' );

				foreach ( $post_types as $post_type ) {
					register_meta(
						$post_type,
						$key,
						array(
							'show_in_rest' => true,
							'single'       => true,
							'type'         => 'string',
						)
					);
				}
			}
		}

		foreach ( array_keys( $keys ) as $key ) {
			register_block_bindings_source(
				'eventkoi/' . str_replace( '_', '-', $key ),
				array(
					'label'              => $keys[ $key ],
					'get_value_callback' => array( $this, 'get_event_meta' ),
					'uses_context'       => array( 'postId' ),
				)
			);
		}
	}

	/**
	 * Get event meta (placeholder, unused).
	 *
	 * @param array  $_source_args     Source arguments. Unused.
	 * @param object $_block_instance WP block instance. Unused.
	 * @param string $_attribute_name Attribute name. Unused.
	 */
	public function get_event_meta( $_source_args, $_block_instance, $_attribute_name ) {
		unset( $_source_args, $_block_instance, $_attribute_name );
		return null;
	}

	/**
	 * Filter final values for event meta.
	 *
	 * @param mixed  $value           Existing value.
	 * @param string $name            Source name.
	 * @param array  $source_args     Binding args.
	 * @param object $block_instance WP block instance.
	 * @param string $attribute_name Attribute name.
	 */
	public function filter_event_meta_values( $value, $name, $source_args, $block_instance, $attribute_name ) {
		unset( $attribute_name );

		if ( ! empty( $source_args['id'] ) ) {
			$event_id = absint( $source_args['id'] );
		} elseif ( isset( $block_instance->context['postId'] ) ) {
			$event_id = absint( $block_instance->context['postId'] );
		} else {
			return $value;
		}

		if ( is_string( $name ) && strpos( $name, 'eventkoi/' ) === 0 ) {
			$event = new Event( $event_id );
			return $event::render_meta( $name );
		}

		if ( ! empty( $source_args['key'] ) && array_key_exists( $source_args['key'], self::get_allowed_keys() ) ) {
			$event = new Event( $event_id );
			return $event::render_meta( $source_args['key'] );
		}

		return $value;
	}
}
