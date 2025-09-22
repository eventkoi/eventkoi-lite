<?php
/**
 * Hooks.
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
 * Class Hooks
 *
 * Handles various hooks and filters for the plugin.
 */
class Hooks {

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_filter( 'get_the_excerpt', array( __CLASS__, 'filter_event_excerpt' ), 10, 2 );

		// Order hooks.
		add_action( 'eventkoi_after_order_created', array( __CLASS__, 'reset_caches' ), 20, 2 );
		add_action( 'eventkoi_after_order_updated', array( __CLASS__, 'reset_caches' ), 20, 2 );

		// Data filtering.
		add_filter( 'eventkoi_prepare_raw_db_data', array( __CLASS__, 'prepare_raw_db_data' ), 50, 2 );

		// HMAC and OAuth state generation endpoints.
		add_action( 'wp_ajax_eventkoi_generate_hmac', array( __CLASS__, 'ajax_generate_hmac' ) );

		add_action( 'save_post_event', array( __CLASS__, 'clear_recurring_cache' ) );
		add_action( 'before_delete_post', array( __CLASS__, 'clear_recurring_cache' ) );

		add_action( 'eventkoi_after_events_deleted', array( __CLASS__, 'clear_recurring_cache_bulk' ) );
		add_action( 'eventkoi_after_events_removed', array( __CLASS__, 'clear_recurring_cache_bulk' ) );
		add_action( 'eventkoi_after_events_restored', array( __CLASS__, 'clear_recurring_cache_bulk' ) );
		add_action( 'eventkoi_after_events_duplicated', array( __CLASS__, 'clear_recurring_cache_bulk' ) );
	}

	/**
	 * Filter the excerpt for event posts to return our generated excerpt.
	 *
	 * @param string   $excerpt Default excerpt text.
	 * @param \WP_Post $post    Post object.
	 * @return string Modified excerpt text for event posts.
	 */
	public static function filter_event_excerpt( $excerpt, $post ) {
		if ( 'event' !== get_post_type( $post ) ) {
			return $excerpt;
		}

		if ( ! class_exists( '\EventKoi\Core\Event' ) ) {
			return $excerpt;
		}

		try {
			$event = new \EventKoi\Core\Event( $post );
			return $event::get_summary();
		} catch ( \Throwable $e ) {
			return $excerpt;
		}
	}

	/**
	 * Reset cached data.
	 *
	 * @return void
	 */
	public static function reset_caches() {
		delete_transient( 'ek_total_orders' );
		delete_transient( 'ek_total_earnings' );
		delete_transient( 'ek_tickets_sold' );
		delete_transient( 'ek_total_refunded' );
	}

	/**
	 * Filters and processes raw database results.
	 *
	 * @param array  $results Array of database results.
	 * @param string $context Optional context (e.g., 'orders').
	 * @return array Processed results.
	 */
	public static function prepare_raw_db_data( $results, $context = '' ) {
		foreach ( $results as $key => $item ) {
			$results[ $key ]->formatted = array();

			foreach ( $item as $field => $value ) {
				// Cast integer fields.
				if ( in_array( $field, array( 'id', 'live', 'quantity', 'ticket_id', 'created', 'expires', 'last_updated' ), true ) ) {
					$results[ $key ]->{$field} = absint( $value );
				}

				// Cast float for currency fields and format them.
				if ( in_array( $field, array( 'total', 'subtotal', 'item_price' ), true ) ) {
					$results[ $key ]->{$field} = floatval( $value );

					$locale   = str_replace( '_', '-', get_locale() );
					$locale   = apply_filters( 'eventkoi_currency_locale', $locale, $results[ $key ] );
					$currency = ! empty( $results[ $key ]->currency ) ? strtoupper( $results[ $key ]->currency ) : 'USD';

					try {
						$formatter = new \NumberFormatter( $locale, \NumberFormatter::CURRENCY );
						$formatted = $formatter->formatCurrency( $value, $currency );
					} catch ( \Throwable $e ) {
						$formatted = number_format_i18n( $value, 2 ) . ' ' . $currency;
					}

					$results[ $key ]->formatted[ $field ] = esc_html( $formatted );
				}

				// Decode JSON fields.
				if ( in_array( $field, array( 'billing_address', 'billing_data' ), true ) ) {
					$decoded_value             = is_string( $value ) ? json_decode( $value, true ) : null;
					$results[ $key ]->{$field} = is_array( $decoded_value ) ? $decoded_value : array();
				}

				// Format timestamps.
				if ( in_array( $field, array( 'created', 'expires', 'last_updated' ), true ) ) {
					$format = eventkoi_get_field_date_format( $field );

					$results[ $key ]->formatted[ $field ] = esc_html(
						gmdate( $format, $value )
					);

					$results[ $key ]->formatted[ $field . '_gmt' ] = esc_html(
						gmdate( $format, $value, new \DateTimeZone( 'UTC' ) )
					);
				}

				// Format status label.
				if ( 'status' === $field ) {
					$results[ $key ]->formatted['status'] = esc_html(
						eventkoi_get_status_title( $value )
					);
				}

				// Format billing type as payment method label.
				if ( 'billing_type' === $field ) {
					$billing_type_map = array(
						'card'       => __( 'Card', 'eventkoi' ),
						'invoice'    => __( 'Invoice', 'eventkoi' ),
						'sepa_debit' => __( 'SEPA Direct Debit', 'eventkoi' ),
						'paypal'     => __( 'PayPal', 'eventkoi' ),
						'cash'       => __( 'Cash', 'eventkoi' ),
						'link'       => __( 'Link', 'eventkoi' ),
					);

					$results[ $key ]->formatted['payment_method'] = esc_html(
						$billing_type_map[ $value ] ?? $value
					);
				}
			}
		}

		return $results;
	}

	/**
	 * AJAX endpoint to generate signed HMAC token.
	 *
	 * @return void
	 */
	public static function ajax_generate_hmac() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Unauthorized', 403 );
		}

		$instance_id = get_option( 'eventkoi_site_instance_id' );
		$secret      = get_option( 'eventkoi_shared_secret' );
		$timestamp   = time();

		if ( empty( $instance_id ) || empty( $secret ) ) {
			wp_send_json_error( 'Missing instance ID or secret.', 500 );
		}

		$payload   = $instance_id . ':' . $timestamp;
		$signature = hash_hmac( 'sha256', $payload, $secret );

		wp_send_json_success(
			array(
				'instance_id' => $instance_id,
				'timestamp'   => $timestamp,
				'signature'   => $signature,
			)
		);
	}

	/**
	 * Clear the recurring events count cache when an event is saved or deleted.
	 *
	 * @param int $post_id The post ID.
	 * @return void
	 */
	public static function clear_recurring_cache( $post_id ) {
		if ( 'event' !== get_post_type( $post_id ) ) {
			return;
		}

		wp_cache_delete( 'eventkoi_recurring_event_count', 'eventkoi_counts' );
	}

	/**
	 * Manually clear recurring event count cache.
	 *
	 * @return void
	 */
	public static function clear_recurring_cache_bulk() {
		wp_cache_delete( 'eventkoi_recurring_event_count', 'eventkoi_counts' );
	}
}
