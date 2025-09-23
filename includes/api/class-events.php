<?php
/**
 * REST API - Events Endpoint.
 *
 * @package    EventKoi
 * @subpackage EventKoi\API
 */

namespace EventKoi\API;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use EventKoi\API\REST;
use EventKoi\Core\Events as Query;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Class Events.
 *
 * Handles events API actions such as fetching, deleting, removing, and restoring events.
 */
class Events {

	/**
	 * Register REST routes.
	 *
	 * @return void
	 */
	public static function init() {
		register_rest_route(
			EVENTKOI_API,
			'/events',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'get_events' ),
				'permission_callback' => array( REST::class, 'public_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/get_event_counts',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'get_event_counts' ),
				'permission_callback' => array( REST::class, 'public_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/delete_events',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'delete_events' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/remove_events',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'remove_events' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/restore_events',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'restore_events' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/duplicate_events',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'duplicate_events' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);
	}

	/**
	 * Fetch events based on parameters.
	 *
	 * @param \WP_REST_Request $request The request containing query parameters.
	 * @return \WP_REST_Response|\WP_Error The response.
	 */
	public static function get_events( WP_REST_Request $request ) {
		$status       = $request->get_param( 'status' );
		$event_status = $request->get_param( 'event_status' );
		$calendar     = $request->get_param( 'calendar' );
		$from         = $request->get_param( 'from' );
		$to           = $request->get_param( 'to' );
		$number_param = $request->get_param( 'number' );
		$number       = $number_param ? $number_param : 0;

		$response = Query::get_events(
			array(
				'status'       => $status,
				'event_status' => $event_status,
				'calendar'     => $calendar,
				'from'         => $from,
				'to'           => $to,
				'number'       => $number,
			)
		);

		return rest_ensure_response( $response );
	}

	/**
	 * Get event status counts.
	 *
	 * @param \WP_REST_Request $request The request (unused).
	 * @return \WP_REST_Response|\WP_Error The response.
	 */
	public static function get_event_counts( WP_REST_Request $request ) {
		// Reserved for future use.
		$request = $request;

		$response = Query::get_counts();

		return rest_ensure_response( $response );
	}

	/**
	 * Soft-delete events based on provided IDs.
	 *
	 * @param \WP_REST_Request $request The request containing event IDs.
	 * @return \WP_REST_Response|\WP_Error The response.
	 */
	public static function delete_events( WP_REST_Request $request ) {
		$data = json_decode( $request->get_body(), true );
		$ids  = ! empty( $data['ids'] ) ? array_map( 'intval', $data['ids'] ) : null;

		$response = Query::delete_events( $ids );

		/**
		 * Fires after soft-deleting multiple events.
		 *
		 * @param array|null $ids The deleted event IDs.
		 */
		do_action( 'eventkoi_after_events_deleted', $ids );

		return rest_ensure_response( $response );
	}

	/**
	 * Permanently remove events based on provided IDs.
	 *
	 * @param \WP_REST_Request $request The request containing event IDs.
	 * @return \WP_REST_Response|\WP_Error The response.
	 */
	public static function remove_events( WP_REST_Request $request ) {
		$data = json_decode( $request->get_body(), true );
		$ids  = ! empty( $data['ids'] ) ? array_map( 'intval', $data['ids'] ) : null;

		$response = Query::remove_events( $ids );

		/**
		 * Fires after permanently removing events.
		 *
		 * @param array|null $ids The removed event IDs.
		 */
		do_action( 'eventkoi_after_events_removed', $ids );

		return rest_ensure_response( $response );
	}

	/**
	 * Restore previously deleted events.
	 *
	 * @param \WP_REST_Request $request The request containing event IDs.
	 * @return \WP_REST_Response|\WP_Error The response.
	 */
	public static function restore_events( WP_REST_Request $request ) {
		$data = json_decode( $request->get_body(), true );
		$ids  = ! empty( $data['ids'] ) ? array_map( 'intval', $data['ids'] ) : null;

		$response = Query::restore_events( $ids );

		/**
		 * Fires after restoring events from trash.
		 *
		 * @param array|null $ids The restored event IDs.
		 */
		do_action( 'eventkoi_after_events_restored', $ids );

		return rest_ensure_response( $response );
	}

	/**
	 * Duplicate one or more events.
	 *
	 * @param \WP_REST_Request $request The request containing event IDs.
	 * @return \WP_REST_Response|\WP_Error The response.
	 */
	public static function duplicate_events( WP_REST_Request $request ) {
		$data = json_decode( $request->get_body(), true );
		$ids  = ! empty( $data['ids'] ) ? array_map( 'intval', $data['ids'] ) : array();

		if ( empty( $ids ) ) {
			return new WP_Error(
				'eventkoi_no_ids',
				__( 'No event IDs provided.', 'eventkoi-lite' ),
				array( 'status' => 400 )
			);
		}

		$response = Query::duplicate_events( $ids );

		/**
		 * Fires after duplicating events.
		 *
		 * @param array $ids The source event IDs that were duplicated.
		 */
		do_action( 'eventkoi_after_events_duplicated', $ids );

		return rest_ensure_response( $response );
	}
}
