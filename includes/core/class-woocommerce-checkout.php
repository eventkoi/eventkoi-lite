<?php
/**
 * WooCommerce ticket checkout integration.
 *
 * Uses WooCommerce's standard cart/checkout flow with a hidden virtual
 * product as a ticket proxy, giving customers the full checkout UX.
 * Syncs completed orders to the local database and handles refunds.
 *
 * @package EventKoi\Core
 */

namespace EventKoi\Core;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * WooCommerce Checkout handler.
 */
class WooCommerce_Checkout {

	/**
	 * Human-friendly code alphabet (no ambiguous chars: 0, O, 1, I).
	 */
	const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	const CODE_LENGTH   = 12;

	/**
	 * Session key for EventKoi checkout data.
	 */
	const SESSION_KEY = 'eventkoi_checkout';

	/**
	 * Init.
	 *
	 * Defers WC hook registration until `woocommerce_loaded` because the
	 * EventKoi bootstrap runs before WooCommerce is loaded.
	 */
	public function __construct() {
		// All WC-dependent hooks must wait until WC is loaded.
		add_action( 'woocommerce_loaded', array( __CLASS__, 'register_wc_hooks' ) );
	}

	/**
	 * Register all WooCommerce-dependent hooks.
	 */
	public static function register_wc_hooks() {
		// Hide the internal ticket proxy product from WP admin so it
		// cannot be accidentally edited or deleted by store owners.
		add_action( 'pre_get_posts', array( __CLASS__, 'hide_ticket_product_from_admin' ) );
		add_filter( 'wp_count_posts', array( __CLASS__, 'adjust_product_counts' ), 10, 3 );

		// Prevent WC from redirecting checkout → cart when we have a pending token.
		add_filter( 'woocommerce_checkout_redirect_empty_cart', array( __CLASS__, 'maybe_allow_empty_cart_checkout' ) );

		// Populate cart from token on template_redirect, before WC's check (priority 10).
		add_action( 'template_redirect', array( __CLASS__, 'maybe_setup_cart_from_token' ), 1 );

		// Cart/checkout hooks.
		add_action( 'woocommerce_before_calculate_totals', array( __CLASS__, 'set_cart_item_prices' ), 20 );
		add_filter( 'woocommerce_cart_item_name', array( __CLASS__, 'filter_cart_item_name' ), 10, 3 );
		add_filter( 'woocommerce_cart_item_thumbnail', array( __CLASS__, 'filter_cart_item_thumbnail' ), 10, 3 );
		add_filter( 'woocommerce_product_get_image_id', array( __CLASS__, 'suppress_proxy_product_image' ), 10, 2 );
		add_filter( 'woocommerce_get_item_data', array( __CLASS__, 'filter_cart_item_data' ), 10, 2 );
		add_action( 'woocommerce_checkout_create_order_line_item', array( __CLASS__, 'add_order_item_meta' ), 10, 4 );
		add_action( 'woocommerce_checkout_order_created', array( __CLASS__, 'attach_order_meta' ) );
		add_action( 'woocommerce_store_api_checkout_order_processed', array( __CLASS__, 'attach_order_meta' ) );

		// Payment/completion hooks. Issue tickets as soon as WC considers the
		// order actionable so every gateway works out of the box:
		// - woocommerce_payment_complete: online gateways (Stripe, PayPal, …).
		// - woocommerce_order_status_processing: offline gateways (COD, BACS, …)
		//   that skip payment_complete and land directly in "processing".
		// - woocommerce_order_status_completed: admin manual completion.
		// on_payment_complete() is idempotent via the _eventkoi_synced guard,
		// and auto-completes the order after syncing so the final status is
		// always "completed".
		add_action( 'woocommerce_payment_complete', array( __CLASS__, 'on_payment_complete' ) );
		add_action( 'woocommerce_order_status_processing', array( __CLASS__, 'on_payment_complete' ) );
		add_action( 'woocommerce_order_status_completed', array( __CLASS__, 'on_payment_complete' ) );
		add_action( 'woocommerce_order_refunded', array( __CLASS__, 'on_order_refunded' ), 10, 2 );
		add_action( 'woocommerce_order_status_changed', array( __CLASS__, 'on_order_status_changed' ), 10, 4 );
		add_action( 'woocommerce_thankyou', array( __CLASS__, 'maybe_redirect_to_event_page' ), 5 );

		// Delete local EK orders when a WC order is permanently deleted.
		add_action( 'woocommerce_before_delete_order', array( __CLASS__, 'on_order_deleted' ), 10, 2 );
		add_action( 'before_delete_post', array( __CLASS__, 'on_order_post_deleted' ) );

		// Suppress WC order emails for EventKoi ticket orders (EventKoi sends its own).
		add_filter( 'woocommerce_email_enabled_new_order', array( __CLASS__, 'suppress_ticket_order_email' ), 10, 2 );
		add_filter( 'woocommerce_email_enabled_customer_processing_order', array( __CLASS__, 'suppress_ticket_order_email' ), 10, 2 );
		add_filter( 'woocommerce_email_enabled_customer_completed_order', array( __CLASS__, 'suppress_ticket_order_email' ), 10, 2 );
		add_filter( 'woocommerce_email_enabled_customer_on_hold_order', array( __CLASS__, 'suppress_ticket_order_email' ), 10, 2 );
		add_filter( 'woocommerce_email_enabled_customer_refunded_order', array( __CLASS__, 'suppress_ticket_order_email' ), 10, 2 );
		add_filter( 'woocommerce_email_enabled_cancelled_order', array( __CLASS__, 'suppress_ticket_order_email' ), 10, 2 );
		add_filter( 'woocommerce_email_enabled_failed_order', array( __CLASS__, 'suppress_ticket_order_email' ), 10, 2 );
	}

	/**
	 * Check whether WooCommerce checkout method is active.
	 *
	 * @return bool
	 */
	public static function is_active() {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return false;
		}

		$settings = Settings::get();

		return 'woocommerce' === ( $settings['ticket_checkout_method'] ?? '' );
	}

	/**
	 * Suppress WC order emails for EventKoi ticket orders.
	 *
	 * @param bool     $enabled Whether the email is enabled.
	 * @param WC_Order $order   The order object.
	 * @return bool
	 */
	public static function suppress_ticket_order_email( $enabled, $order ) {
		if ( $order instanceof \WC_Order && $order->get_meta( '_eventkoi_event_id' ) ) {
			return false;
		}
		return $enabled;
	}

	/**
	 * Hide the internal ticket proxy product from admin product lists
	 * so store owners cannot accidentally edit or delete it.
	 *
	 * @param \WP_Query $query The current query.
	 */
	public static function hide_ticket_product_from_admin( $query ) {
		if ( ! is_admin() ) {
			return;
		}

		$post_type = $query->get( 'post_type' );
		if ( 'product' !== $post_type ) {
			return;
		}

		$product_id = (int) get_option( 'eventkoi_wc_ticket_product_id', 0 );
		if ( ! $product_id ) {
			return;
		}

		$excluded = $query->get( 'post__not_in' );
		if ( ! is_array( $excluded ) ) {
			$excluded = array();
		}
		$excluded[] = $product_id;
		$query->set( 'post__not_in', $excluded );
	}

	/**
	 * Adjust product status counts so the hidden proxy product is not
	 * reflected in the admin list-table tabs (All, Published, etc.).
	 *
	 * @param object $counts  Post counts keyed by status.
	 * @param string $type    Post type.
	 * @param string $perm    Permission context.
	 * @return object
	 */
	public static function adjust_product_counts( $counts, $type, $perm ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
		if ( 'product' !== $type || ! is_admin() ) {
			return $counts;
		}

		$product_id = (int) get_option( 'eventkoi_wc_ticket_product_id', 0 );
		if ( ! $product_id ) {
			return $counts;
		}

		$status = get_post_status( $product_id );
		if ( $status && isset( $counts->$status ) ) {
			$counts->$status = max( 0, $counts->$status - 1 );
		}

		return $counts;
	}

	/**
	 * Get or create the hidden virtual product used as a ticket proxy.
	 *
	 * @return int Product ID.
	 */
	private static function get_ticket_product_id() {
		$product_id = (int) get_option( 'eventkoi_wc_ticket_product_id', 0 );

		if ( $product_id && get_post_type( $product_id ) === 'product' && get_post_status( $product_id ) !== 'trash' ) {
			// Ensure the product is published (not private) so it's purchasable.
			if ( 'publish' !== get_post_status( $product_id ) ) {
				wp_update_post(
					array(
						'ID'          => $product_id,
						'post_status' => 'publish',
					)
				);
			}
			return $product_id;
		}

		$product = new \WC_Product_Simple();
		$product->set_name( 'EventKoi Ticket' );
		$product->set_status( 'publish' );
		$product->set_catalog_visibility( 'hidden' );
		$product->set_virtual( true );
		$product->set_sold_individually( false );
		$product->set_price( 0 );
		$product->set_regular_price( 0 );
		$product->save();

		$product_id = $product->get_id();
		update_option( 'eventkoi_wc_ticket_product_id', $product_id, false );

		return $product_id;
	}

	/**
	 * Create a WC cart-based checkout for an EventKoi ticket purchase.
	 *
	 * Stores checkout data in a transient and returns a tokenized URL.
	 * The cart is populated on page load via `maybe_setup_cart_from_token()`,
	 * because WC sessions created in REST API context are not shared with
	 * the user's browser session.
	 *
	 * @param array $args Checkout arguments.
	 * @return array|\WP_Error Checkout URL on success.
	 */
	public static function create_checkout_order( $args ) {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return new \WP_Error( 'wc_unavailable', __( 'WooCommerce is not active.', 'eventkoi-lite' ), array( 'status' => 500 ) );
		}

		$event_id      = absint( $args['event_id'] ?? 0 );
		$event_title   = sanitize_text_field( (string) ( $args['event_title'] ?? '' ) );
		$instance_ts   = absint( $args['instance_ts'] ?? 0 );
		$email         = sanitize_email( (string) ( $args['email'] ?? '' ) );
		$first_name    = sanitize_text_field( (string) ( $args['first_name'] ?? '' ) );
		$last_name     = sanitize_text_field( (string) ( $args['last_name'] ?? '' ) );
		$items         = (array) ( $args['items'] ?? array() );
		$return_url    = esc_url_raw( (string) ( $args['return_url'] ?? '' ) );
		$wp_user_id    = absint( $args['wp_user_id'] ?? 0 );
		$wp_user_label = sanitize_text_field( (string) ( $args['wp_user_label'] ?? '' ) );

		$product_id = self::get_ticket_product_id();
		if ( ! $product_id ) {
			return new \WP_Error( 'product_error', __( 'Could not create ticket product.', 'eventkoi-lite' ), array( 'status' => 500 ) );
		}

		// Generate ticket codes and master checkin code.
		$master_checkin_code = self::generate_unique_code();
		$all_ticket_items    = array();

		foreach ( $items as $item ) {
			$ticket_id   = absint( $item['ticket_id'] ?? 0 );
			$ticket_name = sanitize_text_field( (string) ( $item['name'] ?? 'Ticket' ) );
			$quantity    = max( 1, absint( $item['quantity'] ?? 1 ) );
			$unit_cents  = absint( $item['unit_amount'] ?? 0 );

			// Generate one code per ticket seat.
			$ticket_codes = array();
			for ( $i = 0; $i < $quantity; $i++ ) {
				$ticket_codes[] = self::generate_unique_code();
			}

			$all_ticket_items[] = array(
				'ticket_id'   => $ticket_id,
				'name'        => $ticket_name,
				'description' => sanitize_text_field( (string) ( $item['description'] ?? '' ) ),
				'quantity'    => $quantity,
				'unit_amount' => $unit_cents,
				'codes'       => $ticket_codes,
			);
		}

		// Store checkout data in a transient (one-time token).
		$token         = wp_generate_password( 32, false );
		$checkout_data = array(
			'product_id'          => $product_id,
			'event_id'            => $event_id,
			'event_title'         => $event_title,
			'instance_ts'         => $instance_ts,
			'email'               => $email,
			'first_name'          => $first_name,
			'last_name'           => $last_name,
			'return_url'          => $return_url,
			'wp_user_id'          => $wp_user_id,
			'wp_user_label'       => $wp_user_label,
			'master_checkin_code' => $master_checkin_code,
			'ticket_items'        => $all_ticket_items,
		);

		set_transient( 'eventkoi_cart_' . $token, $checkout_data, HOUR_IN_SECONDS );

		// Return tokenized checkout URL — cart will be populated on page load.
		$checkout_url = add_query_arg( 'ek_cart', $token, wc_get_checkout_url() );

		return array(
			'hosted_url'  => $checkout_url,
			'wc_order_id' => 0,
		);
	}

	/**
	 * Intercept page load with `ek_cart` token, populate the WC cart,
	 * and redirect to a clean checkout URL.
	 */
	/**
	 * Allow the checkout page to render (instead of redirecting to cart)
	 * when an `ek_cart` token is present in the URL.
	 *
	 * @param bool $redirect Whether to redirect.
	 * @return bool
	 */
	public static function maybe_allow_empty_cart_checkout( $redirect ) {
		if ( ! empty( $_GET['ek_cart'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return false;
		}
		return $redirect;
	}

	/**
	 * Populate the WC cart from a one-time token on the checkout page.
	 * Runs on template_redirect priority 1, before WC's redirect check at 10.
	 * No redirect is issued — the checkout page renders directly with the cart populated.
	 */
	public static function maybe_setup_cart_from_token() {
		if ( empty( $_GET['ek_cart'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return;
		}

		if ( ! WC()->session || ! WC()->cart ) {
			return;
		}

		$token = sanitize_text_field( wp_unslash( $_GET['ek_cart'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$data  = get_transient( 'eventkoi_cart_' . $token );

		if ( ! $data || ! is_array( $data ) ) {
			return;
		}

		// One-time use — delete immediately.
		delete_transient( 'eventkoi_cart_' . $token );

		$product_id = absint( $data['product_id'] ?? 0 );
		if ( ! $product_id ) {
			return;
		}

		WC()->cart->empty_cart();

		$ticket_items = (array) ( $data['ticket_items'] ?? array() );
		foreach ( $ticket_items as $index => $ticket ) {
			WC()->cart->add_to_cart(
				$product_id,
				$ticket['quantity'],
				0,
				array(),
				array(
					'eventkoi_ticket'     => true,
					'eventkoi_index'      => $index,
					'eventkoi_name'       => $ticket['name'],
					'eventkoi_unit_cents' => $ticket['unit_amount'],
					'eventkoi_ticket_id'  => $ticket['ticket_id'],
				)
			);
		}

		// Store EventKoi data in WC session for order metadata.
		WC()->session->set( self::SESSION_KEY, $data );

		// Pre-fill billing fields.
		if ( WC()->customer ) {
			if ( ! empty( $data['email'] ) ) {
				WC()->customer->set_billing_email( $data['email'] );
			}
			if ( ! empty( $data['first_name'] ) ) {
				WC()->customer->set_billing_first_name( $data['first_name'] );
			}
			if ( ! empty( $data['last_name'] ) ) {
				WC()->customer->set_billing_last_name( $data['last_name'] );
			}
			WC()->customer->save();
		}

		WC()->cart->calculate_totals();
	}

	/**
	 * Set the correct price for EventKoi ticket cart items.
	 *
	 * @param \WC_Cart $cart WC Cart object.
	 */
	public static function set_cart_item_prices( $cart ) {
		if ( is_admin() && ! defined( 'DOING_AJAX' ) ) {
			return;
		}

		foreach ( $cart->get_cart() as $cart_item ) {
			if ( empty( $cart_item['eventkoi_ticket'] ) ) {
				continue;
			}

			$unit_cents = absint( $cart_item['eventkoi_unit_cents'] ?? 0 );
			$cart_item['data']->set_price( $unit_cents / 100 );

			// Set real ticket name so it shows in both classic and block checkout.
			if ( ! empty( $cart_item['eventkoi_name'] ) ) {
				$cart_item['data']->set_name( $cart_item['eventkoi_name'] );
			}
		}
	}

	/**
	 * Display ticket name instead of the proxy product name.
	 *
	 * @param string $name    Product name.
	 * @param array  $cart_item Cart item data.
	 * @param string $cart_item_key Cart item key.
	 * @return string
	 */
	public static function filter_cart_item_name( $name, $cart_item, $cart_item_key ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
		if ( ! empty( $cart_item['eventkoi_ticket'] ) && ! empty( $cart_item['eventkoi_name'] ) ) {
			$ticket_name = esc_html( $cart_item['eventkoi_name'] );

			$checkout_data = WC()->session ? WC()->session->get( self::SESSION_KEY ) : null;
			if ( $checkout_data && ! empty( $checkout_data['event_title'] ) ) {
				$event_title = esc_html( $checkout_data['event_title'] );
				return $ticket_name . '<br><small class="eventkoi-cart-event-title" style="color:#666;">' . $event_title . '</small>';
			}

			return $ticket_name;
		}

		return $name;
	}

	/**
	 * Hide the thumbnail for ticket proxy items.
	 *
	 * @param string $thumbnail Thumbnail HTML.
	 * @param array  $cart_item Cart item data.
	 * @param string $cart_item_key Cart item key.
	 * @return string
	 */
	public static function filter_cart_item_thumbnail( $thumbnail, $cart_item, $cart_item_key ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
		if ( ! empty( $cart_item['eventkoi_ticket'] ) ) {
			return '';
		}

		return $thumbnail;
	}

	/**
	 * Return 0 for the proxy product's image ID so neither the classic
	 * nor the block checkout renders a placeholder thumbnail.
	 *
	 * @param int         $image_id  Attachment ID.
	 * @param \WC_Product $product   Product instance.
	 * @return int
	 */
	public static function suppress_proxy_product_image( $image_id, $product ) {
		$proxy_id = (int) get_option( 'eventkoi_wc_ticket_product_id', 0 );
		if ( $proxy_id && $product->get_id() === $proxy_id ) {
			return 0;
		}

		return $image_id;
	}

	/**
	 * Add event name as item data displayed below the product name.
	 * Works in both classic and block checkout (Store API).
	 *
	 * @param array $item_data Existing item data.
	 * @param array $cart_item Cart item.
	 * @return array
	 */
	public static function filter_cart_item_data( $item_data, $cart_item ) {
		if ( empty( $cart_item['eventkoi_ticket'] ) ) {
			return $item_data;
		}

		$checkout_data = WC()->session ? WC()->session->get( self::SESSION_KEY ) : null;
		if ( $checkout_data && ! empty( $checkout_data['event_title'] ) ) {
			$item_data[] = array(
				'key'   => __( 'Event', 'eventkoi-lite' ),
				'value' => $checkout_data['event_title'],
			);
		}

		return $item_data;
	}

	/**
	 * Add EventKoi metadata to WC order line items.
	 *
	 * @param \WC_Order_Item_Product $item     Order item.
	 * @param string                 $cart_item_key Cart item key.
	 * @param array                  $values   Cart item values.
	 * @param \WC_Order              $order    WC Order.
	 */
	public static function add_order_item_meta( $item, $cart_item_key, $values, $order ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
		if ( empty( $values['eventkoi_ticket'] ) ) {
			return;
		}

		$item->add_meta_data( '_eventkoi_ticket', 'yes', true );
		$item->add_meta_data( '_eventkoi_ticket_id', $values['eventkoi_ticket_id'] ?? 0, true );
		$item->add_meta_data( '_eventkoi_index', $values['eventkoi_index'] ?? 0, true );

		// Override the displayed name.
		if ( ! empty( $values['eventkoi_name'] ) ) {
			$item->set_name( $values['eventkoi_name'] );
		}
	}

	/**
	 * Attach EventKoi metadata to the WC order after checkout.
	 *
	 * @param \WC_Order $order WC Order.
	 */
	public static function attach_order_meta( $order ) {
		$checkout_data = WC()->session ? WC()->session->get( self::SESSION_KEY ) : null;
		if ( ! $checkout_data ) {
			return;
		}

		$order->update_meta_data( '_eventkoi_event_id', $checkout_data['event_id'] ?? 0 );
		$order->update_meta_data( '_eventkoi_instance_ts', $checkout_data['instance_ts'] ?? 0 );
		$order->update_meta_data( '_eventkoi_event_title', $checkout_data['event_title'] ?? '' );
		$order->update_meta_data( '_eventkoi_ticket_items', $checkout_data['ticket_items'] ?? array() );
		$order->update_meta_data( '_eventkoi_master_checkin_code', $checkout_data['master_checkin_code'] ?? '' );
		$order->update_meta_data( '_eventkoi_return_url', $checkout_data['return_url'] ?? '' );
		$order->update_meta_data( '_eventkoi_wp_user_id', $checkout_data['wp_user_id'] ?? 0 );
		$order->update_meta_data( '_eventkoi_wp_user_label', $checkout_data['wp_user_label'] ?? '' );
		$order->save();

		// Clear session data.
		WC()->session->set( self::SESSION_KEY, null );
	}

	/**
	 * Handle WC payment completion — sync to local DB + send email.
	 *
	 * @param int $wc_order_id WC order ID.
	 */
	public static function on_payment_complete( $wc_order_id ) {
		$order = wc_get_order( $wc_order_id );
		if ( ! $order ) {
			return;
		}

		$event_id = absint( $order->get_meta( '_eventkoi_event_id' ) );
		if ( ! $event_id ) {
			return; // Not an EventKoi order.
		}

		// Prevent duplicate processing.
		if ( 'yes' === $order->get_meta( '_eventkoi_synced' ) ) {
			return;
		}

		$instance_ts         = absint( $order->get_meta( '_eventkoi_instance_ts' ) );
		$event_title         = (string) $order->get_meta( '_eventkoi_event_title' );
		$ticket_items        = (array) $order->get_meta( '_eventkoi_ticket_items' );
		$master_checkin_code = (string) $order->get_meta( '_eventkoi_master_checkin_code' );
		$wp_user_id          = absint( $order->get_meta( '_eventkoi_wp_user_id' ) );
		$wp_user_label       = (string) $order->get_meta( '_eventkoi_wp_user_label' );
		$currency            = strtolower( $order->get_currency() );
		$customer_name       = trim( $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() );
		$customer_email      = $order->get_billing_email();

		// Build order payload for local sync.
		$ek_order_id = 'wc_' . $wc_order_id;
		$total_cents       = (int) round( (float) $order->get_total() * 100 );
		$total_quantity    = 0;
		$order_items    = array();

		foreach ( $ticket_items as $ti ) {
			$quantity        = absint( $ti['quantity'] ?? 1 );
			$total_quantity += $quantity;

			$order_items[] = array(
				'ticket_id'          => absint( $ti['ticket_id'] ?? 0 ),
				'ticket_name'        => (string) ( $ti['name'] ?? '' ),
				'ticket_description' => (string) ( $ti['description'] ?? '' ),
				'price'              => absint( $ti['unit_amount'] ?? 0 ),
				'quantity'           => $quantity,
				'ticket_codes'       => (array) ( $ti['codes'] ?? array() ),
			);
		}

		$order_payload = array(
			'stripe_checkout_id'   => $ek_order_id,
			'event_id'             => $event_id,
			'event_instance_ts'    => $instance_ts,
			'event_title'          => $event_title,
			'event_instance_title' => $event_title,
			'amount_total'         => $total_cents,
			'currency'             => $currency,
			'status'               => 'completed',
			'quantity'             => $total_quantity,
			'customer_name'        => $customer_name,
			'customer_email'       => $customer_email,
			'checkout_first_name'  => $order->get_billing_first_name(),
			'checkout_last_name'   => $order->get_billing_last_name(),
			'checkout_name'        => $customer_name,
			'master_checkin_code'  => $master_checkin_code,
			'wp_user_id'           => $wp_user_id,
			'wp_user_label'        => $wp_user_label,
			'items'                => $order_items,
			'gateway'              => 'woocommerce',
			'platform_fee_amount'  => 0,
			'metadata'             => array(
				'event_id'            => (string) $event_id,
				'event_title'         => $event_title,
				'instance_ts'         => (string) $instance_ts,
				'customer_name'       => $customer_name,
				'wp_user_id'          => (string) $wp_user_id,
				'wp_user_label'       => $wp_user_label,
				'master_checkin_code' => $master_checkin_code,
				'wc_order_id'         => (string) $wc_order_id,
				'gateway'             => 'woocommerce',
			),
		);

		// Sync to local database.
		$local_order = array(
			'order_id'       => $ek_order_id,
			'customer_name'  => $customer_name,
			'customer_email' => $customer_email,
			'status'         => 'completed',
			'payment_status' => 'complete',
			'event_id'       => $event_id,
			'currency'       => $currency,
			'items'          => $order_items,
			'metadata'       => $order_payload['metadata'],
		);
		Ticket_Order_Sync::sync_order_to_local( $local_order );

		// Send confirmation email.
		$email_order = array_merge(
			$local_order,
			array(
				'id'                  => $ek_order_id,
				'master_checkin_code' => $master_checkin_code,
				'event_instance_ts'   => $instance_ts,
			)
		);
		Ticket_Emails::send_for_order_public( $email_order );

		// Mark as synced BEFORE changing status, so the status-change hooks
		// (woocommerce_order_status_completed, woocommerce_order_status_changed)
		// that re-enter on_payment_complete() hit the guard and exit early.
		$order->update_meta_data( '_eventkoi_synced', 'yes' );
		$order->save();

		// Auto-complete the order (tickets are virtual/digital).
		if ( $order->get_status() !== 'completed' ) {
			$order->set_status( 'completed', __( 'EventKoi ticket order auto-completed.', 'eventkoi-lite' ) );
			$order->save();
		}
	}

	/**
	 * Handle WC order refund — sync to local + send refund email.
	 *
	 * @param int $wc_order_id WC order ID.
	 * @param int $refund_id   WC refund ID.
	 */
	public static function on_order_refunded( $wc_order_id, $refund_id ) {
		$order = wc_get_order( $wc_order_id );
		if ( ! $order ) {
			return;
		}

		$event_id = absint( $order->get_meta( '_eventkoi_event_id' ) );
		if ( ! $event_id ) {
			return; // Not an EventKoi order.
		}

		$ek_order_id = 'wc_' . $wc_order_id;

		$refund        = wc_get_order( $refund_id );
		$refund_amount = $refund ? abs( (float) $refund->get_total() ) : 0;
		$refund_cents  = (int) round( $refund_amount * 100 );

		// Determine if this is a partial or full refund.
		$total_refunded = abs( (float) $order->get_total_refunded() );
		$order_total    = abs( (float) $order->get_total() );
		$is_full_refund = $total_refunded >= $order_total;
		$refund_status  = $is_full_refund ? 'refunded' : 'partially_refunded';

		// Sync refund to local (expects major currency units, not cents).
		Ticket_Order_Sync::sync_refund_to_local(
			$ek_order_id,
			$refund_status,
			$total_refunded
		);

		// Send refund confirmation email.
		Ticket_Emails::send_refund_for_order( $ek_order_id, $refund_amount );
	}

	/**
	 * Handle WC order status changes — sync to local EK ticket order.
	 *
	 * @param int       $wc_order_id WC order ID.
	 * @param string    $old_status  Old status (without 'wc-' prefix).
	 * @param string    $new_status  New status (without 'wc-' prefix).
	 * @param \WC_Order $order    WC Order object.
	 */
	public static function on_order_status_changed( $wc_order_id, $old_status, $new_status, $order ) {
		$event_id = absint( $order->get_meta( '_eventkoi_event_id' ) );
		if ( ! $event_id ) {
			return; // Not an EventKoi order.
		}

		// Map WC statuses to EK payment_status values.
		$status_map = array(
			'completed'  => 'complete',
			'processing' => 'complete',
			'refunded'   => 'refunded',
			'cancelled'  => 'cancelled',
			'failed'     => 'failed',
			'on-hold'    => 'pending',
			'pending'    => 'pending',
		);

		if ( ! isset( $status_map[ $new_status ] ) ) {
			return; // Ignore unmapped statuses (drafts, trashed, custom).
		}

		$ek_status = $status_map[ $new_status ];
		self::update_local_order_status( $wc_order_id, $ek_status );

		// Recount inventory when transitioning to or from a void status so
		// quantity_sold stays accurate in both directions (e.g. completed →
		// cancelled frees tickets, cancelled → completed re-counts them).
		$void_statuses     = array( 'cancelled', 'failed', 'refunded' );
		$complete_statuses = array( 'complete' );
		$old_ek            = isset( $status_map[ $old_status ] ) ? $status_map[ $old_status ] : '';

		if (
			in_array( $ek_status, $void_statuses, true ) ||
			( in_array( $ek_status, $complete_statuses, true ) && in_array( $old_ek, $void_statuses, true ) )
		) {
			self::recount_inventory_for_wc_order( $wc_order_id, $event_id );
		}
	}

	/**
	 * Update local EK ticket order payment_status for a WC order.
	 *
	 * @param int    $wc_order_id WC order ID.
	 * @param string $status      New payment_status value.
	 * @return int Number of rows updated.
	 */
	public static function update_local_order_status( $wc_order_id, $status ) {
		global $wpdb;

		$base_id = 'wc_' . absint( $wc_order_id );
		$table   = $wpdb->prefix . 'eventkoi_ticket_orders';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$updated = $wpdb->query(
			$wpdb->prepare(
				"UPDATE {$table} SET payment_status = %s, updated_at = %s WHERE order_id = %s OR order_id LIKE %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				sanitize_key( $status ),
				gmdate( 'Y-m-d H:i:s' ),
				$base_id,
				$wpdb->esc_like( $base_id ) . ':%'
			)
		);

		return absint( $updated );
	}

	/**
	 * Recount inventory (quantity_sold) for all tickets in a WC order.
	 *
	 * Uses Ticket_Order_Sync::sync_quantity_sold() which recounts from
	 * local order rows WHERE payment_status IN (complete, completed, succeeded).
	 * So cancelled/refunded rows are automatically excluded.
	 *
	 * @param int $wc_order_id WC order ID.
	 * @param int $event_id    Event ID.
	 */
	private static function recount_inventory_for_wc_order( $wc_order_id, $event_id ) {
		global $wpdb;

		$base_id = 'wc_' . absint( $wc_order_id );
		$table   = $wpdb->prefix . 'eventkoi_ticket_orders';

		// Get distinct ticket_ids from this order's rows.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$ticket_ids = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT DISTINCT ticket_id FROM {$table} WHERE order_id = %s OR order_id LIKE %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$base_id,
				$wpdb->esc_like( $base_id ) . ':%'
			)
		);

		if ( empty( $ticket_ids ) ) {
			return;
		}

		// Build items array for sync_quantity_sold.
		$items = array_map(
			static function ( $id ) {
				return array( 'ticket_id' => absint( $id ) );
			},
			$ticket_ids
		);

		// Recount — queries all local order rows for each ticket_id
		// and only counts rows with completed payment_status.
		Ticket_Order_Sync::sync_quantity_sold( $event_id, $items );
	}

	/**
	 * Update the WC order status from an EK order_id.
	 *
	 * Called when EK admin changes status (e.g. archive).
	 *
	 * @param string $ek_order_id EK order ID (e.g. "wc_12345").
	 * @param string $wc_status   WC status to set (without 'wc-' prefix).
	 * @param string $note        Optional order note.
	 * @return bool Whether the WC order was updated.
	 */
	public static function update_wc_order_status( $ek_order_id, $wc_status, $note = '' ) {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return false;
		}

		$wc_match = array();
		if ( ! preg_match( '/^wc_(\d+)/', $ek_order_id, $wc_match ) ) {
			return false;
		}

		$order = wc_get_order( absint( $wc_match[1] ) );
		if ( ! $order ) {
			return false;
		}

		if ( $order->get_status() === $wc_status ) {
			return true;
		}

		$order->set_status( $wc_status, $note ? $note : __( 'Status updated via EventKoi.', 'eventkoi-lite' ) );
		$order->save();

		return true;
	}

	/**
	 * Redirect from WC thank-you page back to event page.
	 *
	 * @param int $wc_order_id WC order ID.
	 */
	public static function maybe_redirect_to_event_page( $wc_order_id ) {
		$order = wc_get_order( $wc_order_id );
		if ( ! $order ) {
			return;
		}

		$return_url = (string) $order->get_meta( '_eventkoi_return_url' );
		if ( empty( $return_url ) ) {
			return;
		}

		$status  = $order->get_status();
		$is_paid = in_array( $status, array( 'completed', 'processing' ), true )
			&& 'yes' === $order->get_meta( '_eventkoi_synced' );

		if ( $is_paid ) {
			// Payment confirmed — redirect back to event page with success.
			$redirect_url = add_query_arg(
				array(
					'ek_checkout'    => 'success',
					'ek_wc_order_id' => $wc_order_id,
				),
				$return_url
			);
		} else {
			// Payment pending (COD, BACS, etc.) — redirect with pending status.
			$redirect_url = add_query_arg(
				array(
					'ek_checkout'    => 'pending',
					'ek_wc_order_id' => $wc_order_id,
				),
				$return_url
			);
		}

		wp_safe_redirect( $redirect_url );
		exit;
	}

	/**
	 * Handle permanent deletion of a WC order (HPOS storage).
	 *
	 * @param int    $wc_order_id WC order ID.
	 * @param object $order       WC Order object.
	 */
	public static function on_order_deleted( $wc_order_id, $order = null ) {
		if ( ! $order ) {
			$order = wc_get_order( $wc_order_id );
		}
		if ( ! $order ) {
			return;
		}

		$event_id = absint( $order->get_meta( '_eventkoi_event_id' ) );
		if ( ! $event_id ) {
			return;
		}

		$base_id = 'wc_' . absint( $wc_order_id );

		// Recount inventory before deleting rows.
		self::recount_inventory_before_delete( $base_id, $event_id );

		// Delete all local EK order rows.
		Ticket_Order_Sync::delete_local_order( $base_id );
	}

	/**
	 * Handle permanent deletion of a WC order (CPT storage fallback).
	 *
	 * @param int $post_id Post ID.
	 */
	public static function on_order_post_deleted( $post_id ) {
		if ( 'shop_order' !== get_post_type( $post_id ) ) {
			return;
		}

		$order = wc_get_order( $post_id );
		if ( ! $order ) {
			return;
		}

		$event_id = absint( $order->get_meta( '_eventkoi_event_id' ) );
		if ( ! $event_id ) {
			return;
		}

		$base_id = 'wc_' . absint( $post_id );

		self::recount_inventory_before_delete( $base_id, $event_id );
		Ticket_Order_Sync::delete_local_order( $base_id );
	}

	/**
	 * Recount inventory for tickets in an order that is about to be deleted.
	 *
	 * Updates payment_status to 'deleted' first so sync_quantity_sold
	 * excludes these rows, then recounts.
	 *
	 * @param string $base_id  EK order ID (e.g. "wc_123").
	 * @param int    $event_id Event ID.
	 */
	private static function recount_inventory_before_delete( $base_id, $event_id ) {
		global $wpdb;

		$table = $wpdb->prefix . 'eventkoi_ticket_orders';

		// Get ticket_ids before we modify anything.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$ticket_ids = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT DISTINCT ticket_id FROM {$table} WHERE order_id = %s OR order_id LIKE %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$base_id,
				$wpdb->esc_like( $base_id ) . ':%'
			)
		);

		if ( empty( $ticket_ids ) ) {
			return;
		}

		// Mark rows as deleted so sync_quantity_sold excludes them.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query(
			$wpdb->prepare(
				"UPDATE {$table} SET payment_status = 'deleted' WHERE order_id = %s OR order_id LIKE %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$base_id,
				$wpdb->esc_like( $base_id ) . ':%'
			)
		);

		$items = array_map(
			static function ( $id ) {
				return array( 'ticket_id' => absint( $id ) );
			},
			$ticket_ids
		);

		Ticket_Order_Sync::sync_quantity_sold( $event_id, $items );
	}

	/**
	 * Generate a unique human-readable code.
	 *
	 * @return string 12-character alphanumeric code.
	 */
	private static function generate_unique_code() {
		$alphabet = self::CODE_ALPHABET;
		$len      = self::CODE_LENGTH;
		$code     = '';

		$bytes = random_bytes( $len );
		for ( $i = 0; $i < $len; $i++ ) {
			$code .= $alphabet[ ord( $bytes[ $i ] ) % strlen( $alphabet ) ];
		}

		return $code;
	}
}
