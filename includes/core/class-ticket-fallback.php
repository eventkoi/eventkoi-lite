<?php
/**
 * No-JavaScript ticket checkout fallback.
 *
 * The ticket "Buy tickets" button is a React modal. When a visitor's browser
 * cannot run our script (an old device, a blocking extension, a firewall),
 * the modal never appears and the buyer is stuck. This renders a plain,
 * server-side ticket form inside the same ticket area as a progressive-
 * enhancement baseline: React replaces it on mount (so normal buyers get the
 * modal, unchanged), but if the script never runs the form stays and works.
 * Its POST is routed through the exact same checkout pipeline as the modal, so
 * every gateway (Stripe, WooCommerce, SureCart) and all validation is reused.
 *
 * @package EventKoi\Core
 */

namespace EventKoi\Core;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Ticket checkout fallback.
 */
class Ticket_Fallback {

	/**
	 * Admin-post action name.
	 */
	const ACTION = 'eventkoi_ticket_fallback';

	/**
	 * Register the form handler for logged-in and guest buyers.
	 */
	public function __construct() {
		add_action( 'admin_post_' . self::ACTION, array( __CLASS__, 'handle' ) );
		add_action( 'admin_post_nopriv_' . self::ACTION, array( __CLASS__, 'handle' ) );
	}

	/**
	 * Fetch the public ticket payload server-side (same source the modal uses).
	 *
	 * @param int $event_id    Event ID.
	 * @param int $instance_ts Instance timestamp.
	 * @return array|null
	 */
	private static function get_public_data( $event_id, $instance_ts = 0 ) {
		if ( ! class_exists( '\EventKoi\API\Tickets' ) ) {
			return null;
		}

		$request = new \WP_REST_Request( 'GET', '/eventkoi/v1/events/' . absint( $event_id ) . '/tickets/public' );
		$request->set_param( 'event_id', absint( $event_id ) );
		if ( $instance_ts ) {
			$request->set_param( 'instance_ts', absint( $instance_ts ) );
		}

		$response = \EventKoi\API\Tickets::get_public_tickets( $request );

		if ( is_wp_error( $response ) ) {
			return null;
		}

		$data = $response instanceof \WP_REST_Response ? $response->get_data() : $response;

		return is_array( $data ) ? $data : null;
	}

	/**
	 * Render the no-JS fallback form for a ticket area. Returned markup is placed
	 * inside the mount node; React clears it when it takes over.
	 *
	 * @param int $event_id    Event ID.
	 * @param int $instance_ts Instance timestamp.
	 * @return string
	 */
	public static function render_form( $event_id, $instance_ts = 0 ) {
		$event_id = absint( $event_id );
		if ( ! $event_id ) {
			return '';
		}

		$data = self::get_public_data( $event_id, $instance_ts );

		if ( ! $data || 'tickets' !== ( $data['attendance_mode'] ?? '' ) ) {
			return '';
		}

		if ( ! empty( $data['event_ended'] ) ) {
			return '';
		}

		$tickets = array();
		foreach ( (array) ( $data['tickets'] ?? array() ) as $ticket ) {
			// Only offer tickets that can actually be bought right now.
			if ( empty( $ticket['is_on_sale'] ) ) {
				continue;
			}
			$remaining = $ticket['remaining'];
			if ( null !== $remaining && (int) $remaining <= 0 ) {
				continue;
			}
			$tickets[] = $ticket;
		}

		if ( empty( $tickets ) ) {
			return '';
		}

		$currency  = (string) ( $tickets[0]['currency'] ?? 'USD' );
		$agreements = array();
		foreach ( (array) ( $data['tickets_agreements'] ?? array() ) as $agreement ) {
			if ( ! empty( $agreement['required'] ) ) {
				$agreements[] = $agreement;
			}
		}
		$terms_required = ! empty( $data['tickets_terms_conditions_required'] )
			&& '' !== trim( wp_strip_all_tags( (string) ( $data['tickets_terms_conditions'] ?? '' ) ) );

		$return_url = self::current_url();
		$action_url = admin_url( 'admin-post.php' );

		ob_start();
		echo self::styles(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static style markup.
		?>
		<form class="eventkoi-tickets__fallback" method="post" action="<?php echo esc_url( $action_url ); ?>">
			<input type="hidden" name="action" value="<?php echo esc_attr( self::ACTION ); ?>" />
			<input type="hidden" name="event_id" value="<?php echo (int) $event_id; ?>" />
			<input type="hidden" name="instance_ts" value="<?php echo (int) $instance_ts; ?>" />
			<input type="hidden" name="return_url" value="<?php echo esc_url( $return_url ); ?>" />
			<?php wp_nonce_field( self::ACTION . '_' . $event_id ); ?>

			<div class="eventkoi-tickets__fallback-title"><?php echo esc_html__( 'Tickets', 'eventkoi-lite' ); ?></div>

			<?php foreach ( $tickets as $ticket ) : ?>
				<?php
				$tid       = absint( $ticket['id'] ?? 0 );
				$name      = (string) ( $ticket['name'] ?? __( 'Ticket', 'eventkoi-lite' ) );
				$price     = (float) ( $ticket['price'] ?? 0 );
				$remaining = $ticket['remaining'];
				$max_order = (int) ( $ticket['max_per_order'] ?? 0 );
				$max       = null !== $remaining ? (int) $remaining : 0;
				if ( $max_order > 0 ) {
					$max = $max > 0 ? min( $max, $max_order ) : $max_order;
				}
				?>
				<div class="eventkoi-tickets__fallback-row">
					<label for="ek-fallback-qty-<?php echo (int) $event_id . '-' . (int) $tid; ?>">
						<span class="eventkoi-tickets__fallback-name"><?php echo esc_html( $name ); ?></span>
						<span class="eventkoi-tickets__fallback-price"><?php echo esc_html( self::format_price( $price, $currency ) ); ?></span>
					</label>
					<input
						type="number"
						id="ek-fallback-qty-<?php echo (int) $event_id . '-' . (int) $tid; ?>"
						name="ek_qty[<?php echo (int) $tid; ?>]"
						min="0"
						<?php echo $max > 0 ? 'max="' . (int) $max . '"' : ''; ?>
						step="1"
						value="0"
						inputmode="numeric"
					/>
				</div>
			<?php endforeach; ?>

			<div class="eventkoi-tickets__fallback-fields">
				<label>
					<span><?php echo esc_html__( 'First name', 'eventkoi-lite' ); ?></span>
					<input type="text" name="first_name" autocomplete="given-name" required />
				</label>
				<label>
					<span><?php echo esc_html__( 'Last name', 'eventkoi-lite' ); ?></span>
					<input type="text" name="last_name" autocomplete="family-name" required />
				</label>
				<label>
					<span><?php echo esc_html__( 'Email address', 'eventkoi-lite' ); ?></span>
					<input type="email" name="email" autocomplete="email" required />
				</label>
			</div>

			<?php if ( $terms_required ) : ?>
				<label class="eventkoi-tickets__fallback-check">
					<input type="checkbox" name="terms_accepted" value="1" required />
					<span><?php echo wp_kses_post( $data['tickets_terms_conditions'] ); ?></span>
				</label>
			<?php endif; ?>

			<?php foreach ( $agreements as $agreement ) : ?>
				<label class="eventkoi-tickets__fallback-check">
					<input type="checkbox" name="agreements[]" value="<?php echo esc_attr( (string) $agreement['id'] ); ?>" required />
					<span><?php echo esc_html( (string) $agreement['text'] ); ?></span>
				</label>
			<?php endforeach; ?>

			<button type="submit" class="eventkoi-tickets__fallback-submit"><?php echo esc_html__( 'Buy tickets', 'eventkoi-lite' ); ?></button>
		</form>
		<?php
		return (string) ob_get_clean();
	}

	/**
	 * Handle the fallback form submission: rebuild the order from server data and
	 * route it through the normal checkout endpoint, then send the buyer to pay.
	 *
	 * @return void
	 */
	public static function handle() {
		$event_id    = isset( $_POST['event_id'] ) ? absint( wp_unslash( $_POST['event_id'] ) ) : 0;
		$instance_ts = isset( $_POST['instance_ts'] ) ? absint( wp_unslash( $_POST['instance_ts'] ) ) : 0;
		$return_url  = isset( $_POST['return_url'] ) ? esc_url_raw( wp_unslash( $_POST['return_url'] ) ) : '';

		if ( ! $event_id || '' === $return_url ) {
			wp_safe_redirect( home_url( '/' ) );
			exit;
		}

		if ( ! isset( $_POST['_wpnonce'] )
			|| ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['_wpnonce'] ) ), self::ACTION . '_' . $event_id ) ) {
			self::redirect_error( $return_url, __( 'Your session expired. Please try again.', 'eventkoi-lite' ) );
		}

		$raw_qty = isset( $_POST['ek_qty'] ) && is_array( $_POST['ek_qty'] )
			? array_map( 'absint', wp_unslash( $_POST['ek_qty'] ) )
			: array();
		$first   = isset( $_POST['first_name'] ) ? sanitize_text_field( wp_unslash( $_POST['first_name'] ) ) : '';
		$last    = isset( $_POST['last_name'] ) ? sanitize_text_field( wp_unslash( $_POST['last_name'] ) ) : '';
		$email   = isset( $_POST['email'] ) ? sanitize_email( wp_unslash( $_POST['email'] ) ) : '';
		$terms   = ! empty( $_POST['terms_accepted'] ) ? '1' : '';
		$agrees  = isset( $_POST['agreements'] ) && is_array( $_POST['agreements'] )
			? array_map( 'sanitize_text_field', wp_unslash( $_POST['agreements'] ) )
			: array();

		if ( '' === $first || '' === $last || ! is_email( $email ) ) {
			self::redirect_error( $return_url, __( 'Please enter your name and a valid email address.', 'eventkoi-lite' ) );
		}

		// Rebuild items from server-side ticket data — never trust posted prices.
		$data = self::get_public_data( $event_id, $instance_ts );
		if ( ! $data ) {
			self::redirect_error( $return_url, __( 'Tickets are unavailable. Please try again.', 'eventkoi-lite' ) );
		}

		$by_id = array();
		foreach ( (array) ( $data['tickets'] ?? array() ) as $ticket ) {
			$by_id[ absint( $ticket['id'] ?? 0 ) ] = $ticket;
		}

		$items = array();
		foreach ( $raw_qty as $tid => $qty ) {
			$tid = absint( $tid );
			$qty = absint( $qty );
			if ( $qty < 1 || empty( $by_id[ $tid ] ) ) {
				continue;
			}
			$ticket  = $by_id[ $tid ];
			$items[] = array(
				'ticket_id'   => $tid,
				'name'        => (string) ( $ticket['name'] ?? 'Ticket' ),
				'description' => (string) ( $ticket['description'] ?? '' ),
				'quantity'    => $qty,
				'unit_amount' => (int) round( (float) ( $ticket['price'] ?? 0 ) * 100 ),
			);
		}

		if ( empty( $items ) ) {
			self::redirect_error( $return_url, __( 'Please choose at least one ticket.', 'eventkoi-lite' ) );
		}

		// Route through the same checkout endpoint the modal uses, so every
		// gateway and all validation behaves identically.
		$request = new \WP_REST_Request( 'POST', '/eventkoi/v1/tickets/checkout-session' );
		$request->set_param( 'event_id', $event_id );
		$request->set_param( 'instance_ts', $instance_ts );
		$request->set_param( 'return_url', $return_url );
		$request->set_param( 'first_name', $first );
		$request->set_param( 'last_name', $last );
		$request->set_param( 'email', $email );
		$request->set_param( 'items', $items );
		$request->set_param( 'terms_accepted', $terms );
		$request->set_param( 'agreements_accepted', $agrees );

		$response = rest_do_request( $request );

		if ( $response->is_error() ) {
			$error = $response->as_error();
			self::redirect_error( $return_url, $error->get_error_message() );
		}

		$body       = $response->get_data();
		$hosted_url = is_array( $body ) ? (string) ( $body['hosted_url'] ?? '' ) : '';

		if ( '' === $hosted_url ) {
			self::redirect_error( $return_url, __( 'Could not start checkout. Please try again.', 'eventkoi-lite' ) );
		}

		// Gateway URLs are external (Stripe/SureCart), so wp_redirect, not safe_redirect.
		wp_redirect( $hosted_url ); // phpcs:ignore WordPress.Security.SafeRedirect.wp_redirect_wp_redirect
		exit;
	}

	/**
	 * Redirect back to the event with an error message and exit.
	 *
	 * @param string $return_url Event URL.
	 * @param string $message    Error message.
	 * @return void
	 */
	private static function redirect_error( $return_url, $message ) {
		$url = add_query_arg(
			array(
				'ek_checkout'       => 'error',
				'ek_checkout_error' => rawurlencode( $message ),
			),
			$return_url
		);
		wp_safe_redirect( $url );
		exit;
	}

	/**
	 * The current front-end URL, used as the checkout return target.
	 *
	 * @return string
	 */
	private static function current_url() {
		$permalink = 0 < get_queried_object_id() ? get_permalink( get_queried_object_id() ) : '';

		if ( $permalink ) {
			return $permalink;
		}

		$scheme = is_ssl() ? 'https' : 'http';
		$host   = isset( $_SERVER['HTTP_HOST'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_HOST'] ) ) : '';
		$uri    = isset( $_SERVER['REQUEST_URI'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';

		return $host ? esc_url_raw( $scheme . '://' . $host . $uri ) : home_url( '/' );
	}

	/**
	 * One-time inline styles for the fallback form, matching the ticket widget's
	 * boxed look so it reads as part of the plugin, not a bare form.
	 *
	 * @return string
	 */
	private static function styles() {
		static $printed = false;
		if ( $printed ) {
			return '';
		}
		$printed = true;

		return '<style id="eventkoi-tickets-fallback-css">'
			. '.eventkoi-tickets__fallback{max-width:450px;border:1px solid #eee;background:#f3f3f3;border-radius:10px;padding:24px;display:flex;flex-direction:column;gap:16px;font-size:15px;color:#1e1e2f}'
			. '.eventkoi-tickets__fallback-title{font-weight:600;text-transform:uppercase;letter-spacing:.02em}'
			. '.eventkoi-tickets__fallback-row{display:flex;align-items:center;justify-content:space-between;gap:12px}'
			. '.eventkoi-tickets__fallback-row label{display:flex;flex-direction:column;gap:2px}'
			. '.eventkoi-tickets__fallback-price{color:#555}'
			. '.eventkoi-tickets__fallback-row input[type=number]{width:72px;padding:8px;border:1px solid #ddd;border-radius:8px;background:#fff}'
			. '.eventkoi-tickets__fallback-fields{display:flex;flex-direction:column;gap:10px}'
			. '.eventkoi-tickets__fallback-fields label{display:flex;flex-direction:column;gap:4px}'
			. '.eventkoi-tickets__fallback-fields input{padding:10px;border:1px solid #ddd;border-radius:8px;background:#fff}'
			. '.eventkoi-tickets__fallback-check{display:flex;align-items:flex-start;gap:8px;font-size:13px;color:#555}'
			. '.eventkoi-tickets__fallback-check input{margin-top:3px}'
			. '.eventkoi-tickets__fallback-submit{appearance:none;border:0;border-radius:9999px;background:#1e1e2f;color:#fff;font-weight:600;padding:14px 20px;cursor:pointer;font-size:15px}'
			. '.eventkoi-tickets__fallback-submit:hover{opacity:.9}'
			. '</style>';
	}

	/**
	 * Format a major-unit price with its currency for display.
	 *
	 * @param float  $amount   Amount in major units.
	 * @param string $currency ISO currency.
	 * @return string
	 */
	private static function format_price( $amount, $currency ) {
		$currency = strtoupper( (string) $currency );
		$symbols  = array(
			'USD' => '$',
			'EUR' => '€',
			'GBP' => '£',
			'AUD' => 'A$',
			'CAD' => 'C$',
		);
		$symbol   = $symbols[ $currency ] ?? '';
		$has_cents = abs( $amount - floor( $amount ) ) > 0.000001;
		$formatted = number_format_i18n( $amount, $has_cents ? 2 : 0 );

		return '' !== $symbol ? $symbol . $formatted : $formatted . ' ' . $currency;
	}
}
