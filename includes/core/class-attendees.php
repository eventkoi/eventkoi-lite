<?php
/**
 * Per-ticket attendee details.
 *
 * @package EventKoi
 */

namespace EventKoi\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Collects, stores and reads the name and email a buyer gives for each ticket.
 *
 * The checkout dialog sends one entry per seat. They are stashed under the
 * inventory hold until the gateway confirms the order, then written onto the
 * per-seat rows in the ticket orders table next to each check-in code.
 */
class Attendees {

	/**
	 * Attendee collection modes an event can choose from.
	 */
	const MODES = array( 'off', 'optional', 'required' );

	/**
	 * How long a checkout's attendees wait for the gateway to confirm.
	 */
	const STASH_TTL = 21 * DAY_IN_SECONDS;

	/**
	 * Normalise an attendee collection mode.
	 *
	 * @param mixed $mode Raw mode.
	 * @return string off|optional|required
	 */
	public static function normalize_mode( $mode ): string {
		$mode = sanitize_key( (string) $mode );

		return in_array( $mode, self::MODES, true ) ? $mode : 'off';
	}

	/**
	 * Validate the attendees a checkout request carries.
	 *
	 * Returns the entries grouped by ticket id, one per seat, in the order the
	 * buyer typed them. Missing seats are padded with empty entries so the
	 * index always matches the code generated for that seat later on.
	 *
	 * A request without the parameter (the legacy inline bridge and the no-JS
	 * fallback form) passes through with no attendees even when the event
	 * requires them, since those forms have nowhere to ask.
	 *
	 * @param mixed  $raw   Request value: list of { ticket_id, name, email }.
	 * @param array  $items Sanitized items: list of { ticket_id, quantity }.
	 * @param string $mode  Event collection mode.
	 * @param bool   $email_each Whether every attendee should get their own ticket email.
	 * @return array|\WP_Error Map ticket_id => list of { name, email }.
	 */
	public static function sanitize_checkout_attendees( $raw, array $items, string $mode, bool $email_each = false ) {
		$mode = self::normalize_mode( $mode );
		if ( 'off' === $mode || ! is_array( $raw ) ) {
			return array();
		}

		$quantities = array();
		foreach ( $items as $item ) {
			$ticket_id = absint( $item['ticket_id'] ?? 0 );
			if ( $ticket_id ) {
				$quantities[ $ticket_id ] = ( $quantities[ $ticket_id ] ?? 0 ) + max( 1, absint( $item['quantity'] ?? 1 ) );
			}
		}

		$grouped = array();
		foreach ( $raw as $entry ) {
			if ( ! is_array( $entry ) ) {
				continue;
			}
			$ticket_id = absint( $entry['ticket_id'] ?? 0 );
			if ( ! isset( $quantities[ $ticket_id ] ) ) {
				continue;
			}
			if ( count( $grouped[ $ticket_id ] ?? array() ) >= $quantities[ $ticket_id ] ) {
				continue;
			}

			$name  = sanitize_text_field( (string) ( $entry['name'] ?? '' ) );
			$email = sanitize_email( (string) ( $entry['email'] ?? '' ) );
			$typed = trim( (string) ( $entry['email'] ?? '' ) );

			if ( '' !== $typed && ! is_email( $email ) ) {
				return new \WP_Error(
					'invalid_attendee_email',
					__( 'Please enter a valid email address for each attendee.', 'eventkoi-lite' ),
					array( 'status' => 400 )
				);
			}

			$grouped[ $ticket_id ][] = array(
				'name'  => $name,
				'email' => $email,
			);
		}

		foreach ( $quantities as $ticket_id => $quantity ) {
			$grouped[ $ticket_id ] = array_values( $grouped[ $ticket_id ] ?? array() );
			$missing               = $quantity - count( $grouped[ $ticket_id ] );
			for ( $i = 0; $i < $missing; $i++ ) {
				$grouped[ $ticket_id ][] = array(
					'name'  => '',
					'email' => '',
				);
			}
		}

		if ( 'required' === $mode ) {
			foreach ( $grouped as $entries ) {
				foreach ( $entries as $entry ) {
					if ( '' === $entry['name'] ) {
						return new \WP_Error(
							'attendee_name_required',
							__( 'Please enter a name for each ticket.', 'eventkoi-lite' ),
							array( 'status' => 400 )
						);
					}
				}
			}
		}

		if ( $email_each ) {
			foreach ( $grouped as $entries ) {
				foreach ( $entries as $entry ) {
					if ( '' === $entry['email'] ) {
						return new \WP_Error(
							'attendee_email_required',
							__( 'Add an email address for each attendee to send them their own ticket.', 'eventkoi-lite' ),
							array( 'status' => 400 )
						);
					}
				}
			}
		}

		return $grouped;
	}

	/**
	 * Whether a grouped attendee map holds any name or email at all.
	 *
	 * @param array $grouped Map from sanitize_checkout_attendees().
	 * @return bool
	 */
	public static function has_details( array $grouped ): bool {
		foreach ( $grouped as $entries ) {
			foreach ( (array) $entries as $entry ) {
				if ( '' !== (string) ( $entry['name'] ?? '' ) || '' !== (string) ( $entry['email'] ?? '' ) ) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Keep the attendees until the gateway confirms the order.
	 *
	 * Same lifetime as the checkout field stash: a WooCommerce order can sit
	 * unpaid for days before it completes.
	 *
	 * @param string $hold_id    Inventory hold id from checkout.
	 * @param array  $grouped    Map ticket_id => list of { name, email }.
	 * @param bool   $email_each Whether every attendee gets their own ticket email.
	 * @return void
	 */
	public static function stash_checkout_attendees( string $hold_id, array $grouped, bool $email_each = false ): void {
		if ( '' === $hold_id || ( empty( $grouped ) && ! $email_each ) ) {
			return;
		}

		set_transient(
			self::stash_key( $hold_id ),
			array(
				'attendees'  => $grouped,
				'email_each' => $email_each,
			),
			self::STASH_TTL
		);
	}

	/**
	 * Read the stashed attendees for a hold.
	 *
	 * @param string $hold_id Inventory hold id.
	 * @return array { attendees: map, email_each: bool }
	 */
	public static function get_stashed_checkout_attendees( string $hold_id ): array {
		$empty = array(
			'attendees'  => array(),
			'email_each' => false,
		);
		if ( '' === $hold_id ) {
			return $empty;
		}

		$stash = get_transient( self::stash_key( $hold_id ) );
		if ( ! is_array( $stash ) ) {
			return $empty;
		}

		return array(
			'attendees'  => isset( $stash['attendees'] ) && is_array( $stash['attendees'] ) ? $stash['attendees'] : array(),
			'email_each' => ! empty( $stash['email_each'] ),
		);
	}

	/**
	 * The attendee for one seat of an order item.
	 *
	 * Prefers attendees carried on the item itself (gateways that keep their
	 * own copy), then the stash keyed by the hold.
	 *
	 * @param array $item        Order item, may carry `attendees`.
	 * @param int   $seat_index  Zero-based seat index within the item.
	 * @param array $stashed     Map ticket_id => list, from the hold stash.
	 * @return array{name:string,email:string}|null
	 */
	public static function resolve_seat_attendee( array $item, int $seat_index, array $stashed ) {
		$ticket_id = absint( $item['ticket_id'] ?? 0 );
		$entry     = null;

		if ( isset( $item['attendees'] ) && is_array( $item['attendees'] ) && isset( $item['attendees'][ $seat_index ] ) ) {
			$entry = $item['attendees'][ $seat_index ];
		} elseif ( isset( $stashed[ $ticket_id ][ $seat_index ] ) ) {
			$entry = $stashed[ $ticket_id ][ $seat_index ];
		}

		if ( ! is_array( $entry ) ) {
			return null;
		}

		$name  = sanitize_text_field( (string) ( $entry['name'] ?? '' ) );
		$email = sanitize_email( (string) ( $entry['email'] ?? '' ) );
		if ( '' === $name && '' === $email ) {
			return null;
		}

		return array(
			'name'  => $name,
			'email' => $email,
		);
	}

	/**
	 * Transient key for a hold's attendee stash.
	 *
	 * @param string $hold_id Inventory hold id.
	 * @return string
	 */
	private static function stash_key( string $hold_id ): string {
		return 'eventkoi_attendees_' . md5( $hold_id );
	}
}
