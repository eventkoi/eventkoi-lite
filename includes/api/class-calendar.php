<?php
/**
 * REST API - Calendar Endpoints.
 *
 * @package    EventKoi
 * @subpackage EventKoi\API
 */

namespace EventKoi\API;

use EventKoi\API\REST;
use EventKoi\Core\Calendar as SingleCal;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Class Calendar
 *
 * Handles REST API routes for individual calendars.
 */
class Calendar {

	/**
	 * Register calendar-related REST API routes.
	 */
	public static function init() {
		register_rest_route(
			EVENTKOI_API,
			'/calendar',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'get_calendar' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/calendar_events',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'get_calendar_events' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/query_events',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'get_query_events' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/update_calendar',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'update_calendar' ),
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/duplicate_calendar',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'duplicate_calendar' ),
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/delete_calendar',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'delete_calendar' ),
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);
	}

	/**
	 * Retrieve calendar data.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response|WP_Error The REST response.
	 */
	public static function get_calendar( WP_REST_Request $request ) {
		$calendar_id = absint( $request->get_param( 'id' ) );

		if ( empty( $calendar_id ) ) {
			return new WP_Error( 'eventkoi_invalid_id', __( 'Invalid calendar ID.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$calendar = new SingleCal( $calendar_id );
		$response = $calendar::get_meta();

		return rest_ensure_response( $response );
	}

	/**
	 * Retrieve calendar and its events.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response The REST response.
	 */
	public static function get_calendar_events( WP_REST_Request $request ) {
		$ids      = array();
		$id       = sanitize_text_field( $request->get_param( 'id' ) );
		$initial  = $request->get_param( 'initial' );
		$expand_instances_marker = ( false !== strpos( $id, '|ek_expand_instances=1' ) );
		$id = str_replace( '|ek_expand_instances=1', '', $id );
		$page     = max( 1, absint( $request->get_param( 'page' ) ) );
		$per_page = $request->get_param( 'per_page' );
		$per_page = isset( $per_page ) ? absint( $per_page ) : -1;

		if ( empty( $id ) ) {
			return new WP_Error(
				'eventkoi_missing_id',
				__( 'Calendar ID is required.', 'eventkoi-lite' ),
				array( 'status' => 400 )
			);
		}

		if ( strpos( $id, ',' ) !== false ) {
			$ids = array_map( 'absint', explode( ',', $id ) );
			$id  = $ids[0];
		} else {
			$ids = array( absint( $id ) );
		}

		$calendar = new SingleCal( $id );

		$display = sanitize_text_field( $request->get_param( 'display' ) );
		$order   = 'desc';
		$orderby = 'date_modified';
		$max_results = 0;
		$date_start = '';
		$date_end   = '';

		if ( 'list' === $display ) {
			$order   = strtolower( sanitize_key( (string) $request->get_param( 'order' ) ) );
			$orderby = sanitize_key( (string) $request->get_param( 'orderby' ) );
			$page    = max( 1, absint( $request->get_param( 'page' ) ) );
			$per_page = absint( $request->get_param( 'per_page' ) );
			$max_results = absint( $request->get_param( 'max_results' ) );
			$date_start = sanitize_text_field( (string) $request->get_param( 'date_start' ) );
			$date_end   = sanitize_text_field( (string) $request->get_param( 'date_end' ) );

			if ( ! in_array( $order, array( 'asc', 'desc' ), true ) ) {
				$order = 'desc';
			}

			$allowed_orderby = array( 'modified', 'date_modified', 'date', 'publish_date', 'title', 'start_date', 'event_start', 'upcoming' );
			if ( ! in_array( $orderby, $allowed_orderby, true ) ) {
				$orderby = 'date_modified';
			}

			if ( 'date_modified' === $orderby || 'modified' === $orderby ) {
				$orderby = 'modified';
			}

			if ( 'publish_date' === $orderby || 'date' === $orderby ) {
				$orderby = 'date';
			}

			if ( 'event_start' === $orderby || 'start_date' === $orderby ) {
				$orderby = 'event_start';
			}

			if ( 'upcoming' === $orderby && ! $request->has_param( 'order' ) ) {
				$order = 'asc';
			}

			$per_page    = $per_page > 0 ? min( $per_page, 100 ) : 10;
			$max_results = $max_results > 0 ? min( $max_results, 1000 ) : 0;
		} else {
			$orderby    = sanitize_key( (string) $request->get_param( 'orderby' ) );
			$order      = strtolower( sanitize_key( (string) $request->get_param( 'order' ) ) );
			$date_start = sanitize_text_field( (string) $request->get_param( 'start_date' ) );
			$date_end   = sanitize_text_field( (string) $request->get_param( 'end_date' ) );
		}

		// On initial load for "calendar" display → return only calendar meta, no events.
		if ( 'calendar' === $display && $initial ) {
			return rest_ensure_response(
				array(
					'calendar' => $calendar::get_meta(),
					'events'   => array(),
				)
			);
		}

		$expand_instances = ( 'calendar' === $display ); // Expand only if display is calendar.
		if ( $request->has_param( 'expand_instances' ) ) {
			$expand_instances = rest_sanitize_boolean( $request->get_param( 'expand_instances' ) );
		}
		if ( $expand_instances_marker ) {
			$expand_instances = true;
		}
		$event_data       = $calendar::get_events(
			$ids,
			$expand_instances,
			array(
				'per_page'   => $per_page,
				'page'       => $page,
				'orderby'    => $orderby,
				'order'      => $order,
				'start_date' => $date_start,
				'end_date'   => $date_end,
				'max_results' => $max_results,
			)
		);

		$response = array(
			'calendar' => $calendar::get_meta(),
			'events'   => $event_data['items'] ?? array(),
			'total'    => $event_data['total'] ?? count( $event_data['items'] ?? array() ),
		);

		return rest_ensure_response( $response );
	}

	/**
	 * Retrieve paged and ordered events for block queries.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function get_query_events( WP_REST_Request $request ) {
		$include_param     = sanitize_text_field( $request->get_param( 'include' ) );
		$include_instances = (bool) $request->get_param( 'include_instances' );
		$parent_event      = absint( $request->get_param( 'parent_event' ) );

		$exclude_param     = sanitize_text_field( $request->get_param( 'exclude' ) );
		$exclude_ids       = array();
		$exclude_instances = array();

		if ( ! empty( $exclude_param ) ) {
			$raw_excludes = array_map( 'sanitize_text_field', explode( ',', $exclude_param ) );

			foreach ( $raw_excludes as $maybe_id ) {
				// Only consider instance-style IDs (contain a dash).
				if ( strpos( $maybe_id, '-' ) !== false ) {
					$exclude_instances[] = $maybe_id;
				}
			}
		}

		// Pagination and sorting.
		$per_page = $request->get_param( 'per_page' );
		$per_page = isset( $per_page ) ? absint( $per_page ) : 10;

		$page = $request->get_param( 'page' );
		$page = isset( $page ) ? absint( $page ) : 1;

		$order = $request->get_param( 'order' );
		$order = isset( $order ) ? sanitize_text_field( $order ) : 'desc';

		$orderby = $request->get_param( 'orderby' );
		$orderby = isset( $orderby ) ? sanitize_text_field( $orderby ) : 'date_modified';

		// Allow only known orderby values.
		$allowed_orderby = array( 'modified', 'date_modified', 'date', 'publish_date', 'title', 'start_date', 'event_start', 'upcoming' );
		if ( ! in_array( $orderby, $allowed_orderby, true ) ) {
			$orderby = 'date_modified';
		}

		if ( 'date_modified' === $orderby || 'modified' === $orderby ) {
			$orderby = 'modified';
		}

		if ( 'publish_date' === $orderby || 'date' === $orderby ) {
			$orderby = 'date';
		}

		if ( 'event_start' === $orderby || 'start_date' === $orderby ) {
			$orderby = 'event_start';
		}

		if ( 'upcoming' === $orderby && ! $request->has_param( 'order' ) ) {
			$order = 'asc';
		}

		// Optional calendar IDs (comma-separated).
		$id  = sanitize_text_field( $request->get_param( 'id' ) );
		$ids = array();

		$start_date = sanitize_text_field( $request->get_param( 'start_date' ) );
		$end_date   = sanitize_text_field( $request->get_param( 'end_date' ) );

		if ( ! empty( $id ) ) {
			$ids = strpos( $id, ',' ) !== false
			? array_map( 'absint', explode( ',', $id ) )
			: array( absint( $id ) );
		}

		/*
		 * Handle ?include= path (hydration requests).
		 */
		if ( ! empty( $include_param ) ) {
			$include_ids = array_filter( array_map( 'absint', explode( ',', $include_param ) ) );

			if ( empty( $include_ids ) ) {
				return new \WP_Error(
					'eventkoi_invalid_include',
					__( 'Invalid event IDs provided.', 'eventkoi-lite' ),
					array( 'status' => 400 )
				);
			}

			$event_data = \EventKoi\Core\Calendar::get_events(
				array(),
				$include_instances,
				array(
					'include'    => $include_ids,
					'exclude'    => $exclude_instances,
					'per_page'   => -1,
					'orderby'    => $orderby,
					'order'      => $order,
					'start_date' => $start_date,
					'end_date'   => $end_date,
				)
			);

			return rest_ensure_response(
				array(
					'events' => $event_data['items'] ?? array(),
					'total'  => $event_data['total'] ?? count( $event_data['items'] ?? array() ),
					'source' => 'include',
				)
			);
		}

		/*
		 * If a specific parent event is provided and instances are requested,
		 * return only that event's individual instances.
		 */
		if ( $include_instances && $parent_event ) {
			// Reuse "include" to fetch the single parent event; expansion will handle instances.
			$event_data = \EventKoi\Core\Calendar::get_events(
				array(),
				true,
				array(
					'include'    => array( (int) $parent_event ),
					'exclude'    => $exclude_instances,
					'per_page'   => $per_page,
					'page'       => $page,
					'order'      => $order,
					'orderby'    => $orderby,
					'start_date' => $start_date,
					'end_date'   => $end_date,
				)
			);

			$events       = $event_data['items'] ?? array();
			$total_events = $event_data['total'] ?? count( $events );

			return rest_ensure_response(
				array(
					'count'    => count( $events ),
					'total'    => $total_events,
					'page'     => $page,
					'per_page' => $per_page,
					'events'   => $events,
					'source'   => 'parent_event',
				)
			);
		}

		/*
		 * Default: calendar-based query.
		 * Expands instances if requested.
		 */
		$event_data = \EventKoi\Core\Calendar::get_events(
			$ids,
			$include_instances,
			array(
				'per_page'   => $per_page,
				'page'       => $page,
				'order'      => $order,
				'orderby'    => $orderby,
				'start_date' => $start_date,
				'end_date'   => $end_date,
			)
		);

		$events       = $event_data['items'] ?? array();
		$total_events = $event_data['total'] ?? count( $events );
		$count        = count( $events );

		$calendar_meta = null;
		if ( ! empty( $ids ) ) {
			$first_id      = reset( $ids );
			$calendar_meta = ( new \EventKoi\Core\Calendar( $first_id ) )->get_meta();
		}

		return rest_ensure_response(
			array(
				'calendar' => $calendar_meta,
				'count'    => $count,
				'total'    => $total_events,
				'page'     => $page,
				'per_page' => $per_page,
				'events'   => $events,
				'source'   => 'calendar',
			)
		);
	}


	/**
	 * Update a calendar.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response The REST response.
	 */
	public static function update_calendar( WP_REST_Request $request ) {
		$data = json_decode( $request->get_body(), true );

		if ( empty( $data['calendar'] ) || ! is_array( $data['calendar'] ) ) {
			return new WP_Error( 'eventkoi_invalid_data', __( 'Invalid calendar data.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$calendar = $data['calendar'];

		$query    = new SingleCal( absint( $calendar['id'] ) );
		$response = $query::update( $calendar );

		return rest_ensure_response( $response );
	}

	/**
	 * Duplicate a calendar.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response The REST response.
	 */
	public static function duplicate_calendar( WP_REST_Request $request ) {
		$data        = json_decode( $request->get_body(), true );
		$calendar_id = ! empty( $data['calendar_id'] ) ? absint( $data['calendar_id'] ) : 0;

		if ( ! $calendar_id ) {
			return new WP_Error( 'eventkoi_invalid_id', __( 'Calendar ID is required.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$calendar = new SingleCal( $calendar_id );
		$response = $calendar::duplicate_calendar();

		return rest_ensure_response( $response );
	}

	/**
	 * Delete a calendar.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response The REST response.
	 */
	public static function delete_calendar( WP_REST_Request $request ) {
		$data        = json_decode( $request->get_body(), true );
		$calendar_id = ! empty( $data['calendar_id'] ) ? absint( $data['calendar_id'] ) : 0;

		if ( ! $calendar_id ) {
			return new WP_Error( 'eventkoi_invalid_id', __( 'Calendar ID is required.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$response = SingleCal::delete_calendar( $calendar_id );

		return rest_ensure_response( $response );
	}
}
