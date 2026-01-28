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
		add_filter( 'eventkoi_rsvp_email_template', array( __CLASS__, 'filter_rsvp_email_template' ), 10, 4 );
		add_filter( 'eventkoi_rsvp_email_subject', array( __CLASS__, 'filter_rsvp_email_subject' ), 10, 4 );
		add_action( 'wp_mail_failed', array( __CLASS__, 'log_mail_failed' ) );
		add_filter( 'wp_mail_from', array( __CLASS__, 'filter_mail_from' ) );
		add_filter( 'wp_mail_from_name', array( __CLASS__, 'filter_mail_from_name' ) );

		// Order hooks.
		add_action( 'eventkoi_after_order_created', array( __CLASS__, 'reset_caches' ), 20, 2 );
		add_action( 'eventkoi_after_order_updated', array( __CLASS__, 'reset_caches' ), 20, 2 );

		// Data filtering.
		add_filter( 'eventkoi_prepare_raw_db_data', array( __CLASS__, 'prepare_raw_db_data' ), 50, 2 );

		add_action( 'save_post_event', array( __CLASS__, 'clear_recurring_cache' ) );
		add_action( 'before_delete_post', array( __CLASS__, 'clear_recurring_cache' ) );

		add_action( 'eventkoi_after_events_deleted', array( __CLASS__, 'clear_recurring_cache_bulk' ) );
		add_action( 'eventkoi_after_events_removed', array( __CLASS__, 'clear_recurring_cache_bulk' ) );
		add_action( 'eventkoi_after_events_restored', array( __CLASS__, 'clear_recurring_cache_bulk' ) );
		add_action( 'eventkoi_after_events_duplicated', array( __CLASS__, 'clear_recurring_cache_bulk' ) );

		// Clear event query caches when events change.
		add_action( 'save_post_eventkoi_event', array( __CLASS__, 'clear_event_query_cache' ), 10, 3 );
		add_action( 'deleted_post', array( __CLASS__, 'clear_event_query_cache_generic' ) );
		add_action( 'trash_post', array( __CLASS__, 'clear_event_query_cache_generic' ) );
		add_action( 'transition_post_status', array( __CLASS__, 'clear_event_query_cache_on_status_change' ), 10, 3 );
	}

	/**
	 * Filter the excerpt for event posts to return our generated excerpt.
	 *
	 * @param string   $excerpt Default excerpt text.
	 * @param \WP_Post $post    Post object.
	 * @return string Modified excerpt text for event posts.
	 */
	public static function filter_event_excerpt( $excerpt, $post ) {
		if ( 'eventkoi_event' !== get_post_type( $post ) ) {
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
		delete_transient( 'eventkoi_total_orders' );
		delete_transient( 'eventkoi_total_earnings' );
		delete_transient( 'eventkoi_tickets_sold' );
		delete_transient( 'eventkoi_total_refunded' );
	}

	/**
	 * Apply saved RSVP email template.
	 *
	 * @param string $template Default template.
	 * @return string
	 */
	public static function filter_rsvp_email_template( $template ) {
		$settings = Settings::get();
		$saved    = isset( $settings['rsvp_email_template'] ) ? (string) $settings['rsvp_email_template'] : '';

		return $saved ? $saved : $template;
	}

	/**
	 * Apply saved RSVP email subject.
	 *
	 * @param string $subject Default subject.
	 * @return string
	 */
	public static function filter_rsvp_email_subject( $subject ) {
		$settings = Settings::get();
		$saved    = isset( $settings['rsvp_email_subject'] ) ? (string) $settings['rsvp_email_subject'] : '';

		return $saved ? $saved : $subject;
	}

	/**
	 * Log wp_mail failures when WP_DEBUG is enabled.
	 *
	 * @param \WP_Error $wp_error Mail error.
	 * @return void
	 */
	public static function log_mail_failed( $wp_error ) {
		if ( ! defined( 'WP_DEBUG' ) || ! WP_DEBUG ) {
			return;
		}

		if ( ! is_wp_error( $wp_error ) ) {
			return;
		}

		$message = $wp_error->get_error_message();
		$data    = $wp_error->get_error_data();

		error_log( sprintf( '[EventKoi] wp_mail_failed: %s', $message ) );

		if ( empty( $data ) ) {
			return;
		}

		if ( is_scalar( $data ) ) {
			error_log( sprintf( '[EventKoi] wp_mail_failed data: %s', (string) $data ) );
			return;
		}

		if ( is_array( $data ) ) {
			error_log( sprintf( '[EventKoi] wp_mail_failed data: %s', wp_json_encode( $data ) ) );
		}
	}

	/**
	 * Ensure a valid From address for wp_mail.
	 *
	 * @param string $from From email.
	 * @return string
	 */
	public static function filter_mail_from( $from ) {
		if ( is_email( $from ) ) {
			return $from;
		}

		$admin_email = get_option( 'admin_email' );
		if ( is_email( $admin_email ) ) {
			return $admin_email;
		}

		return $from;
	}

	/**
	 * Ensure a From name for wp_mail.
	 *
	 * @param string $from_name From name.
	 * @return string
	 */
	public static function filter_mail_from_name( $from_name ) {
		$site_name = get_bloginfo( 'name' );
		return $site_name ? $site_name : $from_name;
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
						'card'       => __( 'Card', 'eventkoi-lite' ),
						'invoice'    => __( 'Invoice', 'eventkoi-lite' ),
						'sepa_debit' => __( 'SEPA Direct Debit', 'eventkoi-lite' ),
						'paypal'     => __( 'PayPal', 'eventkoi-lite' ),
						'cash'       => __( 'Cash', 'eventkoi-lite' ),
						'link'       => __( 'Link', 'eventkoi-lite' ),
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
	 * Clear the recurring events count cache when an event is saved or deleted.
	 *
	 * @param int $post_id The post ID.
	 * @return void
	 */
	public static function clear_recurring_cache( $post_id ) {
		if ( 'eventkoi_event' !== get_post_type( $post_id ) ) {
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

	/**
	 * Clear all cached EventKoi event queries.
	 *
	 * @return void
	 */
	public static function clear_event_query_cache() {
		global $wpdb;

		// Remove transients that match our prefix.
		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
				$wpdb->esc_like( '_transient_eventkoi_events_' ) . '%'
			)
		);

		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
				$wpdb->esc_like( '_transient_timeout_eventkoi_events_' ) . '%'
			)
		);
	}

	/**
	 * Clear event query cache on generic post deletions (if post type matches).
	 *
	 * @param int $post_id The post ID.
	 * @return void
	 */
	public static function clear_event_query_cache_generic( $post_id ) {
		if ( 'eventkoi_event' !== get_post_type( $post_id ) ) {
			return;
		}

		self::clear_event_query_cache();
	}

	/**
	 * Clear cache when post status changes.
	 *
	 * @param string   $new_status The new post status.
	 * @param string   $old_status The old post status.
	 * @param \WP_Post $post      The post object.
	 * @return void
	 */
	public static function clear_event_query_cache_on_status_change( $new_status, $old_status, $post ) {
		if ( 'eventkoi_event' !== $post->post_type ) {
			return;
		}

		self::clear_event_query_cache();
	}
}
