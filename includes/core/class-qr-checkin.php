<?php
/**
 * QR check-in handler.
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
 * Handle QR check-ins via a global query param.
 *
 * QR scanning / check-in is a Pro feature. Lite registers the handler only
 * so a scanned QR shows a clear "upgrade required" message instead of a
 * confusing homepage redirect when an old email's QR is scanned.
 */
class QR_Checkin {

	/**
	 * Pending QR response payload.
	 *
	 * @var array|null
	 */
	private static $qr_payload = null;

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'template_redirect', array( $this, 'maybe_handle_qr_checkin' ) );
		add_action( 'wp_footer', array( $this, 'render_qr_overlay' ) );
	}

	/**
	 * Render an upgrade-required message when a QR check-in URL is hit in Lite.
	 *
	 * @return void
	 */
	public function maybe_handle_qr_checkin() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- QR token would be the request credential; here we only detect the URL shape.
		if ( empty( $_GET['eventkoi_qr'] ) ) {
			return;
		}

		$this->queue_qr_payload(
			__( 'QR check-in is a Pro feature. Upgrade to scan codes and check in attendees.', 'eventkoi-lite' ),
			403,
			'&#10005;'
		);
	}

	/**
	 * Queue a response payload.
	 *
	 * @param string $message Response message.
	 * @param int    $status  HTTP status.
	 * @param string $icon    Optional HTML entity icon.
	 * @return void
	 */
	private function queue_qr_payload( $message, $status, $icon ) {
		self::$qr_payload = array(
			'message'       => $message,
			'status'        => $status,
			'icon'          => $icon,
			'show_form'     => false,
			'count_updated' => false,
			'count'         => 0,
			'max'           => 0,
		);

		status_header( $status );
		nocache_headers();

		if ( $this->wants_json_response() ) {
			wp_send_json( self::$qr_payload, $status );
		}
	}

	/**
	 * Determine if the request expects a JSON response.
	 *
	 * @return bool
	 */
	private function wants_json_response() {
		$accept = isset( $_SERVER['HTTP_ACCEPT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_ACCEPT'] ) ) : '';
		$flag   = isset( $_SERVER['HTTP_X_EVENTKOI_QR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_EVENTKOI_QR'] ) ) : '';

		return false !== strpos( $accept, 'application/json' ) || '1' === $flag;
	}

	/**
	 * Render the QR overlay mount point.
	 *
	 * @return void
	 */
	public function render_qr_overlay() {
		if ( empty( self::$qr_payload ) ) {
			return;
		}

		$payload = wp_json_encode( self::$qr_payload );
		if ( ! $payload ) {
			return;
		}

		printf(
			'<div id="eventkoi-qr-checkin" class="eventkoi-front" data-payload="%s"></div>',
			esc_attr( $payload )
		);
	}
}
