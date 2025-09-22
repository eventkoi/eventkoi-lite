<?php
/**
 * Order.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

use EKLIB\StellarWP\DB\DB;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Order Class.
 */
class Order {

	/**
	 * Charge ID.
	 *
	 * @var string|null
	 */
	private $charge_id;

	/**
	 * Constructor.
	 *
	 * @param string|null $charge_id A charge ID.
	 */
	public function __construct( $charge_id = null ) {
		$this->charge_id = $charge_id;
	}

	/**
	 * Get a specific order by row ID.
	 *
	 * @param int  $order_id Row ID.
	 * @param bool $with_notes Whether to include order notes.
	 * @return array|null Order row or null.
	 */
	public function get( $order_id, $with_notes = false ) {
		if ( empty( $order_id ) || ! is_numeric( $order_id ) ) {
			return null;
		}

		$order = DB::table( 'ek_orders' )
		->where( 'id', $order_id )
		->get();

		if ( ! empty( $order ) && $with_notes ) {
			$order->notes = $this->get_order_notes( $order_id );
		}

		return $order;
	}

	/**
	 * Get order notes by order ID.
	 *
	 * @param int $order_id Order ID.
	 * @return array Array of notes.
	 */
	private function get_order_notes( $order_id ) {
		if ( empty( $order_id ) || ! is_numeric( $order_id ) ) {
			return array();
		}

		$notes = DB::table( 'ek_order_notes' )
			->where( 'order_id', $order_id )
			->orderBy( 'created', 'asc' )
			->getAll();

		foreach ( $notes as $key => $note ) {
			$notes[ $key ]->id       = absint( $note->id );
			$notes[ $key ]->order_id = absint( $note->order_id );
			$notes[ $key ]->created  = absint( $note->created );

			// Handle note_value.
			if ( is_null( $note->note_value ) || strtolower( $note->note_value ) === 'null' ) {
				$notes[ $key ]->note_value = '';
			} elseif ( is_string( $note->note_value ) ) {
				$decoded = json_decode( $note->note_value, true );
				// If JSON decoding worked and returned an array, use it.
				$notes[ $key ]->note_value = ( json_last_error() === JSON_ERROR_NONE && is_array( $decoded ) )
					? $decoded
					: $note->note_value;
			}

			// Format timestamps.
			$notes[ $key ]->formatted = array(
				'created'     => esc_html(
					gmdate( 'j F Y, g:ia', $note->created )
				),
				'created_gmt' => esc_html(
					gmdate(
						'j F Y, g:ia',
						$note->created,
						new \DateTimeZone( 'UTC' )
					)
				),
			);
		}

		return $notes;
	}

	/**
	 * Update order.
	 *
	 * @param array  $args    Order args.
	 * @param string $gateway Payment gateway.
	 * @return void
	 */
	public function update( array $args, $gateway = 'stripe' ) {
		if ( empty( $args ) ) {
			return;
		}

		DB::table( 'ek_charges' )->upsert( $args, array( 'charge_id' ) );

		do_action( 'eventkoi_after_order_updated', $args, $gateway );
	}

	/**
	 * Set order status.
	 *
	 * @param string $status Order status.
	 * @return void
	 */
	public function set_status( $status ) {
		if ( empty( $status ) || empty( $this->charge_id ) ) {
			return;
		}

		DB::table( 'ek_orders' )->upsert(
			array(
				'charge_id'    => $this->charge_id,
				'status'       => $status,
				'last_updated' => time(),
			),
			array( 'charge_id' )
		);

		DB::table( 'ek_charges' )->upsert(
			array(
				'charge_id' => $this->charge_id,
				'status'    => $status,
			),
			array( 'charge_id' )
		);
	}

	/**
	 * Get charge ID.
	 *
	 * @return string|null
	 */
	public function get_charge_id() {
		return $this->charge_id;
	}
}
