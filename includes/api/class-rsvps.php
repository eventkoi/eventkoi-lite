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
				'permission_callback' => REST::cap( 'eventkoi_attendees_view' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/rsvps/bulk',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'bulk_action' ),
				'permission_callback' => REST::cap( 'eventkoi_attendees_manage' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/rsvps/export',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'export_rsvps' ),
				'permission_callback' => REST::cap( 'eventkoi_attendees_view' ),
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
		$date_format = \eventkoi_resolved_date_format();
		$time_format = \eventkoi_resolved_time_format();
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

		// Prevent CSV-formula injection: any cell starting with =, +, -, @, tab
		// or CR is interpreted as a formula by Excel/Sheets/Numbers. Attendee
		// name fields are an open vector; prefix a single quote so the cell
		// renders as text.
		$sanitize_cell = static function ( $value ) {
			$str = (string) $value;
			if ( '' === $str ) {
				return $str;
			}
			$first = $str[0];
			if ( '=' === $first || '+' === $first || '-' === $first || '@' === $first || "\t" === $first || "\r" === $first ) {
				return "'" . $str;
			}
			return $str;
		};

		foreach ( $rows as $row ) {
			fputcsv( $handle, array_map( $sanitize_cell, array_values( $row ) ) );
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

		new Event( $event_id );
		$date_type           = Event::get_date_type();
		$standard_type       = Event::get_standard_type();
		$standard_event_wide = ( 'standard' === $date_type && 'selected' !== $standard_type );

		if ( ! $instance_ts ) {
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

		if ( $token ) {
			$token_rsvp = isset( $token_rsvp ) ? $token_rsvp : Core_Rsvps::get_by_token( $token );
			$token_matches_instance = ! empty( $token_rsvp ) && (int) $token_rsvp->event_id === $event_id && ( $standard_event_wide || (int) $token_rsvp->instance_ts === $instance_ts );
			if ( $token_matches_instance ) {
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

		$summary = $standard_event_wide && method_exists( Core_Rsvps::class, 'get_summary_for_event' ) ? Core_Rsvps::get_summary_for_event( $event_id ) : Core_Rsvps::get_summary( $event_id, $instance_ts );

		$sale_start  = (string) Event::get_rsvp_sale_start( (int) $instance_ts );
		$sale_end    = (string) Event::get_rsvp_sale_end( (int) $instance_ts );
		$is_open     = self::compute_rsvp_is_open( $sale_start, $sale_end );
		$event_ended = self::compute_event_ended( $event_id, (int) $instance_ts );

		return rest_ensure_response(
			array(
				'event_id'        => $event_id,
				'instance_ts'     => $instance_ts,
				'event_title'     => self::get_event_title( $event_id, $instance_ts ),
				'rsvp'            => $rsvp_data,
				'summary'         => $summary,
				'capacity'        => Event::get_rsvp_capacity(),
				'show_count'      => Event::get_rsvp_show_count(),
				'show_remaining'  => Event::get_rsvp_show_remaining(),
				'allow_guests'    => Event::get_rsvp_allow_guests(),
				'max_guests'      => Event::get_rsvp_max_guests(),
				'allow_edit'      => Event::get_rsvp_allow_edit(),
				'rsvp_enabled'    => Event::get_rsvp_enabled(),
				'sale_start'      => $sale_start,
				'sale_end'        => $sale_end,
				'is_open'         => $is_open,
				'event_ended'     => $event_ended,
			)
		);
	}

	/**
	 * Whether the event (or resolved instance) is over.
	 *
	 * @param int $event_id    Event ID.
	 * @param int $instance_ts Instance timestamp, 0 for non-recurring.
	 * @return bool
	 */
	private static function compute_event_ended( $event_id, $instance_ts = 0 ) {
		$status = (string) get_post_meta( $event_id, 'status', true );
		if ( 'completed' === $status || 'cancelled' === $status ) {
			return true;
		}
		$end_ts = Core_Rsvps::resolve_event_end_ts( $event_id, $instance_ts );
		return ( $end_ts > 0 && time() > $end_ts );
	}

	/**
	 * Resolve open/closed/upcoming for an RSVP window.
	 *
	 * @param string $sale_start UTC `Y-m-d H:i:s` or empty.
	 * @param string $sale_end   UTC `Y-m-d H:i:s` or empty.
	 * @return array{open:bool,reason:string}
	 */
	private static function compute_rsvp_is_open( $sale_start, $sale_end ) {
		$now      = time();
		$start_ts = '' !== $sale_start ? strtotime( $sale_start . ' UTC' ) : 0;
		$end_ts   = '' !== $sale_end ? strtotime( $sale_end . ' UTC' ) : 0;

		if ( $start_ts && $now < $start_ts ) {
			return array(
				'open'   => false,
				'reason' => 'not_started',
			);
		}
		if ( $end_ts && $now > $end_ts ) {
			return array(
				'open'   => false,
				'reason' => 'closed',
			);
		}
		return array(
			'open'   => true,
			'reason' => '',
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

		$record_instance_ts  = absint( $record->instance_ts ?? 0 );
		$display_instance_ts = self::get_checkin_display_instance_ts( $event_id, $record_instance_ts );
		$standard_event_wide = 'standard' === Event::get_date_type() && 'selected' !== Event::get_standard_type();
		$response = array(
			'event' => array(
				'id'           => $event_id,
				'title'        => self::get_event_title( $event_id, $display_instance_ts ),
				'url'          => self::get_event_url( $event_id, $display_instance_ts ),
				'datetime_utc' => self::get_event_datetime_utc( $event_id, $display_instance_ts ),
				'location'     => self::get_primary_physical_location( $event_id ),
			),
			'rsvp'  => array(
				'status'        => sanitize_key( $record->status ?? '' ),
				'guests'        => absint( $record->guests ?? 0 ),
				'checkin_token' => sanitize_text_field( $record->checkin_token ?? '' ),
				'name'          => sanitize_text_field( $record->name ?? '' ),
				'email'         => sanitize_email( $record->email ?? '' ),
				'instance_ts'   => $display_instance_ts,
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

		$timestamps = self::get_event_instance_timestamps( $event_id, $display_instance_ts );
		if ( ! empty( $timestamps['start'] ) ) {
			$response['event']['start'] = gmdate( 'Y-m-d\TH:i:s\Z', $timestamps['start'] );
		}
		if ( ! empty( $timestamps['end'] ) ) {
			$response['event']['end'] = gmdate( 'Y-m-d\TH:i:s\Z', $timestamps['end'] );
			$response['event']['end_real'] = gmdate( 'Y-m-d\TH:i:s\Z', $timestamps['end'] );
		}

		$response['event']['date_type'] = Event::get_date_type();
		$response['event']['allDay']    = ! empty( $timestamps['all_day'] );
		if ( ! empty( $response['event']['allDay'] ) ) {
			foreach ( self::get_event_all_day_fields( $event_id, $display_instance_ts, $timestamps ) as $key => $value ) {
				$response['event'][ $key ] = $value;
			}
		}
		if ( 'recurring' === $response['event']['date_type'] ) {
			$response['event']['timeline'] = true;
		}

		$response['summary']        = $standard_event_wide && method_exists( Core_Rsvps::class, 'get_summary_for_event' ) ? Core_Rsvps::get_summary_for_event( $event_id ) : Core_Rsvps::get_summary( $event_id, $display_instance_ts );
		$response['capacity']       = Event::get_rsvp_capacity();
		$response['allow_guests']   = Event::get_rsvp_allow_guests();
		$response['max_guests']     = Event::get_rsvp_max_guests();
		$response['allow_edit']     = Event::get_rsvp_allow_edit();
		$response['rsvp_enabled']   = Event::get_rsvp_enabled();

		$sale_start                 = (string) Event::get_rsvp_sale_start( $display_instance_ts );
		$sale_end                   = (string) Event::get_rsvp_sale_end( $display_instance_ts );
		$response['sale_start']     = $sale_start;
		$response['sale_end']       = $sale_end;
		$response['is_open']        = self::compute_rsvp_is_open( $sale_start, $sale_end );
		$response['event_ended']    = self::compute_event_ended( $event_id, $display_instance_ts );

		return rest_ensure_response( $response );
	}

	/**
	 * Resolve the event instance used for check-in display.
	 *
	 * Non-selected standard events are event-wide, so a legacy RSVP row with an
	 * old start timestamp should still show the current event date.
	 *
	 * @param int $event_id           Event ID.
	 * @param int $record_instance_ts Stored RSVP instance timestamp.
	 * @return int
	 */
	private static function get_checkin_display_instance_ts( $event_id, $record_instance_ts ) {
		$event_id           = absint( $event_id );
		$record_instance_ts = absint( $record_instance_ts );

		if ( ! $event_id ) {
			return $record_instance_ts;
		}

		if ( 'standard' === Event::get_date_type() && 'selected' !== Event::get_standard_type() ) {
			$start_timestamp = absint( get_post_meta( $event_id, 'start_timestamp', true ) );
			return $start_timestamp ? $start_timestamp : $record_instance_ts;
		}

		return $record_instance_ts;
	}

	/**
	 * Get source date-only fields for an all-day event or instance.
	 *
	 * @param int   $event_id    Event ID.
	 * @param int   $instance_ts Instance timestamp.
	 * @param array $timestamps  Resolved instance timestamps.
	 * @return array
	 */
	private static function get_event_all_day_fields( $event_id, $instance_ts = 0, $timestamps = array() ) {
		$event_id    = absint( $event_id );
		$instance_ts = absint( $instance_ts );

		if ( ! $event_id ) {
			return array();
		}

		$copy_fields = static function ( $source ) {
			$fields = array();
			foreach ( array( 'all_day_timezone', 'all_day_start_date', 'all_day_end_date', 'all_day_end_exclusive_date' ) as $key ) {
				if ( isset( $source[ $key ] ) && '' !== (string) $source[ $key ] ) {
					$fields[ $key ] = $source[ $key ];
				}
			}
			return $fields;
		};

		if ( $instance_ts > 0 && 'recurring' === Event::get_date_type() && method_exists( Event::class, 'get_recurring_instance_payload' ) ) {
			$payload = Event::get_recurring_instance_payload( $instance_ts );
			if ( is_array( $payload ) && ! empty( $payload['all_day'] ) ) {
				return $copy_fields( $payload );
			}
		}

		$start_ts = absint( $timestamps['start'] ?? 0 );
		$days     = method_exists( Event::class, 'get_event_days' ) ? Event::get_event_days() : array();
		$fallback = array();

		if ( empty( $days ) || ! is_array( $days ) ) {
			return array();
		}

		foreach ( $days as $day ) {
			if ( ! is_array( $day ) || empty( $day['all_day'] ) || empty( $day['start_date'] ) ) {
				continue;
			}

			if ( empty( $fallback ) ) {
				$fallback = $copy_fields( $day );
			}

			if ( $start_ts && strtotime( (string) $day['start_date'] ) === $start_ts ) {
				return $copy_fields( $day );
			}
		}

		return $fallback;
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

		if ( ! empty( $timestamps['all_day'] ) ) {
			return \eventkoi_format_datetime_range( $event_timestamp, $event_end_timestamp, true, array( 'timezone' => wp_timezone() ) );
		}

		$utc_timezone   = new \DateTimeZone( 'UTC' );
		$date_format    = \eventkoi_resolved_date_format();
		$time_format    = \eventkoi_resolved_time_format();
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

		new Event( $event_id );
		$date_type      = Event::get_date_type();
		$standard_type  = Event::get_standard_type();
		$current_start  = absint( get_post_meta( $event_id, 'start_timestamp', true ) );
		$event_timestamp = ( 'standard' === $date_type && 'selected' !== $standard_type )
			? $current_start
			: ( $instance_ts ? absint( $instance_ts ) : $current_start );
		$event_end_timestamp = absint( get_post_meta( $event_id, 'end_timestamp', true ) );
		$first_instance = Event::get_first_instance();
		$is_all_day     = ! empty( $first_instance['all_day'] );

		if ( $event_timestamp && 'recurring' === $date_type && $instance_ts ) {
			$rules = Event::get_recurrence_rules();

			if ( ! empty( $rules ) ) {
				foreach ( $rules as $rule ) {
					$rule_start = ! empty( $rule['start_date'] ) ? strtotime( $rule['start_date'] . ' UTC' ) : null;
					$rule_end   = ! empty( $rule['end_date'] ) ? strtotime( $rule['end_date'] . ' UTC' ) : null;
					$duration   = ( $rule_start && $rule_end && $rule_end > $rule_start ) ? ( $rule_end - $rule_start ) : null;

					if ( $duration ) {
						$event_end_timestamp = $event_timestamp + $duration;
						$is_all_day          = ! empty( $rule['all_day'] );
						break;
					}
				}
			}
		}

		return array(
			'start'   => $event_timestamp,
			'end'     => $event_end_timestamp,
			'all_day' => $is_all_day,
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

			$type = self::get_location_type( $location, 'inperson' );
			if ( 'inperson' !== $type ) {
				continue;
			}

			$address = isset( $location['address'] ) && is_array( $location['address'] ) ? $location['address'] : array();
			$name    = self::location_text_value( $location, 'name' );
			$line1   = self::first_location_text(
				self::location_text_value( $location, 'address1' ),
				self::location_text_value( $address, 'streetAddress' )
			);
			$line2   = self::location_text_value( $location, 'address2' );
			$city    = self::first_location_text(
				self::location_text_value( $location, 'city' ),
				self::location_text_value( $address, 'addressLocality' )
			);
			$state   = self::first_location_text(
				self::location_text_value( $location, 'state' ),
				self::location_text_value( $address, 'addressRegion' )
			);
			$zip     = self::first_location_text(
				self::location_text_value( $location, 'zip' ),
				self::location_text_value( $address, 'postalCode' )
			);
			$country = self::first_location_text(
				self::location_text_value( $location, 'country' ),
				self::location_text_value( $address, 'addressCountry' )
			);

			$city_line = implode( ', ', array_filter( array( $city, $state, $zip ) ) );
			$parts     = array_filter( array( $name, $line1, $line2, $city_line, $country ) );

			if ( empty( $parts ) ) {
				continue;
			}

			return implode( "\n", $parts );
		}

		return '';
	}

	/**
	 * Return the first non-empty location text.
	 *
	 * @param string ...$values Values.
	 * @return string
	 */
	private static function first_location_text( ...$values ) {
		foreach ( $values as $value ) {
			$value = trim( (string) $value );
			if ( '' !== $value ) {
				return $value;
			}
		}

		return '';
	}

	/**
	 * Get sanitized text from a location row.
	 *
	 * @param array  $location Location row.
	 * @param string $key      Field key.
	 * @return string
	 */
	private static function location_text_value( array $location, $key ) {
		if ( ! array_key_exists( $key, $location ) ) {
			return '';
		}

		$value = $location[ $key ];
		if ( is_object( $value ) ) {
			$value = get_object_vars( $value );
		}

		if ( is_array( $value ) ) {
			foreach ( array( 'name', 'text', 'url', '@id' ) as $nested_key ) {
				if ( array_key_exists( $nested_key, $value ) ) {
					$text = self::location_scalar_text( $value[ $nested_key ] );
					if ( '' !== $text ) {
						return $text;
					}
				}
			}

			$texts = array();
			foreach ( $value as $nested_value ) {
				$text = self::location_scalar_text( $nested_value );
				if ( '' !== $text ) {
					$texts[] = $text;
				}
			}

			return implode( ' ', array_unique( $texts ) );
		}

		return self::location_scalar_text( $value );
	}

	/**
	 * Normalize a scalar location value to text.
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	private static function location_scalar_text( $value ) {
		if ( is_array( $value ) || is_object( $value ) ) {
			return '';
		}

		return sanitize_text_field( (string) $value );
	}

	/**
	 * Normalize EventKoi and raw Schema.org location types.
	 *
	 * @param array  $location Location row.
	 * @param string $default_type Optional default normalized type.
	 * @return string
	 */
	private static function get_location_type( array $location, $default_type = '' ) {
		$type = sanitize_key( self::location_text_value( $location, 'type' ) );
		if ( 'physical' === $type ) {
			return 'inperson';
		}
		if ( 'virtual' === $type ) {
			return 'online';
		}
		if ( in_array( $type, array( 'inperson', 'online' ), true ) ) {
			return $type;
		}
		if ( str_contains( $type, 'virtuallocation' ) ) {
			return 'online';
		}
		if ( str_contains( $type, 'place' ) ) {
			return 'inperson';
		}

		$schema_type = strtolower( self::location_text_value( $location, '@type' ) );
		if ( str_contains( $schema_type, 'virtuallocation' ) ) {
			return 'online';
		}
		if ( str_contains( $schema_type, 'place' ) ) {
			return 'inperson';
		}

		return sanitize_key( $default_type );
	}
}
