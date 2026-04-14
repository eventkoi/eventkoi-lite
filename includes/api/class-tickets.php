<?php
/**
 * Tickets API.
 *
 * @package EventKoi\API
 */

namespace EventKoi\API;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use EventKoi\Core\Event;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Tickets API.
 */
class Tickets {

	/**
	 * Init.
	 */
	public static function init() {
		self::create_rest_routes();
	}

	/**
	 * Create REST routes.
	 */
	public static function create_rest_routes() {
		register_rest_route(
			'eventkoi/v1',
			'/events/(?P<event_id>\d+)/tickets',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'get_tickets' ),
				'permission_callback' => array( __CLASS__, 'permission_check' ),
				'args'                => array(
					'event_id' => array(
						'required'          => true,
						'validate_callback' => function ( $param ) {
							return is_numeric( $param );
						},
					),
				),
			)
		);

		register_rest_route(
			'eventkoi/v1',
			'/events/(?P<event_id>\d+)/tickets/public',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'get_public_tickets' ),
				'permission_callback' => array( REST::class, 'public_api' ),
				'args'                => array(
					'event_id' => array(
						'required'          => true,
						'validate_callback' => function ( $param ) {
							return is_numeric( $param );
						},
					),
				),
			)
		);

		register_rest_route(
			'eventkoi/v1',
			'/tickets/checkout-session',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'create_checkout_session' ),
				'permission_callback' => array( REST::class, 'public_api' ),
			)
		);

		register_rest_route(
			'eventkoi/v1',
			'/tickets/orders/resend-confirmation',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'resend_ticket_confirmation' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);

		register_rest_route(
			'eventkoi/v1',
			'/tickets/orders/send-refund-confirmation',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'send_refund_confirmation' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);

		register_rest_route(
			'eventkoi/v1',
			'/tickets/orders/archive',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'archive_ticket_order' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);

		register_rest_route(
			'eventkoi/v1',
			'/tickets/orders/checkin',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'update_ticket_checkin' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);

		register_rest_route(
			'eventkoi/v1',
			'/tickets/orders/send-confirmation',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'send_ticket_confirmation_from_checkout' ),
				'permission_callback' => array( REST::class, 'public_api' ),
			)
		);

		register_rest_route(
			'eventkoi/v1',
			'/events/(?P<event_id>\d+)/tickets',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'create_ticket' ),
				'permission_callback' => array( __CLASS__, 'permission_check' ),
				'args'                => array(
					'event_id' => array(
						'required'          => true,
						'validate_callback' => function ( $param ) {
							return is_numeric( $param );
						},
					),
				),
			)
		);

		register_rest_route(
			'eventkoi/v1',
			'/tickets/orders',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'get_ticket_orders' ),
				'permission_callback' => array( __CLASS__, 'permission_check' ),
				'args'                => array(
					'event_id' => array(
						'required'          => true,
						'validate_callback' => function ( $param ) {
							return is_numeric( $param );
						},
					),
				),
			)
		);

		register_rest_route(
			'eventkoi/v1',
			'/tickets/(?P<ticket_id>\d+)',
			array(
				'methods'             => 'PUT',
				'callback'            => array( __CLASS__, 'update_ticket' ),
				'permission_callback' => array( __CLASS__, 'permission_check' ),
				'args'                => array(
					'ticket_id' => array(
						'required'          => true,
						'validate_callback' => function ( $param ) {
							return is_numeric( $param );
						},
					),
				),
			)
		);

		register_rest_route(
			'eventkoi/v1',
			'/tickets/(?P<ticket_id>\d+)',
			array(
				'methods'             => 'DELETE',
				'callback'            => array( __CLASS__, 'delete_ticket' ),
				'permission_callback' => array( __CLASS__, 'permission_check' ),
				'args'                => array(
					'ticket_id' => array(
						'required'          => true,
						'validate_callback' => function ( $param ) {
							return is_numeric( $param );
						},
					),
				),
			)
		);

		register_rest_route(
			'eventkoi/v1',
			'/tickets/local-wc-orders',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'get_local_wc_orders' ),
				'permission_callback' => array( __CLASS__, 'permission_check' ),
			)
		);

		register_rest_route(
			'eventkoi/v1',
			'/tickets/local-stats',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'get_local_ticket_stats' ),
				'permission_callback' => array( __CLASS__, 'permission_check' ),
			)
		);

		register_rest_route(
			'eventkoi/v1',
			'/tickets/combined-stats',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'get_combined_ticket_stats' ),
				'permission_callback' => array( __CLASS__, 'permission_check' ),
			)
		);

		register_rest_route(
			'eventkoi/v1',
			'/tickets/all-orders',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'get_all_orders' ),
				'permission_callback' => array( __CLASS__, 'permission_check' ),
			)
		);
	}

	/**
	 * Permission check.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return bool
	 */
	public static function permission_check( WP_REST_Request $request ) {
		return REST::private_api( $request );
	}

	/**
	 * Build a WHERE clause for ticket_orders queries, shared by every list
	 * and stats endpoint so the gateway/currency/hold filters stay in lockstep.
	 *
	 * Lite is WooCommerce-only, so the gateway filter is always WC and currency
	 * is resolved from WC. Optional filters for event_id and created_at range
	 * are added when provided.
	 *
	 * @param array $args {
	 *     @type int    $event_id Optional event ID filter.
	 *     @type string $from     Optional created_at lower bound.
	 *     @type string $to       Optional created_at upper bound.
	 * }
	 * @return string WHERE clause without the leading "WHERE " keyword.
	 */
	private static function build_ticket_orders_where( array $args = array() ) {
		global $wpdb;

		$currency = function_exists( 'get_woocommerce_currency' ) ? strtoupper( get_woocommerce_currency() ) : '';

		$parts   = array();
		$parts[] = "order_id LIKE 'wc\\_%'";
		$parts[] = "payment_status != 'hold'";

		if ( ! empty( $args['only_archived'] ) ) {
			$parts[] = "payment_status = 'archived'";
		} elseif ( empty( $args['include_archived'] ) ) {
			$parts[] = "payment_status != 'archived'";
		}

		if ( '' !== $currency ) {
			$parts[] = $wpdb->prepare( 'UPPER(currency) = %s', $currency );
		}

		if ( ! empty( $args['event_id'] ) ) {
			$parts[] = $wpdb->prepare( 'event_id = %d', absint( $args['event_id'] ) );
		}

		if ( ! empty( $args['from'] ) ) {
			$parts[] = $wpdb->prepare( 'created_at >= %s', sanitize_text_field( (string) $args['from'] ) );
		}

		if ( ! empty( $args['to'] ) ) {
			$parts[] = $wpdb->prepare( 'created_at <= %s', sanitize_text_field( (string) $args['to'] ) );
		}

		return implode( ' AND ', $parts );
	}

	/**
	 * Get ticket orders for an event.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function get_ticket_orders( WP_REST_Request $request ) {
		global $wpdb;

		$event_id = absint( $request->get_param( 'event_id' ) );

		if ( ! $event_id ) {
			return new WP_Error( 'invalid_event_id', __( 'Invalid event ID.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$table_name       = $wpdb->prefix . 'eventkoi_ticket_orders';
		$include_archived = (bool) $request->get_param( 'include_archived' );
		$only_archived    = (bool) $request->get_param( 'only_archived' );
		$where            = self::build_ticket_orders_where(
			array(
				'event_id'         => $event_id,
				'include_archived' => $include_archived,
				'only_archived'    => $only_archived,
			)
		);

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$orders = $wpdb->get_results(
			"SELECT * FROM {$table_name} WHERE {$where} ORDER BY created_at DESC" // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		);

		if ( null === $orders ) {
			return new WP_Error( 'database_error', __( 'Database error occurred.', 'eventkoi-lite' ), array( 'status' => 500 ) );
		}

		// Group local rows by base order ID for consistent frontend rendering.
		$grouped          = array();
		$master_code_cache = array();
		foreach ( $orders as $row ) {
			// Extract base order_id: "wc_25832:948:CODE" -> "wc_25832".
			$full_id = (string) ( $row->order_id ?? '' );
			$parts   = explode( ':', $full_id, 2 );
			$base_id = $parts[0];

			if ( ! isset( $grouped[ $base_id ] ) ) {
				$email      = (string) ( $row->customer_email ?? '' );
				$avatar_url = $email
					? get_avatar_url(
						$email,
						array(
							'size'    => 64,
							'default' => 'identicon',
						)
					)
					: '';

				$master_code = '';
				if ( ! isset( $master_code_cache[ $base_id ] ) ) {
					if ( preg_match( '/^wc_(\d+)/', $base_id, $m ) && function_exists( 'wc_get_order' ) ) {
						$wc_order = wc_get_order( (int) $m[1] );
						if ( $wc_order ) {
							$master_code_cache[ $base_id ] = (string) $wc_order->get_meta( '_eventkoi_master_checkin_code' );
						} else {
							$master_code_cache[ $base_id ] = '';
						}
					} else {
						$master_code_cache[ $base_id ] = '';
					}
				}
				$master_code = $master_code_cache[ $base_id ];

				$row_status       = (string) ( $row->payment_status ?? 'pending' );
				$effective_status = ( 'archived' === $row_status )
					? (string) ( $row->archived_prev_status ?? 'pending' )
					: $row_status;

				$grouped[ $base_id ] = array(
					'id'                    => $base_id,
					'event_id'              => absint( $row->event_id ?? 0 ),
					'order_id'              => $base_id,
					'customer_name'         => (string) ( $row->customer_name ?? '' ),
					'customer_email'        => $email,
					'avatar_url'            => esc_url_raw( (string) $avatar_url ),
					'payment_status'        => $effective_status,
					'is_archived'           => false,
					'quantity'              => 0,
					'amount_total'          => 0,
					'currency'              => strtolower( (string) ( $row->currency ?? 'usd' ) ),
					'checkin_codes'         => array(),
					'master_checkin_code'   => $master_code,
					'checked_in'            => 0,
					'checked_in_count'      => 0,
					'created_at'            => (string) ( $row->created_at ?? '' ),
					'_archived_count'       => 0,
					'_total_count'          => 0,
				);
			}

			++$grouped[ $base_id ]['_total_count'];
			if ( 'archived' === (string) ( $row->payment_status ?? '' ) ) {
				++$grouped[ $base_id ]['_archived_count'];
			}

			$grouped[ $base_id ]['quantity']     += absint( $row->quantity ?? 1 );
			$grouped[ $base_id ]['amount_total'] += (int) round( (float) ( $row->total_amount ?? 0 ) * 100 );

			$token = (string) ( $row->checkin_token ?? '' );
			if ( '' !== $token ) {
				$grouped[ $base_id ]['checkin_codes'][] = $token;
			}
			if ( absint( $row->checked_in ?? 0 ) > 0 ) {
				$grouped[ $base_id ]['checked_in']        = 1;
				$grouped[ $base_id ]['checked_in_count'] += 1;
			}
		}

		foreach ( $grouped as &$entry ) {
			$total    = (int) ( $entry['_total_count'] ?? 0 );
			$archived = (int) ( $entry['_archived_count'] ?? 0 );
			if ( $total > 0 && $archived === $total ) {
				$entry['is_archived'] = true;
			}
			unset( $entry['_total_count'], $entry['_archived_count'] );
		}
		unset( $entry );

		// Sort by created_at descending.
		$result = array_values( $grouped );
		usort(
			$result,
			static function ( $a, $b ) {
				return strcmp( (string) ( $b['created_at'] ?? '' ), (string) ( $a['created_at'] ?? '' ) );
			}
		);

		return new WP_REST_Response( $result, 200 );
	}

	/**
	 * Return local WC ticket orders (order_id starts with 'wc_').
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public static function get_local_wc_orders( WP_REST_Request $request ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.Found
		global $wpdb;

		if ( ! \EventKoi\Core\WooCommerce_Checkout::is_active() ) {
			return rest_ensure_response( array() );
		}

		$table = $wpdb->prefix . 'eventkoi_ticket_orders';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$orders = $wpdb->get_results(
			"SELECT * FROM {$table} WHERE order_id LIKE 'wc\\_%' ORDER BY created_at DESC" // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		);

		if ( ! $orders ) {
			return rest_ensure_response( array() );
		}

		// Group rows by base order ID (e.g. wc_25832) and build order-level records.
		$grouped   = array();
		$event_ids = array(); // Collect unique event IDs to resolve names.
		foreach ( $orders as $row ) {
			// Extract base order_id: "wc_25832:948:CODE" -> "wc_25832".
			$parts   = explode( ':', $row->order_id, 2 );
			$base_id = $parts[0];
			$eid     = absint( $row->event_id ?? 0 );

			if ( $eid ) {
				$event_ids[ $eid ] = true;
			}

			if ( ! isset( $grouped[ $base_id ] ) ) {
				$email      = (string) ( $row->customer_email ?? '' );
				$avatar_url = $email
					? get_avatar_url(
						$email,
						array(
							'size'    => 64,
							'default' => 'identicon',
						)
					)
					: '';

				$grouped[ $base_id ] = array(
					'id'             => $base_id,
					'order_id'       => $base_id,
					'event_ids'      => array(),
					'event_names'    => array(),
					'customer_name'  => (string) ( $row->customer_name ?? '' ),
					'customer_email' => $email,
					'avatar_url'     => esc_url_raw( (string) $avatar_url ),
					'payment_status' => (string) ( $row->payment_status ?? 'pending' ),
					'status'         => (string) ( $row->payment_status ?? 'pending' ),
					'quantity'       => 0,
					'amount_total'   => 0,
					'currency'       => strtolower( (string) ( $row->currency ?? 'usd' ) ),
					'created_at'     => (string) ( $row->created_at ?? '' ),
					'gateway'        => 'woocommerce',
					'items'          => array(),
				);
			}

			if ( $eid && ! in_array( $eid, $grouped[ $base_id ]['event_ids'], true ) ) {
				$grouped[ $base_id ]['event_ids'][] = $eid;
			}

			$grouped[ $base_id ]['quantity']     += absint( $row->quantity ?? 1 );
			$grouped[ $base_id ]['amount_total'] += (float) ( $row->total_amount ?? 0 ) * 100;
		}

		// Resolve event names from post titles.
		$name_map = array();
		foreach ( array_keys( $event_ids ) as $eid ) {
			$title = get_the_title( $eid );
			if ( $title ) {
				$name_map[ $eid ] = $title;
			}
		}
		foreach ( $grouped as &$order ) {
			foreach ( $order['event_ids'] as $eid ) {
				if ( isset( $name_map[ $eid ] ) ) {
					$order['event_names'][ (string) $eid ] = $name_map[ $eid ];
				}
			}
			if ( ! empty( $order['event_ids'] ) ) {
				$order['event_id'] = $order['event_ids'][0];
			}
		}
		unset( $order );

		return rest_ensure_response( array_values( $grouped ) );
	}

	/**
	 * Return ticket order stats from the local database.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public static function get_local_ticket_stats( WP_REST_Request $request ) {
		global $wpdb;

		if ( ! \EventKoi\Core\WooCommerce_Checkout::is_active() ) {
			return rest_ensure_response(
				array(
					'total_orders'   => 0,
					'total_earnings' => 0,
					'tickets_sold'   => 0,
					'refund_amount'  => 0,
				)
			);
		}

		$event_id   = absint( $request->get_param( 'event_id' ) );
		$orders_tbl = $wpdb->prefix . 'eventkoi_ticket_orders';
		$where      = self::build_ticket_orders_where( array( 'event_id' => $event_id ) );

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$row = $wpdb->get_row(
			"SELECT
				COUNT(DISTINCT SUBSTRING_INDEX(order_id, ':', 1)) AS total_orders,
				COALESCE(SUM(CASE WHEN payment_status IN ('complete','completed','succeeded','partially_refunded') THEN total_amount - refund_amount ELSE 0 END), 0) AS total_earnings,
				COALESCE(SUM(CASE WHEN payment_status IN ('complete','completed','succeeded','partially_refunded') THEN quantity ELSE 0 END), 0) AS tickets_sold,
				COALESCE(SUM(refund_amount), 0) AS refund_amount
			FROM {$orders_tbl} WHERE {$where}"
		);
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		return rest_ensure_response(
			array(
				'total_orders'   => absint( $row->total_orders ?? 0 ),
				'total_earnings' => (int) round( (float) ( $row->total_earnings ?? 0 ) * 100 ),
				'tickets_sold'   => absint( $row->tickets_sold ?? 0 ),
				'refund_amount'  => (int) round( (float) ( $row->refund_amount ?? 0 ) * 100 ),
			)
		);
	}

	/**
	 * Get ticket stats from local database.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public static function get_combined_ticket_stats( WP_REST_Request $request ) {
		global $wpdb;

		$event_id = absint( $request->get_param( 'event_id' ) );

		$orders_tbl = $wpdb->prefix . 'eventkoi_ticket_orders';
		$where      = self::build_ticket_orders_where( array( 'event_id' => $event_id ) );

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$row = $wpdb->get_row(
			"SELECT
				COUNT(DISTINCT SUBSTRING_INDEX(order_id, ':', 1)) AS total_orders,
				COALESCE(SUM(CASE WHEN payment_status IN ('complete','completed','succeeded','partially_refunded') THEN total_amount - refund_amount ELSE 0 END), 0) AS total_earnings,
				COALESCE(SUM(CASE WHEN payment_status IN ('complete','completed','succeeded','partially_refunded') THEN quantity ELSE 0 END), 0) AS tickets_sold,
				COALESCE(SUM(refund_amount), 0) AS refund_amount
			FROM {$orders_tbl} WHERE {$where}"
		);
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		$total_orders   = absint( $row->total_orders ?? 0 );
		$total_earnings = (int) round( (float) ( $row->total_earnings ?? 0 ) * 100 );
		$tickets_sold   = absint( $row->tickets_sold ?? 0 );
		$refund_amount  = (int) round( (float) ( $row->refund_amount ?? 0 ) * 100 );

		$net_by_currency     = array();
		$refunds_by_currency = array();

		if ( $total_earnings > 0 && function_exists( 'get_woocommerce_currency' ) ) {
			$currency = strtoupper( get_woocommerce_currency() );
			$net_by_currency[ $currency ] = $total_earnings;
		}

		if ( $refund_amount > 0 && function_exists( 'get_woocommerce_currency' ) ) {
			$currency = strtoupper( get_woocommerce_currency() );
			$refunds_by_currency[ $currency ] = $refund_amount;
		}

		return rest_ensure_response(
			array(
				'total_orders'             => $total_orders,
				'total_earnings'           => $total_earnings,
				'tickets_sold'             => $tickets_sold,
				'refund_amount'            => $refund_amount,
				'net_earnings_by_currency' => $net_by_currency,
				'refunds_by_currency'      => $refunds_by_currency,
			)
		);
	}

	/**
	 * Get all orders from local database.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public static function get_all_orders( WP_REST_Request $request ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.Found
		unset( $request );
		global $wpdb;
		$table = $wpdb->prefix . 'eventkoi_ticket_orders';

		self::cleanup_expired_holds();

		$where = self::build_ticket_orders_where( array( 'include_archived' => true ) );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$wc_rows = $wpdb->get_results(
			"SELECT * FROM {$table} WHERE {$where} ORDER BY created_at DESC" // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		);

		$result = array();

		if ( $wc_rows ) {
			$grouped   = array();
			$event_ids = array();
			foreach ( $wc_rows as $row ) {
				$parts   = explode( ':', $row->order_id, 2 );
				$base_id = $parts[0];
				$eid     = absint( $row->event_id ?? 0 );

				if ( $eid ) {
					$event_ids[ $eid ] = true;
				}

				if ( ! isset( $grouped[ $base_id ] ) ) {
					$grouped[ $base_id ] = array(
						'id'                    => $base_id,
						'order_id'              => $base_id,
						'event_ids'             => array(),
						'event_names'           => array(),
						'customer_name'         => (string) ( $row->customer_name ?? '' ),
						'customer_email'        => (string) ( $row->customer_email ?? '' ),
						'payment_status'        => 'pending',
						'status'                => 'pending',
						'is_archived'           => false,
						'quantity'              => 0,
						'amount_total'          => 0,
						'currency'              => strtolower( (string) ( $row->currency ?? 'usd' ) ),
						'created_at'            => (string) ( $row->created_at ?? '' ),
						'gateway'               => 'woocommerce',
						'items'                 => array(),
						'_completed_count'      => 0,
						'_refunded_count'       => 0,
						'_partial_refund_count' => 0,
						'_archived_count'       => 0,
						'_total_count'          => 0,
					);
				}

				if ( $eid && ! in_array( $eid, $grouped[ $base_id ]['event_ids'], true ) ) {
					$grouped[ $base_id ]['event_ids'][] = $eid;
				}

				++$grouped[ $base_id ]['_total_count'];
				$row_status       = (string) ( $row->payment_status ?? '' );
				$effective_status = ( 'archived' === $row_status )
					? (string) ( $row->archived_prev_status ?? '' )
					: $row_status;
				if ( 'archived' === $row_status ) {
					++$grouped[ $base_id ]['_archived_count'];
				}
				if ( 'refunded' === $effective_status ) {
					++$grouped[ $base_id ]['_refunded_count'];
				} elseif ( 'partially_refunded' === $effective_status ) {
					++$grouped[ $base_id ]['_partial_refund_count'];
				} elseif ( 'completed' === $effective_status || 'complete' === $effective_status || 'paid' === $effective_status ) {
					++$grouped[ $base_id ]['_completed_count'];
				}

				$grouped[ $base_id ]['quantity']     += absint( $row->quantity ?? 1 );
				$grouped[ $base_id ]['amount_total'] += (float) ( $row->total_amount ?? 0 ) * 100;
			}

			// Derive aggregate status from per-seat row mix.
			foreach ( $grouped as &$entry ) {
				$completed = (int) ( $entry['_completed_count'] ?? 0 );
				$refunded  = (int) ( $entry['_refunded_count'] ?? 0 );
				$partial   = (int) ( $entry['_partial_refund_count'] ?? 0 );
				$archived  = (int) ( $entry['_archived_count'] ?? 0 );
				$total     = (int) ( $entry['_total_count'] ?? 0 );
				if ( $partial > 0 || ( $refunded > 0 && $completed > 0 ) ) {
					$entry['payment_status'] = 'partially_refunded';
					$entry['status']         = 'partially_refunded';
				} elseif ( $refunded > 0 ) {
					$entry['payment_status'] = 'refunded';
					$entry['status']         = 'refunded';
				} elseif ( $completed > 0 ) {
					$entry['payment_status'] = 'complete';
					$entry['status']         = 'complete';
				}
				if ( $total > 0 && $archived === $total ) {
					$entry['is_archived'] = true;
				}
				unset( $entry['_completed_count'], $entry['_refunded_count'], $entry['_partial_refund_count'], $entry['_archived_count'], $entry['_total_count'] );
			}
			unset( $entry );

			// Resolve event names.
			$name_map = array();
			foreach ( array_keys( $event_ids ) as $eid ) {
				$title = get_the_title( $eid );
				if ( $title ) {
					$name_map[ $eid ] = $title;
				}
			}
			foreach ( $grouped as &$order ) {
				foreach ( $order['event_ids'] as $eid ) {
					if ( isset( $name_map[ $eid ] ) ) {
						$order['event_names'][ (string) $eid ] = $name_map[ $eid ];
					}
				}
				if ( ! empty( $order['event_ids'] ) ) {
					$order['event_id'] = $order['event_ids'][0];
				}
			}
			unset( $order );

			$result = array_values( $grouped );
		}

		return rest_ensure_response( $result );
	}

	/**
	 * Get tickets for an event.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function get_tickets( WP_REST_Request $request ) {
		global $wpdb;

		$event_id = absint( $request->get_param( 'event_id' ) );

		if ( ! $event_id ) {
			return new WP_Error( 'invalid_event_id', __( 'Invalid event ID.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$table_name = $wpdb->prefix . 'eventkoi_tickets';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$tickets = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$table_name} WHERE event_id = %d ORDER BY sort_order ASC, created_at ASC", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$event_id
			)
		);

		if ( null === $tickets ) {
			return new WP_Error( 'database_error', __( 'Database error occurred.', 'eventkoi-lite' ), array( 'status' => 500 ) );
		}

		$global_currency = self::get_global_currency();
		$tickets         = array_map(
			static function ( $ticket ) use ( $global_currency ) {
				if ( ! is_object( $ticket ) ) {
					return $ticket;
				}
				$ticket->currency = $global_currency;
				return $ticket;
			},
			(array) $tickets
		);

		return new WP_REST_Response(
			array(
				'success' => true,
				'tickets' => $tickets,
			),
			200
		);
	}

	/**
	 * Get public ticket data for an event.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function get_public_tickets( WP_REST_Request $request ) {
		global $wpdb;

		if ( function_exists( 'eventkoi_is_tickets_feature_enabled' ) && ! eventkoi_is_tickets_feature_enabled() ) {
			return new WP_REST_Response(
				array(
					'success'         => true,
					'attendance_mode' => 'none',
					'tickets_enabled' => false,
					'tickets'         => array(),
				),
				200
			);
		}

		$event_id    = absint( $request->get_param( 'event_id' ) );
		$instance_ts = absint( $request->get_param( 'instance_ts' ) );

		if ( ! $event_id ) {
			return new WP_Error( 'invalid_event_id', __( 'Invalid event ID.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$event_post = get_post( $event_id );
		if ( ! $event_post || 'eventkoi_event' !== $event_post->post_type ) {
			return new WP_Error( 'invalid_event', __( 'Invalid event.', 'eventkoi-lite' ), array( 'status' => 404 ) );
		}

		$event = new Event( $event_id );

		// Check if event has already ended.
		// For recurring events, use the instance timestamp if provided.
		if ( $instance_ts > 0 ) {
			$event_bound_ts = $instance_ts;
		} else {
			$event_end_ts   = absint( get_post_meta( $event_id, 'end_timestamp', true ) );
			$event_start_ts = absint( get_post_meta( $event_id, 'start_timestamp', true ) );
			$event_bound_ts = $event_end_ts ? $event_end_ts : $event_start_ts;
		}
		$event_ended = ( $event_bound_ts > 0 && $event_bound_ts < time() );

		$event_status = get_post_meta( $event_id, 'status', true );
		if ( 'completed' === $event_status || 'cancelled' === $event_status ) {
			$event_ended = true;
		}

		$table_name = $wpdb->prefix . 'eventkoi_tickets';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$table_name} WHERE event_id = %d AND status = %s ORDER BY sort_order ASC, created_at ASC", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$event_id,
				'active'
			)
		);

		if ( null === $rows ) {
			return new WP_Error( 'database_error', __( 'Database error occurred.', 'eventkoi-lite' ), array( 'status' => 500 ) );
		}

		$now             = ( new \DateTimeImmutable( 'now', wp_timezone() ) )->getTimestamp();
		$tickets         = array();
		$global_currency = self::get_global_currency();

		foreach ( $rows as $ticket ) {
			$sale_start_ts = ! empty( $ticket->sale_start ) ? strtotime( $ticket->sale_start ) : 0;
			$sale_end_ts   = ! empty( $ticket->sale_end ) ? strtotime( $ticket->sale_end ) : 0;

			$is_on_sale = true;
			if ( $sale_start_ts && $now < $sale_start_ts ) {
				$is_on_sale = false;
			}
			if ( $sale_end_ts && $now > $sale_end_ts ) {
				$is_on_sale = false;
			}

			$quantity_available = isset( $ticket->quantity_available ) ? absint( $ticket->quantity_available ) : null;
			if ( null === $ticket->quantity_available ) {
				$quantity_available = null;
			}

			$quantity_sold = isset( $ticket->quantity_sold ) ? absint( $ticket->quantity_sold ) : 0;
			$remaining = null;
			if ( null !== $quantity_available ) {
				$held_qty  = self::get_held_quantity( $event_id, (int) $ticket->id );
				$remaining = max( $quantity_available - $quantity_sold - $held_qty, 0 );
			}

			$tickets[] = array(
				'id'                 => (int) $ticket->id,
				'name'               => sanitize_text_field( $ticket->name ),
				'description'        => wp_kses_post( $ticket->description ?? '' ),
				'price'              => (float) $ticket->price,
				'currency'           => $global_currency,
				'quantity_available' => $quantity_available,
				'quantity_sold'      => $quantity_sold,
				'remaining'          => $remaining,
				'max_per_order'      => isset( $ticket->max_per_order ) ? absint( $ticket->max_per_order ) : null,
				'sale_start'         => ! empty( $ticket->sale_start ) ? $ticket->sale_start : null,
				'sale_end'           => ! empty( $ticket->sale_end ) ? $ticket->sale_end : null,
				'is_on_sale'         => $is_on_sale,
				'terms_conditions'   => wp_kses_post( $ticket->terms_conditions ?? '' ),
			);
		}

		return new WP_REST_Response(
			array(
				'success'                     => true,
				'event_id'                    => $event_id,
				'event_title'                 => get_the_title( $event_id ),
				'attendance_mode'             => $event::get_attendance_mode(),
				'tickets_enabled'             => $event::get_tickets_enabled(),
				'tickets_auto_create_account' => $event::get_tickets_auto_create_account(),
				'tickets_show_remaining'      => $event::get_tickets_show_remaining(),
				'tickets_show_unavailable'    => $event::get_tickets_show_unavailable(),
				'tickets_terms_conditions'    => wp_kses_post( $event::get_tickets_terms_conditions() ),
				'tickets_display_mode'        => $event::get_tickets_display_mode(),
				'event_ended'                 => $event_ended,
				'tickets'                     => $tickets,
			),
			200
		);
	}

	/**
	 * Create a Stripe hosted checkout session for ticket purchases.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function create_checkout_session( WP_REST_Request $request ) {
		if ( function_exists( 'eventkoi_is_tickets_feature_enabled' ) && ! eventkoi_is_tickets_feature_enabled() ) {
			return new WP_Error( 'tickets_disabled', __( 'Tickets are not enabled.', 'eventkoi-lite' ), array( 'status' => 403 ) );
		}

		global $wpdb;

		$event_id            = absint( $request->get_param( 'event_id' ) );
		$instance_ts         = absint( $request->get_param( 'instance_ts' ) );
		$return_url          = esc_url_raw( (string) $request->get_param( 'return_url' ) );
		$checkout_note       = sanitize_text_field( wp_strip_all_tags( (string) $request->get_param( 'checkout_note' ) ) );
		$checkout_attempt_id = sanitize_text_field( (string) $request->get_param( 'checkout_attempt_id' ) );
		$email               = sanitize_email( (string) $request->get_param( 'email' ) );
		$first_name          = sanitize_text_field( (string) $request->get_param( 'first_name' ) );
		$last_name           = sanitize_text_field( (string) $request->get_param( 'last_name' ) );
		$wp_user_id          = absint( $request->get_param( 'wp_user_id' ) );
		$items_raw           = $request->get_param( 'items' );

		if ( ! $event_id ) {
			return new WP_Error( 'invalid_event_id', __( 'Invalid event ID.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$event_post = get_post( $event_id );
		if ( ! ( $event_post instanceof \WP_Post ) || 'eventkoi_event' !== $event_post->post_type ) {
			return new WP_Error( 'invalid_event', __( 'Invalid event.', 'eventkoi-lite' ), array( 'status' => 404 ) );
		}

		// Block purchases for completed, cancelled, or past events.
		$event_status = get_post_meta( $event_id, 'status', true );
		if ( 'completed' === $event_status || 'cancelled' === $event_status ) {
			return new WP_Error( 'event_ended', __( 'This event has ended and is no longer accepting ticket purchases.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		// For recurring events, use the instance timestamp if provided.
		if ( $instance_ts > 0 ) {
			$event_bound_ts = $instance_ts;
		} else {
			$event_end_ts   = absint( get_post_meta( $event_id, 'end_timestamp', true ) );
			$event_start_ts = absint( get_post_meta( $event_id, 'start_timestamp', true ) );
			$event_bound_ts = $event_end_ts ? $event_end_ts : $event_start_ts;
		}
		if ( $event_bound_ts > 0 && $event_bound_ts < time() ) {
			return new WP_Error( 'event_ended', __( 'This event has ended and is no longer accepting ticket purchases.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		// Rate limit checkout session creation.
		if ( class_exists( '\\EventKoi\\Core\\Rate_Limiter' ) ) {
			$ip = \EventKoi\Core\Rate_Limiter::get_client_ip();
			if ( ! \EventKoi\Core\Rate_Limiter::check( 'checkout', $ip, 10, 60 ) ) {
				$retry = \EventKoi\Core\Rate_Limiter::retry_after( 'checkout', $ip );
				return new WP_Error(
					'eventkoi_rate_limit',
					__( 'Too many requests. Please try again later.', 'eventkoi-lite' ),
					array( 'status' => 429 )
				);
			}
		}

		if ( empty( $return_url ) ) {
			$return_url = wp_get_referer();
			$return_url = $return_url ? esc_url_raw( $return_url ) : esc_url_raw( get_permalink( $event_id ) );
		}

		if ( empty( $return_url ) ) {
			$return_url = esc_url_raw( home_url( '/' ) );
		}

		if ( $instance_ts <= 0 ) {
			$instance_ts = absint( $request->get_param( 'event_instance_ts' ) );
		}

		if ( $instance_ts <= 0 ) {
			$instance_ts = self::extract_instance_ts_from_url( $return_url );
		}

		$event_title          = wp_strip_all_tags( get_the_title( $event_id ) );
		$event_instance_title = $event_title;
		if ( $instance_ts > 0 && function_exists( 'eventkoi_get_instance_override' ) ) {
			$instance_override = eventkoi_get_instance_override( $event_id, $instance_ts );
			if (
				is_array( $instance_override ) &&
				isset( $instance_override['title'] ) &&
				is_string( $instance_override['title'] ) &&
				'' !== trim( $instance_override['title'] )
			) {
				$event_instance_title = wp_strip_all_tags( $instance_override['title'] );
			}
		}
		$checkout_context_title = $event_instance_title ? $event_instance_title : $event_title;

		if ( empty( $email ) ) {
			$current_user = wp_get_current_user();
			if ( $current_user instanceof \WP_User && ! empty( $current_user->user_email ) ) {
				$email = sanitize_email( $current_user->user_email );
			}
		}
		if ( $wp_user_id <= 0 ) {
			$wp_user_id = get_current_user_id() ? absint( get_current_user_id() ) : 0;
		}
		if ( empty( $email ) ) {
			return new WP_Error( 'invalid_email', __( 'A valid email address is required.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}
		if ( $wp_user_id <= 0 && ! empty( $email ) ) {
			$auto_create_account = (bool) get_post_meta( $event_id, 'tickets_auto_create_account', true );
			$wp_user_id          = self::resolve_checkout_wp_user_id( $email, $auto_create_account, $first_name, $last_name );
		}
		$wp_user_label = '';
		if ( $wp_user_id > 0 ) {
			$wp_user = get_userdata( $wp_user_id );
			if ( $wp_user instanceof \WP_User ) {
				$wp_user_primary_label = $wp_user->user_login ? $wp_user->user_login : $wp_user->display_name;
				$wp_user_label         = sanitize_text_field( (string) $wp_user_primary_label );
			}
		}

		if ( ! is_array( $items_raw ) ) {
			return new WP_Error( 'invalid_items', __( 'Invalid ticket selection.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$sanitized_items = array();
		foreach ( $items_raw as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			$ticket_id = absint( $item['ticket_id'] ?? 0 );
			$quantity  = absint( $item['quantity'] ?? 0 );

			if ( $ticket_id < 1 || $quantity < 1 ) {
				continue;
			}

			$sanitized_items[] = array(
				'ticket_id' => $ticket_id,
				'quantity'  => $quantity,
			);
		}

		if ( empty( $sanitized_items ) ) {
			return new WP_Error( 'empty_items', __( 'Select at least one ticket.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$ticket_ids = array_values( array_unique( array_map( 'absint', wp_list_pluck( $sanitized_items, 'ticket_id' ) ) ) );
		if ( empty( $ticket_ids ) ) {
			return new WP_Error( 'invalid_items', __( 'Invalid ticket selection.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$ticket_table = $wpdb->prefix . 'eventkoi_tickets';
		$placeholders = implode( ', ', array_fill( 0, count( $ticket_ids ), '%d' ) );
		$sql          = "SELECT * FROM {$ticket_table} WHERE event_id = %d AND id IN ({$placeholders}) AND status = %s"; // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$prepare_args = array_merge( array( $sql, $event_id ), $ticket_ids, array( 'active' ) );
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- Dynamic placeholder list is flattened before prepare().
			$prepared_sql = call_user_func_array( array( $wpdb, 'prepare' ), $prepare_args );

			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Statement was prepared above with a dynamic placeholder list.
			$ticket_rows = $wpdb->get_results( $prepared_sql );

		if ( null === $ticket_rows ) {
			return new WP_Error( 'database_error', __( 'Unable to validate tickets.', 'eventkoi-lite' ), array( 'status' => 500 ) );
		}

		$tickets_by_id = array();
		foreach ( $ticket_rows as $row ) {
			$tickets_by_id[ (int) $row->id ] = $row;
		}

			$now        = ( new \DateTimeImmutable( 'now', wp_timezone() ) )->getTimestamp();
		$currency       = self::get_global_currency();
		$total_cents    = 0;
		$total_quantity = 0;
		$edge_items     = array();

		foreach ( $sanitized_items as $selected ) {
			$ticket_id = (int) $selected['ticket_id'];
			$quantity  = (int) $selected['quantity'];
			$ticket    = $tickets_by_id[ $ticket_id ] ?? null;

			if ( ! $ticket ) {
				return new WP_Error( 'invalid_ticket', __( 'One or more selected tickets are unavailable.', 'eventkoi-lite' ), array( 'status' => 400 ) );
			}

			$sale_start_ts = ! empty( $ticket->sale_start ) ? strtotime( (string) $ticket->sale_start ) : 0;
			$sale_end_ts   = ! empty( $ticket->sale_end ) ? strtotime( (string) $ticket->sale_end ) : 0;

			if ( $sale_start_ts && $now < $sale_start_ts ) {
				return new WP_Error( 'ticket_not_on_sale', __( 'One or more selected tickets are not on sale yet.', 'eventkoi-lite' ), array( 'status' => 400 ) );
			}

			if ( $sale_end_ts && $now > $sale_end_ts ) {
				return new WP_Error( 'ticket_sale_ended', __( 'One or more selected tickets are no longer on sale.', 'eventkoi-lite' ), array( 'status' => 400 ) );
			}

			$max_per_order = isset( $ticket->max_per_order ) ? absint( $ticket->max_per_order ) : 0;
			if ( $max_per_order > 0 && $quantity > $max_per_order ) {
				return new WP_Error( 'max_per_order_exceeded', __( 'Selected quantity exceeds ticket limits.', 'eventkoi-lite' ), array( 'status' => 400 ) );
			}

			if ( null !== $ticket->quantity_available ) {
				$held_qty  = self::get_held_quantity( $event_id, $ticket_id );
				$remaining = max( absint( $ticket->quantity_available ) - absint( $ticket->quantity_sold ) - $held_qty, 0 );
				if ( $quantity > $remaining ) {
					return new WP_Error( 'insufficient_quantity', __( 'Not enough tickets remaining for one or more selections.', 'eventkoi-lite' ), array( 'status' => 400 ) );
				}
			}

			$unit_amount_cents = (int) round( (float) $ticket->price * 100 );
			$total_cents      += $unit_amount_cents * $quantity;
			$total_quantity   += $quantity;

			$ticket_name = sanitize_text_field( (string) $ticket->name );

			$edge_items[] = array(
				'ticket_id'          => $ticket_id,
				'name'               => $ticket_name,
				'description'        => sanitize_text_field( wp_strip_all_tags( (string) ( $ticket->description ?? '' ) ) ),
				'quantity'           => $quantity,
				'unit_amount'        => $unit_amount_cents,
				'currency'           => $currency,
				'quantity_available' => ( null !== $ticket->quantity_available ) ? absint( $ticket->quantity_available ) : null,
				'instance_ts'        => $instance_ts,
				'event_id'           => $event_id,
			);
		}

		if ( $total_cents < 0 || $total_quantity <= 0 ) {
			return new WP_Error( 'invalid_total', __( 'Invalid checkout total.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$metadata = array(
			'event_id'             => (string) $event_id,
			'event_title'          => (string) $event_title,
			'event_instance_title' => (string) $event_instance_title,
			'instance_ts'          => (string) $instance_ts,
			'event_instance_ts'    => (string) $instance_ts,
			'ticket_quantity'      => (string) $total_quantity,
		);
		if ( '' !== $first_name ) {
			$metadata['first_name'] = $first_name;
		}
		if ( '' !== $last_name ) {
			$metadata['last_name'] = $last_name;
		}
		$customer_name = trim( $first_name . ' ' . $last_name );
		if ( '' !== $customer_name ) {
			$metadata['customer_name'] = $customer_name;
		}
		if ( $wp_user_id > 0 ) {
			$metadata['wp_user_id'] = (string) $wp_user_id;
		}
		if ( '' !== $wp_user_label ) {
			$metadata['wp_user_label'] = $wp_user_label;
		}

		$payload = array(
			'return_url'           => $return_url,
			'quantity'             => 1,
			'unit_amount'          => $total_cents,
			'checkout_attempt_id'  => $checkout_attempt_id,
			'event_id'             => $event_id,
			'event_title'          => $event_title,
			'event_instance_title' => $event_instance_title,
			'checkout_note'        => $checkout_note,
			'wp_user_id'           => $wp_user_id,
			'wp_user_label'        => $wp_user_label,
			'first_name'           => $first_name,
			'last_name'            => $last_name,
			'customer_name'        => $customer_name,
			'instance_ts'          => $instance_ts,
			'event_instance_ts'    => $instance_ts,
			'email'                => $email,
			'currency'             => strtolower( $currency ? $currency : 'usd' ),
			'ticket_items'         => $edge_items,
			'items'                => $edge_items,
			'metadata'             => $metadata,
		);

		// Create inventory holds for all selected tickets.
		$hold_id = 'hold_' . wp_generate_uuid4();
		self::create_inventory_holds( $hold_id, $event_id, $sanitized_items, $tickets_by_id, $currency, $email, $customer_name );

		// Lite requires WooCommerce for checkout.
		if ( ! class_exists( 'WooCommerce' ) ) {
			self::release_inventory_holds( $hold_id );
			return new WP_Error(
				'wc_required',
				__( 'WooCommerce must be installed and activated to process ticket payments.', 'eventkoi-lite' ),
				array( 'status' => 400 )
			);
		}

		$wc_result = \EventKoi\Core\WooCommerce_Checkout::create_checkout_order(
			array(
				'event_id'      => $event_id,
				'event_title'   => $event_title,
				'instance_ts'   => $instance_ts,
				'email'         => $email,
				'first_name'    => $first_name,
				'last_name'     => $last_name,
				'currency'      => $currency,
				'items'         => $edge_items,
				'return_url'    => $return_url,
				'wp_user_id'    => $wp_user_id,
				'wp_user_label' => $wp_user_label,
				'checkout_note' => $checkout_note,
			)
		);

		if ( is_wp_error( $wc_result ) ) {
			self::release_inventory_holds( $hold_id );
			return $wc_result;
		}

		return new WP_REST_Response(
			array(
				'success'     => true,
				'hosted_url'  => $wc_result['hosted_url'],
				'wc_order_id' => $wc_result['wc_order_id'],
				'event_id'    => $event_id,
				'instance_ts' => $instance_ts,
				'total_cents' => $total_cents,
				'currency'    => strtolower( $currency ? $currency : 'usd' ),
			),
			200
		);
	}

	/**
	 * Resend ticket confirmation email by order ID.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function resend_ticket_confirmation( WP_REST_Request $request ) {
		$order_id = sanitize_text_field( (string) $request->get_param( 'order_id' ) );
		if ( '' === $order_id ) {
			return new WP_Error( 'missing_order_id', __( 'Missing order ID.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$result = \EventKoi\Core\Ticket_Emails::resend_for_order( $order_id );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'sent'    => (bool) ( $result['sent'] ?? false ),
			)
		);
	}

	/**
	 * Send refund confirmation email for an order.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function send_refund_confirmation( WP_REST_Request $request ) {
		$order_id = sanitize_text_field( (string) $request->get_param( 'order_id' ) );
		if ( '' === $order_id ) {
			return new WP_Error( 'missing_order_id', __( 'Missing order ID.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$refund_amount = floatval( $request->get_param( 'refund_amount' ) );
		$refund_items  = $request->get_param( 'refund_items' );
		$refund_items  = is_array( $refund_items ) ? $refund_items : array();

		$result = \EventKoi\Core\Ticket_Emails::send_refund_for_order( $order_id, $refund_amount, $refund_items );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'sent'    => (bool) ( $result['sent'] ?? false ),
			)
		);
	}

	/**
	 * Archive or unarchive a ticket order by order ID.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function archive_ticket_order( WP_REST_Request $request ) {
		$order_id = sanitize_text_field( (string) $request->get_param( 'order_id' ) );
		if ( '' === $order_id ) {
			return new WP_Error( 'missing_order_id', __( 'Missing order ID.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$mode = sanitize_key( (string) $request->get_param( 'mode' ) );
		if ( 'unarchive' !== $mode ) {
			$mode = 'archive';
		}

		if ( 'archive' === $mode ) {
			self::soft_archive_rows( $order_id );
			if ( 0 === strpos( $order_id, 'wc_' ) ) {
				self::archive_wc_order( $order_id );
			}
		} else {
			self::soft_unarchive_rows( $order_id );
			if ( 0 === strpos( $order_id, 'wc_' ) ) {
				self::unarchive_wc_order( $order_id );
			}
		}

		self::invalidate_order_caches();

		return rest_ensure_response(
			array(
				'success' => true,
				'mode'    => $mode,
			)
		);
	}

	/**
	 * Soft-archive ticket_orders rows: save current payment_status into
	 * archived_prev_status and set payment_status='archived', then recount
	 * quantity_sold so archived rows stop counting as sales.
	 */
	private static function soft_archive_rows( $order_id ) {
		global $wpdb;

		$table = $wpdb->prefix . 'eventkoi_ticket_orders';
		$like  = $wpdb->esc_like( $order_id ) . ':%';
		$rows  = self::fetch_order_event_ticket_map( $order_id );

		if ( empty( $rows ) ) {
			return;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query(
			$wpdb->prepare(
				"UPDATE {$table} SET archived_prev_status = payment_status, payment_status = 'archived' WHERE ( order_id = %s OR order_id LIKE %s ) AND payment_status <> 'archived'", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$order_id,
				$like
			)
		);

		self::recount_affected_tickets( $rows );
	}

	/**
	 * Restore ticket_orders rows from archived state.
	 */
	private static function soft_unarchive_rows( $order_id ) {
		global $wpdb;

		$table = $wpdb->prefix . 'eventkoi_ticket_orders';
		$like  = $wpdb->esc_like( $order_id ) . ':%';
		$rows  = self::fetch_order_event_ticket_map( $order_id );

		if ( empty( $rows ) ) {
			return;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query(
			$wpdb->prepare(
				"UPDATE {$table} SET payment_status = COALESCE(NULLIF(archived_prev_status, ''), 'completed'), archived_prev_status = NULL WHERE ( order_id = %s OR order_id LIKE %s ) AND payment_status = 'archived'", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$order_id,
				$like
			)
		);

		self::recount_affected_tickets( $rows );
	}

	private static function fetch_order_event_ticket_map( $order_id ) {
		global $wpdb;
		$table = $wpdb->prefix . 'eventkoi_ticket_orders';
		$like  = $wpdb->esc_like( $order_id ) . ':%';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		return $wpdb->get_results(
			$wpdb->prepare(
				"SELECT DISTINCT event_id, ticket_id FROM {$table} WHERE order_id = %s OR order_id LIKE %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$order_id,
				$like
			)
		);
	}

	private static function recount_affected_tickets( $rows ) {
		$by_event = array();
		foreach ( $rows as $row ) {
			$eid = absint( $row->event_id );
			$tid = absint( $row->ticket_id );
			if ( $eid && $tid ) {
				$by_event[ $eid ][] = array( 'ticket_id' => $tid );
			}
		}
		foreach ( $by_event as $event_id => $items ) {
			\EventKoi\Core\Ticket_Order_Sync::sync_quantity_sold( $event_id, $items );
		}
	}

	/**
	 * Cancel a WC order and remember the previous status for later restore.
	 */
	private static function archive_wc_order( $order_id ) {
		if ( ! preg_match( '/^wc_(\d+)/', $order_id, $m ) || ! function_exists( 'wc_get_order' ) ) {
			return;
		}
		$wc_order = wc_get_order( (int) $m[1] );
		if ( ! $wc_order ) {
			return;
		}
		$current = (string) $wc_order->get_status();
		if ( 'cancelled' !== $current && '' === (string) $wc_order->get_meta( '_eventkoi_archive_prev_status' ) ) {
			$wc_order->update_meta_data( '_eventkoi_archive_prev_status', $current );
		}
		$wc_order->update_meta_data( '_eventkoi_is_archived', '1' );
		$wc_order->save();
		if ( 'cancelled' !== $current ) {
			$wc_order->update_status( 'cancelled', __( 'Order archived via EventKoi.', 'eventkoi-lite' ) );
		}
	}

	/**
	 * Restore a WC order to its pre-archive status.
	 */
	private static function unarchive_wc_order( $order_id ) {
		if ( ! preg_match( '/^wc_(\d+)/', $order_id, $m ) || ! function_exists( 'wc_get_order' ) ) {
			return;
		}
		$wc_order = wc_get_order( (int) $m[1] );
		if ( ! $wc_order ) {
			return;
		}
		$prev = (string) $wc_order->get_meta( '_eventkoi_archive_prev_status' );
		$wc_order->delete_meta_data( '_eventkoi_archive_prev_status' );
		$wc_order->delete_meta_data( '_eventkoi_is_archived' );
		$wc_order->save();
		if ( '' !== $prev && $prev !== $wc_order->get_status() ) {
			$wc_order->update_status( $prev, __( 'Order unarchived via EventKoi.', 'eventkoi-lite' ) );
		}
	}

	/**
	 * Update ticket check-in status.
	 *
	 * Accepts a base order_id (e.g. "wc_25832") and either:
	 * - action "checked_in": mark N tickets as checked in
	 * - action "check_in": reset all tickets to not checked in
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function update_ticket_checkin( WP_REST_Request $request ) {
		global $wpdb;

		$order_id = sanitize_text_field( (string) $request->get_param( 'order_id' ) );
		if ( '' === $order_id ) {
			return new WP_Error( 'missing_order_id', __( 'Missing order ID.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$action = sanitize_key( (string) $request->get_param( 'action' ) );
		$count  = $request->get_param( 'count' );
		$table  = $wpdb->prefix . 'eventkoi_ticket_orders';

		// Find all rows matching this base order_id.
		// Rows use format "base:ticket_id:code" or just the base ID.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT id, order_id, checked_in FROM {$table} WHERE order_id = %s OR order_id LIKE %s ORDER BY id ASC", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$order_id,
				$wpdb->esc_like( $order_id ) . ':%'
			)
		);

		if ( empty( $rows ) ) {
			return new WP_Error( 'not_found', __( 'Order not found.', 'eventkoi-lite' ), array( 'status' => 404 ) );
		}

		$now        = current_time( 'mysql', true );
		$total_rows = count( $rows );
		$updated    = 0;

		if ( 'check_in' === $action ) {
			// Reset all to unchecked.
			foreach ( $rows as $row ) {
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
				$wpdb->update(
					$table,
					array(
						'checked_in'    => 0,
						'checked_in_at' => null,
					),
					array( 'id' => $row->id ),
					array( '%d', '%s' ),
					array( '%d' )
				);
				++$updated;
			}
		} elseif ( null !== $count ) {
			// Set exactly $count tickets as checked in.
			$target = max( 0, min( (int) $count, $total_rows ) );
			foreach ( $rows as $i => $row ) {
				$should_be_checked = $i < $target;
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
				$wpdb->update(
					$table,
					array(
						'checked_in'    => $should_be_checked ? 1 : 0,
						'checked_in_at' => $should_be_checked ? $now : null,
					),
					array( 'id' => $row->id ),
					array( '%d', '%s' ),
					array( '%d' )
				);
				++$updated;
			}
		} else {
			// "checked_in" — check in all.
			foreach ( $rows as $row ) {
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
				$wpdb->update(
					$table,
					array(
						'checked_in'    => 1,
						'checked_in_at' => $now,
					),
					array( 'id' => $row->id ),
					array( '%d', '%s' ),
					array( '%d' )
				);
				++$updated;
			}
		}

		return rest_ensure_response(
			array(
				'success'          => true,
				'updated'          => $updated,
				'checked_in_count' => ( null !== $count )
					? max( 0, min( (int) $count, $total_rows ) )
					: ( 'check_in' === $action ? 0 : $total_rows ),
			)
		);
	}

	/**
	 * Send ticket confirmation from checkout success context.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function send_ticket_confirmation_from_checkout( WP_REST_Request $request ) {
		$checkout_session_id = sanitize_text_field( (string) $request->get_param( 'checkout_session_id' ) );
		$wc_order_id         = absint( $request->get_param( 'wc_order_id' ) );
		$event_id            = absint( $request->get_param( 'event_id' ) );
		$instance_ts         = absint( $request->get_param( 'instance_ts' ) );

		// WooCommerce orders: confirmation already sent during on_payment_complete.
		if ( $wc_order_id > 0 ) {
			return rest_ensure_response(
				array(
					'success' => true,
					'sent'    => true,
				)
			);
		}

		if ( '' === $checkout_session_id ) {
			return new WP_Error( 'missing_checkout_session_id', __( 'Missing checkout session ID.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$result = \EventKoi\Core\Ticket_Emails::send_for_checkout_session( $checkout_session_id, $event_id, $instance_ts );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'sent'    => (bool) ( $result['sent'] ?? false ),
			)
		);
	}

	/**
	 * Extract instance timestamp from an event URL.
	 *
	 * Supports query-string format (?instance=123...) and pretty-permalink
	 * format (.../1234567890).
	 *
	 * @param string $url URL to inspect.
	 * @return int
	 */
	private static function extract_instance_ts_from_url( $url ) {
		if ( empty( $url ) ) {
			return 0;
		}

		$parts = wp_parse_url( $url );
		if ( ! is_array( $parts ) ) {
			return 0;
		}

		$query = '';
		if ( ! empty( $parts['query'] ) ) {
			$query = (string) $parts['query'];
		}

		if ( '' !== $query ) {
			parse_str( $query, $params );
			$query_instance = absint( $params['instance'] ?? 0 );
			if ( $query_instance > 0 ) {
				return $query_instance;
			}
		}

		$path = '';
		if ( ! empty( $parts['path'] ) ) {
			$path = (string) $parts['path'];
		}

		if ( '' !== $path && preg_match( '#/(\d{9,})/?$#', $path, $matches ) ) {
			$path_instance = absint( $matches[1] ?? 0 );
			if ( $path_instance > 0 ) {
				return $path_instance;
			}
		}

		return 0;
	}

	/**
	 * Create a new ticket.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function create_ticket( WP_REST_Request $request ) {
		global $wpdb;

		$event_id = absint( $request->get_param( 'event_id' ) );
		$data     = $request->get_json_params();

		if ( ! $event_id ) {
			return new WP_Error( 'invalid_event_id', __( 'Invalid event ID.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$name               = sanitize_text_field( $data['name'] ?? '' );
		$description        = wp_kses_post( $data['description'] ?? '' );
		$price              = floatval( $data['price'] ?? 0 );
		$currency           = self::get_global_currency();
		$quantity_available = isset( $data['quantity_available'] ) ? absint( $data['quantity_available'] ) : null;
		$max_per_order      = isset( $data['max_per_order'] ) ? absint( $data['max_per_order'] ) : null;
		$sale_start_raw     = ! empty( $data['sale_start'] ) ? sanitize_text_field( $data['sale_start'] ) : null;
		$sale_end_raw       = ! empty( $data['sale_end'] ) ? sanitize_text_field( $data['sale_end'] ) : null;
		$sale_start         = self::normalize_utc_datetime( $sale_start_raw );
		$sale_end           = self::normalize_utc_datetime( $sale_end_raw );
		$terms_conditions   = wp_kses_post( $data['terms_conditions'] ?? '' );
		$sort_order         = absint( $data['sort_order'] ?? 0 );

		if ( empty( $name ) ) {
			return new WP_Error( 'missing_name', __( 'Ticket name is required.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$table_name = $wpdb->prefix . 'eventkoi_tickets';

		$insert_data   = array(
			'event_id'         => $event_id,
			'name'             => $name,
			'description'      => $description,
			'price'            => $price,
			'currency'         => $currency,
			'sale_start'       => $sale_start,
			'sale_end'         => $sale_end,
			'terms_conditions' => $terms_conditions,
			'sort_order'       => $sort_order,
		);
		$insert_format = array( '%d', '%s', '%s', '%f', '%s', '%s', '%s', '%s', '%d' );

		if ( null !== $quantity_available ) {
			$insert_data['quantity_available'] = $quantity_available;
			$insert_format[]                   = '%d';
		}
		if ( null !== $max_per_order ) {
			$insert_data['max_per_order'] = $max_per_order;
			$insert_format[]              = '%d';
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$result = $wpdb->insert( $table_name, $insert_data, $insert_format );

		if ( false === $result ) {
			return new WP_Error( 'database_error', __( 'Failed to create ticket.', 'eventkoi-lite' ), array( 'status' => 500 ) );
		}

		$ticket_id = $wpdb->insert_id;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Reading the just-created ticket row for the REST response.
		$ticket = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$table_name} WHERE id = %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$ticket_id
			)
		);

		self::bump_events_cache_version();

		return new WP_REST_Response(
			array(
				'success' => true,
				'ticket'  => $ticket,
			),
			201
		);
	}

	/**
	 * Update a ticket.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function update_ticket( WP_REST_Request $request ) {
		global $wpdb;

		$ticket_id = absint( $request->get_param( 'ticket_id' ) );
		$data      = $request->get_json_params();

		if ( ! $ticket_id ) {
			return new WP_Error( 'invalid_ticket_id', __( 'Invalid ticket ID.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$table_name = $wpdb->prefix . 'eventkoi_tickets';

		$update_data = array();
		$format      = array();

		if ( isset( $data['name'] ) ) {
			$update_data['name'] = sanitize_text_field( $data['name'] );
			$format[]            = '%s';
		}

		if ( isset( $data['description'] ) ) {
			$update_data['description'] = wp_kses_post( $data['description'] );
			$format[]                   = '%s';
		}

		if ( isset( $data['price'] ) ) {
			$update_data['price'] = floatval( $data['price'] );
			$format[]             = '%f';
		}

		if ( isset( $data['quantity_available'] ) ) {
			$update_data['quantity_available'] = absint( $data['quantity_available'] );
			$format[]                          = '%d';
		}

		if ( isset( $data['max_per_order'] ) ) {
			$update_data['max_per_order'] = absint( $data['max_per_order'] );
			$format[]                     = '%d';
		}

		$force_null_fields = array();

		if ( array_key_exists( 'sale_start', $data ) ) {
			$sale_start_raw            = ! empty( $data['sale_start'] ) ? sanitize_text_field( $data['sale_start'] ) : null;
			$update_data['sale_start'] = self::normalize_utc_datetime( $sale_start_raw );
			$format[]                  = '%s';
			if ( empty( $update_data['sale_start'] ) ) {
				$force_null_fields[] = 'sale_start';
			}
		}

		if ( array_key_exists( 'sale_end', $data ) ) {
			$sale_end_raw            = ! empty( $data['sale_end'] ) ? sanitize_text_field( $data['sale_end'] ) : null;
			$update_data['sale_end'] = self::normalize_utc_datetime( $sale_end_raw );
			$format[]                = '%s';
			if ( empty( $update_data['sale_end'] ) ) {
				$force_null_fields[] = 'sale_end';
			}
		}

		if ( isset( $data['terms_conditions'] ) ) {
			$update_data['terms_conditions'] = wp_kses_post( $data['terms_conditions'] );
			$format[]                        = '%s';
		}

		if ( isset( $data['sort_order'] ) ) {
			$update_data['sort_order'] = absint( $data['sort_order'] );
			$format[]                  = '%d';
		}

		if ( isset( $data['status'] ) ) {
			$update_data['status'] = sanitize_text_field( $data['status'] );
			$format[]              = '%s';
		}

		if ( empty( $update_data ) ) {
			return new WP_Error( 'no_data', __( 'No data to update.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$update_data['currency'] = self::get_global_currency();
		$format[]                = '%s';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Ticket updates are persisted directly to the tickets table.
		$result = $wpdb->update(
			$table_name,
			$update_data,
			array( 'id' => $ticket_id ),
			$format,
			array( '%d' )
		);

		if ( false === $result ) {
			return new WP_Error( 'database_error', __( 'Failed to update ticket.', 'eventkoi-lite' ), array( 'status' => 500 ) );
		}

		if ( ! empty( $force_null_fields ) ) {
			foreach ( $force_null_fields as $field ) {
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
				$wpdb->query(
					$wpdb->prepare(
						"UPDATE {$table_name} SET {$field} = NULL WHERE id = %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
						$ticket_id
					)
				);
			}
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$ticket = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$table_name} WHERE id = %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$ticket_id
			)
		);

		self::bump_events_cache_version();

		return new WP_REST_Response(
			array(
				'success' => true,
				'ticket'  => $ticket,
			),
			200
		);
	}

	/**
	 * Delete a ticket.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function delete_ticket( WP_REST_Request $request ) {
		global $wpdb;

		$ticket_id = absint( $request->get_param( 'ticket_id' ) );

		if ( ! $ticket_id ) {
			return new WP_Error( 'invalid_ticket_id', __( 'Invalid ticket ID.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$table_name = $wpdb->prefix . 'eventkoi_tickets';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Ticket deletion is performed directly on the tickets table.
		$result = $wpdb->delete(
			$table_name,
			array( 'id' => $ticket_id ),
			array( '%d' )
		);

		if ( false === $result ) {
			return new WP_Error( 'database_error', __( 'Failed to delete ticket.', 'eventkoi-lite' ), array( 'status' => 500 ) );
		}

		self::bump_events_cache_version();

		return new WP_REST_Response(
			array(
				'success' => true,
				'message' => __( 'Ticket deleted successfully.', 'eventkoi-lite' ),
			),
			200
		);
	}

	/**
	 * Bump cached event list version when tickets change.
	 *
	 * @return void
	 */
	private static function bump_events_cache_version() {
		$version = absint( get_option( 'eventkoi_events_cache_version', 1 ) );
		update_option( 'eventkoi_events_cache_version', $version + 1, false );
	}

	/**
	 * Normalize a datetime string into a UTC MySQL datetime (Y-m-d H:i:s).
	 *
	 * @param string|null $value Datetime string in ISO 8601 or MySQL format.
	 * @return string|null
	 */
	private static function normalize_utc_datetime( $value ) {
		if ( empty( $value ) ) {
			return null;
		}

		$trimmed = trim( (string) $value );
		if ( '' === $trimmed ) {
			return null;
		}

		try {
			$dt = new \DateTime( $trimmed, new \DateTimeZone( 'UTC' ) );
			$dt->setTimezone( new \DateTimeZone( 'UTC' ) );
			return $dt->format( 'Y-m-d H:i:s' );
		} catch ( \Exception $e ) {
			return null;
		}
	}

	/**
	 * Resolve global currency from plugin settings.
	 *
	 * When WooCommerce checkout is active, defers to WooCommerce's currency.
	 *
	 * @return string
	 */
	private static function get_global_currency() {
		if ( \EventKoi\Core\WooCommerce_Checkout::is_active() ) {
			return strtoupper( get_woocommerce_currency() );
		}

		$settings = \EventKoi\Core\Settings::get();
		$currency = strtoupper( sanitize_text_field( (string) ( $settings['currency'] ?? 'USD' ) ) );
		if ( ! preg_match( '/^[A-Z]{3}$/', $currency ) ) {
			return 'USD';
		}
		return $currency;
	}

	/**
	 * Invalidate all order/stats transient caches.
	 *
	 * @param int $event_id Optional event ID to clear event-specific caches.
	 */
	public static function invalidate_order_caches( $event_id = 0 ) {
	}

	/**
	 * Resolve WP user id for checkout based on buyer email.
	 *
	 * @param string $email Buyer email.
	 * @param bool   $auto_create_account Whether auto-creation is enabled for this event.
	 * @param string $first_name Buyer first name from checkout.
	 * @param string $last_name Buyer last name from checkout.
	 * @return int
	 */
	private static function resolve_checkout_wp_user_id( $email, $auto_create_account, $first_name = '', $last_name = '' ) {
		$email = sanitize_email( (string) $email );
		if ( empty( $email ) ) {
			return 0;
		}

		$existing_user = get_user_by( 'email', $email );
		if ( $existing_user instanceof \WP_User ) {
			return absint( $existing_user->ID );
		}

		if ( ! $auto_create_account ) {
			return 0;
		}

		return self::create_checkout_wp_user( $email, $first_name, $last_name );
	}

	/**
	 * Create a WordPress user for checkout email and return user id.
	 *
	 * @param string $email Buyer email.
	 * @param string $first_name Buyer first name from checkout.
	 * @param string $last_name Buyer last name from checkout.
	 * @return int
	 */
	private static function create_checkout_wp_user( $email, $first_name = '', $last_name = '' ) {
		$email = sanitize_email( (string) $email );
		if ( empty( $email ) || ! is_email( $email ) ) {
			return 0;
		}
		$first_name = sanitize_text_field( (string) $first_name );
		$last_name  = sanitize_text_field( (string) $last_name );

		$local_part = strstr( $email, '@', true );
		$base_login = sanitize_user( (string) $local_part, true );
		if ( '' === $base_login ) {
			$base_login = 'eventkoi_user';
		}

		$user_login = $base_login;
		$suffix     = 1;
		while ( username_exists( $user_login ) ) {
			$user_login = $base_login . '_' . $suffix;
			++$suffix;
		}

		$password = wp_generate_password( 20, true, true );
		$user_id  = wp_create_user( $user_login, $password, $email );
		if ( is_wp_error( $user_id ) ) {
			return 0;
		}

		$display_name = trim( $first_name . ' ' . $last_name );
		if ( '' === $display_name ) {
			$display_name = ucwords( str_replace( array( '.', '_', '-' ), ' ', (string) $base_login ) );
		}
		wp_update_user(
			array(
				'ID'           => $user_id,
				'first_name'   => $first_name,
				'last_name'    => $last_name,
				'display_name' => $display_name,
				'role'         => 'subscriber',
			)
		);

		if ( function_exists( 'wp_new_user_notification' ) ) {
			wp_new_user_notification( $user_id, null, 'user' );
		}

		return absint( $user_id );
	}

	/**
	 * Hold duration in seconds (30 minutes).
	 *
	 * @var int
	 */
	const HOLD_DURATION = 1800;

	/**
	 * Create inventory hold rows for a checkout attempt.
	 *
	 * @param string $hold_id       Unique hold identifier.
	 * @param int    $event_id      Event ID.
	 * @param array  $items         Sanitized checkout items.
	 * @param array  $tickets_by_id Ticket rows keyed by ID.
	 * @param string $currency      Currency code.
	 * @param string $email         Customer email.
	 * @param string $customer_name Customer name.
	 */
	private static function create_inventory_holds( $hold_id, $event_id, $items, $tickets_by_id, $currency, $email, $customer_name ) {
		global $wpdb;

		$table      = $wpdb->prefix . 'eventkoi_ticket_orders';
		$created_at = gmdate( 'Y-m-d H:i:s' );

		self::cleanup_expired_holds();

		// Release any previous holds from the same customer for this event
		// to prevent stacking when someone clicks "Buy" multiple times.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$table} WHERE event_id = %d AND customer_email = %s AND payment_status = 'hold'", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$event_id,
				$email
			)
		);

		foreach ( $items as $item ) {
			$ticket_id = (int) $item['ticket_id'];
			$quantity  = (int) $item['quantity'];
			$ticket    = $tickets_by_id[ $ticket_id ] ?? null;

			if ( null === $ticket || null === $ticket->quantity_available ) {
				continue;
			}

			$unit_price = (float) ( $ticket->price ?? 0 );

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
			$wpdb->insert(
				$table,
				array(
					'event_id'       => $event_id,
					'ticket_id'      => $ticket_id,
					'order_id'       => $hold_id . ':' . $ticket_id,
					'customer_name'  => $customer_name,
					'customer_email' => $email,
					'quantity'       => $quantity,
					'unit_price'     => $unit_price,
					'total_amount'   => $unit_price * $quantity,
					'currency'       => $currency,
					'payment_status' => 'hold',
					'created_at'     => $created_at,
				),
				array( '%d', '%d', '%s', '%s', '%s', '%d', '%f', '%f', '%s', '%s', '%s' )
			);
		}
	}

	/**
	 * Release inventory holds for a specific hold ID.
	 *
	 * @param string $hold_id Hold identifier.
	 */
	private static function release_inventory_holds( $hold_id ) {
		global $wpdb;

		$table = $wpdb->prefix . 'eventkoi_ticket_orders';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$table} WHERE order_id LIKE %s AND payment_status = 'hold'", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$wpdb->esc_like( $hold_id ) . '%'
			)
		);
	}

	/**
	 * Get the total held quantity for a ticket (unexpired holds).
	 *
	 * @param int $event_id  Event ID.
	 * @param int $ticket_id Ticket ID.
	 * @return int Held quantity.
	 */
	private static function get_held_quantity( $event_id, $ticket_id ) {
		global $wpdb;

		$table     = $wpdb->prefix . 'eventkoi_ticket_orders';
		$threshold = gmdate( 'Y-m-d H:i:s', time() - self::HOLD_DURATION );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$held = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COALESCE(SUM(quantity), 0) FROM {$table} WHERE event_id = %d AND ticket_id = %d AND payment_status = 'hold' AND created_at > %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$event_id,
				$ticket_id,
				$threshold
			)
		);

		return absint( $held );
	}

	/**
	 * Delete expired hold rows from the ticket orders table.
	 */
	private static function cleanup_expired_holds() {
		global $wpdb;

		$table     = $wpdb->prefix . 'eventkoi_ticket_orders';
		$threshold = gmdate( 'Y-m-d H:i:s', time() - self::HOLD_DURATION );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$table} WHERE payment_status = 'hold' AND created_at <= %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$threshold
			)
		);
	}
}
