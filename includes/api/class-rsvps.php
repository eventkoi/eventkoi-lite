<?php
/**
 * RSVP API.
 *
 * @package    EventKoi
 * @subpackage EventKoi\API
 */

namespace EventKoi\API;

use WP_Error;
use WP_REST_Request;
use EventKoi\Core\Event;
use EventKoi\Core\Rsvps as Core_Rsvps;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * RSVP endpoints.
 */
class Rsvps {

	/**
	 * Init.
	 */
	public static function init() {
		register_rest_route(
			EVENTKOI_API,
			'/rsvp',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'create_rsvp' ),
				'permission_callback' => array( REST::class, 'public_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/rsvp/summary',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'get_summary' ),
				'permission_callback' => array( REST::class, 'public_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/rsvp/checkin',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'get_checkin' ),
				'permission_callback' => array( REST::class, 'public_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/rsvps',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'get_rsvps' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/rsvps/bulk',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'bulk_action' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/rsvps/export',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'export_rsvps' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);
	}

	/**
	 * Create or update an RSVP.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return \WP_REST_Response|WP_Error
	 */
	public static function create_rsvp( WP_REST_Request $request ) {
		$data = json_decode( $request->get_body(), true );

		if ( empty( $data ) || ! is_array( $data ) ) {
			return new WP_Error( 'eventkoi_rsvp_invalid', __( 'Invalid RSVP data.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$payload = array(
			'event_id'    => absint( $data['event_id'] ?? 0 ),
			'instance_ts' => absint( $data['instance_ts'] ?? 0 ),
			'name'        => sanitize_text_field( $data['name'] ?? '' ),
			'email'       => sanitize_email( $data['email'] ?? '' ),
			'status'      => sanitize_key( $data['status'] ?? 'going' ),
			'guests'      => absint( $data['guests'] ?? 0 ),
		);

		$user_id = get_current_user_id();
		if ( $user_id ) {
			$user = get_user_by( 'id', $user_id );
			if ( $user ) {
				if ( empty( $payload['name'] ) ) {
					$first_name = isset( $user->first_name ) ? sanitize_text_field( $user->first_name ) : '';
					$last_name  = isset( $user->last_name ) ? sanitize_text_field( $user->last_name ) : '';
					$payload['name'] = trim( $first_name . ' ' . $last_name );
				}
				if ( empty( $payload['email'] ) ) {
					$payload['email'] = sanitize_email( $user->user_email );
				}
			}
			$payload['user_id'] = $user_id;
		}

		$result = Core_Rsvps::create( $payload );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response( $result );
	}

	/**
	 * Get RSVPs for an event instance.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return \WP_REST_Response|WP_Error
	 */
	public static function get_rsvps( WP_REST_Request $request ) {
		$event_id    = absint( $request->get_param( 'event_id' ) );
		$instance_ts = absint( $request->get_param( 'instance_ts' ) );

		if ( ! $event_id ) {
			return new WP_Error( 'eventkoi_rsvp_missing_event', __( 'Missing event ID.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$event_post = get_post( $event_id );
		if ( empty( $event_post ) || 'eventkoi_event' !== $event_post->post_type ) {
			return new WP_Error( 'eventkoi_rsvp_invalid_event', __( 'Invalid event.', 'eventkoi-lite' ), array( 'status' => 404 ) );
		}

		if ( ! $instance_ts ) {
			new Event( $event_id );
			$date_type = Event::get_date_type();

			if ( 'recurring' === $date_type ) {
				return new WP_Error( 'eventkoi_rsvp_missing_instance', __( 'Missing event instance.', 'eventkoi-lite' ), array( 'status' => 400 ) );
			}

			$instance_ts = absint( get_post_meta( $event_id, 'start_timestamp', true ) );
		}

		if ( ! $instance_ts ) {
			return new WP_Error( 'eventkoi_rsvp_missing_instance', __( 'Missing event instance.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$items = Core_Rsvps::get_list( $event_id, $instance_ts );
		if ( ! empty( $items ) ) {
			foreach ( $items as $item ) {
				$email = isset( $item->email ) ? sanitize_email( $item->email ) : '';
				$item->avatar_url = $email
					? get_avatar_url( $email, array( 'size' => 64, 'default' => 'identicon' ) )
					: '';
			}
		}

		return rest_ensure_response( $items );
	}

	/**
	 * Bulk actions for RSVPs.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return \WP_REST_Response|WP_Error
	 */
	public static function bulk_action( WP_REST_Request $request ) {
		$data = json_decode( $request->get_body(), true );

		if ( empty( $data ) || ! is_array( $data ) ) {
			return new WP_Error( 'eventkoi_rsvp_invalid', __( 'Invalid request.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$ids    = array_filter( array_map( 'absint', (array) ( $data['ids'] ?? array() ) ) );
		$action = sanitize_key( $data['action'] ?? '' );

		if ( empty( $ids ) || empty( $action ) ) {
			return new WP_Error( 'eventkoi_rsvp_missing_fields', __( 'Missing required fields.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		if ( 'delete' === $action ) {
			$result = Core_Rsvps::delete_rsvps( $ids );
		} elseif ( 'status' === $action ) {
			$status = sanitize_key( $data['status'] ?? '' );
			$result = Core_Rsvps::update_status( $ids, $status );
		} elseif ( 'checkin' === $action ) {
			$checkin_status = sanitize_key( $data['status'] ?? '' );
			$result         = Core_Rsvps::update_checkin_status( $ids, $checkin_status );
		} elseif ( 'checkin_count' === $action ) {
			$checkin_count = isset( $data['count'] ) ? absint( $data['count'] ) : null;
			$result        = Core_Rsvps::update_checkin_count( $ids, $checkin_count );
		} elseif ( 'resend_email' === $action ) {
			$result = Core_Rsvps::resend_emails( $ids );
		} else {
			return new WP_Error( 'eventkoi_rsvp_invalid_action', __( 'Invalid action.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'count'   => (int) $result,
			)
		);
	}

	/**
	 * Export RSVPs as CSV.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return \WP_REST_Response|WP_Error
	 */
	public static function export_rsvps( WP_REST_Request $request ) {
		$event_id    = absint( $request->get_param( 'event_id' ) );
		$instance_ts = absint( $request->get_param( 'instance_ts' ) );
		$status      = sanitize_key( $request->get_param( 'status' ) );
		$search      = sanitize_text_field( $request->get_param( 'search' ) );

		if ( ! $event_id ) {
			return new WP_Error( 'eventkoi_rsvp_missing_event', __( 'Missing event ID.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$event_post = get_post( $event_id );
		if ( empty( $event_post ) || 'eventkoi_event' !== $event_post->post_type ) {
			return new WP_Error( 'eventkoi_rsvp_invalid_event', __( 'Invalid event.', 'eventkoi-lite' ), array( 'status' => 404 ) );
		}

		if ( ! $instance_ts ) {
			new Event( $event_id );
			$date_type = Event::get_date_type();

			if ( 'recurring' === $date_type ) {
				return new WP_Error( 'eventkoi_rsvp_missing_instance', __( 'Missing event instance.', 'eventkoi-lite' ), array( 'status' => 400 ) );
			}

			$instance_ts = absint( get_post_meta( $event_id, 'start_timestamp', true ) );
		}

		if ( ! $instance_ts ) {
			return new WP_Error( 'eventkoi_rsvp_missing_instance', __( 'Missing event instance.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$status = $status ? $status : 'going';
		if ( 'all' !== $status && ! in_array( $status, Core_Rsvps::get_allowed_statuses(), true ) ) {
			return new WP_Error( 'eventkoi_rsvp_invalid_status', __( 'Invalid RSVP status.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$items = Core_Rsvps::get_list( $event_id, $instance_ts );

		if ( ! empty( $items ) ) {
			if ( 'all' !== $status ) {
				$items = array_filter(
					$items,
					static function ( $item ) use ( $status ) {
						return strtolower( $item->status ?? '' ) === $status;
					}
				);
			}

			if ( $search ) {
				$needle = strtolower( $search );
				$items  = array_filter(
					$items,
					static function ( $item ) use ( $needle ) {
						$name  = strtolower( $item->name ?? '' );
						$email = strtolower( $item->email ?? '' );
						$code  = strtolower( $item->checkin_token ?? '' );
						return false !== strpos( $name, $needle )
							|| false !== strpos( $email, $needle )
							|| false !== strpos( $code, $needle );
					}
				);
			}
		}

		$rows = array();
		$date_format = get_option( 'date_format' );
		$time_format = get_option( 'time_format' );
		$datetime_format = trim( $date_format . ' ' . $time_format );

		foreach ( $items as $item ) {
			$is_going = strtolower( $item->status ?? '' ) === 'going';
			$created = isset( $item->created ) ? (string) $item->created : '';
			$created_ts = $created ? strtotime( $created . ' UTC' ) : 0;
			$created_label = $created_ts
				? wp_date( $datetime_format, $created_ts, wp_timezone() )
				: '';

			$rows[] = array(
				'name'         => $item->name ?? '',
				'email'        => $item->email ?? '',
				'checkin_code' => $is_going ? ( $item->checkin_token ?? '' ) : '',
				'guests'       => isset( $item->guests ) ? absint( $item->guests ) : 0,
				'rsvp_date'    => $created_label,
			);
		}

		$handle = fopen( 'php://temp', 'r+' );
		fputcsv( $handle, array( 'Name', 'Email', 'Check-in code', 'Guests', 'RSVP date' ) );

		foreach ( $rows as $row ) {
			fputcsv( $handle, array_values( $row ) );
		}

		rewind( $handle );
		$csv = stream_get_contents( $handle );
		fclose( $handle );

		$event_name = get_the_title( $event_id );
		$event_slug = $event_name ? sanitize_title( $event_name ) : 'event';
		$status_slug = sanitize_key( $status );
		$instance_date = '';

		new Event( $event_id );
		$date_type = Event::get_date_type();
		if ( 'recurring' === $date_type ) {
			$instance_date = wp_date( 'dmy', $instance_ts, wp_timezone() );
		}

		$filename = $instance_date
			? sprintf( '%1$s-%2$s-%3$s.csv', $event_slug, $instance_date, $status_slug )
			: sprintf( '%1$s-%2$s.csv', $event_slug, $status_slug );

		$response = new \WP_REST_Response( $csv, 200 );
		$response->header( 'Content-Type', 'text/csv; charset=utf-8' );
		$response->header( 'Content-Disposition', 'attachment; filename="' . $filename . '"' );

		add_filter(
			'rest_pre_serve_request',
			static function ( $served, $result, $request, $server ) use ( $csv, $filename ) {
				if ( '/' . EVENTKOI_API . '/rsvps/export' !== $request->get_route() ) {
					return $served;
				}

				nocache_headers();
				header( 'Content-Type: text/csv; charset=utf-8' );
				header( 'Content-Disposition: attachment; filename="' . $filename . '"' );
				echo $csv;
				return true;
			},
			10,
			4
		);

		return $response;
	}

	/**
	 * Get RSVP summary for an event instance.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return \WP_REST_Response|WP_Error
	 */
	public static function get_summary( WP_REST_Request $request ) {
		$event_id    = absint( $request->get_param( 'event_id' ) );
		$instance_ts = absint( $request->get_param( 'instance_ts' ) );
		$token       = sanitize_text_field( $request->get_param( 'eventkoi_rsvp' ) );
		$rsvp_data   = null;
		$user_id     = get_current_user_id();
		$user_email  = '';

		if ( $user_id ) {
			$user = get_user_by( 'id', $user_id );
			if ( $user ) {
				$user_email = sanitize_email( $user->user_email );
			}
		}

		if ( ! $event_id ) {
			return new WP_Error( 'eventkoi_rsvp_missing_event', __( 'Missing event ID.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$event_post = get_post( $event_id );
		if ( empty( $event_post ) || 'eventkoi_event' !== $event_post->post_type ) {
			return new WP_Error( 'eventkoi_rsvp_invalid_event', __( 'Invalid event.', 'eventkoi-lite' ), array( 'status' => 404 ) );
		}

		if ( ! $instance_ts ) {
			new Event( $event_id );
			$date_type = Event::get_date_type();

			if ( 'recurring' === $date_type ) {
				if ( $token ) {
					$token_rsvp = Core_Rsvps::get_by_token( $token );
					if ( ! empty( $token_rsvp ) && (int) $token_rsvp->event_id === $event_id ) {
						$instance_ts = absint( $token_rsvp->instance_ts );
					}
				}
			}

			if ( 'recurring' === $date_type && ! $instance_ts ) {
				return new WP_Error( 'eventkoi_rsvp_missing_instance', __( 'Missing event instance.', 'eventkoi-lite' ), array( 'status' => 400 ) );
			}

			$instance_ts = absint( get_post_meta( $event_id, 'start_timestamp', true ) );
		}

		if ( ! $instance_ts ) {
			return new WP_Error( 'eventkoi_rsvp_missing_instance', __( 'Missing event instance.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		new Event( $event_id );

		if ( $token ) {
			$token_rsvp = isset( $token_rsvp ) ? $token_rsvp : Core_Rsvps::get_by_token( $token );
			if ( ! empty( $token_rsvp ) && (int) $token_rsvp->event_id === $event_id && (int) $token_rsvp->instance_ts === $instance_ts ) {
				$rsvp_data = array(
					'status'        => sanitize_key( $token_rsvp->status ?? '' ),
					'guests'        => absint( $token_rsvp->guests ?? 0 ),
					'checkin_token' => sanitize_text_field( $token_rsvp->checkin_token ?? '' ),
					'name'          => sanitize_text_field( $token_rsvp->name ?? '' ),
					'email'         => sanitize_email( $token_rsvp->email ?? '' ),
				);
			}
		} elseif ( $user_id ) {
			$identity_rsvp = Core_Rsvps::get_by_identity( $event_id, $instance_ts, $user_id, $user_email );
			if ( ! empty( $identity_rsvp ) ) {
				$rsvp_data = array(
					'status'        => sanitize_key( $identity_rsvp->status ?? '' ),
					'guests'        => absint( $identity_rsvp->guests ?? 0 ),
					'checkin_token' => sanitize_text_field( $identity_rsvp->checkin_token ?? '' ),
					'name'          => sanitize_text_field( $identity_rsvp->name ?? '' ),
					'email'         => sanitize_email( $identity_rsvp->email ?? '' ),
				);
			}
		}

		$summary = Core_Rsvps::get_summary( $event_id, $instance_ts );

		return rest_ensure_response(
			array(
				'event_id'        => $event_id,
				'instance_ts'     => $instance_ts,
				'event_title'     => self::get_event_title( $event_id, $instance_ts ),
				'rsvp'            => $rsvp_data,
				'summary'         => $summary,
				'capacity'        => Event::get_rsvp_capacity(),
				'show_remaining'  => Event::get_rsvp_show_remaining(),
				'allow_guests'    => Event::get_rsvp_allow_guests(),
				'max_guests'      => Event::get_rsvp_max_guests(),
				'allow_edit'      => Event::get_rsvp_allow_edit(),
				'rsvp_enabled'    => Event::get_rsvp_enabled(),
			)
		);
	}

	/**
	 * Lookup an RSVP by check-in token.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return \WP_REST_Response|WP_Error
	 */
	public static function get_checkin( WP_REST_Request $request ) {
		$token = sanitize_text_field( $request->get_param( 'eventkoi_rsvp' ) );

		if ( empty( $token ) ) {
			return new WP_Error( 'eventkoi_rsvp_missing_token', __( 'Missing check-in code.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$record = Core_Rsvps::get_by_token( $token );
		if ( empty( $record ) ) {
			return new WP_Error( 'eventkoi_rsvp_invalid_token', __( 'Invalid check-in code.', 'eventkoi-lite' ), array( 'status' => 404 ) );
		}

		$event_id = absint( $record->event_id ?? 0 );
		$event    = $event_id ? get_post( $event_id ) : null;
		if ( empty( $event ) || 'eventkoi_event' !== $event->post_type ) {
			return new WP_Error( 'eventkoi_rsvp_invalid_event', __( 'Invalid event.', 'eventkoi-lite' ), array( 'status' => 404 ) );
		}

		new Event( $event_id );

		$response = array(
			'event' => array(
				'id'           => $event_id,
				'title'        => self::get_event_title( $event_id, absint( $record->instance_ts ?? 0 ) ),
				'url'          => self::get_event_url( $event_id, absint( $record->instance_ts ?? 0 ) ),
				'datetime_utc' => self::get_event_datetime_utc( $event_id, absint( $record->instance_ts ?? 0 ) ),
				'location'     => self::get_primary_physical_location( $event_id ),
			),
			'rsvp'  => array(
				'status'        => sanitize_key( $record->status ?? '' ),
				'guests'        => absint( $record->guests ?? 0 ),
				'checkin_token' => sanitize_text_field( $record->checkin_token ?? '' ),
				'name'          => sanitize_text_field( $record->name ?? '' ),
				'email'         => sanitize_email( $record->email ?? '' ),
				'instance_ts'   => absint( $record->instance_ts ?? 0 ),
				'avatar_url'    => '',
			),
		);

		$email = sanitize_email( $record->email ?? '' );
		if ( $email ) {
			$response['rsvp']['avatar_url'] = get_avatar_url(
				$email,
				array(
					'size'    => 64,
					'default' => 'identicon',
				)
			);
		}

		$timestamps = self::get_event_instance_timestamps( $event_id, absint( $record->instance_ts ?? 0 ) );
		if ( ! empty( $timestamps['start'] ) ) {
			$response['event']['start'] = gmdate( 'Y-m-d\TH:i:s\Z', $timestamps['start'] );
		}
		if ( ! empty( $timestamps['end'] ) ) {
			$response['event']['end'] = gmdate( 'Y-m-d\TH:i:s\Z', $timestamps['end'] );
			$response['event']['end_real'] = gmdate( 'Y-m-d\TH:i:s\Z', $timestamps['end'] );
		}

		$response['event']['date_type'] = Event::get_date_type();
		$response['event']['allDay']    = (bool) get_post_meta( $event_id, 'all_day', true );
		if ( 'recurring' === $response['event']['date_type'] ) {
			$response['event']['timeline'] = true;
		}

		$response['summary']        = Core_Rsvps::get_summary( $event_id, absint( $record->instance_ts ?? 0 ) );
		$response['capacity']       = Event::get_rsvp_capacity();
		$response['allow_guests']   = Event::get_rsvp_allow_guests();
		$response['max_guests']     = Event::get_rsvp_max_guests();
		$response['allow_edit']     = Event::get_rsvp_allow_edit();
		$response['rsvp_enabled']   = Event::get_rsvp_enabled();

		return rest_ensure_response( $response );
	}

	/**
	 * Build UTC schedule string for an event.
	 *
	 * @param int $event_id Event ID.
	 * @param int $instance_ts Instance timestamp.
	 * @return string
	 */
	private static function get_event_datetime_utc( $event_id, $instance_ts = 0 ) {
		$event_id = absint( $event_id );
		if ( ! $event_id ) {
			return '';
		}

		$timestamps = self::get_event_instance_timestamps( $event_id, $instance_ts );
		$event_timestamp     = $timestamps['start'] ?? 0;
		$event_end_timestamp = $timestamps['end'] ?? 0;

		if ( ! $event_timestamp ) {
			return '';
		}

		$utc_timezone   = new \DateTimeZone( 'UTC' );
		$date_format    = get_option( 'date_format' );
		$time_format    = get_option( 'time_format' );
		$event_date     = wp_date( $date_format, $event_timestamp, $utc_timezone );
		$event_time     = wp_date( $time_format, $event_timestamp, $utc_timezone );
		$event_end_date = $event_end_timestamp ? wp_date( $date_format, $event_end_timestamp, $utc_timezone ) : '';
		$event_end_time = $event_end_timestamp ? wp_date( $time_format, $event_end_timestamp, $utc_timezone ) : '';

		if ( $event_end_timestamp ) {
			$is_same_day = $event_date === $event_end_date;
			return $is_same_day
				? sprintf( '%1$s, %2$s — %3$s', $event_date, $event_time, $event_end_time )
				: sprintf( '%1$s, %2$s — %3$s, %4$s', $event_date, $event_time, $event_end_date, $event_end_time );
		}

		return sprintf( '%1$s, %2$s', $event_date, $event_time );
	}

	/**
	 * Get start/end timestamps for an event instance.
	 *
	 * @param int $event_id Event ID.
	 * @param int $instance_ts Instance timestamp.
	 * @return array
	 */
	private static function get_event_instance_timestamps( $event_id, $instance_ts = 0 ) {
		$event_id = absint( $event_id );
		if ( ! $event_id ) {
			return array();
		}

		$event_timestamp     = $instance_ts ? absint( $instance_ts ) : absint( get_post_meta( $event_id, 'start_timestamp', true ) );
		$event_end_timestamp = absint( get_post_meta( $event_id, 'end_timestamp', true ) );

		new Event( $event_id );
		$date_type = Event::get_date_type();

		if ( $event_timestamp && 'recurring' === $date_type && $instance_ts ) {
			$rules = Event::get_recurrence_rules();

			if ( ! empty( $rules ) ) {
				foreach ( $rules as $rule ) {
					$rule_start = ! empty( $rule['start_date'] ) ? strtotime( $rule['start_date'] . ' UTC' ) : null;
					$rule_end   = ! empty( $rule['end_date'] ) ? strtotime( $rule['end_date'] . ' UTC' ) : null;
					$duration   = ( $rule_start && $rule_end && $rule_end > $rule_start ) ? ( $rule_end - $rule_start ) : null;

					if ( $duration ) {
						$event_end_timestamp = $event_timestamp + $duration;
						break;
					}
				}
			}
		}

		return array(
			'start' => $event_timestamp,
			'end'   => $event_end_timestamp,
		);
	}

	/**
	 * Build event URL for a specific instance if needed.
	 *
	 * @param int $event_id Event ID.
	 * @param int $instance_ts Instance timestamp.
	 * @return string
	 */
	private static function get_event_url( $event_id, $instance_ts = 0 ) {
		$event_id = absint( $event_id );
		if ( ! $event_id ) {
			return '';
		}

		$url = get_permalink( $event_id );
		if ( ! $url ) {
			return '';
		}

		new Event( $event_id );
		if ( 'recurring' !== Event::get_date_type() || ! $instance_ts ) {
			return $url;
		}

		$is_pretty_permalink = get_option( 'permalink_structure' ) && false === strpos( $url, '?' );

		if ( $is_pretty_permalink ) {
			return trailingslashit( $url ) . absint( $instance_ts ) . '/';
		}

		return add_query_arg( 'instance', absint( $instance_ts ), $url );
	}

	/**
	 * Get event title, preferring instance override when available.
	 *
	 * @param int $event_id Event ID.
	 * @param int $instance_ts Instance timestamp.
	 * @return string
	 */
	private static function get_event_title( $event_id, $instance_ts = 0 ) {
		$event_id = absint( $event_id );
		if ( ! $event_id ) {
			return __( 'Event', 'eventkoi-lite' );
		}

		$event = new Event( $event_id );

		if ( $instance_ts ) {
			$overrides = $event->get_recurrence_overrides();

			if (
				isset( $overrides[ $instance_ts ]['title'] ) &&
				is_string( $overrides[ $instance_ts ]['title'] ) &&
				! empty( $overrides[ $instance_ts ]['title'] )
			) {
				return wp_strip_all_tags( $overrides[ $instance_ts ]['title'] );
			}
		}

		return $event->get_title();
	}

	/**
	 * Get the first physical location for an event.
	 *
	 * @param int $event_id Event ID.
	 * @return string
	 */
	private static function get_primary_physical_location( $event_id ) {
		$event_id = absint( $event_id );
		if ( ! $event_id ) {
			return '';
		}

		new Event( $event_id );
		$locations = Event::get_locations();

		if ( empty( $locations ) || ! is_array( $locations ) ) {
			return '';
		}

		foreach ( $locations as $location ) {
			if ( ! is_array( $location ) || empty( $location ) ) {
				continue;
			}

			$type = isset( $location['type'] ) ? sanitize_key( $location['type'] ) : 'physical';
			if ( 'physical' !== $type ) {
				continue;
			}

			$name    = isset( $location['name'] ) ? sanitize_text_field( $location['name'] ) : '';
			$line1   = isset( $location['address1'] ) ? sanitize_text_field( $location['address1'] ) : '';
			$line2   = isset( $location['address2'] ) ? sanitize_text_field( $location['address2'] ) : '';
			$city    = isset( $location['city'] ) ? sanitize_text_field( $location['city'] ) : '';
			$state   = isset( $location['state'] ) ? sanitize_text_field( $location['state'] ) : '';
			$zip     = isset( $location['zip'] ) ? sanitize_text_field( $location['zip'] ) : '';
			$country = isset( $location['country'] ) ? sanitize_text_field( $location['country'] ) : '';

			$city_line = implode( ', ', array_filter( array( $city, $state, $zip ) ) );
			$parts     = array_filter( array( $name, $line1, $line2, $city_line, $country ) );

			if ( empty( $parts ) ) {
				continue;
			}

			return implode( "\n", $parts );
		}

		return '';
	}
}
