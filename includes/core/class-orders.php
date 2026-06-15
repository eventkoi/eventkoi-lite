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
	 * Get custom checkout field definitions, registered via the
	 * `eventkoi_checkout_fields` filter and normalized to a safe shape.
	 *
	 * @param int $event_id Optional event ID for per-event fields.
	 * @return array[] List of { key, label, type, required, options, placeholder }.
	 */
	public static function get_checkout_fields( $event_id = 0 ) {
		$allowed_types = array( 'text', 'email', 'tel', 'number', 'textarea', 'select', 'checkbox' );
		$reserved      = array( 'first_name', 'last_name', 'email', 'checkout_note' );
		$raw           = apply_filters( 'eventkoi_checkout_fields', array(), absint( $event_id ) );
		$fields        = array();

		foreach ( (array) $raw as $field ) {
			$key = sanitize_key( $field['key'] ?? '' );
			if ( ! $key || in_array( $key, $reserved, true ) ) {
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
	 * Sanitize submitted checkout field values against the registered definitions.
	 *
	 * @param array $values   Raw submitted values keyed by field key.
	 * @param int   $event_id Optional event ID for per-event fields.
	 * @return array|\WP_Error Sanitized values, or an error when a required field is empty.
	 */
	public static function sanitize_checkout_field_values( $values, $event_id = 0 ) {
		$values    = is_array( $values ) ? $values : array();
		$sanitized = array();

		foreach ( self::get_checkout_fields( $event_id ) as $field ) {
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
					'eventkoi_checkout_missing_fields',
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
	 * Create order.
	 *
	 * @param array  $args An array of args to create an order.
	 * @param string $gateway Payment gateway.
	 */
	public static function create_order( $args = array(), $gateway = 'woocommerce' ) {
		$order_id = null;

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

		$orders = DB::table( 'eventkoi_orders' )->where( 'live', eventkoi_live_mode_enabled() )->getAll();

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

		DB::table( 'eventkoi_order_notes' )->insert(
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

		// Update last_updated column in eventkoi_orders (GMT timestamp).
		DB::table( 'eventkoi_orders' )
		->where( 'id', $order_id )
		->update(
			array( 'last_updated' => time() )
		);
	}
}
