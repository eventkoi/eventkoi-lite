<?php
/**
 * Sync edge ticket orders to local WordPress tables.
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
 * Ticket Order Sync.
 *
 * Persists Supabase edge order data into the local wp_eventkoi_ticket_orders
 * table so that the admin attendees list, QR check-in, and quantity counters
 * work even when the edge API is unreachable.
 */
class Ticket_Order_Sync {

	/**
	 * Sync a completed edge order payload to the local ticket_orders table.
	 *
	 * Each order item with ticket_codes is expanded into one row per code.
	 * Items without codes get a single row. Check-in tokens are generated
	 * locally for QR code support.
	 *
	 * @param array $order Edge order payload (from list-orders / get-order).
	 * @return int Number of rows inserted or updated.
	 */
	public static function sync_order_to_local( $order ) {
		global $wpdb;

		if ( ! is_array( $order ) ) {
			return 0;
		}

		$order_id       = sanitize_text_field( (string) ( $order['order_id'] ?? $order['id'] ?? '' ) );
		$customer_name  = sanitize_text_field( (string) ( $order['customer_name'] ?? '' ) );
		$customer_email = sanitize_email( (string) ( $order['customer_email'] ?? $order['billing_email'] ?? '' ) );
		$payment_status = sanitize_key( (string) ( $order['status'] ?? $order['payment_status'] ?? 'pending' ) );
		$payment_intent = sanitize_text_field( (string) ( $order['stripe_payment_intent_id'] ?? $order['payment_intent_id'] ?? '' ) );
		$charge_id      = sanitize_text_field( (string) ( $order['charge_id'] ?? '' ) );
		$created_at     = sanitize_text_field( (string) ( $order['created_at'] ?? '' ) );
		$metadata       = isset( $order['metadata'] ) && is_array( $order['metadata'] ) ? $order['metadata'] : array();
		$event_id       = absint( $order['event_id'] ?? ( $metadata['event_id'] ?? 0 ) );
		$currency       = strtoupper( sanitize_text_field( (string) ( $order['currency'] ?? 'USD' ) ) );
		$items          = isset( $order['items'] ) && is_array( $order['items'] ) ? $order['items'] : array();

		if ( '' === $order_id || ! $event_id ) {
			return 0;
		}

		if ( ! preg_match( '/^[A-Z]{3}$/', $currency ) ) {
			$currency = 'USD';
		}

		if ( '' === $created_at ) {
			$created_at = gmdate( 'Y-m-d H:i:s' );
		}

		$table = $wpdb->prefix . 'eventkoi_ticket_orders';
		$count = 0;

		if ( empty( $items ) ) {
			return 0;
		}

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			$ticket_id    = absint( $item['ticket_id'] ?? 0 );
			$quantity     = max( 1, absint( $item['quantity'] ?? 1 ) );
			$unit_price   = floatval( $item['price'] ?? $item['unit_amount'] ?? 0 ) / 100;
			$ticket_codes = isset( $item['ticket_codes'] ) && is_array( $item['ticket_codes'] ) ? $item['ticket_codes'] : array();

			if ( ! empty( $ticket_codes ) ) {
				foreach ( $ticket_codes as $code ) {
					$code          = sanitize_text_field( (string) $code );
					$composite_key = $order_id . ':' . $ticket_id . ':' . $code;
					$count        += self::upsert_row(
						$table,
						array(
							'event_id'          => $event_id,
							'ticket_id'         => $ticket_id,
							'order_id'          => $composite_key,
							'customer_name'     => $customer_name,
							'customer_email'    => $customer_email,
							'quantity'          => 1,
							'unit_price'        => $unit_price,
							'total_amount'      => $unit_price,
							'currency'          => $currency,
							'payment_status'    => $payment_status,
							'payment_intent_id' => $payment_intent,
							'charge_id'         => $charge_id,
							'checkin_token'     => $code,
							'created_at'        => $created_at,
						)
					);
				}
			} else {
				$composite_key = $order_id . ':' . $ticket_id;
				$total_amount  = $unit_price * $quantity;
				$token         = self::generate_checkin_token();

				$count += self::upsert_row(
					$table,
					array(
						'event_id'          => $event_id,
						'ticket_id'         => $ticket_id,
						'order_id'          => $composite_key,
						'customer_name'     => $customer_name,
						'customer_email'    => $customer_email,
						'quantity'          => $quantity,
						'unit_price'        => $unit_price,
						'total_amount'      => $total_amount,
						'currency'          => $currency,
						'payment_status'    => $payment_status,
						'payment_intent_id' => $payment_intent,
						'charge_id'         => $charge_id,
						'checkin_token'     => $token,
						'created_at'        => $created_at,
					)
				);
			}
		}

		if ( $count > 0 ) {
			self::sync_quantity_sold( $event_id, $items );
		}

		return $count;
	}

	/**
	 * Sync multiple edge orders to local (bulk).
	 *
	 * Pre-fetches existing order_ids in a single query to avoid N+1 SELECT
	 * lookups during upsert.
	 *
	 * @param array $orders Array of edge order payloads.
	 * @return int Total rows inserted or updated.
	 */
	public static function sync_orders_to_local( $orders ) {
		if ( ! is_array( $orders ) || empty( $orders ) ) {
			return 0;
		}

		global $wpdb;

		// Collect all composite keys that will be upserted.
		$all_keys = array();
		foreach ( $orders as $order ) {
			if ( ! is_array( $order ) ) {
				continue;
			}
			$oid   = sanitize_text_field( (string) ( $order['order_id'] ?? $order['id'] ?? '' ) );
			$items = isset( $order['items'] ) && is_array( $order['items'] ) ? $order['items'] : array();
			if ( '' === $oid || empty( $items ) ) {
				continue;
			}
			foreach ( $items as $item ) {
				if ( ! is_array( $item ) ) {
					continue;
				}
				$tid   = absint( $item['ticket_id'] ?? 0 );
				$codes = isset( $item['ticket_codes'] ) && is_array( $item['ticket_codes'] ) ? $item['ticket_codes'] : array();
				if ( ! empty( $codes ) ) {
					foreach ( $codes as $code ) {
						$all_keys[] = $oid . ':' . $tid . ':' . sanitize_text_field( (string) $code );
					}
				} else {
					$all_keys[] = $oid . ':' . $tid;
				}
			}
		}

		// Pre-fetch existing rows in one query instead of per-row SELECTs.
		if ( ! empty( $all_keys ) ) {
			$table        = $wpdb->prefix . 'eventkoi_ticket_orders';
			$placeholders = implode( ',', array_fill( 0, count( $all_keys ), '%s' ) );
			// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare
			$existing_rows = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT id, order_id FROM {$table} WHERE order_id IN ({$placeholders})",
					...$all_keys
				)
			);
			// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare
			$existing_map = array();
			if ( $existing_rows ) {
				foreach ( $existing_rows as $row ) {
					$existing_map[ $row->order_id ] = absint( $row->id );
				}
			}
			self::$prefetched_ids = $existing_map;
		}

		$total = 0;
		foreach ( $orders as $order ) {
			$total += self::sync_order_to_local( $order );
		}

		self::$prefetched_ids = null;

		return $total;
	}

	/**
	 * Pre-fetched order ID map for batch sync.
	 *
	 * @var array|null
	 */
	private static $prefetched_ids = null;

	/**
	 * Update local ticket_orders rows after a successful refund.
	 *
	 * Matches rows by edge order ID prefix (order_id LIKE) or by charge_id
	 * when the optional $charge_id parameter is provided.
	 *
	 * @param string $order_id      Edge order ID (can be empty when charge_id is provided).
	 * @param string $new_status    New payment status (refunded, partially_refunded).
	 * @param float  $refund_amount Refund amount in major currency units.
	 * @param array  $refund_items  Refunded items with ticket_id and quantity.
	 * @param string $charge_id     Optional. Stripe charge ID to match rows when edge order ID is unavailable.
	 * @return int Number of rows updated.
	 */
	public static function sync_refund_to_local( $order_id, $new_status, $refund_amount, $refund_items = array(), $charge_id = '' ) {
		global $wpdb;

		$order_id  = sanitize_text_field( (string) $order_id );
		$charge_id = sanitize_text_field( (string) $charge_id );

		if ( '' === $order_id && '' === $charge_id ) {
			return 0;
		}

		$table = $wpdb->prefix . 'eventkoi_ticket_orders';

		// Match by edge order_id prefix or by charge_id.
		if ( '' !== $order_id ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Updates local cache rows after edge refund.
			$updated = $wpdb->query(
				$wpdb->prepare(
					"UPDATE {$table} SET payment_status = %s, refund_amount = %f, updated_at = %s WHERE order_id LIKE %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					sanitize_key( $new_status ),
					floatval( $refund_amount ),
					gmdate( 'Y-m-d H:i:s' ),
					$wpdb->esc_like( $order_id ) . '%'
				)
			);
		} else {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Updates local cache rows after Stripe refund by charge_id.
			$updated = $wpdb->query(
				$wpdb->prepare(
					"UPDATE {$table} SET payment_status = %s, refund_amount = %f, updated_at = %s WHERE charge_id = %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					sanitize_key( $new_status ),
					floatval( $refund_amount ),
					gmdate( 'Y-m-d H:i:s' ),
					$charge_id
				)
			);
		}

		if ( ! empty( $refund_items ) && is_array( $refund_items ) ) {
			$ticket_table = $wpdb->prefix . 'eventkoi_tickets';
			foreach ( $refund_items as $refund_item ) {
				if ( ! is_array( $refund_item ) ) {
					continue;
				}

				$ticket_id = absint( $refund_item['ticket_id'] ?? 0 );
				$qty       = absint( $refund_item['quantity'] ?? 0 );
				$restock   = (bool) ( $refund_item['restock_tickets'] ?? true );

				if ( $ticket_id > 0 && $qty > 0 && $restock ) {
					// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Decrements local sold count after edge refund with restock.
					$wpdb->query(
						$wpdb->prepare(
							"UPDATE {$ticket_table} SET quantity_sold = GREATEST(0, CAST(quantity_sold AS SIGNED) - %d) WHERE id = %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
							$qty,
							$ticket_id
						)
					);
				}
			}
		}

		return absint( $updated );
	}

	/**
	 * Get a ticket order row by checkin_token.
	 *
	 * @param string $token Check-in token.
	 * @return object|null
	 */
	public static function get_by_token( $token ) {
		global $wpdb;

		$token = sanitize_text_field( (string) $token );
		if ( '' === $token ) {
			return null;
		}

		$table = $wpdb->prefix . 'eventkoi_ticket_orders';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Token lookup for QR check-in must be uncached real-time.
		return $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$table} WHERE checkin_token = %s LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$token
			)
		);
	}

	/**
	 * Mark a ticket order row as checked in.
	 *
	 * @param int $row_id Local ticket_orders row ID.
	 * @return bool
	 */
	public static function mark_checked_in( $row_id ) {
		global $wpdb;

		$row_id = absint( $row_id );
		if ( ! $row_id ) {
			return false;
		}

		$table = $wpdb->prefix . 'eventkoi_ticket_orders';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Updates check-in state for QR scan.
		$result = $wpdb->update(
			$table,
			array(
				'checked_in'    => 1,
				'checked_in_at' => gmdate( 'Y-m-d H:i:s' ),
				'updated_at'    => gmdate( 'Y-m-d H:i:s' ),
			),
			array( 'id' => $row_id ),
			array( '%d', '%s', '%s' ),
			array( '%d' )
		);

		return false !== $result;
	}

	/**
	 * Update quantity_sold on local tickets table from order items.
	 *
	 * @param int   $event_id Event ID.
	 * @param array $items    Order items with ticket_id and quantity.
	 * @return void
	 */
	public static function sync_quantity_sold( $event_id, $items ) {
		global $wpdb;

		$ticket_table = $wpdb->prefix . 'eventkoi_tickets';
		$orders_table = $wpdb->prefix . 'eventkoi_ticket_orders';
		$event_id     = absint( $event_id );

		if ( ! $event_id ) {
			return;
		}

		$ticket_ids = array();
		foreach ( $items as $item ) {
			if ( is_array( $item ) && ! empty( $item['ticket_id'] ) ) {
				$ticket_ids[] = absint( $item['ticket_id'] );
			}
		}

		$ticket_ids = array_unique( array_filter( $ticket_ids ) );
		if ( empty( $ticket_ids ) ) {
			return;
		}

		foreach ( $ticket_ids as $ticket_id ) {
			// Count completed rows in local table as source of truth for local sold count.
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Recounts sold qty from local orders for accuracy.
			$sold = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COALESCE(SUM(quantity), 0) FROM {$orders_table} WHERE ticket_id = %d AND event_id = %d AND payment_status IN ('complete', 'completed', 'succeeded')", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					$ticket_id,
					$event_id
				)
			);

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Syncs local sold count from order rows.
			$wpdb->update(
				$ticket_table,
				array( 'quantity_sold' => absint( $sold ) ),
				array(
					'id'       => $ticket_id,
					'event_id' => $event_id,
				),
				array( '%d' ),
				array( '%d', '%d' )
			);
		}
	}

	/**
	 * Insert or update a single ticket_orders row.
	 *
	 * @param string $table Table name with prefix.
	 * @param array  $data  Row data.
	 * @return int 1 if inserted/updated, 0 otherwise.
	 */
	private static function upsert_row( $table, $data ) {
		global $wpdb;

		$order_id = $data['order_id'] ?? '';
		if ( '' === $order_id ) {
			return 0;
		}

		// Use prefetched map when available (batch sync), otherwise single query.
		if ( null !== self::$prefetched_ids ) {
			$existing = self::$prefetched_ids[ $order_id ] ?? null;
		} else {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Check for existing row before insert/update.
			$existing = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT id FROM {$table} WHERE order_id = %s LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					$order_id
				)
			);
		}

		if ( $existing ) {
			$update_data = $data;
			unset( $update_data['order_id'], $update_data['created_at'], $update_data['checkin_token'] );
			$update_data['updated_at'] = gmdate( 'Y-m-d H:i:s' );

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Updates local cache row from edge data.
			$wpdb->update( $table, $update_data, array( 'id' => absint( $existing ) ) );
			return 0;
		}

		$data['updated_at'] = gmdate( 'Y-m-d H:i:s' );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Inserts local cache row from edge data.
		$result = $wpdb->insert( $table, $data );
		return $result ? 1 : 0;
	}

	/**
	 * Generate a short unique check-in token.
	 *
	 * Uses the same human-friendly base32 alphabet as RSVP tokens.
	 *
	 * @return string 12-character token.
	 */
	private static function generate_checkin_token() {
		global $wpdb;

		$table        = $wpdb->prefix . 'eventkoi_ticket_orders';
		$max_attempts = 5;

		for ( $i = 0; $i < $max_attempts; $i++ ) {
			$token = substr( self::base32_encode( random_bytes( 8 ) ), 0, 12 );

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Token uniqueness check must be uncached.
			$exists = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT id FROM {$table} WHERE checkin_token = %s LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					$token
				)
			);

			if ( ! $exists ) {
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
	 * Delete local order rows by order_id.
	 *
	 * @param string $order_id Order ID (e.g. "wc_123" or Supabase UUID).
	 * @return int Number of rows deleted.
	 */
	public static function delete_local_order( $order_id ) {
		global $wpdb;

		$order_id = sanitize_text_field( (string) $order_id );
		if ( '' === $order_id ) {
			return 0;
		}

		$table = $wpdb->prefix . 'eventkoi_ticket_orders';

		// Local rows use composite keys (e.g. "uuid:ticket_id:code"), so match by prefix.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Removes archived order rows.
		$deleted = $wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$table} WHERE order_id = %s OR order_id LIKE %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$order_id,
				$wpdb->esc_like( $order_id ) . ':%'
			)
		);

		return absint( $deleted );
	}
}
