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
		}

		if ( ! in_array( $status, self::$allowed_statuses, true ) ) {
			$status = 'going';
		}

		$rsvp_enabled = Event::get_rsvp_enabled();
		if ( ! $rsvp_enabled ) {
			return new \WP_Error( 'eventkoi_rsvp_disabled', __( 'RSVP is disabled for this event.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$allow_guests = Event::get_rsvp_allow_guests();
		$max_guests   = Event::get_rsvp_max_guests();

		if ( ! $allow_guests ) {
			$guests = 0;
		} elseif ( $max_guests > 0 ) {
			$guests = min( $guests, $max_guests );
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
			->where( 'instance_ts', $instance_ts );

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
						'checkin_token' => $updated_token,
						'checkin_status' => $existing->checkin_status ?? 'none',
						'updated'       => $now,
					)
				);

			self::bump_events_cache_version();

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
				self::send_rsvp_email( $new_email, $name, $event_id, $instance_ts, $updated_token, $guests );
			}

			return array(
				'id'            => $existing->id,
				'checkin_token' => $existing->checkin_token,
				'updated'       => true,
			);
		}

		$checkin_token = self::generate_checkin_token();

		$id = DB::table( 'eventkoi_rsvps' )->insert(
			array(
				'event_id'      => $event_id,
				'instance_ts'   => $instance_ts,
				'user_id'       => $user_id ? $user_id : null,
				'name'          => $name,
				'email'         => $email,
				'status'        => $status,
				'guests'        => $guests,
				'checkin_token' => $checkin_token,
				'checked_in'    => null,
				'checked_in_count' => null,
				'checkin_status' => 'none',
				'created'       => $now,
				'updated'       => $now,
			)
		);

		self::bump_events_cache_version();

		if ( 'going' === $status ) {
			self::send_rsvp_email( $email, $name, $event_id, $instance_ts, $checkin_token, $guests );
		}

		return array(
			'id'            => $id,
			'checkin_token' => $checkin_token,
			'created'       => true,
		);
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
			->where( 'instance_ts', $instance_ts );

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
			$sql          = call_user_func_array(
				array( $wpdb, 'prepare' ),
				array_merge(
					array(
						// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
						"UPDATE {$table} SET checked_in = %s, checkin_status = %s, checked_in_count = CASE WHEN %s = 'checked_in' THEN IFNULL(checked_in_count, (1 + guests)) ELSE NULL END, updated = %s WHERE id IN ({$placeholders})",
						$checked_in,
						$checkin_status,
						$checkin_status,
						gmdate( 'Y-m-d H:i:s' ),
					),
					$ids
				)
			);
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$updated = $wpdb->query( $sql );

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

			$did_send = self::send_rsvp_email(
				$email,
				isset( $row->name ) ? sanitize_text_field( $row->name ) : '',
				absint( $row->event_id ),
				absint( $row->instance_ts ),
				$token,
				absint( $row->guests ?? 0 )
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
	 * @return bool
	 */
	private static function send_rsvp_email( $email, $name, $event_id, $instance_ts, $token, $guests = 0 ) {
		if ( empty( $email ) || empty( $token ) ) {
			return false;
		}

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
		$qr_code  = '';

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

		$utc_timezone       = new \DateTimeZone( 'UTC' );
		$date_format        = get_option( 'date_format' );
		$time_format        = get_option( 'time_format' );
		$event_date         = $event_timestamp ? wp_date( $date_format, $event_timestamp, $utc_timezone ) : '';
		$event_time         = $event_timestamp ? wp_date( $time_format, $event_timestamp, $utc_timezone ) : '';
		$event_end_date     = $event_end_timestamp ? wp_date( $date_format, $event_end_timestamp, $utc_timezone ) : '';
		$event_end_time     = $event_end_timestamp ? wp_date( $time_format, $event_end_timestamp, $utc_timezone ) : '';
		$event_datetime_utc = '';
		$event_datetime     = '';

		if ( $event_timestamp ) {
			if ( $event_end_timestamp ) {
				$is_same_day        = $event_date === $event_end_date;
				$event_datetime_utc = $is_same_day
					? sprintf( '%1$s, %2$s — %3$s', $event_date, $event_time, $event_end_time )
					: sprintf( '%1$s, %2$s — %3$s, %4$s', $event_date, $event_time, $event_end_date, $event_end_time );
			} else {
				$event_datetime_utc = sprintf( '%1$s, %2$s', $event_date, $event_time );
			}

			$event_datetime = $event_end_timestamp
				? eventkoi_date( 'datetime', $event_timestamp ) . ' — ' . eventkoi_date( 'datetime', $event_end_timestamp )
				: eventkoi_date( 'datetime', $event_timestamp );
		}
		$guest_count    = absint( $guests );
		$guest_line     = $guest_count ? sprintf( __( 'Guests: %d', 'eventkoi-lite' ), $guest_count ) : '';
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
			'[checkin_code]'       => $token,
			'[qr_code]'            => '',
			'[site_name]'          => get_bloginfo( 'name' ),
		);

		$tags = apply_filters( 'eventkoi_rsvp_email_tags', $tags, $event_id, $instance_ts );

		$schedule_label = $event_datetime
			? ( $event_timezone
				? sprintf( __( 'Schedule (%s):', 'eventkoi-lite' ), $event_timezone )
				: __( 'Schedule:', 'eventkoi-lite' )
			)
			: '';
		$default_body  = implode(
			"\n",
			array(
				'<p>Hi [attendee_name],</p>',
				'<p>Thanks for your RSVP to [event_name].</p>',
				'<p>Check-in code:<br />[checkin_code]</p>',
				$event_datetime ? '<p>' . esc_html( $schedule_label ) . '<br />[event_datetime]</p>' : '',
				$event_location ? '<p>' . esc_html__( 'Location:', 'eventkoi-lite' ) . '<br />[event_location]</p>' : '',
				'<p>[guests_line]</p>',
				'<p>' . esc_html__( 'View / manage your RSVP:', 'eventkoi-lite' ) . '<br />[event_url]</p>',
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

		$headers = array( 'Content-Type: text/html; charset=UTF-8' );
		$sender_email = sanitize_email( $settings['rsvp_email_sender_email'] ?? '' );
		$sender_name  = sanitize_text_field( $settings['rsvp_email_sender_name'] ?? '' );
		$from_email_filter = null;
		$from_name_filter  = null;

		if ( $sender_email ) {
			$from = $sender_email;
			if ( $sender_name ) {
				$from = sprintf( '%s <%s>', $sender_name, $sender_email );
			}
			$headers[] = 'From: ' . $from;

			$from_email_filter = static function () use ( $sender_email ) {
				return $sender_email;
			};
			add_filter( 'wp_mail_from', $from_email_filter );
		}

		if ( $sender_name ) {
			$from_name_filter = static function () use ( $sender_name ) {
				return $sender_name;
			};
			add_filter( 'wp_mail_from_name', $from_name_filter );
		}

		$sent = wp_mail( $email, $subject, $body, $headers );

		if ( $from_email_filter ) {
			remove_filter( 'wp_mail_from', $from_email_filter );
		}

		if ( $from_name_filter ) {
			remove_filter( 'wp_mail_from_name', $from_name_filter );
		}

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
}
