<?php
/**
 * Shared render helpers for the Divi modules.
 *
 * The Divi 4 shortcode modules, the Divi 5 block modules and the Divi 5
 * builder preview all render through these functions, so one set of
 * settings produces the same markup everywhere. Settings arrive as the
 * flat Divi 4 prop array (eventkoi_calendar, eventkoi_timeframe, ...);
 * the Divi 5 layer maps its attributes onto those keys first.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Divi_Renderers.
 */
class Divi_Renderers {

	/**
	 * Render the calendar module.
	 *
	 * @param array $props Module settings.
	 * @return string
	 */
	public static function calendar( array $props ) {
		$calendar_id = absint( $props['eventkoi_calendar'] ?? 0 );
		if ( ! $calendar_id ) {
			$calendar_id = eventkoi_resolve_calendar_id( (int) get_option( 'eventkoi_default_event_cal', 0 ) );
		}

		$args = array(
			'calendars'     => $calendar_id ? array( $calendar_id ) : array(),
			'startday'      => in_array( ( $props['eventkoi_week_start'] ?? 'monday' ), array( 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday' ), true ) ? $props['eventkoi_week_start'] : 'monday',
			'timeframe'     => in_array( ( $props['eventkoi_timeframe'] ?? 'month' ), array( 'month', 'week', 'list' ), true ) ? $props['eventkoi_timeframe'] : 'month',
			'default_month' => '',
			'default_year'  => '',
			'context'       => 'block',
		);

		if ( 'on' === ( $props['eventkoi_show_calendar_filter'] ?? 'off' ) ) {
			$args['show_calendar_filter'] = true;
		}

		// Default 'on' shows the label; only an explicit 'off' hides it.
		$args['show_timezone'] = ( 'off' === ( $props['eventkoi_show_timezone'] ?? 'on' ) ) ? false : true;

		// Taxonomy pinning is a Pro feature; Lite has no taxonomy builder.
		if ( class_exists( Taxonomies::class ) && method_exists( Taxonomies::class, 'filters_from_settings' ) ) {
			$divi_taxonomies = Taxonomies::filters_from_settings( $props );
			if ( '' !== $divi_taxonomies ) {
				$args['taxonomies'] = $divi_taxonomies;
			}
		}

		$divi_views = array();
		foreach ( array( 'month', 'week', 'list' ) as $view_key ) {
			if ( 'off' !== ( $props[ 'eventkoi_show_' . $view_key . '_view' ] ?? 'on' ) ) {
				$divi_views[] = $view_key;
			}
		}
		if ( count( $divi_views ) < 3 && ! empty( $divi_views ) ) {
			$args['views'] = implode( ',', $divi_views );
		}

		if ( ! function_exists( 'eventkoi_get_calendar_content' ) ) {
			return '';
		}

		return sprintf(
			'<div class="eventkoi-divi-calendar eventkoi-calendar-wrapper">%s</div>',
			eventkoi_get_calendar_content( $calendar_id, 'calendar', $args )
		);
	}

	/**
	 * Render the event module.
	 *
	 * @param array $props Module settings.
	 * @return string
	 */
	public static function event( array $props ) {
		$selected = $props['eventkoi_event_id'] ?? 'current';
		$event_id = ( '' === $selected || 'current' === $selected ) ? 0 : absint( $selected );
		if ( ! $event_id ) {
			$current = get_the_ID();
			if ( $current && 'eventkoi_event' === get_post_type( $current ) ) {
				$event_id = (int) $current;
			}
		}

		if ( ! $event_id ) {
			return '';
		}

		$data = sanitize_key( $props['eventkoi_data'] ?? 'full' );

		if ( 'full' === $data ) {
			$items  = array( 'event_title', 'event_datetime', 'event_location', 'event_details' );
			$output = '';
			foreach ( $items as $key ) {
				$output .= do_shortcode( sprintf( '[eventkoi id=%d data=%s]', $event_id, $key ) );
			}
		} else {
			$output = do_shortcode( sprintf( '[eventkoi id=%d data=%s]', $event_id, $data ) );
		}

		if ( '' === trim( $output ) ) {
			return '';
		}

		return sprintf( '<div class="eventkoi-divi-event">%s</div>', $output );
	}

	/**
	 * Calendar picker options, keyed by term ID.
	 *
	 * @param string $empty_label Label for the empty choice.
	 * @return array<string,string>
	 */
	public static function calendar_options( $empty_label ) {
		$options = array( '' => $empty_label );

		$terms = get_terms(
			array(
				'taxonomy'   => 'event_cal',
				'hide_empty' => false,
			)
		);

		if ( is_wp_error( $terms ) || empty( $terms ) ) {
			return $options;
		}

		foreach ( $terms as $term ) {
			$options[ (string) $term->term_id ] = eventkoi_decode_term_name( $term->name );
		}

		return $options;
	}

	/**
	 * Event picker options, keyed by post ID, newest edits first.
	 *
	 * @return array<string,string>
	 */
	public static function event_options() {
		$options = array( 'current' => esc_html__( '— Current event —', 'eventkoi-lite' ) );

		$limit = (int) apply_filters( 'eventkoi_divi_event_options_limit', 200 );
		$posts = get_posts(
			array(
				'post_type'        => 'eventkoi_event',
				'posts_per_page'   => max( 1, $limit ),
				'post_status'      => array( 'publish', 'draft', 'future', 'private' ),
				'orderby'          => 'modified',
				'order'            => 'DESC',
				'suppress_filters' => true,
			)
		);

		foreach ( $posts as $post ) {
			$options[ (string) $post->ID ] = $post->post_title;
		}

		return $options;
	}

	/**
	 * Data choices for the event module.
	 *
	 * @return array<string,string>
	 */
	public static function event_data_options() {
		return array(
			'full'                        => esc_html__( 'Full event', 'eventkoi-lite' ),
			'event_title'                 => esc_html__( 'Title', 'eventkoi-lite' ),
			'event_details'               => esc_html__( 'Details', 'eventkoi-lite' ),
			'event_image'                 => esc_html__( 'Image', 'eventkoi-lite' ),
			'event_datetime'              => esc_html__( 'Date & time', 'eventkoi-lite' ),
			'event_date'                  => esc_html__( 'Date only', 'eventkoi-lite' ),
			'event_time'                  => esc_html__( 'Time only', 'eventkoi-lite' ),
			'event_datetime_with_summary' => esc_html__( 'Date, time & recurring summary', 'eventkoi-lite' ),
			'event_location'              => esc_html__( 'Location', 'eventkoi-lite' ),
			'event_location_name'         => esc_html__( 'Location Name', 'eventkoi-lite' ),
			'event_location_address'      => esc_html__( 'Location Address', 'eventkoi-lite' ),
			'event_location_unit'         => esc_html__( 'Location Apartment/Unit', 'eventkoi-lite' ),
			'event_location_city'         => esc_html__( 'Location City', 'eventkoi-lite' ),
			'event_location_state'        => esc_html__( 'Location State', 'eventkoi-lite' ),
			'event_location_country'      => esc_html__( 'Location Country', 'eventkoi-lite' ),
			'event_location_zip'          => esc_html__( 'Location Post Code', 'eventkoi-lite' ),
			'event_gmap'                  => esc_html__( 'Google map', 'eventkoi-lite' ),
			'event_rulesummary'           => esc_html__( 'Recurring summary', 'eventkoi-lite' ),
			'event_ticket_rsvp'           => esc_html__( 'Ticket / RSVP', 'eventkoi-lite' ),
			'event_url'                   => esc_html__( 'Event URL', 'eventkoi-lite' ),
			'event_capacity'              => esc_html__( 'Capacity', 'eventkoi-lite' ),
			'event_capacity_remaining'    => esc_html__( 'Capacity remaining', 'eventkoi-lite' ),
			'event_capacity_sold'         => esc_html__( 'Capacity sold', 'eventkoi-lite' ),
			'event_sold_out'              => esc_html__( 'Sold out label', 'eventkoi-lite' ),
			'event_low_stock'             => esc_html__( 'Low stock label', 'eventkoi-lite' ),
			'event_ticket_count'          => esc_html__( 'Ticket count', 'eventkoi-lite' ),
			'event_ticket_summary'        => esc_html__( 'Ticket summary', 'eventkoi-lite' ),
			'event_sales_start'           => esc_html__( 'Sales start', 'eventkoi-lite' ),
			'event_sales_end'             => esc_html__( 'Sales end', 'eventkoi-lite' ),
			'event_ticket_price_from'     => esc_html__( 'Ticket price from', 'eventkoi-lite' ),
			'event_ticket_price_to'       => esc_html__( 'Ticket price to', 'eventkoi-lite' ),
			'event_ticket_price_range'    => esc_html__( 'Ticket price range', 'eventkoi-lite' ),
			'event_date_year'             => esc_html__( 'Date — year', 'eventkoi-lite' ),
			'event_date_month'            => esc_html__( 'Date — month', 'eventkoi-lite' ),
			'event_date_month_short'      => esc_html__( 'Date — month short', 'eventkoi-lite' ),
			'event_date_day'              => esc_html__( 'Date — day', 'eventkoi-lite' ),
			'event_date_day_name'         => esc_html__( 'Date — day name', 'eventkoi-lite' ),
			'event_date_iso'              => esc_html__( 'Date — ISO', 'eventkoi-lite' ),
			'event_rsvp_capacity'         => esc_html__( 'RSVP capacity', 'eventkoi-lite' ),
			'event_rsvp_remaining'        => esc_html__( 'RSVP remaining', 'eventkoi-lite' ),
			'event_rsvp_going'            => esc_html__( 'RSVP going', 'eventkoi-lite' ),
			'event_rsvp_full'             => esc_html__( 'RSVP full label', 'eventkoi-lite' ),
		);
	}
}
