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
		// QR check-ins are Pro-only; disable handlers in Lite.
	}

	/**
	 * Handle QR check-ins from the public site.
	 *
	 * @return void
	 */
	public function maybe_handle_qr_checkin() {
		if ( empty( $_GET['eventkoi_qr'] ) ) {
			return;
		}

		// QR check-ins are a Pro feature.
		$this->queue_qr_payload(
			__( 'QR check-ins are a Pro feature.', 'eventkoi-lite' ),
			403,
			'&#10005;',
			null,
			false,
			false
		);
		return;

		$token = sanitize_text_field( wp_unslash( $_GET['eventkoi_qr'] ) );
		if ( empty( $token ) ) {
			return;
		}

		if ( ! is_user_logged_in() || ! current_user_can( 'manage_options' ) ) {
			$this->queue_qr_payload(
				__( 'Not authorized.', 'eventkoi-lite' ),
				403,
				'&#10005;',
				null,
				false,
				false
			);
			return;
		}

		$record = Rsvps::get_by_token( $token );
		if ( empty( $record ) ) {
			$this->queue_qr_payload(
				__( 'Invalid check-in code.', 'eventkoi-lite' ),
				404,
				'&#10005;',
				null,
				false,
				false
			);
			return;
		}

		$status        = sanitize_key( $record->status ?? '' );
		$checkin_state = sanitize_key( $record->checkin_status ?? '' );
		$checked_in_at = isset( $record->checked_in ) ? (string) $record->checked_in : '';
		$has_checked_in_time = ! empty( $checked_in_at ) && '0000-00-00 00:00:00' !== $checked_in_at;

		if ( 'going' !== $status ) {
			$this->queue_qr_payload(
				__( 'RSVP is not marked as going.', 'eventkoi-lite' ),
				403,
				'&#33;',
				$record,
				false,
				false
			);
			return;
		}

		if ( 'denied' === $checkin_state ) {
			$this->queue_qr_payload(
				__( 'Check-in denied.', 'eventkoi-lite' ),
				403,
				'&#10005;',
				$record,
				false,
				false
			);
			return;
		}

		if ( 'checked_in' === $checkin_state || $has_checked_in_time ) {
			$count_updated = $this->maybe_update_checkin_count( $record );
			$this->queue_qr_payload(
				__( 'Already checked in.', 'eventkoi-lite' ),
				200,
				'&#10003;',
				$record,
				true,
				$count_updated
			);
			return;
		}

		$result = Rsvps::update_checkin_status( array( absint( $record->id ) ), 'checked_in' );

		if ( is_wp_error( $result ) ) {
			$this->queue_qr_payload(
				__( 'Check-in failed.', 'eventkoi-lite' ),
				500,
				'&#10005;',
				$record,
				false,
				false
			);
			return;
		}

		$count_updated = $this->maybe_update_checkin_count( $record );

		$this->queue_qr_payload(
			__( 'Checked in.', 'eventkoi-lite' ),
			200,
			'&#10003;',
			$record,
			true,
			$count_updated
		);
		return;
	}

	/**
	 * Update the check-in count from POST data when provided.
	 *
	 * @param object $record RSVP record.
	 * @return void
	 */
	private function maybe_update_checkin_count( &$record ) {
		if ( empty( $_POST['eventkoi_checkin_count'] ) ) {
			return false;
		}

		$raw = wp_unslash( $_POST['eventkoi_checkin_count'] );
		if ( ! is_numeric( $raw ) ) {
			return false;
		}

		$max   = 1 + absint( $record->guests ?? 0 );
		$count = min( absint( $raw ), $max );
		Rsvps::update_checkin_count( array( absint( $record->id ) ), $count );
		$record->checked_in_count = $count;
		return true;
	}

	/**
	 * Render a check-in response with optional count editor.
	 *
	 * @param string $message Response message.
	 * @param int    $status HTTP status.
	 * @param string $icon Optional HTML entity icon.
	 * @param object $record RSVP record.
	 * @param bool   $show_form Whether to show the count form.
	 * @return void
	 */
	private function queue_qr_payload( $message, $status, $icon, $record = null, $show_form = true, $show_updated = false ) {
		$guests        = $record ? absint( $record->guests ?? 0 ) : 0;
		$default_count = 1 + $guests;
		$stored_count  = isset( $record->checked_in_count ) ? $record->checked_in_count : null;
		$current_count = null !== $stored_count ? (int) $stored_count : $default_count;

		self::$qr_payload = array(
			'message'       => $message,
			'status'        => $status,
			'icon'          => $icon,
			'show_form'     => (bool) $show_form,
			'count_updated' => (bool) $show_updated,
			'count'         => $current_count,
			'max'           => $default_count,
		);

		status_header( $status );
		nocache_headers();

		if ( $this->wants_json_response() ) {
			wp_send_json( self::$qr_payload, $status );
		}
	}

	/**
	 * Render a plain text response and exit.
	 *
	 * @param string $message Response message.
	 * @param int    $status  HTTP status.
	 * @param string $icon    Optional HTML entity icon.
	 * @return void
	 */
	private function render_text_response( $message, $status = 200, $icon = '' ) {
		status_header( $status );
		nocache_headers();
		header( 'Content-Type: text/html; charset=UTF-8' );
		$icon_markup = $icon ? '<div style="font-size:48px;line-height:1;">' . $icon . '</div>' : '';
		$body        = sprintf(
			'<div style="min-height:60vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-family:Arial,sans-serif;"><div style="display:flex;flex-direction:column;align-items:center;gap:12px;">%s<div style="font-size:22px;font-weight:600;color:#111;">%s</div></div></div>',
			$icon_markup,
			esc_html( $message )
		);
		echo $body; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		exit;
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
