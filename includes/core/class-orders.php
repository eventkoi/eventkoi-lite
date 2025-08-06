<?php
/**
 * Orders.
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
 * Orders.
 */
class Orders {

	/**
	 * Init.
	 */
	public function __construct() {
	}

	/**
	 * Create order.
	 *
	 * @param array  $args An array of args to create an order.
	 * @param string $gateway Payment gateway.
	 */
	public static function create_order( $args = array(), $gateway = 'stripe' ) {

		if ( 'stripe' === $gateway ) {
			$stripe   = new \EventKoi\Payments\Stripe();
			$order_id = $stripe->create_order( $args );
		}

		// Fires after order has been created.
		do_action( 'eventkoi_after_order_created', $args, $gateway );

		return $order_id;
	}

	/**
	 * Get orders.
	 *
	 * @param bool $display Get results for display or raw purposes.
	 */
	public static function get( $display = false ) {

		$orders = DB::table( 'ek_orders' )->where( 'live', eventkoi_live_mode_enabled() )->getAll();

		if ( $display ) {
			$orders = apply_filters( 'eventkoi_prepare_raw_db_data', $orders, 'orders' );
		}

		return $orders;
	}

	/**
	 * Add a structured note to an order.
	 *
	 * @param int         $order_id   The database ID of the order.
	 * @param string      $note_key   A short machine-readable note key.
	 * @param string|null $note_value Optional. Extra data to accompany the note.
	 * @param string      $type       Optional. Type of note. Default 'system'.
	 * @return void
	 */
	public function add_note( $order_id, $note_key, $note_value = null, $type = 'system' ) {
		$order_id = absint( $order_id );

		if ( ! $order_id ) {
			return;
		}

		DB::table( 'ek_order_notes' )->insert(
			array(
				'order_id'   => $order_id,
				'note_key'   => sanitize_key( $note_key ),
				'note_value' => is_null( $note_value )
					? null
					: ( is_scalar( $note_value ) ? (string) $note_value : wp_json_encode( $note_value ) ),
				'type'       => sanitize_key( $type ),
				'created'    => time(),
			)
		);

		// Update last_updated column in ek_orders (GMT timestamp).
		DB::table( 'ek_orders' )
		->where( 'id', $order_id )
		->update(
			array( 'last_updated' => time() )
		);
	}
}
