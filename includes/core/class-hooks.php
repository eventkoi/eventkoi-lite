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
	 * Cron hook used to clean abandoned empty event auto-drafts.
	 *
	 * @var string
	 */
	public const EMPTY_AUTO_DRAFT_CLEANUP_HOOK = 'eventkoi_cleanup_empty_auto_draft_events';

	/**
	 * Minimum age before an empty auto-draft can be cleaned.
	 *
	 * @var int
	 */
	public const EMPTY_AUTO_DRAFT_MIN_AGE = 86400;

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_filter( 'get_the_excerpt', array( __CLASS__, 'filter_event_excerpt' ), 10, 2 );
		add_filter( 'eventkoi_rsvp_email_template', array( __CLASS__, 'filter_rsvp_email_template' ), 10, 4 );
		add_filter( 'eventkoi_rsvp_email_subject', array( __CLASS__, 'filter_rsvp_email_subject' ), 10, 4 );
		add_filter( 'eventkoi_ticket_email_template', array( __CLASS__, 'filter_ticket_email_template' ), 10, 4 );
		add_filter( 'eventkoi_ticket_email_subject', array( __CLASS__, 'filter_ticket_email_subject' ), 10, 4 );
		add_action( 'wp_mail_failed', array( __CLASS__, 'log_mail_failed' ) );
		add_filter( 'wp_mail_from', array( __CLASS__, 'filter_mail_from' ) );
		add_filter( 'wp_mail_from_name', array( __CLASS__, 'filter_mail_from_name' ) );

		// Order hooks.
		add_action( 'eventkoi_after_order_created', array( __CLASS__, 'reset_caches' ), 20, 2 );
		add_action( 'eventkoi_after_order_updated', array( __CLASS__, 'reset_caches' ), 20, 2 );
		add_action( 'eventkoi_after_order_created', array( __CLASS__, 'bump_events_cache_version' ), 30, 2 );
		add_action( 'eventkoi_after_order_updated', array( __CLASS__, 'bump_events_cache_version' ), 30, 2 );

		// Data filtering.
		add_filter( 'eventkoi_prepare_raw_db_data', array( __CLASS__, 'prepare_raw_db_data' ), 50, 2 );

		add_action( 'wp_ajax_rest-nonce', array( __CLASS__, 'ajax_rest_nonce' ) );
		add_action( 'wp_ajax_nopriv_rest-nonce', array( __CLASS__, 'ajax_rest_nonce' ) );

		add_action( 'save_post_event', array( __CLASS__, 'clear_recurring_cache' ) );
		add_action( 'before_delete_post', array( __CLASS__, 'clear_recurring_cache' ) );

		// Keep the `_eventkoi_has_location` flag in sync whenever an event's
		// locations change, so page builders can use it in conditional logic to
		// show/hide rows based on whether a venue exists.
		add_action( 'added_post_meta', array( __CLASS__, 'sync_event_has_location' ), 10, 4 );
		add_action( 'updated_post_meta', array( __CLASS__, 'sync_event_has_location' ), 10, 4 );

		add_action( 'eventkoi_after_events_deleted', array( __CLASS__, 'clear_recurring_cache_bulk' ) );
		add_action( 'eventkoi_after_events_removed', array( __CLASS__, 'clear_recurring_cache_bulk' ) );
		add_action( 'eventkoi_after_events_restored', array( __CLASS__, 'clear_recurring_cache_bulk' ) );
		add_action( 'eventkoi_after_events_duplicated', array( __CLASS__, 'clear_recurring_cache_bulk' ) );

		// Clear event query caches when events change.
		add_action( 'save_post_eventkoi_event', array( __CLASS__, 'clear_event_query_cache' ), 10, 3 );
		add_action( 'deleted_post', array( __CLASS__, 'clear_event_query_cache_generic' ) );
		add_action( 'trash_post', array( __CLASS__, 'clear_event_query_cache_generic' ) );
		add_action( 'transition_post_status', array( __CLASS__, 'clear_event_query_cache_on_status_change' ), 10, 3 );
		add_action( 'eventkoi_after_update_event_meta', array( __CLASS__, 'clear_event_query_cache' ), 20, 3 );
		add_action( 'eventkoi_after_update_event_meta', array( __CLASS__, 'bump_events_cache_version' ), 20, 3 );
		add_action( self::EMPTY_AUTO_DRAFT_CLEANUP_HOOK, array( __CLASS__, 'cleanup_empty_auto_draft_events' ) );

		self::maybe_schedule_empty_auto_draft_cleanup();
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
	 * Schedule empty auto-draft cleanup if it is not already queued.
	 *
	 * @return void
	 */
	public static function maybe_schedule_empty_auto_draft_cleanup() {
		if ( wp_next_scheduled( self::EMPTY_AUTO_DRAFT_CLEANUP_HOOK ) ) {
			return;
		}

		wp_schedule_event( time() + HOUR_IN_SECONDS, 'hourly', self::EMPTY_AUTO_DRAFT_CLEANUP_HOOK );
	}

	/**
	 * Clear scheduled EventKoi cron events.
	 *
	 * @return void
	 */
	public static function clear_scheduled_events() {
		wp_clear_scheduled_hook( self::EMPTY_AUTO_DRAFT_CLEANUP_HOOK );
	}

	/**
	 * Permanently delete abandoned empty event auto-drafts.
	 *
	 * This never targets normal drafts. Auto-drafts are only deleted when they
	 * still look like untouched WordPress placeholders.
	 *
	 * @return int Number of auto-drafts deleted.
	 */
	public static function cleanup_empty_auto_draft_events() {
		$cutoff_gmt = gmdate( 'Y-m-d H:i:s', time() - self::EMPTY_AUTO_DRAFT_MIN_AGE );
		$event_ids  = get_posts(
			array(
				'post_type'      => 'eventkoi_event',
				'post_status'    => 'auto-draft',
				'posts_per_page' => 50,
				'fields'         => 'ids',
				'orderby'        => 'modified',
				'order'          => 'ASC',
				'no_found_rows'  => true,
				'date_query'     => array(
					array(
						'column'    => 'post_modified_gmt',
						'before'    => $cutoff_gmt,
						'inclusive' => true,
					),
				),
			)
		);

		$deleted_ids = array();

		foreach ( $event_ids as $event_id ) {
			if ( ! self::is_deletable_empty_auto_draft_event( $event_id ) ) {
				continue;
			}

			$deleted = wp_delete_post( (int) $event_id, true );
			if ( $deleted ) {
				$deleted_ids[] = (int) $event_id;
			}
		}

		if ( ! empty( $deleted_ids ) ) {
			self::clear_event_query_cache();
			self::bump_events_cache_version();
		}

		/**
		 * Fires after EventKoi deletes abandoned empty event auto-drafts.
		 *
		 * @param array<int> $deleted_ids Deleted event post IDs.
		 */
		do_action( 'eventkoi_empty_auto_draft_events_cleaned', $deleted_ids );

		return count( $deleted_ids );
	}

	/**
	 * Check whether an event auto-draft is safe to delete.
	 *
	 * @param int|\WP_Post $post Post ID or object.
	 * @return bool
	 */
	public static function is_deletable_empty_auto_draft_event( $post ) {
		$post = get_post( $post );

		if ( ! ( $post instanceof \WP_Post ) ) {
			return false;
		}

		if ( 'eventkoi_event' !== $post->post_type || 'auto-draft' !== $post->post_status ) {
			return false;
		}

		if ( self::is_recent_event_auto_draft( $post ) || self::has_recent_edit_lock( (int) $post->ID ) ) {
			return false;
		}

		$title = trim( wp_strip_all_tags( (string) $post->post_title ) );
		$empty_title_placeholders = array(
			'auto draft',
			strtolower( (string) __( 'Auto Draft' ) ),
		);
		if ( '' !== $title && ! in_array( strtolower( $title ), $empty_title_placeholders, true ) ) {
			return false;
		}

		if ( '' !== trim( (string) $post->post_content ) || '' !== trim( (string) $post->post_excerpt ) ) {
			return false;
		}

		return ! self::has_started_event_meta( (int) $post->ID );
	}

	/**
	 * Check whether an auto-draft was modified too recently for cleanup.
	 *
	 * @param \WP_Post $post Post object.
	 * @return bool
	 */
	private static function is_recent_event_auto_draft( \WP_Post $post ) {
		$modified = '0000-00-00 00:00:00' !== $post->post_modified_gmt ? strtotime( $post->post_modified_gmt . ' UTC' ) : 0;

		return $modified && $modified > ( time() - self::EMPTY_AUTO_DRAFT_MIN_AGE );
	}

	/**
	 * Check whether a post still has a recent edit lock.
	 *
	 * @param int $post_id Post ID.
	 * @return bool
	 */
	private static function has_recent_edit_lock( $post_id ) {
		$lock = (string) get_post_meta( $post_id, '_edit_lock', true );
		if ( '' === $lock ) {
			return false;
		}

		$timestamp = absint( strtok( $lock, ':' ) );
		if ( $timestamp <= 0 ) {
			return true;
		}

		return $timestamp > ( time() - self::EMPTY_AUTO_DRAFT_MIN_AGE );
	}

	/**
	 * Check whether EventKoi or another integration has started saving data.
	 *
	 * @param int $post_id Post ID.
	 * @return bool
	 */
	private static function has_started_event_meta( $post_id ) {
		$meta = get_post_meta( $post_id );
		if ( empty( $meta ) || ! is_array( $meta ) ) {
			return false;
		}

		$ignored_keys = array(
			'_edit_last' => true,
			'_edit_lock' => true,
		);

		foreach ( $meta as $key => $values ) {
			if ( isset( $ignored_keys[ $key ] ) ) {
				continue;
			}

			foreach ( (array) $values as $value ) {
				if ( self::is_meaningful_auto_draft_meta_value( maybe_unserialize( $value ) ) ) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Check whether an auto-draft meta value should preserve the post.
	 *
	 * @param mixed $value Meta value.
	 * @return bool
	 */
	private static function is_meaningful_auto_draft_meta_value( $value ) {
		if ( is_array( $value ) ) {
			foreach ( $value as $item ) {
				if ( self::is_meaningful_auto_draft_meta_value( $item ) ) {
					return true;
				}
			}

			return false;
		}

		if ( is_object( $value ) ) {
			return ! empty( get_object_vars( $value ) );
		}

		if ( is_bool( $value ) ) {
			return $value;
		}

		if ( null === $value ) {
			return false;
		}

		return '' !== trim( (string) $value );
	}

	/**
	 * RSVP email template.
	 *
	 * Lite does not support editing email content, so always return the
	 * baked-in default. Any saved template would be a leftover from a
	 * previous Pro install and may contain Pro-only tags.
	 *
	 * @param string $template Default template.
	 * @return string
	 */
	public static function filter_rsvp_email_template( $template ) {
		return $template;
	}

	/**
	 * RSVP email subject.
	 *
	 * Lite does not support editing the subject line; always use the default.
	 *
	 * @param string $subject Default subject.
	 * @return string
	 */
	public static function filter_rsvp_email_subject( $subject ) {
		return $subject;
	}

	/**
	 * Ticket email template.
	 *
	 * Lite does not support editing email content, so always return the
	 * baked-in default. Any saved template would be a leftover from a
	 * previous Pro install and may contain Pro-only tags.
	 *
	 * @param string $template Default template.
	 * @return string
	 */
	public static function filter_ticket_email_template( $template ) {
		return $template;
	}

	/**
	 * Ticket email subject.
	 *
	 * Lite does not support editing the subject line; always use the default.
	 *
	 * @param string $subject Default subject.
	 * @return string
	 */
	public static function filter_ticket_email_subject( $subject ) {
		return $subject;
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
	 * Sync the `_eventkoi_has_location` flag whenever event locations change.
	 *
	 * Fired on added/updated post meta for the `locations` key. Stores '1' when
	 * the event has a physical venue with details and removes the flag otherwise,
	 * so builder conditional logic can show/hide rows on "is not empty".
	 *
	 * @param int    $meta_id    Meta row ID (unused).
	 * @param int    $object_id  Event post ID.
	 * @param string $meta_key   Meta key being written.
	 * @param mixed  $meta_value New meta value.
	 * @return void
	 */
	public static function sync_event_has_location( $meta_id, $object_id, $meta_key, $meta_value ) {
		if ( 'locations' !== $meta_key ) {
			return;
		}

		if ( 'eventkoi_event' !== get_post_type( $object_id ) ) {
			return;
		}

		if ( Event::locations_have_physical( $meta_value ) ) {
			update_post_meta( $object_id, '_eventkoi_has_location', '1' );
		} else {
			delete_post_meta( $object_id, '_eventkoi_has_location' );
		}
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

	/**
	 * Bump EventKoi events cache version.
	 *
	 * @return void
	 */
	public static function bump_events_cache_version() {
		$version = absint( get_option( 'eventkoi_events_cache_version', 1 ) );
		update_option( 'eventkoi_events_cache_version', $version + 1, false );
	}

	/**
	 * Public AJAX endpoint to provide a REST API nonce.
	 *
	 * @return void
	 */
	public static function ajax_rest_nonce() {
		wp_send_json_success(
			array(
				'nonce' => wp_create_nonce( 'wp_rest' ),
			)
		);
	}
}
