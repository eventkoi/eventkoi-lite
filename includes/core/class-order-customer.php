<?php
/**
 * Correct the customer details on a ticket order.
 *
 * A mistyped email at checkout means the confirmation never arrives, so a site
 * admin can fix the name, email and billing address after the sale. The order,
 * every ticket row and any attendee who carried the same details are updated,
 * and the change is recorded in the order's activity.
 *
 * @package EventKoi\Core
 */

namespace EventKoi\Core;

use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Class Order_Customer.
 */
class Order_Customer {

	/**
	 * Billing address parts that can be edited.
	 *
	 * @var string[]
	 */
	const ADDRESS_PARTS = array( 'line1', 'line2', 'city', 'state', 'postal_code', 'country' );

	/**
	 * Update an order's customer details.
	 *
	 * @param string     $order_id Order id, as the order screen knows it.
	 * @param string     $name     Customer name.
	 * @param string     $email    Customer email.
	 * @param array|null $address  Billing address parts, or null to leave it alone.
	 * @return array|WP_Error The saved details, or an error.
	 */
	public static function update( $order_id, $name, $email, $address = null ) {
		global $wpdb;

		$order_id = sanitize_text_field( (string) $order_id );
		$name     = sanitize_text_field( (string) $name );
		$email    = sanitize_email( (string) $email );

		if ( '' === $order_id ) {
			return new WP_Error( 'missing_order_id', __( 'Missing order ID.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}
		if ( '' === $email || ! is_email( $email ) ) {
			return new WP_Error( 'invalid_customer_email', __( 'Please enter a valid email address.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$order_row = self::find_order_row( $order_id );
		$keys      = array_values( array_unique( array_filter( array( $order_id, (string) ( $order_row->checkout_id ?? '' ), (string) ( $order_row->id ?? '' ) ) ) ) );
		$rows      = self::find_ticket_rows( $keys );

		if ( ! $order_row && empty( $rows ) ) {
			return new WP_Error( 'order_not_found', __( 'Order not found.', 'eventkoi-lite' ), array( 'status' => 404 ) );
		}

		$old_name        = (string) ( $order_row->billing_name ?? ( $rows[0]->customer_name ?? '' ) );
		$old_email       = (string) ( $order_row->billing_email ?? ( $rows[0]->customer_email ?? '' ) );
		$address_changed = false;

		if ( $order_row ) {
			$fields = array(
				'billing_name'  => $name,
				'billing_email' => $email,
				'last_updated'  => time(),
			);

			if ( is_array( $address ) ) {
				$current_address           = (string) ( $order_row->billing_address ?? '' );
				$new_address               = self::clean_address( $address, $current_address );
				$address_changed           = self::address_differs( $current_address, $new_address );
				$fields['billing_address'] = wp_json_encode( $new_address );
			}

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Order table is custom.
			$wpdb->update( $wpdb->prefix . 'eventkoi_orders', $fields, array( 'id' => (int) $order_row->id ) );
		}

		$tickets_table = $wpdb->prefix . 'eventkoi_ticket_orders';
		foreach ( $rows as $row ) {
			$fields = array(
				'customer_name'  => $name,
				'customer_email' => $email,
			);

			// An attendee who carried the buyer's details gets the correction too.
			// One with their own details keeps them.
			if ( '' !== (string) ( $row->attendee_email ?? '' ) && strtolower( (string) $row->attendee_email ) === strtolower( $old_email ) ) {
				$fields['attendee_email'] = $email;
			}
			if ( '' !== (string) ( $row->attendee_name ?? '' ) && (string) $row->attendee_name === $old_name ) {
				$fields['attendee_name'] = $name;
			}

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Ticket table is custom.
			$wpdb->update( $tickets_table, $fields, array( 'id' => (int) $row->id ) );
		}

		self::update_woocommerce_order( $order_id, $name, $email, $address );

		if ( $order_row && ( $old_name !== $name || strtolower( $old_email ) !== strtolower( $email ) || $address_changed ) ) {
			( new Orders() )->add_note( (int) $order_row->id, 'customer_details_updated', self::change_summary( $old_name, $name, $old_email, $email, $address_changed ), 'system' );
		}

		/**
		 * Fires after an order's customer details are corrected.
		 *
		 * @param string $order_id Order id.
		 * @param string $name     New name.
		 * @param string $email    New email.
		 */
		do_action( 'eventkoi_order_customer_updated', $order_id, $name, $email );

		return array(
			'order_id'       => $order_id,
			'customer_name'  => $name,
			'customer_email' => $email,
		);
	}

	/**
	 * Find the order row for an id, which can be the row id or the checkout id.
	 *
	 * @param string $order_id Order id.
	 * @return object|null
	 */
	private static function find_order_row( $order_id ) {
		global $wpdb;

		$table = $wpdb->prefix . 'eventkoi_orders';
		$where = ctype_digit( $order_id ) ? $wpdb->prepare( 'id = %d', (int) $order_id ) : $wpdb->prepare( 'checkout_id = %s', $order_id );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Custom table; $where is prepared above.
		$row = $wpdb->get_row( "SELECT * FROM {$table} WHERE {$where} LIMIT 1" );

		return $row ? $row : null;
	}

	/**
	 * Find every ticket row of an order. Rows are stored under the order id, or
	 * under "order id:ticket:code" when each seat has its own row.
	 *
	 * @param string[] $keys Order id forms.
	 * @return object[]
	 */
	private static function find_ticket_rows( $keys ) {
		global $wpdb;

		$table = $wpdb->prefix . 'eventkoi_ticket_orders';
		$rows  = array();

		foreach ( $keys as $key ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Custom table name.
			$found = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} WHERE order_id = %s OR order_id LIKE %s", $key, $wpdb->esc_like( $key ) . ':%' ) );
			foreach ( (array) $found as $row ) {
				$rows[ (int) $row->id ] = $row;
			}
		}

		return array_values( $rows );
	}

	/**
	 * Clean address parts over what is already stored, keeping anything else there.
	 *
	 * @param array  $address Submitted parts.
	 * @param string $current Stored address JSON.
	 * @return array
	 */
	private static function clean_address( $address, $current ) {
		$stored = json_decode( $current, true );
		$stored = is_array( $stored ) ? $stored : array();

		foreach ( self::ADDRESS_PARTS as $part ) {
			if ( array_key_exists( $part, $address ) ) {
				$stored[ $part ] = sanitize_text_field( (string) $address[ $part ] );
			}
		}

		return $stored;
	}

	/**
	 * Whether the address really changed. Empty parts count as missing.
	 *
	 * @param string $current Stored address JSON.
	 * @param array  $new     Address about to be saved.
	 * @return bool
	 */
	private static function address_differs( $current, $new ) {
		$stored = json_decode( $current, true );
		$stored = is_array( $stored ) ? array_filter( $stored ) : array();
		$new    = array_filter( $new );

		ksort( $stored );
		ksort( $new );

		return $stored !== $new;
	}

	/**
	 * Keep the WooCommerce order in step when the sale came through WooCommerce.
	 *
	 * @param string     $order_id Order id.
	 * @param string     $name     Customer name.
	 * @param string     $email    Customer email.
	 * @param array|null $address  Billing address parts.
	 * @return void
	 */
	private static function update_woocommerce_order( $order_id, $name, $email, $address ) {
		if ( ! preg_match( '/^wc_(\d+)/', $order_id, $match ) || ! function_exists( 'wc_get_order' ) ) {
			return;
		}

		$order = wc_get_order( (int) $match[1] );
		if ( ! $order ) {
			return;
		}

		$parts = explode( ' ', $name, 2 );
		$order->set_billing_first_name( $parts[0] );
		$order->set_billing_last_name( $parts[1] ?? '' );
		$order->set_billing_email( $email );

		if ( is_array( $address ) ) {
			$order->set_billing_address_1( sanitize_text_field( (string) ( $address['line1'] ?? '' ) ) );
			$order->set_billing_address_2( sanitize_text_field( (string) ( $address['line2'] ?? '' ) ) );
			$order->set_billing_city( sanitize_text_field( (string) ( $address['city'] ?? '' ) ) );
			$order->set_billing_state( sanitize_text_field( (string) ( $address['state'] ?? '' ) ) );
			$order->set_billing_postcode( sanitize_text_field( (string) ( $address['postal_code'] ?? '' ) ) );
			$order->set_billing_country( sanitize_text_field( (string) ( $address['country'] ?? '' ) ) );
		}

		$order->save();
	}

	/**
	 * One line for the order's activity.
	 *
	 * @param string $old_name  Previous name.
	 * @param string $name      New name.
	 * @param string $old_email Previous email.
	 * @param string $email     New email.
	 * @param bool   $address_changed Whether the billing address changed.
	 * @return string
	 */
	private static function change_summary( $old_name, $name, $old_email, $email, $address_changed = false ) {
		$changes = array();

		if ( strtolower( $old_email ) !== strtolower( $email ) ) {
			/* translators: 1: previous email, 2: new email. */
			$changes[] = sprintf( __( 'email from %1$s to %2$s', 'eventkoi-lite' ), $old_email, $email );
		}
		if ( $old_name !== $name ) {
			/* translators: 1: previous name, 2: new name. */
			$changes[] = sprintf( __( 'name from %1$s to %2$s', 'eventkoi-lite' ), $old_name, $name );
		}
		if ( $address_changed && ! empty( $changes ) ) {
			$changes[] = __( 'billing address', 'eventkoi-lite' );
		}

		$user = wp_get_current_user();
		$who  = $user && $user->exists() ? $user->display_name : __( 'An admin', 'eventkoi-lite' );

		if ( empty( $changes ) ) {
			/* translators: %s: who made the change. */
			return sprintf( __( '%s updated the billing address.', 'eventkoi-lite' ), $who );
		}

		/* translators: 1: who made the change, 2: the list of changes. */
		return sprintf( __( '%1$s changed the customer %2$s.', 'eventkoi-lite' ), $who, implode( ', ', $changes ) );
	}
}
