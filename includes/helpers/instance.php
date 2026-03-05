<?php
/**
 * Instance helpers.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Helpers
 */

use EKLIB\StellarWP\DB\DB;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'eventkoi_get_instance_override' ) ) {
	/**
	 * Get override data for a specific instance timestamp.
	 *
	 * @param int $event_id Event post ID.
	 * @param int $timestamp Instance start timestamp.
	 *
	 * @return array|null Array of overrides or null.
	 */
	function eventkoi_get_instance_override( $event_id, $timestamp ) {
		$row = DB::table( 'eventkoi_recurrence_overrides' )
		         ->where( 'event_id', $event_id )
		         ->where( 'timestamp', $timestamp )
		         ->get();

		return $row ? maybe_unserialize( $row->data ) : null;
	}
}

if ( ! function_exists( 'eventkoi_merge_instance_data' ) ) {
	/**
	 * Merge event data with instance override.
	 *
	 * @param array $event_data Raw event array.
	 * @param array $override Override array.
	 *
	 * @return array Merged data.
	 */
	function eventkoi_merge_instance_data( $event_data, $override ) {
		foreach ( $override as $key => $value ) {
			if ( null !== $value ) {
				$event_data[ $key ] = $value;
			}
		}

		return $event_data;
	}
}

if ( ! function_exists( 'eventkoi_get_template_ids_by_pattern' ) ) {
	/**
	 * Return template ids by pattern or conditional logic
	 *
	 * @param $pattern
	 *
	 * @return array
	 */
	function eventkoi_get_template_ids_by_pattern( $pattern = 'include/singular' ): array {

		$results   = array();
		$templates = get_posts(
			array(
				'post_type'      => 'elementor_library',
				'posts_per_page' => - 1,
				'post_status'    => 'publish',
				'meta_query'     => array(
					array(
						'key'     => '_elementor_conditions',
						'compare' => 'EXISTS',
					),
				),
			)
		);

		foreach ( $templates as $template ) {
			$conditions = get_post_meta( $template->ID, '_elementor_conditions', true );

			if ( ! empty( $conditions ) ) {
				foreach ( $conditions as $condition ) {
					if ( strpos( $condition, $pattern ) !== false ) {
						$results[] = array(
							'slug'  => $template->post_name,
							'title' => $template->post_title,
						);
						break;
					}
				}
			}
		}

		return $results;
	}
}

if ( ! function_exists( 'eventkoi_get_calendar_options' ) ) {
	/**
	 * Get calendar options
	 *
	 * @return array
	 */
	function eventkoi_get_calendar_options() {
		$options = array( '' => __( 'Select a calendar', 'eventkoi' ) );
		$terms   = get_terms(
			array(
				'taxonomy'   => 'event_cal',
				'hide_empty' => false,
			)
		);

		if ( ! is_wp_error( $terms ) ) {
			foreach ( $terms as $term ) {
				$options[ (string) $term->term_id ] = $term->name;
			}
		}

		return $options;
	}
}

if ( ! function_exists( 'eventkoi_get_month_options' ) ) {
	/**
	 * Get month options
	 *
	 * @return array
	 */
	function eventkoi_get_month_options() {
		return array(
			'current'   => __( 'Current month', 'eventkoi' ),
			'january'   => __( 'January', 'eventkoi' ),
			'february'  => __( 'February', 'eventkoi' ),
			'march'     => __( 'March', 'eventkoi' ),
			'april'     => __( 'April', 'eventkoi' ),
			'may'       => __( 'May', 'eventkoi' ),
			'june'      => __( 'June', 'eventkoi' ),
			'july'      => __( 'July', 'eventkoi' ),
			'august'    => __( 'August', 'eventkoi' ),
			'september' => __( 'September', 'eventkoi' ),
			'october'   => __( 'October', 'eventkoi' ),
			'november'  => __( 'November', 'eventkoi' ),
			'december'  => __( 'December', 'eventkoi' ),
		);
	}
}

if ( ! function_exists( 'eventkoi_get_weekday_options' ) ) {
	/**
	 * Get weekday options
	 *
	 * @return array
	 */
	function eventkoi_get_weekday_options() {
		return array(
			'monday'    => __( 'Monday', 'eventkoi' ),
			'tuesday'   => __( 'Tuesday', 'eventkoi' ),
			'wednesday' => __( 'Wednesday', 'eventkoi' ),
			'thursday'  => __( 'Thursday', 'eventkoi' ),
			'friday'    => __( 'Friday', 'eventkoi' ),
			'saturday'  => __( 'Saturday', 'eventkoi' ),
			'sunday'    => __( 'Sunday', 'eventkoi' ),
		);
	}
}

if ( ! function_exists( 'eventkoi_sanitize_calendar_selection' ) ) {
	/**
	 * Sanitize calendar selection
	 *
	 * @param mixed $calendars Calendar selection.
	 *
	 * @return array
	 */
	function eventkoi_sanitize_calendar_selection( $calendars ) {
		if ( empty( $calendars ) ) {
			return array();
		}

		if ( is_string( $calendars ) ) {
			$calendars = trim( $calendars );

			// Support comma-delimited values (e.g. "2,5,9") from UI controls.
			if ( false !== strpos( $calendars, ',' ) ) {
				return array_values(
					array_filter(
						array_map( 'absint', array_map( 'trim', explode( ',', $calendars ) ) )
					)
				);
			}

			$id = absint( $calendars );
			return $id > 0 ? array( $id ) : array();
		}

		if ( is_array( $calendars ) ) {
			return array_values(
				array_filter(
					array_map( 'absint', $calendars )
				)
			);
		}

		return array();
	}
}

if ( ! function_exists( 'eventkoi_sanitize_week_start' ) ) {
	/**
	 * Sanitize week start
	 *
	 * @param mixed $value Week start.
	 *
	 * @return string
	 */
	function eventkoi_sanitize_week_start( $value ) {
		$value   = strtolower( (string) $value );
		$options = array( 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday' );

		return in_array( $value, $options, true ) ? $value : 'monday';
	}
}

if ( ! function_exists( 'eventkoi_sanitize_timeframe' ) ) {
	/**
	 * Sanitize timeframe
	 *
	 * @param mixed $value Timeframe.
	 *
	 * @return string
	 */
	function eventkoi_sanitize_timeframe( $value ) {
		$value = strtolower( (string) $value );

		return in_array( $value, array( 'month', 'week' ), true ) ? $value : 'month';
	}
}

if ( ! function_exists( 'eventkoi_normalize_default_month' ) ) {
	/**
	 * Normalize default month
	 *
	 * @param mixed $value Default month.
	 *
	 * @return string
	 */
	function eventkoi_normalize_default_month( $value ) {
		$value = strtolower( (string) $value );

		if ( 'current' === $value || empty( $value ) ) {
			return '';
		}

		$options = array( 'current', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december' );

		return in_array( $value, $options, true ) ? $value : '';
	}
}

if ( ! function_exists( 'eventkoi_normalize_default_year' ) ) {
	/**
	 * Normalize default year
	 *
	 * @param mixed $value Default year.
	 *
	 * @return string
	 */
	function eventkoi_normalize_default_year( $value ) {
		$value = trim( (string) $value );

		if ( empty( $value ) ) {
			return '';
		}

		return preg_match( '/^\d{4}$/', $value ) ? $value : '';
	}
}

if ( ! function_exists( 'eventkoi_get_events' ) ) {
	/**
	 * Get all events
	 *
	 * @return array
	 */
	function eventkoi_get_events() {
		$options    = array();
		$all_events = get_posts(
			array(
				'post_type'      => 'eventkoi_event',
				'posts_per_page' => - 1,
				'post_status'    => 'publish',
			)
		);

		if ( is_wp_error( $all_events ) ) {
			return $options;
		}

		foreach ( $all_events as $event_post ) {
			$options[ (string) $event_post->ID ] = $event_post->post_title;
		}

		return $options;
	}
}

if ( ! function_exists( 'eventkoi_get_event_data_options' ) ) {
	/**
	 * Get available event data options.
	 *
	 * @return array
	 */
	function eventkoi_get_event_data_options() {
		return array(
			'event_title'                 => __( 'Event Title', 'eventkoi' ),
			'event_details'               => __( 'Event Details', 'eventkoi' ),
			'event_timezone'              => __( 'Event Timezone', 'eventkoi' ),
			'event_gmap'                  => __( 'Event Google Map', 'eventkoi' ),
			'event_image'                 => __( 'Event Image', 'eventkoi' ),
			'event_image_url'             => __( 'Event Image URL', 'eventkoi' ),
			'event_calendar_url'          => __( 'Event Calendar URL', 'eventkoi' ),
			'event_calendar'              => __( 'Event Calendar', 'eventkoi' ),
			'event_calendar_link'         => __( 'Event Calendar Link', 'eventkoi' ),
			'event_location'              => __( 'Event Location', 'eventkoi' ),
			'event_datetime_with_summary' => __( 'Event Datetime with Summary', 'eventkoi' ),
			'event_datetime'              => __( 'Event Datetime', 'eventkoi' ),
			'event_date_type'             => __( 'Event Date Type', 'eventkoi' ),
			'event_rulesummary'           => __( 'Event Rule Summary', 'eventkoi' ),
		);
	}
}

if ( ! function_exists( 'eventkoi_get_default_event_data_items' ) ) {
	/**
	 * Get default event data items for the repeater.
	 *
	 * @return array
	 */
	function eventkoi_get_default_event_data_items() {
		return array(
			array(
				'data_type' => 'event_title',
				'show'      => 'yes',
			),
			array(
				'data_type' => 'event_datetime',
				'show'      => 'yes',
			),
			array(
				'data_type' => 'event_location',
				'show'      => 'yes',
			),
			array(
				'data_type' => 'event_details',
				'show'      => 'yes',
			),
		);
	}
}
