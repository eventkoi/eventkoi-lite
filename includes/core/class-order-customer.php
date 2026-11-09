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

		// A blank name never wipes the one on the order.
		$name = '' !== $name ? $name : $old_name;

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
	 * The corrected details of an order an admin has edited. A later payment
	 * event still carries what the buyer first typed, so callers keep these.
	 *
	 * @param string $order_id Order id, the row id or the checkout id.
	 * @return array|null Name, email and row id, or null if never corrected.
	 */
	public static function corrected_details( $order_id ) {
		global $wpdb;

		$order_row = self::find_order_row( (string) $order_id );
		if ( ! $order_row ) {
			return null;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table.
		$note = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$wpdb->prefix}eventkoi_order_notes WHERE order_id = %d AND note_key = %s LIMIT 1", (int) $order_row->id, 'customer_details_updated' ) );
		if ( ! $note ) {
			return null;
		}

		return array(
			'id'    => (int) $order_row->id,
			'name'  => (string) $order_row->billing_name,
			'email' => (string) $order_row->billing_email,
		);
	}

	/**
	 * The custom checkout fields of an order's event, with the buyer's answers.
	 *
	 * @param string $order_id Order id, as the order screen knows it.
	 * @param int    $event_id Event id when the caller already knows it.
	 * @return array[] List of { key, label, type, required, options, placeholder, description, value }.
	 */
	public static function checkout_fields( $order_id, $event_id = 0 ) {
		$order_id  = sanitize_text_field( (string) $order_id );
		$order_row = '' !== $order_id ? self::find_order_row( $order_id ) : null;
		$event_id  = absint( $event_id ) ? absint( $event_id ) : self::event_id_for_order( $order_id, $order_row );
		$fields    = $event_id ? Orders::get_checkout_fields( $event_id ) : array();

		if ( empty( $fields ) ) {
			return array();
		}

		$values = self::stored_checkout_fields( $order_id, $order_row, $event_id );
		$list   = array();

		foreach ( $fields as $field ) {
			$field['value'] = $values[ $field['key'] ] ?? '';
			$list[]         = $field;
		}

		return $list;
	}

	/**
	 * Change the answers a buyer gave to the custom checkout fields of an order.
	 *
	 * Only the fields sent are changed, the rest keep their answers, and a
	 * required field cannot be cleared. WooCommerce orders keep their answers
	 * in order meta, local orders in a structured order note.
	 *
	 * @param string $order_id Order id, as the order screen knows it.
	 * @param array  $values   New answers keyed by field key.
	 * @return array|WP_Error The answers now stored, or an error.
	 */
	public static function update_checkout_fields( $order_id, $values ) {
		$order_id  = sanitize_text_field( (string) $order_id );
		$values    = is_array( $values ) ? $values : array();
		$order_row = '' !== $order_id ? self::find_order_row( $order_id ) : null;
		$event_id  = self::event_id_for_order( $order_id, $order_row );
		$fields    = $event_id ? Orders::get_checkout_fields( $event_id ) : array();

		if ( '' === $order_id || empty( $fields ) ) {
			return array();
		}

		$current = self::stored_checkout_fields( $order_id, $order_row, $event_id );
		$merged  = $current;

		foreach ( $fields as $field ) {
			if ( array_key_exists( $field['key'], $values ) ) {
				$merged[ $field['key'] ] = $values[ $field['key'] ];
			}
		}

		$clean = Orders::sanitize_checkout_field_values( $merged, $event_id );
		if ( is_wp_error( $clean ) ) {
			return $clean;
		}

		// A cleared answer is stored as empty, so it also overrides what an earlier note held.
		$stored  = array();
		$changes = array();
		foreach ( $fields as $field ) {
			$key            = $field['key'];
			$stored[ $key ] = $clean[ $key ] ?? '';
			$before         = self::answer_text( $current[ $key ] ?? '' );
			$after          = self::answer_text( $stored[ $key ] );

			if ( $before !== $after ) {
				/* translators: 1: field label, 2: previous answer, 3: new answer. */
				$changes[] = sprintf( __( '%1$s from "%2$s" to "%3$s"', 'eventkoi-lite' ), $field['label'], $before, $after );
			}
		}

		if ( empty( $changes ) ) {
			return $stored;
		}

		if ( preg_match( '/^wc_(\d+)/', $order_id, $match ) && function_exists( 'wc_get_order' ) ) {
			$order = wc_get_order( (int) $match[1] );
			if ( $order ) {
				$order->update_meta_data( '_eventkoi_checkout_fields', $stored );
				$order->save();
			}
		} elseif ( $order_row ) {
			$orders = new Orders();
			$orders->add_note( (int) $order_row->id, 'checkout_fields', $stored, 'system' );

			$user = wp_get_current_user();
			$who  = $user && $user->exists() ? $user->display_name : __( 'An admin', 'eventkoi-lite' );
			/* translators: 1: who made the change, 2: the list of changed answers. */
			$orders->add_note( (int) $order_row->id, 'checkout_fields_updated', sprintf( __( '%1$s changed %2$s.', 'eventkoi-lite' ), $who, implode( '; ', $changes ) ), 'system' );
		}

		/**
		 * Fires after an admin changes the custom checkout field answers of an order.
		 *
		 * @param string $order_id Order id.
		 * @param array  $stored   Answers now stored, keyed by field key.
		 * @param array  $current  Answers before the change.
		 */
		do_action( 'eventkoi_order_checkout_fields_updated', $order_id, $stored, $current );

		return $stored;
	}

	/**
	 * The event an order was placed for, read from its ticket rows.
	 *
	 * @param string      $order_id  Order id.
	 * @param object|null $order_row Order row, when there is one.
	 * @return int
	 */
	private static function event_id_for_order( $order_id, $order_row ) {
		$keys = array_values( array_unique( array_filter( array( $order_id, (string) ( $order_row->checkout_id ?? '' ), (string) ( $order_row->id ?? '' ) ) ) ) );

		foreach ( self::find_ticket_rows( $keys ) as $row ) {
			if ( ! empty( $row->event_id ) ) {
				return absint( $row->event_id );
			}
		}

		return 0;
	}

	/**
	 * The checkout field answers an order holds now.
	 *
	 * @param string      $order_id  Order id.
	 * @param object|null $order_row Order row, when there is one.
	 * @param int         $event_id  Event id.
	 * @return array Answers keyed by field key.
	 */
	private static function stored_checkout_fields( $order_id, $order_row, $event_id ) {
		if ( preg_match( '/^wc_(\d+)/', $order_id, $match ) && function_exists( 'wc_get_order' ) ) {
			$order  = wc_get_order( (int) $match[1] );
			$values = $order ? $order->get_meta( '_eventkoi_checkout_fields' ) : array();

			return is_array( $values ) ? $values : array();
		}

		return $order_row ? Orders::get_checkout_field_values( (int) $order_row->id, $event_id ) : array();
	}

	/**
	 * An answer as one line, for comparing and for the activity.
	 *
	 * @param mixed $value Answer.
	 * @return string
	 */
	private static function answer_text( $value ) {
		return is_array( $value ) ? implode( ', ', array_map( 'strval', $value ) ) : (string) $value;
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
		$stored = self::decode_address( $current );

		foreach ( self::ADDRESS_PARTS as $part ) {
			if ( array_key_exists( $part, $address ) ) {
				$stored[ $part ] = sanitize_text_field( (string) $address[ $part ] );
			}
		}

		return $stored;
	}

	/**
	 * Stored address as parts. Text that isn't JSON is kept as the first line.
	 *
	 * @param string $current Stored address.
	 * @return array
	 */
	private static function decode_address( $current ) {
		$stored = json_decode( $current, true );

		if ( is_array( $stored ) ) {
			return $stored;
		}

		return '' !== trim( $current ) ? array( 'line1' => $current ) : array();
	}

	/**
	 * Whether the address really changed. Empty parts count as missing.
	 *
	 * @param string $current Stored address JSON.
	 * @param array  $new     Address about to be saved.
	 * @return bool
	 */
	private static function address_differs( $current, $new ) {
		$stored = array_filter( self::decode_address( $current ) );
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

		// Splitting the name again could move a two-part first name, so a name
		// that did not change is left as it is.
		if ( trim( $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() ) !== $name ) {
			$parts = explode( ' ', $name, 2 );
			$order->set_billing_first_name( $parts[0] );
			$order->set_billing_last_name( $parts[1] ?? '' );
		}

		$order->set_billing_email( $email );

		// Only the parts that were sent are written.
		$setters = array(
			'line1'       => 'set_billing_address_1',
			'line2'       => 'set_billing_address_2',
			'city'        => 'set_billing_city',
			'state'       => 'set_billing_state',
			'postal_code' => 'set_billing_postcode',
			'country'     => 'set_billing_country',
		);
		foreach ( $setters as $part => $setter ) {
			if ( is_array( $address ) && array_key_exists( $part, $address ) ) {
				$order->$setter( sanitize_text_field( (string) $address[ $part ] ) );
			}
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
