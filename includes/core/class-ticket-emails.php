<?php
/**
 * Ticket confirmation emails.
 *
 * @package EventKoi
 */

namespace EventKoi\Core;

use WP_Error;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Ticket Emails.
 */
class Ticket_Emails {

	/**
	 * Send refund confirmation email for an order.
	 *
	 * @param string $order_id      Order ID.
	 * @param float  $refund_amount Refund amount in major currency units.
	 * @param array  $refund_items  Refunded items with ticket_id, quantity, and ticket_name.
	 * @return array|WP_Error
	 */
	public static function send_refund_for_order( $order_id, $refund_amount = 0, $refund_items = array() ) {
		$order_id = sanitize_text_field( (string) $order_id );
		if ( '' === $order_id ) {
			return new WP_Error( 'invalid_order_id', __( 'Invalid order ID.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$settings        = Settings::get();
		$enabled_setting = $settings['refund_email_enabled'] ?? null;
		$enabled         = null === $enabled_setting || '' === $enabled_setting
			? true
			: filter_var( $enabled_setting, FILTER_VALIDATE_BOOLEAN );

		if ( ! $enabled ) {
			return new WP_Error( 'refund_email_disabled', __( 'Refund confirmation email is disabled.', 'eventkoi-lite' ), array( 'status' => 200 ) );
		}

		$order = self::get_order_by_id( $order_id );
		if ( is_wp_error( $order ) ) {
			return $order;
		}

		$sent = self::send_refund_email( $order, floatval( $refund_amount ), (array) $refund_items );
		if ( ! $sent ) {
			return new WP_Error( 'refund_email_not_sent', __( 'Refund confirmation email was not sent.', 'eventkoi-lite' ), array( 'status' => 500 ) );
		}

		return array(
			'success' => true,
			'sent'    => true,
		);
	}

	/**
	 * Resend ticket confirmation email for an order.
	 *
	 * @param string $order_id Order ID.
	 * @return array|WP_Error
	 */
	public static function resend_for_order( $order_id ) {
		$order_id = sanitize_text_field( (string) $order_id );
		if ( '' === $order_id ) {
			return new WP_Error( 'invalid_order_id', __( 'Invalid order ID.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		// WC orders: build order payload from local DB + WC meta.
		if ( preg_match( '/^wc_(\d+)/', $order_id, $m ) ) {
			$order = self::build_order_from_wc( (int) $m[1] );
		} else {
			$order = self::get_order_by_id( $order_id );
		}

		if ( is_wp_error( $order ) ) {
			return $order;
		}

		$sent = self::send_for_order( $order, false );
		if ( ! $sent ) {
			return new WP_Error( 'ticket_email_not_sent', __( 'Ticket confirmation email was not sent.', 'eventkoi-lite' ), array( 'status' => 500 ) );
		}

		return array(
			'success' => true,
			'sent'    => true,
		);
	}

	/**
	 * Build an order payload from a WooCommerce order for email sending.
	 *
	 * @param int $wc_order_id WC order ID.
	 * @return array|WP_Error
	 */
	private static function build_order_from_wc( $wc_order_id ) {
		if ( ! function_exists( 'wc_get_order' ) ) {
			return new WP_Error( 'wc_not_available', __( 'WooCommerce is not available.', 'eventkoi-lite' ), array( 'status' => 500 ) );
		}

		$wc_order = wc_get_order( $wc_order_id );
		if ( ! $wc_order ) {
			return new WP_Error( 'order_not_found', __( 'WooCommerce order not found.', 'eventkoi-lite' ), array( 'status' => 404 ) );
		}

		$event_id            = absint( $wc_order->get_meta( '_eventkoi_event_id' ) );
		$event_title         = (string) $wc_order->get_meta( '_eventkoi_event_title' );
		$instance_ts         = absint( $wc_order->get_meta( '_eventkoi_instance_ts' ) );
		$master_checkin_code = (string) $wc_order->get_meta( '_eventkoi_master_checkin_code' );
		$ticket_items_raw    = $wc_order->get_meta( '_eventkoi_ticket_items' );
		$ticket_items        = is_array( $ticket_items_raw ) ? $ticket_items_raw : array();

		$items = array();
		foreach ( $ticket_items as $item ) {
			$codes   = isset( $item['codes'] ) && is_array( $item['codes'] ) ? $item['codes'] : array();
			$items[] = array(
				'ticket_id'    => absint( $item['ticket_id'] ?? 0 ),
				'name'         => (string) ( $item['name'] ?? '' ),
				'quantity'     => absint( $item['quantity'] ?? 1 ),
				'price'        => absint( $item['unit_amount'] ?? 0 ),
				'ticket_codes' => $codes,
			);
		}

		return array(
			'id'                  => 'wc_' . $wc_order_id,
			'order_id'            => 'wc_' . $wc_order_id,
			'status'              => 'completed',
			'payment_status'      => 'completed',
			'customer_email'      => $wc_order->get_billing_email(),
			'customer_name'       => trim( $wc_order->get_billing_first_name() . ' ' . $wc_order->get_billing_last_name() ),
			'event_id'            => $event_id,
			'event_instance_ts'   => $instance_ts,
			'master_checkin_code' => $master_checkin_code,
			'currency'            => strtolower( $wc_order->get_currency() ),
			'items'               => $items,
			'metadata'            => array(
				'event_id'    => (string) $event_id,
				'event_title' => $event_title,
				'instance_ts' => (string) $instance_ts,
			),
		);
	}

	/**
	 * Send ticket confirmation email by checkout session.
	 *
	 * @param string $checkout_session_id Checkout session ID.
	 * @param int    $event_id Event ID.
	 * @param int    $instance_ts Instance timestamp.
	 * @return array|WP_Error
	 */
	public static function send_for_checkout_session( $checkout_session_id, $event_id = 0, $instance_ts = 0 ) {
		$checkout_session_id = sanitize_text_field( (string) $checkout_session_id );
		$event_id            = absint( $event_id );
		$instance_ts         = absint( $instance_ts );

		if ( '' === $checkout_session_id ) {
			return new WP_Error( 'missing_checkout_session', __( 'Missing checkout session ID.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$sent_cache_key = 'eventkoi_ticket_email_sent_' . md5( $checkout_session_id ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_md5
		if ( get_transient( $sent_cache_key ) ) {
			return array(
				'success' => true,
				'sent'    => false,
			);
		}

		$order_id = self::find_order_id_by_checkout_session( $checkout_session_id, $event_id, $instance_ts );
		if ( is_wp_error( $order_id ) ) {
			return $order_id;
		}

		$order = self::get_order_by_id( $order_id );
		if ( is_wp_error( $order ) ) {
			return $order;
		}

		$sent = self::send_for_order( $order, true );
		if ( $sent ) {
			set_transient( $sent_cache_key, '1', DAY_IN_SECONDS );
		}

		return array(
			'success' => true,
			'sent'    => (bool) $sent,
		);
	}

	/**
	 * Public entry point for sending ticket confirmation from a completed order.
	 *
	 * @param array $order Order payload.
	 * @return bool
	 */
	public static function send_for_order_public( $order ) {
		return self::send_for_order( $order, false );
	}

	/**
	 * Send ticket confirmation email for order payload.
	 *
	 * @param array $order Order payload from edge.
	 * @param bool  $skip_if_note_exists Skip if confirmation note already exists.
	 * @return bool
	 */
	private static function send_for_order( $order, $skip_if_note_exists = false ) {
		if ( ! is_array( $order ) ) {
			return false;
		}

		$status = strtolower( sanitize_key( (string) ( $order['status'] ?? $order['payment_status'] ?? '' ) ) );
		if ( ! in_array( $status, array( 'complete', 'completed', 'succeeded' ), true ) ) {
			return false;
		}

		$settings        = Settings::get();
		$enabled_setting = $settings['ticket_email_enabled'] ?? null;
		$enabled         = null === $enabled_setting || '' === $enabled_setting
			? true
			: filter_var( $enabled_setting, FILTER_VALIDATE_BOOLEAN );

		if ( ! $enabled ) {
			return false;
		}

		if ( $skip_if_note_exists && self::has_confirmation_note( $order ) ) {
			return false;
		}

		$recipient_email = sanitize_email( (string) ( $order['customer_email'] ?? $order['billing_email'] ?? '' ) );
		if ( ! is_email( $recipient_email ) ) {
			return false;
		}

		$order_id      = sanitize_text_field( (string) ( $order['id'] ?? $order['order_id'] ?? '' ) );
		$metadata      = ( isset( $order['metadata'] ) && is_array( $order['metadata'] ) ) ? $order['metadata'] : array();
		$items         = isset( $order['items'] ) && is_array( $order['items'] ) ? $order['items'] : array();
		$event_id      = absint( $order['event_id'] ?? 0 );
		$instance_ts   = absint( $order['event_instance_ts'] ?? 0 );
		$event_name    = sanitize_text_field( (string) ( $metadata['event_instance_title'] ?? $metadata['event_title'] ?? '' ) );
		$customer_name = sanitize_text_field( (string) ( $order['customer_name'] ?? '' ) );

		if ( ! $event_id && ! empty( $items ) && is_array( $items[0] ?? null ) ) {
			$event_id = absint( $items[0]['event_id'] ?? 0 );
		}

		if ( ! $instance_ts ) {
			$instance_ts = absint( $metadata['event_instance_ts'] ?? ( $metadata['instance_ts'] ?? 0 ) );
		}

		$event_url = self::get_event_url( $event_id, $instance_ts );
		if ( '' === $event_name ) {
			$event_name = self::get_event_title( $event_id, $instance_ts );
		}

		list( $event_datetime, $event_timezone ) = self::get_event_datetime_parts( $event_id, $instance_ts );
		$event_location                          = self::get_primary_physical_location( $event_id );

		// Snapshot the event datetime at first send so resends show the original date.
		$snapshot_key = 'eventkoi_email_snapshot_' . md5( $order_id );
		$snapshot     = get_option( $snapshot_key );
		if ( is_array( $snapshot ) ) {
			$event_datetime = $snapshot['event_datetime'] ?? $event_datetime;
			$event_timezone = $snapshot['event_timezone'] ?? $event_timezone;
			$event_location = $snapshot['event_location'] ?? $event_location;
		} else {
			update_option(
				$snapshot_key,
				array(
					'event_datetime' => $event_datetime,
					'event_timezone' => $event_timezone,
					'event_location' => $event_location,
				),
				false
			);
		}

		$checkin_code = sanitize_text_field( (string) ( $order['master_checkin_code'] ?? '' ) );
		$ticket_name_contexts                    = array_filter(
			array_map(
				'trim',
				array(
					(string) $event_name,
					(string) ( $metadata['event_instance_title'] ?? '' ),
					(string) ( $metadata['event_title'] ?? '' ),
					(string) ( $order['event_instance_title'] ?? '' ),
					(string) ( $order['event_title'] ?? '' ),
				)
			)
		);
		$tickets_line                            = self::render_ticket_lines_for_email(
			$items,
			(string) ( $order['currency'] ?? '' ),
			$ticket_name_contexts
		);
		$first_name                              = $customer_name ? trim( strtok( $customer_name, ' ' ) ) : '';
		$formatted_status                        = eventkoi_get_status_title( $status );

		$checkin_line = '' !== $checkin_code
			? sprintf(
				'<p>%1$s<br />%2$s</p>',
				esc_html__( 'Check-in code:', 'eventkoi-lite' ),
				esc_html( $checkin_code )
			)
			: '';

		$qr_code = '';
		if ( '' !== $checkin_code ) {
			$checkin_url = add_query_arg(
				array( 'eventkoi_qr' => $checkin_code ),
				home_url( '/' )
			);
			$qr_url      = add_query_arg(
				array(
					'data' => $checkin_url,
					'size' => '96x96',
				),
				'https://api.qrserver.com/v1/create-qr-code/'
			);
			$qr_url      = apply_filters( 'eventkoi_ticket_qr_url', $qr_url, $checkin_url, $checkin_code, $event_id, $instance_ts );
			$qr_code     = sprintf(
				'<img src="%s" alt="%s" width="96" height="96" />',
				esc_url( $qr_url ),
				esc_attr__( 'QR code', 'eventkoi-lite' )
			);
		}

		$ticket_codes_line = self::render_ticket_codes_for_email( $items, $ticket_name_contexts );

		$tags = array(
			'[attendee_name]'  => $first_name ? $first_name : __( 'there', 'eventkoi-lite' ),
			'[attendee_email]' => $recipient_email,
			'[customer_name]'  => $customer_name,
			'[order_id]'       => $order_id,
			'[order_status]'   => $formatted_status,
			'[event_title]'    => $event_name,
			'[event_name]'     => $event_name,
			'[event_datetime]' => $event_datetime,
			'[event_timezone]' => $event_timezone,
			'[event_location]' => $event_location,
			'[event_url]'      => $event_url,
			'[checkin_code]'   => $checkin_code,
			'[checkin_line]'   => $checkin_line,
			'[qr_code]'        => $qr_code,
			'[ticket_codes]'   => $ticket_codes_line,
			'[ticket_lines]'   => $tickets_line,
			'[site_name]'      => get_bloginfo( 'name' ),
		);

		$tags = apply_filters( 'eventkoi_ticket_email_tags', $tags, $order, $items );

		$subject_default = __( '[event_name]: Ticket details', 'eventkoi-lite' );
		$subject         = apply_filters( 'eventkoi_ticket_email_subject', $subject_default, $tags, $order, $items );
		$subject         = self::replace_email_tags( (string) $subject, $tags );

		$default_body = implode(
			"\n",
			array(
				'<p>' . esc_html__( 'Hi [attendee_name],', 'eventkoi-lite' ) . '</p>',
				'<p>' . esc_html__( 'Thanks for your ticket purchase for [event_name].', 'eventkoi-lite' ) . '</p>',
				'<p>' . esc_html__( 'Order ID:', 'eventkoi-lite' ) . ' <br />[order_id]</p>',
				'[checkin_line]',
				'' !== $qr_code ? '<p>[qr_code]</p>' : '',
				'<p><strong>' . esc_html__( 'Tickets', 'eventkoi-lite' ) . '</strong><br />[ticket_lines]</p>',
				'' !== $ticket_codes_line ? '<p><strong>' . esc_html__( 'Ticket Codes', 'eventkoi-lite' ) . '</strong><br />[ticket_codes]</p>' : '',
				$event_datetime ? '<p>' . esc_html__( 'Schedule ([event_timezone]):', 'eventkoi-lite' ) . '<br />[event_datetime]</p>' : '',
				$event_location ? '<p>' . esc_html__( 'Location:', 'eventkoi-lite' ) . '<br />[event_location]</p>' : '',
				$event_url ? '<p>' . esc_html__( 'Event page:', 'eventkoi-lite' ) . '<br />[event_url]</p>' : '',
				'<p>&mdash;<br />[site_name]</p>',
			)
		);

		$body = apply_filters( 'eventkoi_ticket_email_template', $default_body, $tags, $order, $items );
		$body = self::replace_email_tags( (string) $body, $tags );

		$body     = preg_replace( "/\n{3,}/", "\n\n", trim( (string) $body ) );
		$has_html = (bool) preg_match( '/<[^>]+>/', (string) $body );
		$body     = $has_html
			? wp_kses( wpautop( (string) $body ), Settings::get_email_template_allowed_tags() )
			: wpautop( esc_html( (string) $body ) );

		$headers         = array( 'Content-Type: text/html; charset=UTF-8' );
		$sender_email    = sanitize_email( (string) ( $settings['ticket_email_sender_email'] ?? '' ) );
		$sender_name     = sanitize_text_field( (string) ( $settings['ticket_email_sender_name'] ?? '' ) );
		$from_email_hook = null;
		$from_name_hook  = null;

		if ( $sender_email ) {
			$from = $sender_email;
			if ( $sender_name ) {
				$from = sprintf( '%s <%s>', $sender_name, $sender_email );
			}
			$headers[]       = 'From: ' . $from;
			$from_email_hook = static function () use ( $sender_email ) {
				return $sender_email;
			};
			add_filter( 'wp_mail_from', $from_email_hook );
		}

		if ( $sender_name ) {
			$from_name_hook = static function () use ( $sender_name ) {
				return $sender_name;
			};
			add_filter( 'wp_mail_from_name', $from_name_hook );
		}

		$sent = wp_mail( $recipient_email, $subject, $body, $headers );

		if ( $from_email_hook ) {
			remove_filter( 'wp_mail_from', $from_email_hook );
		}
		if ( $from_name_hook ) {
			remove_filter( 'wp_mail_from_name', $from_name_hook );
		}

		if ( $sent && '' !== $order_id ) {
			self::add_confirmation_note( $order_id );
			Ticket_Order_Sync::sync_order_to_local( $order );
		}

		return (bool) $sent;
	}

	/**
	 * Send refund confirmation email for an order.
	 *
	 * @param array $order         Order payload from edge.
	 * @param float $refund_amount Refund amount in major currency units.
	 * @param array $refund_items  Refunded items with ticket_id, quantity, and ticket_name.
	 * @return bool
	 */
	private static function send_refund_email( $order, $refund_amount, $refund_items = array() ) {
		if ( ! is_array( $order ) ) {
			return false;
		}

		$recipient_email = sanitize_email( (string) ( $order['customer_email'] ?? $order['billing_email'] ?? '' ) );
		if ( ! is_email( $recipient_email ) ) {
			return false;
		}

		$settings      = Settings::get();
		$order_id      = sanitize_text_field( (string) ( $order['id'] ?? $order['order_id'] ?? '' ) );
		$metadata      = ( isset( $order['metadata'] ) && is_array( $order['metadata'] ) ) ? $order['metadata'] : array();
		$items         = isset( $order['items'] ) && is_array( $order['items'] ) ? $order['items'] : array();
		$event_id      = absint( $order['event_id'] ?? 0 );
		$instance_ts   = absint( $order['event_instance_ts'] ?? 0 );
		$event_name    = sanitize_text_field( (string) ( $metadata['event_instance_title'] ?? $metadata['event_title'] ?? '' ) );
		$customer_name = sanitize_text_field( (string) ( $order['customer_name'] ?? '' ) );
		$currency      = strtoupper( sanitize_text_field( (string) ( $order['currency'] ?? 'USD' ) ) );

		if ( ! $event_id && ! empty( $items ) && is_array( $items[0] ?? null ) ) {
			$event_id = absint( $items[0]['event_id'] ?? 0 );
		}

		if ( ! $instance_ts ) {
			$instance_ts = absint( $metadata['event_instance_ts'] ?? ( $metadata['instance_ts'] ?? 0 ) );
		}

		$event_url = self::get_event_url( $event_id, $instance_ts );
		if ( '' === $event_name ) {
			$event_name = self::get_event_title( $event_id, $instance_ts );
		}

		if ( ! preg_match( '/^[A-Z]{3}$/', $currency ) ) {
			$currency = 'USD';
		}

		list( $event_datetime, $event_timezone ) = self::get_event_datetime_parts( $event_id, $instance_ts );

		$first_name       = $customer_name ? trim( strtok( $customer_name, ' ' ) ) : '';
		$formatted_amount = self::format_currency( (float) $refund_amount, $currency );
		$refund_lines     = self::render_refund_items_for_email( $refund_items, $items );

		$tags = array(
			'[attendee_name]'  => $first_name ? $first_name : __( 'there', 'eventkoi-lite' ),
			'[attendee_email]' => $recipient_email,
			'[customer_name]'  => $customer_name,
			'[order_id]'       => $order_id,
			'[event_title]'    => $event_name,
			'[event_name]'     => $event_name,
			'[event_datetime]' => $event_datetime,
			'[event_url]'      => $event_url,
			'[refund_amount]'  => $formatted_amount,
			'[refund_items]'   => $refund_lines,
			'[event_timezone]' => $event_timezone,
			'[site_name]'      => get_bloginfo( 'name' ),
		);

		$tags = apply_filters( 'eventkoi_refund_email_tags', $tags, $order, $refund_items );

		$subject_default = __( '[event_name]: Refund confirmation', 'eventkoi-lite' );
		$subject_raw     = ! empty( $settings['refund_email_subject'] )
			? (string) $settings['refund_email_subject']
			: $subject_default;
		$subject         = apply_filters( 'eventkoi_refund_email_subject', $subject_raw, $tags, $order );
		$subject         = self::replace_email_tags( (string) $subject, $tags );

		$default_body = implode(
			"\n",
			array(
				'<p>' . esc_html__( 'Hi [attendee_name],', 'eventkoi-lite' ) . '</p>',
				'<p>' . esc_html__( 'A refund has been issued for your order.', 'eventkoi-lite' ) . '</p>',
				'<p>' . esc_html__( 'Order ID:', 'eventkoi-lite' ) . ' <br />[order_id]</p>',
				'<p>' . esc_html__( 'Event:', 'eventkoi-lite' ) . ' <br />[event_name]</p>',
				$event_datetime ? '<p>' . esc_html__( 'Date:', 'eventkoi-lite' ) . ' <br />[event_datetime]</p>' : '',
				$event_url ? '<p>' . esc_html__( 'Event page:', 'eventkoi-lite' ) . ' <br />[event_url]</p>' : '',
				'' !== $refund_lines ? '<p><strong>' . esc_html__( 'Refunded items', 'eventkoi-lite' ) . '</strong><br />[refund_items]</p>' : '',
				'<p><strong>' . esc_html__( 'Refund amount:', 'eventkoi-lite' ) . '</strong> [refund_amount]</p>',
				'<p>' . esc_html__( 'The refund should appear in your account within 5-10 business days, depending on your payment provider.', 'eventkoi-lite' ) . '</p>',
				'<p>&mdash;<br />[site_name]</p>',
			)
		);

		$body = ! empty( $settings['refund_email_template'] )
			? (string) $settings['refund_email_template']
			: $default_body;
		$body = apply_filters( 'eventkoi_refund_email_template', $body, $tags, $order );
		$body = self::replace_email_tags( (string) $body, $tags );

		$body     = preg_replace( "/\n{3,}/", "\n\n", trim( (string) $body ) );
		$has_html = (bool) preg_match( '/<[^>]+>/', (string) $body );
		$body     = $has_html
			? wp_kses( wpautop( (string) $body ), Settings::get_email_template_allowed_tags() )
			: wpautop( esc_html( (string) $body ) );

		$headers         = array( 'Content-Type: text/html; charset=UTF-8' );
		$sender_email    = sanitize_email( (string) ( $settings['refund_email_sender_email'] ?? $settings['ticket_email_sender_email'] ?? '' ) );
		$sender_name     = sanitize_text_field( (string) ( $settings['refund_email_sender_name'] ?? $settings['ticket_email_sender_name'] ?? '' ) );
		$from_email_hook = null;
		$from_name_hook  = null;

		if ( $sender_email ) {
			$from = $sender_email;
			if ( $sender_name ) {
				$from = sprintf( '%s <%s>', $sender_name, $sender_email );
			}
			$headers[]       = 'From: ' . $from;
			$from_email_hook = static function () use ( $sender_email ) {
				return $sender_email;
			};
			add_filter( 'wp_mail_from', $from_email_hook );
		}

		if ( $sender_name ) {
			$from_name_hook = static function () use ( $sender_name ) {
				return $sender_name;
			};
			add_filter( 'wp_mail_from_name', $from_name_hook );
		}

		$sent = wp_mail( $recipient_email, $subject, $body, $headers );

		if ( $from_email_hook ) {
			remove_filter( 'wp_mail_from', $from_email_hook );
		}
		if ( $from_name_hook ) {
			remove_filter( 'wp_mail_from_name', $from_name_hook );
		}

		if ( $sent && '' !== $order_id ) {
			self::add_refund_confirmation_note( $order_id );
		}

		return (bool) $sent;
	}

	/**
	 * Render refund items for email.
	 *
	 * Matches refund_items (ticket_id + quantity) against order items to get ticket names.
	 *
	 * @param array $refund_items Refunded items with ticket_id and quantity.
	 * @param array $order_items  Original order items with ticket_name.
	 * @return string
	 */
	private static function render_refund_items_for_email( $refund_items, $order_items = array() ) {
		if ( empty( $refund_items ) || ! is_array( $refund_items ) ) {
			return '';
		}

		$name_map = array();
		if ( is_array( $order_items ) ) {
			foreach ( $order_items as $item ) {
				if ( ! is_array( $item ) ) {
					continue;
				}
				$tid = absint( $item['ticket_id'] ?? 0 );
				if ( $tid > 0 ) {
					$name_map[ $tid ] = sanitize_text_field( (string) ( $item['ticket_name'] ?? '' ) );
				}
			}
		}

		$lines = array();
		foreach ( $refund_items as $refund_item ) {
			if ( ! is_array( $refund_item ) ) {
				continue;
			}

			$ticket_id = absint( $refund_item['ticket_id'] ?? 0 );
			$quantity  = max( 1, absint( $refund_item['quantity'] ?? 1 ) );
			$name      = sanitize_text_field( (string) ( $refund_item['ticket_name'] ?? '' ) );

			if ( '' === $name && $ticket_id > 0 && isset( $name_map[ $ticket_id ] ) ) {
				$name = $name_map[ $ticket_id ];
			}

			$lines[] = sprintf(
				'%1$d × %2$s',
				$quantity,
				$name ? $name : __( 'Ticket', 'eventkoi-lite' )
			);
		}

		return implode( '<br />', $lines );
	}

	/**
	 * Add order note after sending refund confirmation.
	 *
	 * @param string $order_id Order ID.
	 * @return void
	 */
	private static function add_refund_confirmation_note( $order_id ) {
		// Notes are stored locally via the Orders class — extract WC order ID if applicable.
		$wc_id = 0;
		if ( preg_match( '/^wc_(\d+)/', (string) $order_id, $m ) ) {
			$wc_id = (int) $m[1];
		}
		if ( $wc_id > 0 ) {
			$orders = new \EventKoi\Core\Orders();
			$orders->add_note( $wc_id, 'refund_confirmation_sent', __( 'Refund confirmation sent.', 'eventkoi-lite' ), 'system' );
		}
	}

	/**
	 * Render ticket lines for email.
	 *
	 * @param array  $items Order items.
	 * @param string $currency Currency.
	 * @param array  $contexts Optional event-title contexts to strip from ticket names.
	 * @return string
	 */
	private static function render_ticket_lines_for_email( $items, $currency = '', $contexts = array() ) {
		if ( empty( $items ) || ! is_array( $items ) ) {
			return '';
		}

		$lines    = array();
		$currency = strtoupper( sanitize_text_field( (string) $currency ) );
		$currency = preg_match( '/^[A-Z]{3}$/', $currency ) ? $currency : 'USD';

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			$name     = sanitize_text_field( (string) ( $item['ticket_name'] ?? '' ) );
			$name     = self::strip_ticket_context_suffix( $name, $contexts );
			$quantity = max( 1, absint( $item['quantity'] ?? 1 ) );
			// Edge order payload stores line item price in cents.
			$price  = floatval( $item['price'] ?? 0 ) / 100;
			$amount = $price * $quantity;

			$lines[] = sprintf(
				'%1$d × %2$s — %3$s',
				$quantity,
				$name ? $name : __( 'Ticket', 'eventkoi-lite' ),
				self::format_currency( $amount, $currency )
			);
		}

		return implode( '<br />', $lines );
	}

	/**
	 * Render individual ticket codes grouped by ticket type.
	 *
	 * @param array $items    Order items with ticket_codes arrays.
	 * @param array $contexts Optional event-title contexts to strip from ticket names.
	 * @return string HTML string of ticket codes, empty if none present.
	 */
	private static function render_ticket_codes_for_email( $items, $contexts = array() ) {
		if ( empty( $items ) || ! is_array( $items ) ) {
			return '';
		}

		$lines = array();

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			$ticket_codes = isset( $item['ticket_codes'] ) && is_array( $item['ticket_codes'] ) ? $item['ticket_codes'] : array();
			if ( empty( $ticket_codes ) ) {
				continue;
			}

			$name = sanitize_text_field( (string) ( $item['ticket_name'] ?? '' ) );
			$name = self::strip_ticket_context_suffix( $name, $contexts );
			if ( '' === $name ) {
				$name = __( 'Ticket', 'eventkoi-lite' );
			}

			$codes = array_map( 'sanitize_text_field', $ticket_codes );
			$codes = array_filter( $codes );

			if ( ! empty( $codes ) ) {
				$lines[] = esc_html( $name ) . ': ' . esc_html( implode( ', ', $codes ) );
			}
		}

		return implode( '<br />', $lines );
	}

	/**
	 * Remove trailing " - Event Title" context from ticket name.
	 *
	 * @param string $name Ticket name.
	 * @param array  $contexts Context labels to remove when trailing.
	 * @return string
	 */
	private static function strip_ticket_context_suffix( $name, $contexts = array() ) {
		$normalized_name = trim( (string) $name );
		if ( '' === $normalized_name ) {
			return '';
		}

		if ( ! is_array( $contexts ) || empty( $contexts ) ) {
			return $normalized_name;
		}

		foreach ( $contexts as $context ) {
			$label = trim( sanitize_text_field( (string) $context ) );
			if ( '' === $label ) {
				continue;
			}
			$suffix = ' - ' . $label;
			if ( strlen( $normalized_name ) >= strlen( $suffix ) && substr( $normalized_name, -strlen( $suffix ) ) === $suffix ) {
				$normalized_name = trim( substr( $normalized_name, 0, -strlen( $suffix ) ) );
				break;
			}
		}

		return $normalized_name;
	}

	/**
	 * Format currency amount.
	 *
	 * @param float  $amount Amount.
	 * @param string $currency Currency code.
	 * @return string
	 */
	private static function format_currency( $amount, $currency ) {
		try {
			$formatter = new \NumberFormatter( get_locale(), \NumberFormatter::CURRENCY );
			$formatted = $formatter->formatCurrency( (float) $amount, strtoupper( $currency ) );
			if ( is_string( $formatted ) ) {
				return $formatted;
			}
		// phpcs:ignore Generic.CodeAnalysis.EmptyStatement.DetectedCatch -- Formatting falls back to the plain numeric string below.
		} catch ( \Throwable $e ) {
			// Formatting falls back to the plain numeric string below.
		}

		return number_format_i18n( (float) $amount, 2 ) . ' ' . strtoupper( $currency );
	}

	/**
	 * Replace template tags.
	 *
	 * @param string $template Template.
	 * @param array  $tags Tags map.
	 * @return string
	 */
	private static function replace_email_tags( $template, $tags ) {
		if ( '' === $template || empty( $tags ) ) {
			return $template;
		}

		$replace = array();
		foreach ( $tags as $tag => $value ) {
			$replace[ $tag ] = is_scalar( $value ) ? (string) $value : '';
		}

		return strtr( $template, $replace );
	}

	/**
	 * Check whether confirmation note already exists.
	 *
	 * @param array $order Order payload.
	 * @return bool
	 */
	private static function has_confirmation_note( $order ) {
		$notes = isset( $order['notes'] ) && is_array( $order['notes'] ) ? $order['notes'] : array();
		foreach ( $notes as $note ) {
			if ( ! is_array( $note ) ) {
				continue;
			}

			$key = sanitize_key( (string) ( $note['note_key'] ?? '' ) );
			if ( 'ticket_confirmation_sent' === $key ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Add order note after sending confirmation.
	 *
	 * @param string $order_id Order ID.
	 * @return void
	 */
	private static function add_confirmation_note( $order_id ) {
		$wc_id = 0;
		if ( preg_match( '/^wc_(\d+)/', (string) $order_id, $m ) ) {
			$wc_id = (int) $m[1];
		}
		if ( $wc_id > 0 ) {
			$orders = new \EventKoi\Core\Orders();
			$orders->add_note( $wc_id, 'ticket_confirmation_sent', __( 'Ticket confirmation sent.', 'eventkoi-lite' ), 'system' );
		}
	}

	/**
	 * Find order ID by checkout session.
	 *
	 * @param string $checkout_session_id Checkout session ID.
	 * @param int    $event_id Event ID.
	 * @param int    $instance_ts Instance timestamp.
	 * @return string|WP_Error
	 */
	private static function find_order_id_by_checkout_session( $checkout_session_id, $event_id = 0, $instance_ts = 0 ) {
		// Lite is WC-only; Stripe-direct checkout sessions do not exist.
		return new WP_Error( 'order_not_found', __( 'Completed order was not found for this checkout session.', 'eventkoi-lite' ), array( 'status' => 404 ) );
	}

	/**
	 * Fetch edge order by ID.
	 *
	 * @param string $order_id Order ID.
	 * @return array|WP_Error
	 */
	private static function get_order_by_id( $order_id ) {
		$order_id = sanitize_text_field( (string) $order_id );

		// WC orders: build from WC meta.
		if ( preg_match( '/^wc_(\d+)/', $order_id, $m ) ) {
			return self::build_order_from_wc( (int) $m[1] );
		}

		// Non-WC orders: query local ticket_orders table.
		global $wpdb;
		$table = $wpdb->prefix . 'eventkoi_ticket_orders';
		$rows  = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$table} WHERE order_id = %s LIMIT 10",
				$order_id
			),
			ARRAY_A
		);

		if ( empty( $rows ) ) {
			return new WP_Error( 'order_not_found', __( 'Order not found.', 'eventkoi-lite' ), array( 'status' => 404 ) );
		}

		$first = $rows[0];
		$items = array();
		foreach ( $rows as $row ) {
			$tid  = absint( $row['ticket_id'] ?? 0 );
			$name = $tid ? get_the_title( $tid ) : '';
			$items[] = array(
				'ticket_id' => $tid,
				'name'      => $name,
				'quantity'  => absint( $row['quantity'] ?? 1 ),
				'price'     => (int) round( floatval( $row['unit_price'] ?? 0 ) * 100 ),
			);
		}

		return array(
			'id'             => $order_id,
			'order_id'       => $order_id,
			'status'         => (string) ( $first['payment_status'] ?? '' ),
			'payment_status' => (string) ( $first['payment_status'] ?? '' ),
			'customer_email' => (string) ( $first['customer_email'] ?? '' ),
			'customer_name'  => (string) ( $first['customer_name'] ?? '' ),
			'event_id'       => absint( $first['event_id'] ?? 0 ),
			'event_instance_ts' => 0,
			'currency'       => strtolower( (string) ( $first['currency'] ?? 'usd' ) ),
			'items'          => $items,
			'metadata'       => array(
				'event_id'    => (string) absint( $first['event_id'] ?? 0 ),
				'event_title' => get_the_title( absint( $first['event_id'] ?? 0 ) ),
				'instance_ts' => (string) 0,
			),
		);
	}

	/**
	 * Get event title with instance override support.
	 *
	 * @param int $event_id Event ID.
	 * @param int $instance_ts Instance timestamp.
	 * @return string
	 */
	private static function get_event_title( $event_id, $instance_ts = 0 ) {
		$event_id = absint( $event_id );
		if ( ! $event_id ) {
			return __( 'Event', 'eventkoi-lite' );
		}

		$event = new Event( $event_id );
		if ( $instance_ts ) {
			$overrides = $event->get_recurrence_overrides();
			if (
				isset( $overrides[ $instance_ts ]['title'] ) &&
				is_string( $overrides[ $instance_ts ]['title'] ) &&
				'' !== trim( $overrides[ $instance_ts ]['title'] )
			) {
				return wp_strip_all_tags( $overrides[ $instance_ts ]['title'] );
			}
		}

		return $event->get_title();
	}

	/**
	 * Build event URL for an instance.
	 *
	 * @param int $event_id Event ID.
	 * @param int $instance_ts Instance timestamp.
	 * @return string
	 */
	private static function get_event_url( $event_id, $instance_ts = 0 ) {
		$event_id = absint( $event_id );
		if ( ! $event_id ) {
			return '';
		}

		$url = get_permalink( $event_id );
		if ( ! $url ) {
			return '';
		}

		$event = new Event( $event_id );
		if ( 'recurring' !== $event->get_date_type() || ! $instance_ts ) {
			return $url;
		}

		$is_pretty_permalink = get_option( 'permalink_structure' ) && false === strpos( $url, '?' );
		if ( $is_pretty_permalink ) {
			return trailingslashit( $url ) . absint( $instance_ts ) . '/';
		}

		return add_query_arg( 'instance', absint( $instance_ts ), $url );
	}

	/**
	 * Build event datetime display and timezone label.
	 *
	 * @param int $event_id Event ID.
	 * @param int $instance_ts Instance timestamp.
	 * @return array
	 */
	private static function get_event_datetime_parts( $event_id, $instance_ts = 0 ) {
		$event_id    = absint( $event_id );
		$instance_ts = absint( $instance_ts );
		if ( ! $event_id ) {
			return array( '', eventkoi_timezone() );
		}

		$start_ts = $instance_ts ? $instance_ts : absint( get_post_meta( $event_id, 'start_timestamp', true ) );
		$end_ts   = absint( get_post_meta( $event_id, 'end_timestamp', true ) );

		new Event( $event_id );
		if ( $start_ts && 'recurring' === Event::get_date_type() && $instance_ts ) {
			$rules = Event::get_recurrence_rules();
			if ( is_array( $rules ) ) {
				foreach ( $rules as $rule ) {
					if ( ! is_array( $rule ) ) {
						continue;
					}

					$rule_start = ! empty( $rule['start_date'] ) ? strtotime( (string) $rule['start_date'] . ' UTC' ) : null;
					$rule_end   = ! empty( $rule['end_date'] ) ? strtotime( (string) $rule['end_date'] . ' UTC' ) : null;
					$duration   = ( $rule_start && $rule_end && $rule_end > $rule_start ) ? ( $rule_end - $rule_start ) : null;
					if ( $duration ) {
						$end_ts = $start_ts + $duration;
						break;
					}
				}
			}
		}

		$event_datetime = '';
		if ( $start_ts ) {
			$event_datetime = $end_ts
				? eventkoi_date( 'datetime', $start_ts ) . ' — ' . eventkoi_date( 'datetime', $end_ts )
				: eventkoi_date( 'datetime', $start_ts );
		}

		return array( $event_datetime, eventkoi_timezone() );
	}

	/**
	 * Get primary physical location line.
	 *
	 * @param int $event_id Event ID.
	 * @return string
	 */
	private static function get_primary_physical_location( $event_id ) {
		$event_id = absint( $event_id );
		if ( ! $event_id ) {
			return '';
		}

		new Event( $event_id );
		$locations = Event::get_locations();
		if ( ! is_array( $locations ) ) {
			return '';
		}

		foreach ( $locations as $location ) {
			if ( ! is_array( $location ) ) {
				continue;
			}
			$type = isset( $location['type'] ) ? sanitize_key( (string) $location['type'] ) : '';
			if ( 'physical' !== $type ) {
				continue;
			}

			$parts = array_filter(
				array(
					sanitize_text_field( (string) ( $location['name'] ?? '' ) ),
					sanitize_text_field( (string) ( $location['address1'] ?? '' ) ),
					sanitize_text_field( (string) ( $location['address2'] ?? '' ) ),
					sanitize_text_field( (string) ( $location['city'] ?? '' ) ),
					sanitize_text_field( (string) ( $location['state'] ?? '' ) ),
					sanitize_text_field( (string) ( $location['zip'] ?? '' ) ),
					sanitize_text_field( (string) ( $location['country'] ?? '' ) ),
				)
			);

			if ( ! empty( $parts ) ) {
				return implode( ', ', $parts );
			}
		}

		return '';
	}

	/**
	 * Send admin notification for a new ticket sale.
	 *
	 * @param array $order Order payload.
	 */
	public static function send_admin_sale_notification( $order ) {
		$settings = Settings::get();
		$enabled  = $settings['admin_sale_email_enabled'] ?? null;
		$enabled  = null === $enabled || '' === $enabled
			? true
			: filter_var( $enabled, FILTER_VALIDATE_BOOLEAN );

		if ( ! $enabled ) {
			return;
		}

		$admin_email = get_option( 'admin_email' );
		if ( ! is_email( $admin_email ) ) {
			return;
		}

		$event_id    = absint( $order['event_id'] ?? 0 );
		$instance_ts = $order['event_instance_ts'] ?? '';
		$event_name  = get_the_title( $event_id );
		$items       = $order['items'] ?? array();

		$customer_name  = sanitize_text_field( (string) ( $order['customer_name'] ?? '' ) );
		$customer_email = sanitize_email( (string) ( $order['customer_email'] ?? '' ) );
		$order_id       = self::get_order_display_id( $order );
		$currency       = strtoupper( (string) ( $order['currency'] ?? 'USD' ) );

		$total = 0;
		$lines = array();
		foreach ( $items as $item ) {
			$qty    = absint( $item['quantity'] ?? 1 );
			$price  = absint( $item['price'] ?? $item['unit_amount'] ?? 0 );
			$name   = sanitize_text_field( (string) ( $item['ticket_name'] ?? $item['name'] ?? '' ) );
			$total += $price * $qty;
			/* translators: 1: quantity, 2: ticket name. */
			$lines[] = sprintf( '%1$d &times; %2$s', $qty, $name );
		}

		$formatted_total = self::format_currency( $total / 100, $currency );

		list( $event_datetime ) = self::get_event_datetime_parts( $event_id, $instance_ts );

		$tags = array(
			'[customer_name]'  => esc_html( $customer_name ),
			'[attendee_email]' => esc_html( $customer_email ),
			'[order_id]'       => esc_html( (string) $order_id ),
			'[ticket_lines]'   => implode( '<br />', array_map( 'esc_html', $lines ) ),
			'[order_total]'    => esc_html( $formatted_total ),
			'[event_name]'     => esc_html( $event_name ),
			'[event_datetime]' => esc_html( (string) $event_datetime ),
			'[site_name]'      => esc_html( get_bloginfo( 'name' ) ),
		);

		$default_subject  = __( 'New ticket sale: [event_name]', 'eventkoi-lite' );
		$default_template = implode(
			"\n",
			array(
				'<p>' . esc_html__( 'A new ticket order has been placed.', 'eventkoi-lite' ) . '</p>',
				'<p><strong>' . esc_html__( 'Customer:', 'eventkoi-lite' ) . '</strong> [customer_name] ([attendee_email])</p>',
				'<p><strong>' . esc_html__( 'Order:', 'eventkoi-lite' ) . '</strong> #[order_id]</p>',
				'<p><strong>' . esc_html__( 'Tickets:', 'eventkoi-lite' ) . '</strong><br />[ticket_lines]</p>',
				'<p><strong>' . esc_html__( 'Total:', 'eventkoi-lite' ) . '</strong> [order_total]</p>',
				'<p><strong>' . esc_html__( 'Event:', 'eventkoi-lite' ) . '</strong> [event_name]</p>',
				'<p><strong>' . esc_html__( 'Date:', 'eventkoi-lite' ) . '</strong> [event_datetime]</p>',
				'<p>&mdash;<br />[site_name]</p>',
			)
		);

		$subject  = trim( (string) ( $settings['admin_sale_email_subject'] ?? '' ) );
		$template = trim( (string) ( $settings['admin_sale_email_template'] ?? '' ) );
		$subject  = '' !== $subject ? $subject : $default_subject;
		$template = '' !== $template ? $template : $default_template;

		$subject = strtr( $subject, $tags );
		$body    = strtr( $template, $tags );
		$body    = wp_kses( wpautop( trim( $body ) ), Settings::get_email_template_allowed_tags() );

		$headers         = array( 'Content-Type: text/html; charset=UTF-8' );
		$sender_email    = sanitize_email( (string) ( $settings['admin_sale_email_sender_email'] ?? '' ) );
		$sender_name     = sanitize_text_field( (string) ( $settings['admin_sale_email_sender_name'] ?? '' ) );
		$from_email_hook = null;
		$from_name_hook  = null;

		if ( $sender_email ) {
			$from = $sender_email;
			if ( $sender_name ) {
				$from = sprintf( '%s <%s>', $sender_name, $sender_email );
			}
			$headers[]       = 'From: ' . $from;
			$from_email_hook = static function () use ( $sender_email ) {
				return $sender_email;
			};
			add_filter( 'wp_mail_from', $from_email_hook );
		}

		if ( $sender_name ) {
			$from_name_hook = static function () use ( $sender_name ) {
				return $sender_name;
			};
			add_filter( 'wp_mail_from_name', $from_name_hook );
		}

		wp_mail( $admin_email, $subject, $body, $headers );

		if ( $from_email_hook ) {
			remove_filter( 'wp_mail_from', $from_email_hook );
		}
		if ( $from_name_hook ) {
			remove_filter( 'wp_mail_from_name', $from_name_hook );
		}
	}
}
