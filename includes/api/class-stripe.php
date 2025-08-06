<?php
/**
 * Stripe API integration.
 *
 * @package    EventKoi
 * @subpackage EventKoi\API
 */

namespace EventKoi\API;

use EKLIB\StellarWP\DB\DB;
use WP_REST_Request;
use WP_Error;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Class Stripe
 *
 * Handles Stripe API integration for EventKoi.
 */
class Stripe {

	/**
	 * Initialize the Stripe API routes.
	 */
	public static function init() {
		register_rest_route(
			EVENTKOI_API,
			'/stripe',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'get_stripe_event' ),
				'permission_callback' => '__return_true',
			)
		);

		$protected_routes = array(
			'/manual_stripe_session'        => 'manual_stripe_session',
			'/stripe_test_checkout_session' => 'test_checkout_session',
			'/validate_stripe_key'          => 'validate_stripe_key',
		);

		foreach ( $protected_routes as $route => $callback ) {
			register_rest_route(
				EVENTKOI_API,
				$route,
				array(
					'methods'             => 'POST',
					'callback'            => array( __CLASS__, $callback ),
					'permission_callback' => array( '\EventKoi\API\REST', 'private_api' ),
				)
			);
		}
	}

	/**
	 * Process Stripe webhook events.
	 *
	 * @return void
	 */
	public static function get_stripe_event() {
		include_once EVENTKOI_PLUGIN_DIR . 'includes/payments/stripe-php/init.php';

		$endpoint_secret = eventkoi_get_stripe_webhook_secret();

		// Read raw body for signature verification.
		$payload    = file_get_contents( 'php://input' ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		$sig_header = isset( $_SERVER['HTTP_STRIPE_SIGNATURE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_STRIPE_SIGNATURE'] ) ) : '';

		if ( empty( $payload ) || empty( $sig_header ) || empty( $endpoint_secret ) ) {
			http_response_code( 400 );
			exit();
		}

		try {
			$event = \Stripe\Webhook::constructEvent( $payload, $sig_header, $endpoint_secret );
		} catch ( \UnexpectedValueException | \Stripe\Exception\SignatureVerificationException $e ) {
			http_response_code( 400 );
			exit();
		}

		$stripe = new \EventKoi\Payments\Stripe();
		$orders = new \EventKoi\Core\Orders();

		switch ( $event->type ) {
			case 'checkout.session.completed':
				$session = $stripe->retrieve_checkout_session( $event->data->object->id );
				$orders->create_order( $session, 'stripe' );
				break;

			case 'payment_intent.payment_failed':
				$checkout_id = $stripe->get_checkout_session_id( $event->data->object->id );
				$session     = $stripe->retrieve_checkout_session( $checkout_id );
				$orders->create_order( $session, 'stripe' );
				break;

			// You can handle more event types here in the future...
			default:
				// Unknown event type, just acknowledge.
				break;
		}

		http_response_code( 200 );
		exit();
	}

	/**
	 * Handle manual Stripe session.
	 *
	 * @param WP_REST_Request $request The API request object.
	 * @return WP_REST_Response The response object.
	 */
	public static function manual_stripe_session( WP_REST_Request $request ) {
		$data      = json_decode( $request->get_body(), true );
		$stripe_id = isset( $data['stripe_id'] ) ? sanitize_text_field( $data['stripe_id'] ) : '';

		$stripe  = new \EventKoi\Payments\Stripe();
		$orders  = new \EventKoi\Core\Orders();
		$session = $stripe->retrieve_checkout_session( $stripe_id );
		$orders->create_order( $session, 'stripe' );

		return rest_ensure_response( $session );
	}

	/**
	 * Create a test Stripe checkout session and record a pending order.
	 *
	 * @return WP_REST_Response The response object.
	 */
	public static function test_checkout_session() {
		$stripe = new \EventKoi\Payments\Stripe();
		$orders = new \EventKoi\Core\Orders();

		// Simulate test values.
		$quantity    = wp_rand( 1, 10 );
		$unit_amount = wp_rand( 500, 1000 ); // Amount in cents.
		$currency    = 'usd';
		$ticket_id   = 0;
		$customer    = $stripe->get_or_create_customer();
		$customer_id = $customer->id;
		$return_url  = admin_url( 'admin.php?page=eventkoi#/settings/integrations?stripe_session_id={CHECKOUT_SESSION_ID}' );
		$total_cents = $unit_amount * $quantity;

		// Build Stripe Checkout args inline.
		$checkout_args = array(
			'ui_mode'                    => 'embedded',
			'mode'                       => 'payment',
			'customer'                   => $customer_id,
			'billing_address_collection' => 'required',
			'phone_number_collection'    => array( 'enabled' => true ),
			'adaptive_pricing'           => array( 'enabled' => true ),
			'automatic_tax'              => array( 'enabled' => true ),
			'customer_update'            => array(
				'address' => 'auto',
				'name'    => 'auto',
			),
			'line_items'                 => array(
				array(
					'price_data' => array(
						'unit_amount'  => $unit_amount,
						'product_data' => array(
							/* translators: %d quantity. */
							'name' => sprintf( __( 'Test payment for %d tickets', 'eventkoi' ), $quantity ),
						),
						'currency'     => $currency,
					),
					'quantity'   => $quantity,
				),
			),
			'metadata'                   => array(
				'ticket_id'   => $ticket_id,
				'quantity'    => $quantity,
				'unit_amount' => $unit_amount,
				'currency'    => $currency,
			),
			'return_url'                 => $return_url,
		);

		// Create the Checkout Session.
		$checkout_session = $stripe->create_checkout_session( $checkout_args );
		$checkout_id      = $checkout_session->id;

		// Get IP address.
		$ip_address = eventkoi_get_client_ip();

		// Create the pending order.
		$order_id = $orders->create_order(
			array(
				'id'             => $checkout_id,
				'payment_id'     => '',
				'charge_id'      => '',
				'customer_id'    => $customer_id,
				'customer'       => $customer,
				'payment_status' => 'unpaid',
				'status'         => 'pending',
				'currency'       => $currency,
				'total'          => $total_cents / 100,
				'subtotal'       => $total_cents / 100,
				'item_price'     => $unit_amount / 100,
				'created'        => $checkout_session->created ?? time(),
				'expires_at'     => $checkout_session->expires_at ?? ( time() + 3600 ),
				'livemode'       => $checkout_session->livemode ?? 0,
				'payment_intent' => (object) array(),
				'metadata'       => (object) $checkout_args['metadata'],
				'ticket_id'      => $ticket_id,
				'quantity'       => $quantity,
				'ip_address'     => $ip_address,
			),
			'stripe'
		);

		// Safely add note only if checkout ID is valid.
		if ( ! empty( $checkout_id ) ) {
			$orders->add_note( $order_id, 'order_started' );
			$orders->add_note( $order_id, 'order_awaiting_payment' );
		}

		return rest_ensure_response(
			array( 'clientSecret' => $checkout_session->client_secret )
		);
	}

	/**
	 * Validate Stripe API keys.
	 *
	 * @param WP_REST_Request $request The API request object.
	 * @return WP_REST_Response The response object.
	 */
	public static function validate_stripe_key( WP_REST_Request $request ) {
		$data = json_decode( $request->get_body(), true );

		$public_key = isset( $data['stripe_pk'] ) ? sanitize_text_field( $data['stripe_pk'] ) : '';
		$secret_key = isset( $data['stripe_sk'] ) ? sanitize_text_field( $data['stripe_sk'] ) : '';

		$stripe   = new \EventKoi\Payments\Stripe( $secret_key );
		$response = $stripe->verify_integration( $public_key );

		if ( is_wp_error( $response ) ) {
			return rest_ensure_response( array( 'error' => $response->get_error_message() ) );
		}

		// Set Stripe settings when keys are valid.
		$settings_api = new \EventKoi\Core\Settings();
		$settings     = $settings_api::get();

		$settings['stripe'] = array(
			'publishable_key' => $public_key,
			'secret_key'      => $secret_key,
			'mode'            => $response->livemode ? 'live' : 'test',
			'currency'        => $response->available[0]->currency,
		);
		$settings['mode']   = $response->livemode ? 'live' : 'test';

		$settings_api::set( $settings );

		return rest_ensure_response( $response );
	}
}
