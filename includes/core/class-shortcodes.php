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
		add_shortcode( 'eventkoi_calendar', array( __CLASS__, 'render_calendar' ) );
		add_shortcode( 'eventkoi', array( __CLASS__, 'render_event_data' ) );
		add_shortcode( 'eventkoi_rsvp', array( __CLASS__, 'render_rsvp' ) );
		add_shortcode( 'eventkoi_checkin', array( __CLASS__, 'render_checkin' ) );
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
				'id'               => '',
				'display'          => 'calendar',
				'orderby'          => 'date_modified',
				'order'            => 'desc',
				'per_page'         => 10,
				'max_results'      => 0,
				'date_start'       => '',
				'date_end'         => '',
				'expand'           => '',
				'expand_instances' => '',
			),
			$user_attributes,
			$shortcode_name
		);

		$ids_raw = trim( $attributes['id'] );

		// "all" keyword = load all calendars.
		if ( 'all' === strtolower( $ids_raw ) ) {
			$all_terms = get_terms(
				array(
					'taxonomy'   => 'event_cal',
					'hide_empty' => false,
					'fields'     => 'ids',
				)
			);

			$ids = is_wp_error( $all_terms ) ? array() : array_map( 'absint', $all_terms );

		} else {
			$ids = array_filter(
				array_map( 'absint', explode( ',', $ids_raw ) )
			);
		}

		// Default fallback.
		if ( empty( $ids ) ) {
			$ids = array( (int) get_option( 'eventkoi_default_event_cal', 0 ) );
		}

		$primary_id = $ids[0];
		$display    = sanitize_text_field( $attributes['display'] );
		$orderby    = sanitize_key( $attributes['orderby'] );
		$order      = strtolower( sanitize_key( $attributes['order'] ) );
		$per_page   = absint( $attributes['per_page'] );
		$max_results = absint( $attributes['max_results'] );
		$date_start = sanitize_text_field( $attributes['date_start'] );
		$date_end   = sanitize_text_field( $attributes['date_end'] );

		$expand_instances_raw = isset( $attributes['expand_instances'] ) ? $attributes['expand_instances'] : '';
		$expand_instances     = false;
		$has_bare_expand      = is_array( $user_attributes ) && in_array( 'expand', $user_attributes, true );

		if ( is_array( $user_attributes ) && array_key_exists( 'expand', $user_attributes ) && ! array_key_exists( 'expand_instances', $user_attributes ) ) {
			$expand_instances_raw = $user_attributes['expand'];
		}

		if ( is_array( $user_attributes ) && ( array_key_exists( 'expand', $user_attributes ) || array_key_exists( 'expand_instances', $user_attributes ) || $has_bare_expand ) ) {
			if ( '' === (string) $expand_instances_raw ) {
				$expand_instances = true;
			} else {
				$expand_instances = (bool) filter_var( $expand_instances_raw, FILTER_VALIDATE_BOOLEAN );
			}
		}

		$per_page    = $per_page > 0 ? min( $per_page, 100 ) : 10;
		$max_results = $max_results > 0 ? min( $max_results, 1000 ) : 0;

		$allowed_orderby = array( 'modified', 'date_modified', 'date', 'publish_date', 'title', 'start_date', 'event_start', 'upcoming' );
		if ( ! in_array( $orderby, $allowed_orderby, true ) ) {
			$orderby = 'date_modified';
		}

		if ( 'modified' === $orderby ) {
			$orderby = 'date_modified';
		}

		if ( 'date' === $orderby ) {
			$orderby = 'publish_date';
		}

		if ( 'start_date' === $orderby ) {
			$orderby = 'event_start';
		}

		if ( ! in_array( $order, array( 'asc', 'desc' ), true ) ) {
			$order = 'desc';
		}

		// "upcoming" defaults to nearest first unless explicitly overridden.
		if ( 'upcoming' === $orderby && ( ! is_array( $user_attributes ) || ! array_key_exists( 'order', $user_attributes ) ) ) {
			$order = 'asc';
		}

		$calendar = new \EventKoi\Core\Calendar( $primary_id );

		if ( true === $calendar::is_invalid() ) {
			return '';
		}

		ob_start();

		$calendar_args = array(
			'calendars' => $ids,
		);

		if ( 'list' === $display ) {
			$calendar_args['orderby']          = $orderby;
			$calendar_args['order']            = $order;
			$calendar_args['per_page']         = $per_page;
			$calendar_args['max_results']      = $max_results;
			$calendar_args['date_start']       = $date_start;
			$calendar_args['date_end']         = $date_end;
			$calendar_args['expand_instances'] = $expand_instances;
		}

		$html = eventkoi_get_calendar_content( $primary_id, $display, $calendar_args );

		if ( ! empty( $html ) ) {
			echo wp_kses_post( $html );
		}

		wp_enqueue_style( 'eventkoi-frontend' );

		$css = sprintf(
			':root { --fc-event-bg-color: %1$s; --fc-event-border-color: %1$s; }',
			esc_attr( $calendar::get_color() )
		);

		wp_add_inline_style( 'eventkoi-frontend', $css );

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
				'id'       => 0,
				'data'     => '',
				'with_name' => false,
			),
			$user_attributes,
			$shortcode_name
		);

		// Prefer explicitly passed ID.
		$event_id = absint( $attributes['id'] );

		// Attempt to detect event ID from current post when none provided.
		if ( 0 === $event_id ) {
			global $post;

			if ( isset( $post->ID ) && 'eventkoi_event' === get_post_type( $post->ID ) ) {
				$event_id = (int) $post->ID;
			}
		}

		// Bail if still no valid event ID or missing data parameter.
		if ( 0 === $event_id || empty( $attributes['data'] ) ) {
			return '';
		}

		$event = new \EventKoi\Core\Event( $event_id );

		$keys        = array_map( 'trim', explode( ',', $attributes['data'] ) );
		$parts       = array();
		$auto_unwrap = false;
		$show_label  = ! empty( $attributes['with_name'] ) || ( is_array( $user_attributes ) && in_array( 'with_name', $user_attributes, true ) );

		foreach ( $keys as $key ) {
			$normalized_key = strtolower( str_replace( '-', '_', $key ) );
			$normalized_key = preg_replace( '/[^a-z0-9_]/', '', $normalized_key );

			if ( ! empty( $normalized_key ) ) {

				if ( 'datetime' === $normalized_key ) {
					\EventKoi\Core\Event::suppress_inline_rulesummary( true );
				}

				if ( in_array( $normalized_key, array( 'image_url', 'event_image_url' ), true ) ) {
					$auto_unwrap = true;
				}

				$value = \EventKoi\Core\Event::render_meta( $normalized_key );
				if ( '' === $value ) {
					continue;
				}

				if ( $show_label ) {
					if ( 0 === strpos( $normalized_key, 'event_field_' ) ) {
						$field_key = substr( $normalized_key, 12 );
						$label = $field_key;

						if ( class_exists( '\EventKoi\Core\Fields' ) ) {
							$field = Fields::get_field_by_key( $field_key );
							$label = $field['name'] ?? $label;
						}
						$value     = sprintf(
							'<span class="eventkoi-label">%1$s:</span> <span class="eventkoi-value">%2$s</span>',
							esc_html( $label ),
							wp_kses_post( $value )
						);
					} elseif ( 0 === strpos( $normalized_key, 'event_fieldgroup_' ) && ! preg_match( '/_with_name$/', $normalized_key ) ) {
						$normalized_key = $normalized_key . '_with_name';
						$value          = \EventKoi\Core\Event::render_meta( $normalized_key );
					}
				}

				$parts[] = $value;
			}
		}

		$output = implode(
			'',
			array_filter( $parts )
		);

		if ( empty( $output ) ) {
			return '';
		}

		// Automatically avoid wrapping when only an image URL is requested.
		if ( true === $auto_unwrap && 1 === count( array_filter( $parts ) ) ) {
			return wp_strip_all_tags( reset( $parts ) );
		}

		$wrapped = implode(
			'',
			array_map(
				function ( $item ) {
					return '<div class="eventkoi-data">' . wp_kses_post( $item ) . '</div>';
				},
				array_filter( $parts )
			)
		);

		return '<div class="eventkoi-shortcode">' . wp_kses_post( $wrapped ) . '</div>';
	}

	/**
	 * Render RSVP block via shortcode.
	 *
	 * @param array  $user_attributes Shortcode attributes.
	 * @param string $content         Shortcode content.
	 * @param string $shortcode_name  Shortcode name.
	 * @return string Rendered output.
	 */
	public static function render_rsvp( $user_attributes, $content, $shortcode_name ) {
		$attributes = shortcode_atts(
			array(
				'event_id'    => 0,
				'instance_ts' => 0,
				'instance'    => 0,
			),
			$user_attributes,
			$shortcode_name
		);

		$event_id = absint( $attributes['event_id'] );

		if ( 0 === $event_id ) {
			global $post;

			if ( isset( $post->ID ) && 'eventkoi_event' === get_post_type( $post->ID ) ) {
				$event_id = (int) $post->ID;
			}
		}

		if ( 0 === $event_id ) {
			return '';
		}

		$instance_ts = absint( $attributes['instance_ts'] );
		if ( 0 === $instance_ts && ! empty( $attributes['instance'] ) ) {
			$instance_ts = absint( $attributes['instance'] );
		}
		if ( 0 === $instance_ts ) {
			$instance_ts = function_exists( 'eventkoi_get_instance_id' )
				? absint( eventkoi_get_instance_id() )
				: 0;

			if ( 0 === $instance_ts && isset( $_GET['instance'] ) ) {
				$instance_ts = absint( wp_unslash( $_GET['instance'] ) );
			}
		}

		Scripts::enqueue_frontend_assets();

		$attrs = sprintf(
			'data-event-id="%1$d" data-instance-ts="%2$d"',
			(int) $event_id,
			(int) $instance_ts
		);

		return sprintf(
			'<div class="eventkoi-front"><div id="eventkoi-rsvp-%1$d" class="eventkoi-rsvp" %2$s></div></div>',
			(int) $event_id,
			$attrs
		);
	}

	/**
	 * Render check-in lookup via shortcode.
	 *
	 * @param array  $user_attributes Shortcode attributes.
	 * @param string $content         Shortcode content.
	 * @param string $shortcode_name  Shortcode name.
	 * @return string Rendered output.
	 */
	public static function render_checkin( $user_attributes, $content, $shortcode_name ) {
		$attributes = shortcode_atts(
			array(
				'token' => '',
			),
			$user_attributes,
			$shortcode_name
		);

		Scripts::enqueue_frontend_assets();

		$token = sanitize_text_field( $attributes['token'] );
		$attrs = $token ? sprintf( 'data-token="%s"', esc_attr( $token ) ) : '';

		return sprintf(
			'<div class="eventkoi-front"><div class="eventkoi-checkin" %1$s></div></div>',
			$attrs
		);
	}
}
