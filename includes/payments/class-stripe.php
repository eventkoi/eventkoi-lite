<?php
/**
 * Stripe.
 *
 * @package EventKoi
 */

namespace EventKoi\Payments;

use EKLIB\StellarWP\DB\DB;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Stripe.
 */
class Stripe {

	/**
	 * Stripe client instance.
	 *
	 * @var \Stripe\StripeClient
	 */
	private $stripe = null;

	/**
	 * Secret key.
	 *
	 * @var string
	 */
	private $secret_key = null;

	/**
	 * Constructor.
	 *
	 * @param string $secret_key Optional. Override Stripe secret key.
	 */
	public function __construct( $secret_key = null ) {
		require_once EVENTKOI_PLUGIN_DIR . 'includes/payments/stripe-php/init.php';

		$settings_api = new \EventKoi\Core\Settings();
		$settings     = $settings_api::get();

		$this->secret_key = ! empty( $settings['stripe']['secret_key'] ) ? $settings['stripe']['secret_key'] : '';

		if ( $secret_key ) {
			$this->secret_key = $secret_key;
		}

		if ( ! empty( $this->secret_key ) ) {
			$this->stripe = new \Stripe\StripeClient( $this->secret_key );
		}
	}

	/**
	 * Create a checkout session.
	 *
	 * @param array $args Checkout session args.
	 * @return \Stripe\Checkout\Session
	 */
	public function create_checkout_session( $args ) {
		return $this->stripe->checkout->sessions->create( $args );
	}

	/**
	 * Get a checkout session ID using a payment intent.
	 *
	 * @param string $payment_id A payment intent ID.
	 * @return string
	 */
	public function get_checkout_session_id( $payment_id = '' ) {
		$sessions = $this->stripe->checkout->sessions->all(
			array(
				'payment_intent' => $payment_id,
				'limit'          => 1,
			)
		);

		return $sessions->data[0]->id;
	}

	/**
	 * Retrieve a Stripe Checkout Session with expanded payment intent and latest charge info,
	 * then parse it into an array for order creation.
	 *
	 * @param string $checkout_id Get the details from a given session ID.
	 * @param array  $expand      Additional objects to expand.
	 * @return array|null Parsed session data or null on failure.
	 */
	public function retrieve_checkout_session( $checkout_id = null, $expand = array() ) {
		if ( empty( $checkout_id ) ) {
			return null;
		}

		$default_expand = array_merge(
			array(
				'customer',
				'payment_intent',
				'payment_intent.latest_charge',
				'payment_intent.latest_charge.balance_transaction',
				'payment_intent.latest_charge.payment_method_details',
			),
			$expand
		);

		$max_attempts = 5;
		$attempt      = 0;
		$session      = null;

		do {
			try {
				$session = $this->stripe->checkout->sessions->retrieve(
					$checkout_id,
					array( 'expand' => $default_expand )
				);

				$payment_intent = $session->payment_intent ?? null;
				$latest_charge  = $payment_intent->latest_charge ?? null;

				if ( ! empty( $latest_charge ) && ! empty( $latest_charge->balance_transaction ) ) {
					return array(
						'id'              => $session->id,
						'payment_intent'  => $payment_intent,
						'customer'        => $session->customer,
						'metadata'        => $session->metadata ?? (object) array(),
						'currency'        => $session->currency ?? '',
						'amount_total'    => $session->amount_total ?? 0,
						'amount_subtotal' => $session->amount_subtotal ?? 0,
						'payment_status'  => $session->payment_status ?? '',
						'status'          => 'succeeded',
						'created'         => $session->created ?? time(),
						'expires_at'      => $session->expires_at ?? ( time() + 3600 ),
						'livemode'        => ! empty( $session->livemode ),
					);
				}
			} catch ( \Exception $e ) {
				return null;
			}

			++$attempt;
			sleep( 1 );
		} while ( $attempt < $max_attempts );

		return null;
	}

	/**
	 * Create a customer.
	 *
	 * @param array $args Customer args.
	 * @return \Stripe\Customer|\WP_Error
	 */
	public function create_customer( $args ) {
		try {
			$customer = $this->stripe->customers->create( $args );
		} catch ( \Stripe\Exception\AuthenticationException $e ) {
			return new \WP_Error( 'ek_stripe_invalid_auth', __( 'Invalid Stripe authentication.', 'eventkoi' ) );
		}

		return $customer;
	}

	/**
	 * Returns a customer object, creating one if it doesn't exist.
	 *
	 * @throws \Stripe\Exception\InvalidRequestException If the customer is not found.
	 * @return \Stripe\Customer
	 */
	public function get_or_create_customer() {
		global $current_user;

		$user_id = get_current_user_id();

		$query = DB::table( 'ek_customers' )
			->select( 'customer_id' )
			->where( 'user_id', $user_id )
			->get();

		$queried_id = ! empty( $query ) ? $query->customer_id : null;

		if ( ! empty( $queried_id ) ) {
			try {
				$stripe_customer = $this->stripe->customers->retrieve( $queried_id );
				if ( ! empty( $stripe_customer->deleted ) ) {
					throw new \Stripe\Exception\InvalidRequestException( 'Customer is deleted.' );
				}
				return $stripe_customer;
			} catch ( \Stripe\Exception\InvalidRequestException $e ) { // phpcs:ignore.
				// Fall through to create a new customer.
			}
		}

		$customer = $this->stripe->customers->create(
			array(
				'name'  => $current_user->display_name,
				'email' => $current_user->user_email,
			)
		);

		DB::table( 'ek_customers' )->upsert(
			array(
				'user_id'     => $user_id,
				'customer_id' => $customer->id,
				'email'       => $customer->email,
				'name'        => $customer->name,
				'created'     => $customer->created,
			),
			array( 'user_id' )
		);

		return $customer;
	}

	/**
	 * Create an order from Stripe Checkout Session data.
	 *
	 * @param array $args Stripe session data including payment_intent, customer, metadata, etc.
	 * @return int|false The created order ID on success, false on failure.
	 */
	public function create_order( $args ) {
		if ( empty( $args ) || ! isset( $args['payment_intent'], $args['customer'], $args['metadata'] ) ) {
			return false;
		}

		$payment_intent = $args['payment_intent'];
		$customer       = $args['customer'];
		$metadata       = $args['metadata'];

		$charge = $this->get_charge_from_payment_intent( $payment_intent );

		$order_args    = $this->prepare_order_args( $args, $payment_intent, $customer, $metadata, $charge );
		$charge_args   = $this->prepare_charge_args( $args, $payment_intent, $metadata, $charge );
		$customer_args = $this->prepare_customer_args( $customer );

		$order_args = wp_parse_args(
			$order_args,
			array(
				'checkout_id'    => '',
				'payment_id'     => '',
				'charge_id'      => '',
				'customer_id'    => '',
				'ticket_id'      => 0,
				'quantity'       => 0,
				'subtotal'       => 0,
				'total'          => 0,
				'currency'       => '',
				'payment_status' => '',
				'status'         => '',
				'created'        => time(),
				'expires'        => time() + 3600,
				'live'           => 0,
				'gateway'        => 'stripe',
			)
		);

		$charge_args = wp_parse_args(
			$charge_args,
			array(
				'checkout_id'     => '',
				'payment_id'      => '',
				'charge_id'       => '',
				'amount'          => 0,
				'amount_captured' => 0,
				'amount_refunded' => 0,
				'net'             => 0,
				'fees'            => 0,
				'status'          => '',
				'currency'        => '',
				'created'         => time(),
				'live'            => 0,
				'quantity'        => 0,
				'gateway'         => 'stripe',
			)
		);

		$checkout_id = $order_args['checkout_id'];

		// Add last_updated timestamp before upsert.
		$order_args['last_updated'] = time();

		// Upsert the order record.
		DB::table( 'ek_orders' )->upsert( $order_args, array( 'checkout_id' ) );

		// Retrieve the inserted or existing order ID.
		$order_row = DB::table( 'ek_orders' )
		->where( 'checkout_id', $checkout_id )
		->get();

		if ( ! $order_row || empty( $order_row->id ) ) {
			return false;
		}

		$order_id = absint( $order_row->id );

		// Attach order_id to charge_args before inserting charge data.
		if ( ! empty( $charge ) && ! empty( $charge->id ) ) {
			$charge_args['order_id'] = $order_id;

			DB::table( 'ek_charges' )->upsert(
				$charge_args,
				array( 'charge_id' )
			);
		}

		// Update customer.
		if ( ! empty( $customer_args ) && ! empty( $customer->id ) ) {
			DB::table( 'ek_customers' )
			->where( 'customer_id', $customer->id )
			->update( $customer_args );
		}

		// Add system note based on order status.
		if ( ! empty( $charge ) && ! empty( $charge->id ) ) {
			$orders = new \EventKoi\Core\Orders();

			switch ( $order_args['status'] ) {
				case 'complete':
					$orders->add_note( $order_id, 'order_completed' );
					break;

				case 'failed':
					$reason = isset( $charge->failure_message ) ? $charge->failure_message : __( 'Unknown reason', 'eventkoi' );
					$orders->add_note( $order_id, 'order_failed', $reason );
					break;
			}
		}

		return $order_id;
	}

	/**
	 * Get the Stripe charge object from a payment intent.
	 *
	 * @param \Stripe\PaymentIntent $payment_intent Stripe payment intent.
	 * @return object|null Stripe charge object or null if not available.
	 */
	private function get_charge_from_payment_intent( $payment_intent ) {
		return $payment_intent->latest_charge ?? null;
	}

	/**
	 * Prepare order arguments for the ek_orders table.
	 *
	 * @param array                 $args            Session args from Stripe webhook.
	 * @param \Stripe\PaymentIntent $payment_intent  Stripe payment intent object.
	 * @param \Stripe\Customer      $customer        Stripe customer object.
	 * @param object                $metadata        Metadata from the session.
	 * @param object|null           $charge          Stripe charge object.
	 * @return array Cleaned and filtered order args.
	 */
	private function prepare_order_args( $args, $payment_intent, $customer, $metadata, $charge ) {
		$billing_details  = $charge->billing_details ?? null;
		$billing_type     = $charge->payment_method_details->type ?? null;
		$customer_address = $customer->address ?? null;

		// Map Stripe status to internal order status.
		if ( ! empty( $charge->status ) && 'succeeded' === $charge->status ) {
			$status = 'complete';
		} elseif ( ! empty( $charge->status ) && 'failed' === $charge->status ) {
			$status = 'failed';
		} else {
			$status = $args['status'] ?? 'pending';
		}

		return array_filter(
			array(
				'checkout_id'     => $args['id'] ?? null,
				'payment_id'      => $payment_intent->id ?? null,
				'charge_id'       => $charge->id ?? null,
				'customer_id'     => $customer->id ?? null,
				'payment_status'  => $args['payment_status'] ?? null,
				'status'          => $status,
				'currency'        => $args['currency'] ?? null,
				'total'           => isset( $args['total'] ) ? $args['total'] : ( ( $args['amount_total'] ?? 0 ) / 100 ),
				'subtotal'        => isset( $args['subtotal'] ) ? $args['subtotal'] : ( ( $args['amount_subtotal'] ?? 0 ) / 100 ),
				'item_price'      => isset( $args['item_price'] ) ? $args['item_price'] : null,
				'created'         => $args['created'] ?? null,
				'expires'         => $args['expires_at'] ?? null,
				'billing_type'    => $billing_type,
				'billing_address' => isset( $billing_details->address )
					? wp_json_encode( $billing_details->address->toArray() )
					: ( isset( $customer_address ) ? wp_json_encode( $customer_address->toArray() ) : null ),
				'billing_name'    => $billing_details->name ?? $customer->name ?? null,
				'billing_email'   => $billing_details->email ?? $customer->email ?? null,
				'billing_phone'   => $billing_details->phone ?? $customer->phone ?? null,
				'billing_data'    => ( isset( $billing_type ) && isset( $charge->payment_method_details->{$billing_type} ) )
					? wp_json_encode( $charge->payment_method_details->{$billing_type}->toArray() )
					: null,
				'live'            => ! empty( $args['livemode'] ) ? 1 : 0,
				'ticket_id'       => $metadata->ticket_id ?? 0,
				'quantity'        => $metadata->quantity ?? 0,
				'gateway'         => 'stripe',
				'ip_address'      => $args['ip_address'] ?? null,
			)
		);
	}

	/**
	 * Prepare charge arguments for the ek_charges table.
	 *
	 * @param array                 $args           Session args from Stripe webhook.
	 * @param \Stripe\PaymentIntent $payment_intent Stripe payment intent object.
	 * @param object                $metadata       Metadata object.
	 * @param object|null           $charge         Stripe charge object.
	 * @return array Cleaned and filtered charge args.
	 */
	private function prepare_charge_args( $args, $payment_intent, $metadata, $charge ) {
		$balance = $charge->balance_transaction ?? null;

		return array_filter(
			array(
				'checkout_id'     => $args['id'] ?? null,
				'payment_id'      => $payment_intent->id ?? null,
				'charge_id'       => $charge->id ?? null,
				'amount'          => ( $charge->amount ?? 0 ) / 100,
				'amount_captured' => ( $charge->amount_captured ?? 0 ) / 100,
				'amount_refunded' => ( $charge->amount_refunded ?? 0 ) / 100,
				'net'             => ( $balance->net ?? $charge->amount ?? 0 ) / 100,
				'fees'            => ( $balance->fee ?? 0 ) / 100,
				'status'          => $charge->status ?? null,
				'currency'        => $balance->currency ?? $args['currency'] ?? null,
				'created'         => $balance->created ?? $args['created'] ?? null,
				'live'            => ! empty( $args['livemode'] ) ? 1 : 0,
				'quantity'        => $metadata->quantity ?? 0,
				'gateway'         => 'stripe',
			)
		);
	}

	/**
	 * Prepare customer arguments for the ek_customers table.
	 *
	 * @param \Stripe\Customer $customer Stripe customer object.
	 * @return array Cleaned and filtered customer args.
	 */
	private function prepare_customer_args( $customer ) {
		$address = $customer->address ?? (object) array();

		return array_filter(
			array(
				'city'        => $address->city ?? null,
				'country'     => $address->country ?? null,
				'line1'       => $address->line1 ?? null,
				'line2'       => $address->line2 ?? null,
				'postal_code' => $address->postal_code ?? null,
				'state'       => $address->state ?? null,
				'name'        => $customer->name ?? null,
				'email'       => $customer->email ?? null,
				'phone'       => $customer->phone ?? null,
			)
		);
	}

	/**
	 * Refund payment.
	 *
	 * @param string $charge_id   A charge transaction ID (optional if checkout_id is provided).
	 * @param string $checkout_id Optional. Stripe Checkout Session ID.
	 * @param int    $amount      The amount to refund in cents.
	 */
	public function refund( $charge_id = '', $checkout_id = '', $amount = 0 ) {
		if ( empty( $charge_id ) && empty( $checkout_id ) ) {
			return;
		}

		// If only checkout_id is provided, fetch the charge_id.
		if ( empty( $charge_id ) && ! empty( $checkout_id ) ) {
			$charge_id = DB::table( 'ek_charges' )
				->select( 'charge_id' )
				->where( 'checkout_id', $checkout_id )
				->value( 'charge_id' );
		}

		if ( empty( $charge_id ) ) {
			return;
		}

		// Build refund arguments.
		$refund_args = array( 'charge' => $charge_id );
		if ( $amount > 0 ) {
			$refund_args['amount'] = $amount;
		}

		try {
			$refund = $this->stripe->refunds->create( $refund_args );
		} catch ( \Stripe\Exception\ApiErrorException $e ) {
			return;
		}

		// Retrieve payment_intent ID.
		$payment_id = '';
		if ( ! empty( $refund ) && ! empty( $refund->payment_intent ) ) {
			$payment_id = $refund->payment_intent;
		} else {
			$payment_intent = DB::table( 'ek_charges' )
				->select( 'payment_id' )
				->where( 'charge_id', $charge_id )
				->get();

			if ( ! empty( $payment_intent ) && isset( $payment_intent->payment_id ) ) {
				$payment_id = $payment_intent->payment_id;
			}
		}

		if ( empty( $payment_id ) ) {
			return;
		}

		// Get full payment intent with charge details.
		$payment = $this->stripe->paymentIntents->retrieve(
			$payment_id,
			array( 'expand' => array( 'latest_charge.balance_transaction' ) )
		);

		if ( empty( $payment->latest_charge ) ) {
			return;
		}

		$charge  = $payment->latest_charge;
		$balance = $charge->balance_transaction ?? null;

		$args = array(
			'charge_id'       => $charge->id,
			'amount'          => isset( $charge->amount ) ? $charge->amount / 100 : 0,
			'amount_captured' => isset( $charge->amount_captured ) ? $charge->amount_captured / 100 : 0,
			'amount_refunded' => isset( $charge->amount_refunded ) ? $charge->amount_refunded / 100 : 0,
			'fees'            => isset( $balance->fee ) ? $balance->fee / 100 : 0,
			'net'             => isset( $balance->net ) ? $balance->net / 100 : 0,
		);

		$status = '';
		if ( ! empty( $charge->amount_refunded ) && ! empty( $charge->amount_captured ) ) {
			if ( $charge->amount_refunded < $charge->amount_captured ) {
				$status = 'partially_refunded';
			} else {
				$status = 'refunded';
			}
		}

		$order = new \EventKoi\Core\Order( $charge_id );
		$order->update( $args );
		$order->set_status( $status );

		// Fetch order ID for note writing.
		$order_id = DB::get_var(
			DB::table( 'ek_orders' )
				->select( 'id' )
				->where( 'charge_id', $charge->id )
				->getSQL()
		);

		if ( ! empty( $order_id ) ) {
			$orders = new \EventKoi\Core\Orders();

			if ( 'refunded' === $status ) {
				$orders->add_note( $order_id, 'order_refunded' );
			} elseif ( 'partially_refunded' === $status ) {
				$amount_value = number_format_i18n( $args['amount_refunded'], 2 );
				$orders->add_note( $order_id, 'order_partially_refunded', $amount_value );
			}
		}
	}

	/**
	 * Verify Stripe integration.
	 *
	 * @param string $public_key Stripe publishable key.
	 * @return mixed WP_Error on failure, Stripe account details on success.
	 */
	public function verify_integration( $public_key = '' ) {
		if ( empty( $public_key ) ) {
			return new \WP_Error( 'ek_stripe_missing_key', __( 'Stripe public key is required.', 'eventkoi' ) );
		}

		$response = wp_remote_post(
			'https://api.stripe.com/v1/tokens',
			array(
				'headers' => array(
					// Construct the Basic Auth header for Stripe API. The public key must be base64-encoded per Stripe's specification.
					// This usage is benign and not intended to obfuscate code.
					'Authorization' => 'Basic ' . base64_encode( $public_key . ':' ), // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
					'Content-Type'  => 'application/x-www-form-urlencoded',
				),
				'body'    => array(
					'card[number]'    => '4242424242424242',
					'card[exp_month]' => '12',
					'card[exp_year]'  => '2027',
					'card[cvc]'       => '123',
				),
				'timeout' => 10,
			)
		);

		if ( is_wp_error( $response ) ) {
			return new \WP_Error( 'ek_stripe_request_error', __( 'Stripe API request failed.', 'eventkoi' ), $response->get_error_message() );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( isset( $body['error']['message'] ) && str_contains( $body['error']['message'], 'Invalid API Key' ) ) {
			return new \WP_Error( 'ek_stripe_invalid_key', __( 'Invalid API key provided.', 'eventkoi' ) );
		}

		try {
			$account = $this->stripe->balance->retrieve();
		} catch ( \Stripe\Exception\AuthenticationException $e ) {
			return new \WP_Error( 'ek_stripe_invalid_auth', __( 'Invalid Stripe authentication.', 'eventkoi' ) );
		}

		$settings_api = new \EventKoi\Core\Settings();
		$settings     = $settings_api::get();
		$webhook_url  = untrailingslashit( home_url() ) . '/?rest_route=/' . EVENTKOI_API . '/stripe';

		$webhook_id    = $settings['stripe_webhook']->id ?? '';
		$webhook_setup = null;

		if ( ! empty( $webhook_id ) ) {
			try {
				$webhook_setup = $this->stripe->webhookEndpoints->retrieve( $webhook_id );
			} catch ( \Stripe\Exception\InvalidRequestException | \Stripe\Exception\InvalidArgumentException $e ) { // phpcs:ignore.
				// Continue.
			}
		}

		if ( empty( $webhook_setup->id ) ) {
			try {
				$webhook = $this->stripe->webhookEndpoints->create(
					array(
						'enabled_events' => array( '*' ),
						'description'    => __( 'Stripe event listener for EventKoi.', 'eventkoi' ),
						'url'            => $webhook_url,
					)
				);

				$settings['stripe_webhook'] = $webhook;
				$settings_api::set( $settings );
			} catch ( \Stripe\Exception\InvalidRequestException $e ) { // phpcs:ignore.
				// Continue.
			}
		}

		return $account;
	}

	/**
	 * Get currency.
	 *
	 * @return string
	 */
	public function get_currency() {
		$currency = 'usd';
		return apply_filters( 'eventkoi_get_stripe_currency', $currency );
	}
}
