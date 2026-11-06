<?php
/**
 * RSVPs.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

use EKLIB\StellarWP\DB\DB;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * RSVPs.
 */
class Rsvps {

	/**
	 * Allowed RSVP statuses.
	 *
	 * @var string[]
	 */
	private static $allowed_statuses = array( 'going', 'maybe', 'not_going', 'cancelled' );
	private static $allowed_checkin_statuses = array( 'check_in', 'checked_in', 'denied', 'none' );

	/**
	 * Bump events list cache version after RSVP changes.
	 *
	 * @return void
	 */
	private static function bump_events_cache_version() {
		$version = absint( get_option( 'eventkoi_events_cache_version', 1 ) );
		update_option( 'eventkoi_events_cache_version', $version + 1, false );
	}

	/**
	 * Get custom RSVP field definitions, registered via the
	 * `eventkoi_rsvp_fields` filter and normalized to a safe shape.
	 *
	 * @param int $event_id Optional event ID for per-event fields.
	 * @return array[] List of { key, label, type, required, options, placeholder }.
	 */
	public static function get_custom_fields( $event_id = 0 ) {
		$allowed_types = array( 'text', 'email', 'tel', 'number', 'textarea', 'select', 'checkbox' );
		$raw           = apply_filters( 'eventkoi_rsvp_fields', array(), absint( $event_id ) );
		$fields        = array();

		foreach ( (array) $raw as $field ) {
			$key = sanitize_key( $field['key'] ?? '' );
			if ( ! $key || in_array( $key, array( 'name', 'email', 'status', 'guests' ), true ) ) {
				continue;
			}

			$type = sanitize_key( $field['type'] ?? 'text' );
			if ( ! in_array( $type, $allowed_types, true ) ) {
				$type = 'text';
			}

			$options = array();
			if ( 'select' === $type ) {
				foreach ( (array) ( $field['options'] ?? array() ) as $option ) {
					$option = sanitize_text_field( $option );
					if ( '' !== $option ) {
						$options[] = $option;
					}
				}
			}

			$fields[ $key ] = array(
				'key'         => $key,
				'label'       => sanitize_text_field( $field['label'] ?? $key ),
				'type'        => $type,
				'required'    => ! empty( $field['required'] ),
				'options'     => $options,
				'placeholder' => sanitize_text_field( $field['placeholder'] ?? '' ),
			);
		}

		return array_values( $fields );
	}

	/**
	 * Sanitize submitted custom field values against the registered definitions.
	 *
	 * @param array $values   Raw submitted values keyed by field key.
	 * @param int   $event_id Optional event ID for per-event fields.
	 * @return array|\WP_Error Sanitized values, or an error when a required field is empty.
	 */
	public static function sanitize_custom_field_values( $values, $event_id = 0 ) {
		$values    = is_array( $values ) ? $values : array();
		$sanitized = array();

		foreach ( self::get_custom_fields( $event_id ) as $field ) {
			$key = $field['key'];
			$raw = $values[ $key ] ?? '';

			switch ( $field['type'] ) {
				case 'email':
					$value = sanitize_email( $raw );
					break;
				case 'number':
					$value = '' === $raw ? '' : (string) floatval( $raw );
					break;
				case 'checkbox':
					$value = $raw ? '1' : '';
					break;
				case 'select':
					$value = in_array( $raw, $field['options'], true ) ? $raw : '';
					break;
				case 'textarea':
					$value = sanitize_textarea_field( $raw );
					break;
				default:
					$value = sanitize_text_field( $raw );
			}

			if ( $field['required'] && '' === trim( (string) $value ) ) {
				return new \WP_Error(
					'eventkoi_rsvp_missing_fields',
					/* translators: %s: field label */
					sprintf( __( '%s is required.', 'eventkoi-lite' ), $field['label'] ),
					array( 'status' => 400 )
				);
			}

			if ( '' !== $value ) {
				$sanitized[ $key ] = $value;
			}
		}

		return $sanitized;
	}

	/**
	 * Decode custom field values stored on an RSVP row.
	 *
	 * @param object|null $row RSVP database row.
	 * @return array
	 */
	public static function get_row_fields( $row ) {
		if ( empty( $row->meta ) ) {
			return array();
		}

		$meta = json_decode( (string) $row->meta, true );
		if ( ! is_array( $meta ) || empty( $meta['fields'] ) || ! is_array( $meta['fields'] ) ) {
			return array();
		}

		$fields = array();
		foreach ( $meta['fields'] as $key => $value ) {
			$key = sanitize_key( $key );
			if ( $key && is_scalar( $value ) ) {
				$fields[ $key ] = sanitize_text_field( (string) $value );
			}
		}

		return $fields;
	}

	/**
	 * Most guest rows one RSVP can carry, whatever the event's max guests says.
	 */
	const MAX_GUEST_ROWS = 50;

	/**
	 * Create or update an RSVP.
	 *
	 * @param array $args RSVP data.
	 * @return array|\WP_Error
	 */
	public static function create( $args = array() ) {
		$event_id    = absint( $args['event_id'] ?? 0 );
		$instance_ts = absint( $args['instance_ts'] ?? 0 );
		$name        = isset( $args['name'] ) ? sanitize_text_field( $args['name'] ) : '';
		$email       = isset( $args['email'] ) ? sanitize_email( $args['email'] ) : '';
		$status      = isset( $args['status'] ) ? sanitize_key( $args['status'] ) : 'going';
		$guests      = isset( $args['guests'] ) ? absint( $args['guests'] ) : 0;
		$user_id     = isset( $args['user_id'] ) ? absint( $args['user_id'] ) : 0;
		$fields      = isset( $args['fields'] ) && is_array( $args['fields'] ) ? $args['fields'] : array();
		$guest_input = isset( $args['guest_details'] ) && is_array( $args['guest_details'] ) ? $args['guest_details'] : null;
		$email_each  = ! empty( $args['email_guests'] );
		$meta        = array();
		if ( $fields ) {
			$meta['fields'] = $fields;
		}
		if ( $email_each ) {
			$meta['email_guests'] = true;
		}
		$meta_json = $meta ? wp_json_encode( $meta ) : null;

		if ( ! $event_id || ! $email || ! $name ) {
			return new \WP_Error( 'eventkoi_rsvp_missing_fields', __( 'Missing RSVP fields.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$event_post = get_post( $event_id );
		if ( empty( $event_post ) || 'eventkoi_event' !== $event_post->post_type ) {
			return new \WP_Error( 'eventkoi_rsvp_invalid_event', __( 'Invalid event.', 'eventkoi-lite' ), array( 'status' => 404 ) );
		}

		new Event( $event_id );
		$date_type = Event::get_date_type();

		if ( 'recurring' === $date_type && ! $instance_ts ) {
			return new \WP_Error( 'eventkoi_rsvp_missing_instance', __( 'Missing event instance.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		if ( ! $instance_ts ) {
			$instance_ts = absint( get_post_meta( $event_id, 'start_timestamp', true ) );

			// Selected-date events (including single-package) keep their dates in
			// event_days, not start_timestamp; anchor to the first day so a package
			// RSVP stores against the same instance the summary reads.
			if ( ! $instance_ts ) {
				$eventkoi_first_days = Event::get_event_days();
				if ( is_array( $eventkoi_first_days ) && ! empty( $eventkoi_first_days[0]['start_date'] ) ) {
					$instance_ts = absint( strtotime( (string) $eventkoi_first_days[0]['start_date'] ) );
				}
			}
		}

		if ( ! in_array( $status, self::$allowed_statuses, true ) ) {
			$status = 'going';
		}

		$rsvp_enabled = Event::get_rsvp_enabled();
		if ( ! $rsvp_enabled ) {
			return new \WP_Error( 'eventkoi_rsvp_disabled', __( 'RSVP is disabled for this event.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		// Reject after the event has ended. Highest-priority gate: a closed-out
		// event blocks RSVPs even if an admin left the RSVP window open.
		$now            = time();
		$event_end_ts   = self::resolve_event_end_ts( $event_id, (int) $instance_ts );
		$event_status   = (string) get_post_meta( $event_id, 'status', true );
		$event_ended    = ( 'completed' === $event_status || 'cancelled' === $event_status )
			|| ( $event_end_ts > 0 && $now > $event_end_ts );
		if ( $event_ended ) {
			return new \WP_Error( 'eventkoi_event_ended', __( 'This event has ended and is no longer accepting RSVPs.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		// Reject submissions outside the configured RSVP window. Done before
		// the auto-account branch so we never create a WP user for a closed
		// RSVP, and before any capacity work.
		$window_s = (string) Event::get_rsvp_sale_start( (int) $instance_ts );
		$window_e = (string) Event::get_rsvp_sale_end( (int) $instance_ts );
		$start_ts = '' !== $window_s ? strtotime( $window_s . ' UTC' ) : 0;
		$end_ts   = '' !== $window_e ? strtotime( $window_e . ' UTC' ) : 0;
		if ( $start_ts && $now < $start_ts ) {
			return new \WP_Error( 'eventkoi_rsvp_not_started', __( 'RSVP is not open yet.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}
		if ( $end_ts && $now > $end_ts ) {
			return new \WP_Error( 'eventkoi_rsvp_closed', __( 'RSVP is closed.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$allow_guests = Event::get_rsvp_allow_guests();
		$max_guests   = Event::get_rsvp_max_guests();

		if ( ! $allow_guests ) {
			$guests = 0;
		} elseif ( $max_guests > 0 ) {
			$guests = min( $guests, $max_guests );
		}
		// Every guest is a row now, so an "unlimited" event still gets a ceiling.
		$guests = min( $guests, self::MAX_GUEST_ROWS );

		// Who the guests are. Only the dialog sends this list; older clients
		// just send a number and get unnamed guest rows.
		$guest_details = self::sanitize_guest_details( $guest_input, $guests, Event::get_rsvp_guest_details() );
		if ( is_wp_error( $guest_details ) ) {
			return $guest_details;
		}

		// Each guest needs an address of their own to get their own confirmation;
		// a repeated address is stored once per party and would vanish on edit.
		if ( $email_each && is_array( $guest_details ) ) {
			$seen = array( strtolower( $email ) );
			foreach ( $guest_details as $entry ) {
				$guest_email = strtolower( (string) ( $entry['email'] ?? '' ) );
				if ( '' === $guest_email ) {
					continue;
				}
				if ( in_array( $guest_email, $seen, true ) ) {
					return new \WP_Error( 'eventkoi_rsvp_guest_email_unique', __( 'Each guest needs their own email address to get their own confirmation.', 'eventkoi-lite' ), array( 'status' => 400 ) );
				}
				$seen[] = $guest_email;
			}
		}

		$auto_account = Event::get_rsvp_auto_account();
		if ( ! $user_id && 'going' === $status && $auto_account ) {
			$user_id = self::get_or_create_user( $email, $name );
			if ( is_wp_error( $user_id ) ) {
				return $user_id;
			}
		}

		$existing_query = DB::table( 'eventkoi_rsvps' )
			->where( 'event_id', $event_id )
			->where( 'instance_ts', $instance_ts )
			->where( 'parent_id', 0 );

		if ( $user_id ) {
			$existing_query->where( 'user_id', $user_id );
		} else {
			$existing_query->where( 'email', $email );
		}

		$existing = $existing_query->get();

		if ( $user_id && empty( $existing ) ) {
			$existing = DB::table( 'eventkoi_rsvps' )
				->where( 'event_id', $event_id )
				->where( 'instance_ts', $instance_ts )
				->where( 'email', $email )
				->where( 'parent_id', 0 )
				->get();
		}

		if ( 'going' === $status ) {
			$capacity = Event::get_rsvp_capacity();
			if ( $capacity > 0 ) {
				$used   = self::count_used_capacity( $event_id, $instance_ts );
				$needed = 1 + $guests;
				if ( ! empty( $existing ) && 'going' === ( $existing->status ?? '' ) ) {
					$used -= 1 + absint( $existing->guests ?? 0 );
				}
				if ( ( $used + $needed ) > $capacity ) {
					return new \WP_Error( 'eventkoi_rsvp_full', __( 'RSVP capacity reached.', 'eventkoi-lite' ), array( 'status' => 400 ) );
				}
			}
		}

		$now = gmdate( 'Y-m-d H:i:s' );

		if ( ! empty( $existing ) ) {
			$allow_edit = Event::get_rsvp_allow_edit();
			if ( ! $allow_edit ) {
				return new \WP_Error( 'eventkoi_rsvp_exists', __( 'RSVP already exists.', 'eventkoi-lite' ), array( 'status' => 409 ) );
			}

			$updated_token = $existing->checkin_token ?? '';
			if ( empty( $updated_token ) ) {
				$updated_token = self::generate_checkin_token();
			}

			DB::table( 'eventkoi_rsvps' )
				->where( 'id', $existing->id )
				->update(
					array(
						'user_id'       => $user_id ? $user_id : $existing->user_id,
						'name'          => $name,
						'email'         => $email ? $email : $existing->email,
						'status'        => $status,
						'guests'        => $guests,
						'meta'          => $meta_json,
						'checkin_token' => $updated_token,
						'checkin_status' => $existing->checkin_status ?? 'none',
						'updated'       => $now,
					)
				);

			self::bump_events_cache_version();

			// Guests were only mailed before if the host had asked for it then.
			$previous_meta = json_decode( (string) ( $existing->meta ?? '' ), true );
			$already_sent  = is_array( $previous_meta ) && ! empty( $previous_meta['email_guests'] )
				? self::emailed_guest_addresses( absint( $existing->id ) )
				: array();
			$party        = self::sync_guest_rows( absint( $existing->id ), $event_id, $instance_ts, $status, $guests, $guest_details );

			$new_email     = sanitize_email( $email );
			$old_email     = sanitize_email( $existing->email ?? '' );
			$email_changed = ! empty( $new_email ) && is_email( $new_email ) && $new_email !== $old_email;
			if (
				'going' === $status
				&& (
					'going' !== ( $existing->status ?? '' )
					|| $guests !== absint( $existing->guests ?? 0 )
					|| $email_changed
				)
			) {
				self::send_rsvp_email( $new_email, $name, $event_id, $instance_ts, $updated_token, $guests, $party );
			}
			if ( 'going' === $status && $email_each ) {
				self::send_guest_emails( $name, $new_email, $event_id, $instance_ts, $party, $already_sent );
			}

			return array(
				'id'            => $existing->id,
				'checkin_token' => $existing->checkin_token,
				'updated'       => true,
			);
		}

		$checkin_token = self::generate_checkin_token();

		$inserted = DB::table( 'eventkoi_rsvps' )->insert(
			array(
				'event_id'      => $event_id,
				'parent_id'     => 0,
				'instance_ts'   => $instance_ts,
				'user_id'       => $user_id ? $user_id : null,
				'name'          => $name,
				'email'         => $email,
				'status'        => $status,
				'guests'        => $guests,
				'meta'          => $meta_json,
				'checkin_token' => $checkin_token,
				'checked_in'    => null,
				'checked_in_count' => null,
				'checkin_status' => 'none',
				'created'       => $now,
				'updated'       => $now,
			)
		);

		if ( ! $inserted ) {
			return new \WP_Error( 'eventkoi_rsvp_create_failed', __( 'Failed to create RSVP.', 'eventkoi-lite' ), array( 'status' => 500 ) );
		}

		// The query builder reports affected rows, not the new id.
		global $wpdb;
		$id = absint( $wpdb->insert_id );
		if ( ! $id ) {
			$created = DB::table( 'eventkoi_rsvps' )
				->where( 'event_id', $event_id )
				->where( 'instance_ts', $instance_ts )
				->where( 'email', $email )
				->where( 'parent_id', 0 )
				->get();
			$id      = ! empty( $created->id ) ? absint( $created->id ) : 0;
		}

		self::bump_events_cache_version();

		$party = $id ? self::sync_guest_rows( $id, $event_id, $instance_ts, $status, $guests, $guest_details ) : array();

		if ( 'going' === $status ) {
			self::send_rsvp_email( $email, $name, $event_id, $instance_ts, $checkin_token, $guests, $party );
			self::send_admin_rsvp_notification( $name, $email, $event_id, $instance_ts, $guests );
			if ( $email_each ) {
				self::send_guest_emails( $name, $email, $event_id, $instance_ts, $party );
			}
		}

		return array(
			'id'            => $id,
			'checkin_token' => $checkin_token,
			'created'       => true,
		);
	}

	/**
	 * Clean the guest list a dialog sent for one RSVP.
	 *
	 * Returns one entry per guest seat (padded with blanks), or null when the
	 * client sent no list at all, so unnamed guest rows get created instead.
	 *
	 * @param array|null $raw    Request value: list of { name, email }.
	 * @param int        $guests Guest count after clamping.
	 * @param string     $mode   Event guest details mode (off|optional|required).
	 * @return array|null|\WP_Error
	 */
	public static function sanitize_guest_details( $raw, $guests, $mode ) {
		if ( ! is_array( $raw ) || 'off' === $mode ) {
			return null;
		}

		$clean = array();
		foreach ( array_values( $raw ) as $index => $entry ) {
			if ( $index >= $guests ) {
				break;
			}
			$entry = is_array( $entry ) ? $entry : array();
			$name  = sanitize_text_field( (string) ( $entry['name'] ?? '' ) );
			$typed = trim( (string) ( $entry['email'] ?? '' ) );
			$mail  = sanitize_email( $typed );
			if ( '' !== $typed && ! is_email( $mail ) ) {
				return new \WP_Error( 'eventkoi_rsvp_guest_email', __( 'Please enter a valid email address for each guest.', 'eventkoi-lite' ), array( 'status' => 400 ) );
			}
			$clean[] = array(
				'name'  => $name,
				'email' => $mail,
			);
		}

		$missing = $guests - count( $clean );
		for ( $i = 0; $i < $missing; $i++ ) {
			$clean[] = array(
				'name'  => '',
				'email' => '',
			);
		}

		if ( 'required' === $mode ) {
			foreach ( $clean as $entry ) {
				if ( '' === $entry['name'] ) {
					return new \WP_Error( 'eventkoi_rsvp_guest_name', __( 'Please enter a name for each guest.', 'eventkoi-lite' ), array( 'status' => 400 ) );
				}
			}
		}

		return $clean;
	}

	/**
	 * Guest rows of an RSVP, in the order they were added.
	 *
	 * @param int $parent_id RSVP row id.
	 * @return array
	 */
	public static function get_guest_rows( $parent_id ) {
		$parent_id = absint( $parent_id );
		if ( ! $parent_id ) {
			return array();
		}

		$rows = DB::table( 'eventkoi_rsvps' )
			->where( 'parent_id', $parent_id )
			->orderBy( 'id', 'asc' )
			->getAll();

		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * Guest rows for a set of RSVPs, keyed by parent id.
	 *
	 * @param array $parent_ids RSVP row ids.
	 * @return array Map parent_id => list of rows.
	 */
	public static function get_guest_rows_for( array $parent_ids ) {
		$parent_ids = array_values( array_filter( array_map( 'absint', $parent_ids ) ) );
		if ( empty( $parent_ids ) ) {
			return array();
		}

		$rows = DB::table( 'eventkoi_rsvps' )
			->whereIn( 'parent_id', $parent_ids )
			->orderBy( 'id', 'asc' )
			->getAll();

		$map = array();
		foreach ( (array) $rows as $row ) {
			$map[ absint( $row->parent_id ) ][] = $row;
		}

		return $map;
	}

	/**
	 * Make the guest rows of an RSVP match its guest count and details.
	 *
	 * Existing rows are updated in order, missing ones created, extra ones
	 * removed. Guests follow the RSVP's status: a cancelled RSVP cancels its
	 * guests, and only going guests hold a check-in token.
	 *
	 * @param int        $parent_id   RSVP row id.
	 * @param int        $event_id    Event ID.
	 * @param int        $instance_ts Instance timestamp.
	 * @param string     $status      RSVP status.
	 * @param int        $guests      Guest count.
	 * @param array|null $details     Guest details (one per seat) or null to keep names as they are.
	 * @return array Guest rows after the sync.
	 */
	public static function sync_guest_rows( $parent_id, $event_id, $instance_ts, $status, $guests, $details = null ) {
		$parent_id = absint( $parent_id );
		if ( ! $parent_id ) {
			return array();
		}

		$existing = self::get_guest_rows( $parent_id );
		$now      = gmdate( 'Y-m-d H:i:s' );
		$going    = 'going' === $status;

		// The table keeps one row per address within a party, so a repeated
		// address (two guests sharing an inbox, or the host's own) is stored
		// once and the other rows keep no address. Clearing the party's
		// addresses first lets an edit swap two guests' emails safely.
		$seen = array();
		if ( is_array( $details ) ) {
			$host = DB::table( 'eventkoi_rsvps' )->where( 'id', $parent_id )->get();
			if ( $host && '' !== (string) ( $host->email ?? '' ) ) {
				$seen[ strtolower( (string) $host->email ) ] = true;
			}
			if ( ! empty( $existing ) ) {
				DB::table( 'eventkoi_rsvps' )->where( 'parent_id', $parent_id )->update( array( 'email' => null ) );
			}
			foreach ( $details as $index => $detail ) {
				$address = strtolower( (string) ( $detail['email'] ?? '' ) );
				if ( '' === $address ) {
					continue;
				}
				if ( isset( $seen[ $address ] ) ) {
					$details[ $index ]['email'] = '';
				} else {
					$seen[ $address ] = true;
				}
			}
		}

		for ( $i = 0; $i < $guests; $i++ ) {
			$detail = is_array( $details ) ? ( $details[ $i ] ?? array() ) : null;
			$row    = $existing[ $i ] ?? null;

			if ( $row ) {
				$token = null;
				if ( $going ) {
					$token = '' !== (string) ( $row->checkin_token ?? '' ) ? (string) $row->checkin_token : self::generate_checkin_token();
				}
				$values = array(
					'instance_ts'    => absint( $instance_ts ),
					'status'         => $status,
					'checkin_token'  => $token,
					'checkin_status' => $going ? (string) ( $row->checkin_status ?? 'none' ) : 'none',
					'updated'        => $now,
				);
				if ( ! $going ) {
					$values['checked_in'] = null;
				}
				if ( null !== $detail ) {
					$values['name']  = '' !== (string) ( $detail['name'] ?? '' ) ? $detail['name'] : null;
					$values['email'] = '' !== (string) ( $detail['email'] ?? '' ) ? $detail['email'] : null;
				}
				DB::table( 'eventkoi_rsvps' )->where( 'id', absint( $row->id ) )->update( $values );
				continue;
			}

			DB::table( 'eventkoi_rsvps' )->insert(
				array(
					'event_id'         => absint( $event_id ),
					'parent_id'        => $parent_id,
					'instance_ts'      => absint( $instance_ts ),
					'user_id'          => null,
					'name'             => null !== $detail && '' !== (string) ( $detail['name'] ?? '' ) ? $detail['name'] : null,
					'email'            => null !== $detail && '' !== (string) ( $detail['email'] ?? '' ) ? $detail['email'] : null,
					'status'           => $status,
					'guests'           => 0,
					'meta'             => null,
					'checkin_token'    => $going ? self::generate_checkin_token() : null,
					'checked_in'       => null,
					'checked_in_count' => null,
					'checkin_status'   => 'none',
					'created'          => $now,
					'updated'          => $now,
				)
			);
		}

		$extra = array_slice( $existing, $guests );
		if ( ! empty( $extra ) ) {
			self::delete_rows_by_id( array_map( static fn( $row ) => absint( $row->id ), $extra ) );
		}

		self::recount_party_checkins( array( $parent_id ) );

		return self::get_guest_rows( $parent_id );
	}

	/**
	 * Store how many of a party are checked in on the RSVP row.
	 *
	 * The admin table, exports and the QR screen keep reading
	 * `checked_in_count`, so it has to follow the per-person state.
	 *
	 * @param array $parent_ids RSVP row ids.
	 * @return void
	 */
	public static function recount_party_checkins( array $parent_ids ) {
		global $wpdb;

		$table = $wpdb->prefix . 'eventkoi_rsvps';
		foreach ( array_filter( array_map( 'absint', $parent_ids ) ) as $parent_id ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$parent = $wpdb->get_row(
				$wpdb->prepare(
					"SELECT id, guests, checkin_status FROM {$table} WHERE id = %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					$parent_id
				)
			);
			if ( ! $parent ) {
				continue;
			}
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$guest_rows     = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT checkin_status FROM {$table} WHERE parent_id = %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					$parent_id
				)
			);
			$checked_guests = 0;
			foreach ( (array) $guest_rows as $guest_row ) {
				if ( 'checked_in' === (string) $guest_row->checkin_status ) {
					++$checked_guests;
				}
			}
			// Guests that never got a row of their own (rows written before the
			// upgrade) still arrive with the host, as they always did.
			$rowless_guests = max( 0, absint( $parent->guests ) - count( (array) $guest_rows ) );
			$host_in        = 'checked_in' === (string) $parent->checkin_status;
			$count          = ( $host_in ? 1 + $rowless_guests : 0 ) + $checked_guests;
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->update(
				$table,
				array( 'checked_in_count' => $count > 0 ? $count : null ),
				array( 'id' => $parent_id ),
				array( '%d' ),
				array( '%d' )
			);
		}
	}

	/**
	 * Parent ids for any mix of RSVP and guest row ids.
	 *
	 * @param array $ids Row ids.
	 * @return array
	 */
	private static function resolve_parent_ids( array $ids ) {
		$ids = array_values( array_filter( array_map( 'absint', $ids ) ) );
		if ( empty( $ids ) ) {
			return array();
		}

		$rows = DB::table( 'eventkoi_rsvps' )->select( 'id', 'parent_id' )->whereIn( 'id', $ids )->getAll();
		$out  = array();
		foreach ( (array) $rows as $row ) {
			$out[] = absint( $row->parent_id ) > 0 ? absint( $row->parent_id ) : absint( $row->id );
		}

		return array_values( array_unique( $out ) );
	}

	/**
	 * Add the guest row ids of every RSVP in the list.
	 *
	 * @param array $ids RSVP row ids.
	 * @return array
	 */
	private static function with_guest_ids( array $ids ) {
		$ids = array_values( array_filter( array_map( 'absint', $ids ) ) );
		if ( empty( $ids ) ) {
			return array();
		}

		$guests = DB::table( 'eventkoi_rsvps' )->select( 'id' )->whereIn( 'parent_id', $ids )->getAll();
		foreach ( (array) $guests as $guest ) {
			$ids[] = absint( $guest->id );
		}

		return array_values( array_unique( $ids ) );
	}

	/**
	 * Check a whole party in or out: the RSVP and every guest.
	 *
	 * @param array  $parent_ids RSVP row ids.
	 * @param string $status     check_in|checked_in|denied|none.
	 * @return int|\WP_Error
	 */
	public static function update_party_checkin( $parent_ids, $status ) {
		return self::update_checkin_status( self::with_guest_ids( (array) $parent_ids ), $status );
	}

	/**
	 * Edit one guest's name and email.
	 *
	 * @param int    $guest_id Guest row id.
	 * @param string $name     Name.
	 * @param string $email    Email, may be empty.
	 * @return int|\WP_Error
	 */
	public static function update_guest( $guest_id, $name, $email ) {
		$guest_id = absint( $guest_id );
		$row      = $guest_id ? DB::table( 'eventkoi_rsvps' )->where( 'id', $guest_id )->get() : null;
		if ( ! $row || absint( $row->parent_id ) < 1 ) {
			return new \WP_Error( 'eventkoi_rsvp_guest_missing', __( 'Guest not found.', 'eventkoi-lite' ), array( 'status' => 404 ) );
		}

		$typed = trim( (string) $email );
		$mail  = sanitize_email( $typed );
		if ( '' !== $typed && ! is_email( $mail ) ) {
			return new \WP_Error( 'eventkoi_rsvp_guest_email', __( 'Please enter a valid email address.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		// One row per address within a party: refuse an address the host or
		// another guest already uses rather than failing on the unique key.
		if ( '' !== $mail ) {
			$parent_id = absint( $row->parent_id );
			$taken     = DB::table( 'eventkoi_rsvps' )
				->where( 'email', $mail )
				->where( 'id', $guest_id, '!=' )
				->whereRaw( 'AND ( id = %d OR parent_id = %d )', $parent_id, $parent_id )
				->count();
			if ( $taken ) {
				return new \WP_Error( 'eventkoi_rsvp_guest_email_taken', __( 'Someone on this RSVP already uses that email address.', 'eventkoi-lite' ), array( 'status' => 400 ) );
			}
		}

		$name = sanitize_text_field( (string) $name );
		DB::table( 'eventkoi_rsvps' )->where( 'id', $guest_id )->update(
			array(
				'name'    => '' !== $name ? $name : null,
				'email'   => '' !== $mail ? $mail : null,
				'updated' => gmdate( 'Y-m-d H:i:s' ),
			)
		);

		return 1;
	}

	/**
	 * Remove guests from their RSVPs and lower the guest counts to match.
	 *
	 * @param array $guest_ids Guest row ids.
	 * @return int|\WP_Error
	 */
	public static function remove_guests( $guest_ids ) {
		$guest_ids = array_values( array_filter( array_map( 'absint', (array) $guest_ids ) ) );
		if ( empty( $guest_ids ) ) {
			return 0;
		}

		$rows = DB::table( 'eventkoi_rsvps' )->select( 'id', 'parent_id' )->whereIn( 'id', $guest_ids )->getAll();
		$ids  = array();
		foreach ( (array) $rows as $row ) {
			if ( absint( $row->parent_id ) > 0 ) {
				$ids[] = absint( $row->id );
			}
		}
		if ( empty( $ids ) ) {
			return 0;
		}

		self::delete_rows_by_id( $ids );

		global $wpdb;
		$table = $wpdb->prefix . 'eventkoi_rsvps';
		$parent_ids = array_values( array_unique( array_filter( array_map( 'absint', array_column( array_map( 'get_object_vars', (array) $rows ), 'parent_id' ) ) ) ) );
		foreach ( $parent_ids as $parent_id ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$left = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE parent_id = %d", $parent_id ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			DB::table( 'eventkoi_rsvps' )->where( 'id', $parent_id )->update(
				array(
					'guests'  => $left,
					'updated' => gmdate( 'Y-m-d H:i:s' ),
				)
			);
		}
		self::recount_party_checkins( $parent_ids );
		self::bump_events_cache_version();

		return count( $ids );
	}

	/**
	 * Delete rows by id with a plain query; the query builder's delete has
	 * proven unreliable with IN lists.
	 *
	 * @param array $ids Row ids.
	 * @return int Rows deleted.
	 */
	private static function delete_rows_by_id( array $ids ) {
		global $wpdb;

		$ids = array_values( array_filter( array_map( 'absint', $ids ) ) );
		if ( empty( $ids ) ) {
			return 0;
		}

		$table        = $wpdb->prefix . 'eventkoi_rsvps';
		$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
		$sql          = call_user_func_array(
			array( $wpdb, 'prepare' ),
			array_merge(
				array(
					// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					"DELETE FROM {$table} WHERE id IN ({$placeholders})",
				),
				$ids
			)
		);

		return (int) $wpdb->query( $sql ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.NotPrepared -- Statement was prepared above with a dynamic placeholder list.
	}

	/**
	 * A fresh check-in token for callers outside this class (schema upgrades).
	 *
	 * @return string
	 */
	public static function new_checkin_token() {
		return self::generate_checkin_token();
	}

	/**
	 * Send each guest with an email their own confirmation and QR code.
	 *
	 * @param string $host_name   Name of the person who RSVPd.
	 * @param string $host_email  Their email, skipped if a guest repeats it.
	 * @param int    $event_id    Event ID.
	 * @param int    $instance_ts Instance timestamp.
	 * @param array  $party       Guest rows.
	 * @param array  $skip        Addresses that already had their email (an edit resends only to new ones).
	 * @return int Emails sent.
	 */
	private static function send_guest_emails( $host_name, $host_email, $event_id, $instance_ts, array $party, array $skip = array() ) {
		$sent = 0;
		$seen = array( strtolower( (string) $host_email ) => true );
		foreach ( $skip as $address ) {
			$seen[ strtolower( (string) $address ) ] = true;
		}
		foreach ( array_slice( $party, 0, 10 ) as $guest ) {
			$email = sanitize_email( (string) ( $guest->email ?? '' ) );
			$token = (string) ( $guest->checkin_token ?? '' );
			if ( '' === $email || ! is_email( $email ) || '' === $token || isset( $seen[ strtolower( $email ) ] ) ) {
				continue;
			}
			$seen[ strtolower( $email ) ] = true;
			if ( self::send_rsvp_email( $email, (string) ( $guest->name ?? '' ), $event_id, $instance_ts, $token, 0, array(), array( 'guest_of' => $host_name ) ) ) {
				++$sent;
			}
		}

		return $sent;
	}

	/**
	 * Guest addresses that already received a confirmation for this RSVP.
	 *
	 * Going guests with a token were emailed when they were added, so an edit
	 * only writes to guests that are new or changed their address.
	 *
	 * @param int $parent_id RSVP row id.
	 * @return array<int,string>
	 */
	private static function emailed_guest_addresses( $parent_id ) {
		$addresses = array();
		foreach ( self::get_guest_rows( $parent_id ) as $row ) {
			if ( 'going' !== (string) ( $row->status ?? '' ) || '' === (string) ( $row->checkin_token ?? '' ) ) {
				continue;
			}
			$email = sanitize_email( (string) ( $row->email ?? '' ) );
			if ( '' !== $email ) {
				$addresses[] = $email;
			}
		}

		return $addresses;
	}

	/**
	 * Generate a short unique check-in token.
	 *
	 * @return string
	 */
	private static function generate_checkin_token() {
		$max_attempts = 5;

		for ( $i = 0; $i < $max_attempts; $i++ ) {
			$token  = substr( self::base32_encode( random_bytes( 8 ) ), 0, 12 );
			$exists = DB::table( 'eventkoi_rsvps' )
				->where( 'checkin_token', $token )
				->get();

			if ( empty( $exists ) ) {
				return $token;
			}
		}

		return substr( self::base32_encode( random_bytes( 8 ) ), 0, 12 );
	}

	/**
	 * Base32 encode bytes using a human-friendly alphabet.
	 *
	 * @param string $bytes Raw bytes.
	 * @return string
	 */
	private static function base32_encode( $bytes ) {
		$alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
		$buffer   = 0;
		$bits     = 0;
		$output   = '';

		$length = strlen( $bytes );
		for ( $i = 0; $i < $length; $i++ ) {
			$buffer = ( $buffer << 8 ) | ord( $bytes[ $i ] );
			$bits  += 8;

			while ( $bits >= 5 ) {
				$index   = ( $buffer >> ( $bits - 5 ) ) & 31;
				$output .= $alphabet[ $index ];
				$bits   -= 5;
			}
		}

		if ( $bits > 0 ) {
			$index   = ( $buffer << ( 5 - $bits ) ) & 31;
			$output .= $alphabet[ $index ];
		}

		return $output;
	}
	/**
	 * Get or create a WordPress user for RSVP.
	 *
	 * @param string $email Email address.
	 * @param string $name Display name.
	 * @return int|\WP_Error
	 */
	private static function get_or_create_user( $email, $name ) {
		$user = get_user_by( 'email', $email );
		if ( $user && isset( $user->ID ) ) {
			return (int) $user->ID;
		}

		$base_username = sanitize_user( current( explode( '@', $email ) ), true );
		if ( ! $base_username ) {
			$base_username = 'eventkoi-lite';
		}

		$username = $base_username;
		$suffix   = 1;

		while ( username_exists( $username ) ) {
			$username = $base_username . $suffix;
			++$suffix;
		}

		$password = wp_generate_password( 20, true, true );
		$user_id  = wp_create_user( $username, $password, $email );

		if ( is_wp_error( $user_id ) ) {
			return $user_id;
		}

		wp_update_user(
			array(
				'ID'           => $user_id,
				'display_name' => $name,
			)
		);

		wp_new_user_notification( $user_id, null, 'user' );

		return (int) $user_id;
	}

	/**
	 * Get allowed RSVP statuses.
	 *
	 * @return array
	 */
	public static function get_allowed_statuses() {
		return self::$allowed_statuses;
	}

	/**
	 * Get RSVP summary counts for an event instance.
	 *
	 * @param int $event_id Event ID.
	 * @param int $instance_ts Instance timestamp.
	 * @return array
	 */
	public static function get_summary( $event_id, $instance_ts ) {
		$event_id    = absint( $event_id );
		$instance_ts = absint( $instance_ts );

		if ( ! $event_id || ! $instance_ts ) {
			return array();
		}

		$rows = DB::table( 'eventkoi_rsvps' )
			->select( 'status', 'guests' )
			->where( 'event_id', $event_id )
			->where( 'instance_ts', $instance_ts )
			->where( 'parent_id', 0 )
			->getAll();

		$summary = array(
			'going'     => 0,
			'maybe'     => 0,
			'not_going' => 0,
			'cancelled' => 0,
			'used'      => 0,
			'total'     => 0,
		);

		if ( ! empty( $rows ) ) {
			foreach ( $rows as $row ) {
				$status = isset( $row->status ) ? sanitize_key( $row->status ) : '';
				$guests = absint( $row->guests ?? 0 );

				if ( isset( $summary[ $status ] ) ) {
					++$summary[ $status ];
				}

				if ( 'going' === $status ) {
					$summary['used'] += 1 + $guests;
				}
			}
		}

		$summary['total'] = $summary['going'] + $summary['maybe'] + $summary['not_going'] + $summary['cancelled'];

		return $summary;
	}

	/**
	 * Get RSVP summary counts across every RSVP row for an event.
	 *
	 * This is used for standard single/continuous events where an event date edit
	 * should not split capacity or attendee state by the old start timestamp.
	 *
	 * @param int $event_id Event ID.
	 * @return array
	 */
	public static function get_summary_for_event( $event_id ) {
		$event_id = absint( $event_id );

		if ( ! $event_id ) {
			return array();
		}

		$rows = DB::table( 'eventkoi_rsvps' )
			->select( 'status', 'guests' )
			->where( 'event_id', $event_id )
			->where( 'parent_id', 0 )
			->getAll();

		$summary = array(
			'going'     => 0,
			'maybe'     => 0,
			'not_going' => 0,
			'cancelled' => 0,
			'used'      => 0,
			'total'     => 0,
		);

		if ( ! empty( $rows ) ) {
			foreach ( $rows as $row ) {
				$status = isset( $row->status ) ? sanitize_key( $row->status ) : '';
				$guests = absint( $row->guests ?? 0 );

				if ( isset( $summary[ $status ] ) ) {
					++$summary[ $status ];
				}

				if ( 'going' === $status ) {
					$summary['used'] += 1 + $guests;
				}
			}
		}

		$summary['total'] = $summary['going'] + $summary['maybe'] + $summary['not_going'] + $summary['cancelled'];

		return $summary;
	}

	/**
	 * Get a single RSVP by check-in token.
	 *
	 * @param string $token Check-in token.
	 * @return object|null
	 */
	public static function get_by_token( $token ) {
		$token = sanitize_text_field( $token );

		if ( empty( $token ) ) {
			return null;
		}

		return DB::table( 'eventkoi_rsvps' )
			->where( 'checkin_token', $token )
			->get();
	}

	/**
	 * Get a single RSVP by user/email identity.
	 *
	 * @param int    $event_id Event ID.
	 * @param int    $instance_ts Instance timestamp.
	 * @param int    $user_id User ID.
	 * @param string $email Email address.
	 * @return object|null
	 */
	public static function get_by_identity( $event_id, $instance_ts, $user_id, $email ) {
		$event_id    = absint( $event_id );
		$instance_ts = absint( $instance_ts );
		$user_id     = absint( $user_id );
		$email       = sanitize_email( $email );

		if ( ! $event_id || ! $instance_ts ) {
			return null;
		}

		$query = DB::table( 'eventkoi_rsvps' )
			->where( 'event_id', $event_id )
			->where( 'instance_ts', $instance_ts )
			->where( 'parent_id', 0 );

		if ( $user_id ) {
			$query->where( 'user_id', $user_id );
		} elseif ( $email ) {
			$query->where( 'email', $email );
		} else {
			return null;
		}

		$existing = $query->get();

		if ( empty( $existing ) && $user_id && $email ) {
			$existing = DB::table( 'eventkoi_rsvps' )
				->where( 'event_id', $event_id )
				->where( 'instance_ts', $instance_ts )
				->where( 'email', $email )
				->where( 'parent_id', 0 )
				->get();
		}

		return $existing;
	}

	/**
	 * Get RSVPs for an event instance.
	 *
	 * @param int $event_id Event ID.
	 * @param int $instance_ts Instance timestamp.
	 * @return array
	 */
	public static function get_list( $event_id, $instance_ts ) {
		$event_id    = absint( $event_id );
		$instance_ts = absint( $instance_ts );

		if ( ! $event_id || ! $instance_ts ) {
			return array();
		}

		return DB::table( 'eventkoi_rsvps' )
			->where( 'event_id', $event_id )
			->where( 'instance_ts', $instance_ts )
			->getAll();
	}

	/**
	 * Update RSVP status in bulk.
	 *
	 * @param array  $ids RSVP IDs.
	 * @param string $status Status to set.
	 * @return int|\WP_Error
	 */
	public static function update_status( $ids, $status ) {
		$ids    = array_filter( array_map( 'absint', (array) $ids ) );
		$status = sanitize_key( $status );

		if ( empty( $ids ) ) {
			return 0;
		}

		// Guests follow their RSVP.
		$ids = self::with_guest_ids( $ids );

		if ( ! in_array( $status, self::$allowed_statuses, true ) ) {
			return new \WP_Error(
				'eventkoi_rsvp_invalid_status',
				__( 'Invalid RSVP status.', 'eventkoi-lite' ),
				array( 'status' => 400 )
			);
		}

		try {
			$updated = DB::table( 'eventkoi_rsvps' )
				->whereIn( 'id', $ids )
				->update(
					array(
						'status'  => $status,
						'updated' => gmdate( 'Y-m-d H:i:s' ),
					)
				);

			if ( 0 === (int) $updated ) {
				global $wpdb;
				$table        = $wpdb->prefix . 'eventkoi_rsvps';
				$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
				$sql          = call_user_func_array(
					array( $wpdb, 'prepare' ),
					array_merge(
						array(
							// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
							"UPDATE {$table} SET status = %s, updated = %s WHERE id IN ({$placeholders})",
							$status,
							gmdate( 'Y-m-d H:i:s' ),
						),
						$ids
					)
				);
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
				$updated = $wpdb->query( $sql );
			}

			if ( $updated > 0 ) {
				self::bump_events_cache_version();
			}

			return (int) $updated;
		} catch ( \Throwable $e ) {
			return new \WP_Error(
				'eventkoi_rsvp_update_failed',
				__( 'Failed to update RSVP status.', 'eventkoi-lite' ),
				array( 'status' => 500 )
			);
		}
	}

	/**
	 * Update check-in status in bulk.
	 *
	 * @param array  $ids RSVP IDs.
	 * @param string $status Check-in status to set.
	 * @return int|\WP_Error
	 */
	public static function update_checkin_status( $ids, $status ) {
		$ids    = array_filter( array_map( 'absint', (array) $ids ) );
		$status = sanitize_key( $status );

		if ( empty( $ids ) ) {
			return 0;
		}

		if ( ! in_array( $status, self::$allowed_checkin_statuses, true ) ) {
			return new \WP_Error(
				'eventkoi_rsvp_invalid_checkin_status',
				__( 'Invalid check-in status.', 'eventkoi-lite' ),
				array( 'status' => 400 )
			);
		}

		if ( 'checked_in' === $status ) {
			$checked_in = gmdate( 'Y-m-d H:i:s' );
		} else {
			$checked_in = null;
		}
		$checkin_status = $status;

		try {
			global $wpdb;
			$table        = $wpdb->prefix . 'eventkoi_rsvps';
			$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
			if ( null === $checked_in ) {
				$sql = call_user_func_array(
					array( $wpdb, 'prepare' ),
					array_merge(
						array(
							// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
							"UPDATE {$table} SET checked_in = NULL, checkin_status = %s, checked_in_count = NULL, updated = %s WHERE id IN ({$placeholders})",
							$checkin_status,
							gmdate( 'Y-m-d H:i:s' ),
						),
						$ids
					)
				);
			} else {
				$sql = call_user_func_array(
					array( $wpdb, 'prepare' ),
					array_merge(
						array(
							// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
							"UPDATE {$table} SET checked_in = %s, checkin_status = %s, updated = %s WHERE id IN ({$placeholders})",
							$checked_in,
							$checkin_status,
							gmdate( 'Y-m-d H:i:s' ),
						),
						$ids
					)
				);
			}
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared -- Statement was prepared above with a dynamic placeholder list.
			$updated = $wpdb->query( $sql );

			// The host's checked-in count is the people in the party who are in.
			self::recount_party_checkins( self::resolve_parent_ids( $ids ) );

			if ( $updated > 0 ) {
				self::bump_events_cache_version();
			}

			return (int) $updated;
		} catch ( \Throwable $e ) {
			return new \WP_Error(
				'eventkoi_rsvp_checkin_failed',
				__( 'Failed to update check-in status.', 'eventkoi-lite' ),
				array( 'status' => 500 )
			);
		}
	}

	/**
	 * Update checked-in count in bulk.
	 *
	 * @param array $ids RSVP IDs.
	 * @param int   $count Checked-in count to set.
	 * @return int|\WP_Error
	 */
	public static function update_checkin_count( $ids, $count ) {
		$ids = array_filter( array_map( 'absint', (array) $ids ) );
		$count = is_numeric( $count ) ? absint( $count ) : null;

		if ( empty( $ids ) ) {
			return 0;
		}

		try {
			$rows = DB::table( 'eventkoi_rsvps' )
				->whereIn( 'id', $ids )
				->getAll();

			if ( empty( $rows ) ) {
				return 0;
			}

			$updated_total = 0;
			$now           = gmdate( 'Y-m-d H:i:s' );

			foreach ( $rows as $row ) {
				$max_count = 1 + absint( $row->guests ?? 0 );
				$value     = null;

				if ( null !== $count ) {
					$value = min( $count, $max_count );
				}

				$updated = DB::table( 'eventkoi_rsvps' )
					->where( 'id', absint( $row->id ) )
					->update(
						array(
							'checked_in_count' => $value,
							'updated'          => $now,
						)
					);

				if ( $updated > 0 ) {
					$updated_total += $updated;
				}
			}

			if ( $updated_total > 0 ) {
				self::bump_events_cache_version();
			}

			return (int) $updated_total;
		} catch ( \Throwable $e ) {
			return new \WP_Error(
				'eventkoi_rsvp_checkin_count_failed',
				__( 'Failed to update check-in count.', 'eventkoi-lite' ),
				array( 'status' => 500 )
			);
		}
	}

	/**
	 * Resend RSVP confirmation emails.
	 *
	 * @param array $ids RSVP IDs.
	 * @return int|\WP_Error
	 */
	public static function resend_emails( $ids ) {
		$ids = array_filter( array_map( 'absint', (array) $ids ) );

		if ( empty( $ids ) ) {
			return 0;
		}

		$rows = DB::table( 'eventkoi_rsvps' )
			->whereIn( 'id', $ids )
			->getAll();

		if ( empty( $rows ) ) {
			return 0;
		}

		$sent = 0;
		foreach ( $rows as $row ) {
			$status = isset( $row->status ) ? sanitize_key( $row->status ) : '';
			if ( 'going' !== $status ) {
				continue;
			}

			$email = isset( $row->email ) ? sanitize_email( $row->email ) : '';
			$token = isset( $row->checkin_token ) ? sanitize_text_field( $row->checkin_token ) : '';

			if ( empty( $email ) || empty( $token ) ) {
				continue;
			}

			$is_guest = absint( $row->parent_id ?? 0 ) > 0;
			$host     = $is_guest ? DB::table( 'eventkoi_rsvps' )->where( 'id', absint( $row->parent_id ) )->get() : null;
			$did_send = self::send_rsvp_email(
				$email,
				isset( $row->name ) ? sanitize_text_field( $row->name ) : '',
				absint( $row->event_id ),
				absint( $row->instance_ts ),
				$token,
				absint( $row->guests ?? 0 ),
				$is_guest ? array() : self::get_guest_rows( absint( $row->id ) ),
				$is_guest ? array( 'guest_of' => (string) ( $host->name ?? '' ) ) : array()
			);
			if ( $did_send ) {
				++$sent;
			}
		}

		return $sent;
	}

	/**
	 * Delete RSVPs in bulk.
	 *
	 * @param array $ids RSVP IDs.
	 * @return int|\WP_Error
	 */
	public static function delete_rsvps( $ids ) {
		$ids = array_filter( array_map( 'absint', (array) $ids ) );

		if ( empty( $ids ) ) {
			return 0;
		}

		// Guests go with their RSVP.
		$ids = self::with_guest_ids( $ids );

		try {
			$deleted = DB::table( 'eventkoi_rsvps' )
				->whereIn( 'id', $ids )
				->delete();

			if ( 0 === (int) $deleted ) {
				global $wpdb;
				$table        = $wpdb->prefix . 'eventkoi_rsvps';
				$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
				$sql = call_user_func_array(
					array( $wpdb, 'prepare' ),
					array_merge(
						array(
							// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
							"DELETE FROM {$table} WHERE id IN ({$placeholders})",
						),
						$ids
					)
				);

				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
				$wpdb->query( $sql );
				$deleted = (int) $wpdb->rows_affected;
			}

			if ( $deleted > 0 ) {
				self::bump_events_cache_version();
			}

			return (int) $deleted;
		} catch ( \Throwable $e ) {
			return new \WP_Error(
				'eventkoi_rsvp_delete_failed',
				__( 'Failed to delete RSVPs.', 'eventkoi-lite' ),
				array( 'status' => 500 )
			);
		}
	}

	/**
	 * Count used capacity for an instance.
	 *
	 * @param int $event_id Event ID.
	 * @param int $instance_ts Instance timestamp.
	 * @return int
	 */
	public static function count_used_capacity( $event_id, $instance_ts ) {
		$event_id    = absint( $event_id );
		$instance_ts = absint( $instance_ts );

		if ( ! $event_id || ! $instance_ts ) {
			return 0;
		}

		$rows = DB::table( 'eventkoi_rsvps' )
			->select( 'guests' )
			->where( 'event_id', $event_id )
			->where( 'instance_ts', $instance_ts )
			->where( 'parent_id', 0 )
			->where( 'status', 'going' )
			->getAll();

		$total = 0;
		if ( ! empty( $rows ) ) {
			foreach ( $rows as $row ) {
				$total += 1 + absint( $row->guests ?? 0 );
			}
		}

		return $total;
	}

	/**
	 * Send RSVP confirmation email with QR.
	 *
	 * @param string $email Recipient email.
	 * @param string $name Attendee name.
	 * @param int    $event_id Event ID.
	 * @param int    $instance_ts Instance timestamp.
	 * @param string $token Check-in token.
	 * @param int    $guests Guest count.
	 * @param array  $party Guest rows, named in the body.
	 * @param array  $options Extras: `guest_of` sends the guest variant (no manage link).
	 * @return bool
	 */
	private static function send_rsvp_email( $email, $name, $event_id, $instance_ts, $token, $guests = 0, $party = array(), $options = array() ) {
		if ( empty( $email ) || empty( $token ) ) {
			return false;
		}

		$is_guest = ! empty( $options['guest_of'] );

		$settings        = Settings::get();
		$enabled_setting = $settings['rsvp_email_enabled'] ?? null;
		$enabled         = null === $enabled_setting || '' === $enabled_setting
			? true
			: filter_var( $enabled_setting, FILTER_VALIDATE_BOOLEAN );

		if ( ! $enabled ) {
			return false;
		}

		$event_post = get_post( $event_id );
		if ( empty( $event_post ) ) {
			return false;
		}

		$title   = self::get_event_title( $event_id, $instance_ts );
		$subject = sprintf( __( 'Your RSVP for %s', 'eventkoi-lite' ), $title );

		$event_url = self::get_event_url( $event_id, $instance_ts );

		$schedule            = self::get_event_instance_schedule( $event_id, $instance_ts );
		$event_timestamp     = $schedule['start'];
		$event_end_timestamp = $schedule['end'];
		$is_all_day          = $schedule['all_day'];

		$site_timezone      = wp_timezone();
		$utc_timezone       = new \DateTimeZone( 'UTC' );
		$date_format        = \eventkoi_resolved_date_format();
		$time_format        = \eventkoi_resolved_time_format();
		$event_date         = $event_timestamp ? wp_date( $date_format, $event_timestamp, $site_timezone ) : '';
		$event_time         = $event_timestamp && ! $is_all_day ? wp_date( $time_format, $event_timestamp, $site_timezone ) : '';
		$event_end_date     = $event_end_timestamp ? wp_date( $date_format, $event_end_timestamp, $site_timezone ) : '';
		$event_end_time     = $event_end_timestamp && ! $is_all_day ? wp_date( $time_format, $event_end_timestamp, $site_timezone ) : '';
		$event_date_utc     = $event_timestamp ? wp_date( $date_format, $event_timestamp, $utc_timezone ) : '';
		$event_time_utc     = $event_timestamp ? wp_date( $time_format, $event_timestamp, $utc_timezone ) : '';
		$event_end_date_utc = $event_end_timestamp ? wp_date( $date_format, $event_end_timestamp, $utc_timezone ) : '';
		$event_end_time_utc = $event_end_timestamp ? wp_date( $time_format, $event_end_timestamp, $utc_timezone ) : '';
		$event_datetime_utc = '';
		$event_datetime     = '';

		if ( $event_timestamp ) {
			if ( $event_end_timestamp ) {
				$is_same_day        = $event_date_utc === $event_end_date_utc;
				$event_datetime_utc = $is_same_day
					? sprintf( '%1$s, %2$s — %3$s', $event_date_utc, $event_time_utc, $event_end_time_utc )
					: sprintf( '%1$s, %2$s — %3$s, %4$s', $event_date_utc, $event_time_utc, $event_end_date_utc, $event_end_time_utc );
			} else {
				$event_datetime_utc = sprintf( '%1$s, %2$s', $event_date_utc, $event_time_utc );
			}

			$event_datetime = $is_all_day
				? eventkoi_format_datetime_range( $event_timestamp, $event_end_timestamp, true, array( 'timezone' => $site_timezone ) )
				: (
					$event_end_timestamp
						? eventkoi_date( 'datetime', $event_timestamp ) . ' — ' . eventkoi_date( 'datetime', $event_end_timestamp )
						: eventkoi_date( 'datetime', $event_timestamp )
				);
		}
		$guest_count = absint( $guests );
		$guest_names = array();
		foreach ( (array) $party as $guest ) {
			$guest_name = trim( (string) ( is_object( $guest ) ? ( $guest->name ?? '' ) : ( $guest['name'] ?? '' ) ) );
			if ( '' !== $guest_name ) {
				$guest_names[] = $guest_name;
			}
		}
		/* translators: %d: Number of guests attached to the RSVP. */
		$guest_line = $guest_count ? sprintf( __( 'Guests: %d', 'eventkoi-lite' ), $guest_count ) : '';
		if ( $guest_names ) {
			$guest_line .= ' (' . implode( ', ', $guest_names ) . ')';
		}
		if ( $is_guest ) {
			/* translators: %s: name of the person who RSVPd. */
			$guest_line = sprintf( __( 'Guest of %s', 'eventkoi-lite' ), (string) $options['guest_of'] );
		}
		$event_location = self::get_primary_physical_location( $event_id );

		$first_name = $name ? trim( strtok( $name, ' ' ) ) : '';

		$event_timezone = eventkoi_timezone();
			$tags           = array(
			'[attendee_name]'      => $first_name ? $first_name : __( 'there', 'eventkoi-lite' ),
			'[attendee_email]'     => $email,
			'[event_title]'        => $title,
			'[event_name]'         => $title,
			'[event_date]'         => $event_date,
			'[event_time]'         => $event_time,
			'[event_datetime_utc]' => $event_datetime_utc,
			'[event_datetime]'     => $event_datetime,
			'[event_timezone]'     => $event_timezone,
			'[event_location]'     => $event_location,
			'[event_url]'          => $event_url,
			'[rsvp_status]'        => __( 'Going', 'eventkoi-lite' ),
			'[guest_count]'        => $guest_count,
			'[guests_line]'        => $guest_line,
			'[guest_names]'        => implode( ', ', $guest_names ),
			'[checkin_code]'       => $token,
			'[site_name]'          => get_bloginfo( 'name' ),
		);

		$tags = apply_filters( 'eventkoi_rsvp_email_tags', $tags, $event_id, $instance_ts );

		$schedule_label = $event_datetime
			? ( $event_timezone
				? sprintf( __( 'Schedule (%s):', 'eventkoi-lite' ), $event_timezone )
				: __( 'Schedule:', 'eventkoi-lite' )
			)
			: '';
		// PROD-444: pick the link line based on whether attendees can edit.
		// A guest cannot manage the RSVP, so they only get the event page link.
		$allow_edit     = Event::get_rsvp_allow_edit() && ! $is_guest;
		$rsvp_link_line = $allow_edit
			? '<p>' . esc_html__( 'View / manage your RSVP:', 'eventkoi-lite' ) . '<br />[event_url]</p>'
			: '<p>' . esc_html__( 'View event page:', 'eventkoi-lite' ) . '<br />[event_url]</p>';

		$default_body  = implode(
			"\n",
			array(
				'<p>Hi [attendee_name],</p>',
				'<p>Thanks for your RSVP to [event_name].</p>',
				'<p>Check-in code:<br />[checkin_code]</p>',
				$event_datetime ? '<p>' . esc_html( $schedule_label ) . '<br />[event_datetime]</p>' : '',
				$event_location ? '<p>' . esc_html__( 'Location:', 'eventkoi-lite' ) . '<br />[event_location]</p>' : '',
				'<p>[guests_line]</p>',
				$rsvp_link_line,
				'<p>&mdash;<br />[site_name]</p>',
			)
		);

		$body = apply_filters( 'eventkoi_rsvp_email_template', $default_body, $tags, $event_id, $instance_ts );
		$body = self::replace_email_tags( $body, $tags );

		if ( empty( $event_location ) ) {
			$location_label = __( 'Location:', 'eventkoi-lite' );
			$pattern        = '/^' . preg_quote( $location_label, '/' ) . '\s*$/m';
			$body           = preg_replace( $pattern, '', $body );
		}

		$body     = preg_replace( "/\n{3,}/", "\n\n", $body );
		$body     = trim( $body );
		$has_html = (bool) preg_match( '/<[^>]+>/', $body );
		if ( ! $has_html ) {
			$body = wpautop( esc_html( $body ) );
		} else {
			$body = wp_kses( wpautop( $body ), \EventKoi\Core\Settings::get_email_template_allowed_tags() );
		}
		$subject = apply_filters( 'eventkoi_rsvp_email_subject', $subject, $tags, $event_id, $instance_ts );
		$subject = self::replace_email_tags( $subject, $tags );

		// A guest's own copy goes only to them.
		$sent = Email_Routing::send( 'rsvp', $email, $subject, $body, $settings, array( 'personal' => $is_guest ) );


		if ( ! $sent && defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			error_log( sprintf( '[EventKoi] RSVP email failed for %s (event %d).', $email, $event_id ) );
		}

		return (bool) $sent;
	}

	/**
	 * Replace RSVP email tags in a template.
	 *
	 * @param string $template Email template.
	 * @param array  $tags Tag map.
	 * @return string
	 */
	private static function replace_email_tags( $template, $tags ) {
		if ( empty( $template ) || empty( $tags ) ) {
			return $template;
		}

		$replace = array();
		foreach ( $tags as $key => $value ) {
			$replace[ $key ] = is_scalar( $value ) ? (string) $value : '';
		}

		return strtr( $template, $replace );
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
	 * @param string $default  Optional default normalized type.
	 * @return string
	 */
	private static function get_location_type( array $location, $default = '' ) {
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

		return sanitize_key( $default );
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

		$event = new Event( $event_id );
		if ( 'recurring' !== $event->get_date_type() || ! $instance_ts ) {
			return $url;
		}

		$is_pretty_permalink = get_option( 'permalink_structure' ) && false === strpos( $url, '?' );

		if ( $is_pretty_permalink ) {
			return trailingslashit( $url ) . absint( $instance_ts ) . '/';
		}

		return add_query_arg( 'instance', absint( $instance_ts ), $url );
	}

	/**
	 * Send admin notification for a new RSVP.
	 *
	 * @param string $name        Attendee name.
	 * @param string $email       Attendee email.
	 * @param int    $event_id    Event post ID.
	 * @param string $instance_ts Instance timestamp.
	 * @param int    $guests      Guest count.
	 */
	private static function send_admin_rsvp_notification( $name, $email, $event_id, $instance_ts, $guests = 0 ) {
		$settings = Settings::get();
		$enabled  = $settings['admin_rsvp_email_enabled'] ?? null;
		$enabled  = null === $enabled || '' === $enabled
			? true
			: filter_var( $enabled, FILTER_VALIDATE_BOOLEAN );

		if ( ! $enabled ) {
			return;
		}

		$admin_email = get_option( 'admin_email' );
		if ( ! is_email( $admin_email ) ) {
			return;
		}

		$event_name = self::get_event_title( $event_id, $instance_ts );

		$schedule            = self::get_event_instance_schedule( $event_id, $instance_ts );
		$event_timestamp     = $schedule['start'];
		$event_end_timestamp = $schedule['end'];
		$is_all_day          = $schedule['all_day'];
		$date_format         = \eventkoi_resolved_date_format();
		$time_format         = \eventkoi_resolved_time_format();
		$event_datetime      = '';

		if ( $event_timestamp ) {
			$event_datetime = $is_all_day
				? eventkoi_format_datetime_range( $event_timestamp, $event_end_timestamp, true, array( 'timezone' => wp_timezone() ) )
				: wp_date( $date_format . ' ' . $time_format, $event_timestamp, wp_timezone() );
		}

		$guest_line = $guests > 0
			/* translators: %d: Number of guests. */
			? '<strong>' . esc_html__( 'Guests:', 'eventkoi-lite' ) . '</strong> ' . absint( $guests )
			: '';

		$tags = array(
			'[attendee_name]'  => esc_html( $name ),
			'[attendee_email]' => esc_html( $email ),
			'[event_name]'     => esc_html( $event_name ),
			'[event_datetime]' => esc_html( $event_datetime ),
			'[guests_line]'    => $guest_line,
			'[site_name]'      => esc_html( get_bloginfo( 'name' ) ),
		);

		$default_subject  = __( 'New RSVP: [event_name]', 'eventkoi-lite' );
		$default_template = implode(
			"\n",
			array(
				'<p>' . esc_html__( 'A new RSVP has been submitted.', 'eventkoi-lite' ) . '</p>',
				'<p><strong>' . esc_html__( 'Attendee:', 'eventkoi-lite' ) . '</strong> [attendee_name] ([attendee_email])</p>',
				'<p>[guests_line]</p>',
				'<p><strong>' . esc_html__( 'Event:', 'eventkoi-lite' ) . '</strong> [event_name]</p>',
				'<p><strong>' . esc_html__( 'Date:', 'eventkoi-lite' ) . '</strong> [event_datetime]</p>',
				'<p>&mdash;<br />[site_name]</p>',
			)
		);

		$subject  = trim( (string) ( $settings['admin_rsvp_email_subject'] ?? '' ) );
		$template = trim( (string) ( $settings['admin_rsvp_email_template'] ?? '' ) );
		$subject  = '' !== $subject ? $subject : $default_subject;
		$template = '' !== $template ? $template : $default_template;

		// The tag values are escaped for the HTML body. The subject line is
		// plain text, so entities there would show up literally in the inbox.
		$subject = wp_specialchars_decode( strtr( $subject, $tags ), ENT_QUOTES );
		$body    = strtr( $template, $tags );
		$body    = wp_kses( wpautop( trim( $body ) ), Settings::get_email_template_allowed_tags() );

		Email_Routing::send( 'admin_rsvp', $admin_email, $subject, $body, $settings );
	}

	/**
	 * Resolve the end timestamp for an event, instance-aware.
	 *
	 * @param int $event_id    Event ID.
	 * @param int $instance_ts Instance start timestamp (0 for non-recurring).
	 * @return int Unix timestamp, 0 when undeterminable.
	 */
	public static function resolve_event_end_ts( $event_id, $instance_ts = 0 ) {
		$event_id    = absint( $event_id );
		$instance_ts = absint( $instance_ts );
		if ( $event_id <= 0 ) {
			return 0;
		}

		$end_ts = absint( get_post_meta( $event_id, 'end_timestamp', true ) );

		if ( $instance_ts > 0 && 'recurring' === Event::get_date_type() ) {
			$rules = Event::get_recurrence_rules();
			if ( ! empty( $rules ) ) {
				foreach ( $rules as $rule ) {
					$rule_start = ! empty( $rule['start_date'] ) ? strtotime( $rule['start_date'] . ' UTC' ) : null;
					$rule_end   = ! empty( $rule['end_date'] ) ? strtotime( $rule['end_date'] . ' UTC' ) : null;
					$duration   = ( $rule_start && $rule_end && $rule_end > $rule_start ) ? ( $rule_end - $rule_start ) : null;
					if ( $duration ) {
						return $instance_ts + $duration;
					}
				}
			}
			return $instance_ts;
		}

		if ( $end_ts <= 0 ) {
			$end_ts = absint( get_post_meta( $event_id, 'start_timestamp', true ) );
		}
		return $end_ts;
	}

	/**
	 * Resolve instance timestamps plus all-day state for RSVP email rendering.
	 *
	 * @param int $event_id    Event ID.
	 * @param int $instance_ts Instance start timestamp.
	 * @return array{start:int,end:int,all_day:bool}
	 */
	private static function get_event_instance_schedule( $event_id, $instance_ts = 0 ) {
		$event_id    = absint( $event_id );
		$instance_ts = absint( $instance_ts );

		if ( ! $event_id ) {
			return array(
				'start'   => 0,
				'end'     => 0,
				'all_day' => false,
			);
		}

		$current_start_timestamp = absint( get_post_meta( $event_id, 'start_timestamp', true ) );
		$event_timestamp         = $instance_ts ? $instance_ts : $current_start_timestamp;
		$event_end_timestamp = absint( get_post_meta( $event_id, 'end_timestamp', true ) );

		new Event( $event_id );
		$date_type      = Event::get_date_type();
		$first_instance = Event::get_first_instance();
		$is_all_day     = ! empty( $first_instance['all_day'] );

		if ( 'standard' === $date_type ) {
			$event_timestamp = $current_start_timestamp;
			$instance_ts     = 0;
		}

		if ( $event_timestamp && 'recurring' === $date_type && $instance_ts ) {
			$rules = Event::get_recurrence_rules();

			if ( ! empty( $rules ) ) {
				foreach ( $rules as $rule ) {
					if ( ! is_array( $rule ) ) {
						continue;
					}

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
}
