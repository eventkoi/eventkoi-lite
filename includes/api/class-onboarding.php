<?php
/**
 * REST API - Onboarding endpoints.
 *
 * @package    EventKoi
 * @subpackage EventKoi\API
 */

namespace EventKoi\API;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Class Onboarding.
 *
 * The plugin tour: when it shows, which step each admin is on, and the
 * newsletter signup on its last step.
 */
class Onboarding {

	/**
	 * Site option set on the first activation on a site: offer the tour.
	 */
	const PROMPT_OPTION = 'eventkoi_tour_prompt';

	/**
	 * Site option set once the tour is finished or closed.
	 */
	const COMPLETED_OPTION = 'eventkoi_tour_completed';

	/**
	 * The old quick start's options. Marked done with the tour, so switching
	 * to Pro later does not start Pro's onboarding again.
	 */
	const LEGACY_COMPLETED_OPTION = 'eventkoi_quick_start_completed';
	const LEGACY_PROMPT_OPTION    = 'eventkoi_show_quick_start_prompt';

	/**
	 * Site option: when the tour was offered, as a timestamp.
	 */
	const STARTED_OPTION = 'eventkoi_tour_started';

	/**
	 * User meta: the step this admin is on.
	 */
	const STEP_META = 'eventkoi_tour_step';

	/**
	 * User meta: when this admin last moved a step, as a timestamp.
	 */
	const UPDATED_META = 'eventkoi_tour_updated';

	/**
	 * Number of steps in the tour.
	 */
	const LAST_STEP = 14;

	/**
	 * A tour nobody touched for this long stops showing.
	 */
	const STALE_AFTER = 7 * DAY_IN_SECONDS;

	/**
	 * Need more help: setup guide.
	 */
	const GUIDE_URL = 'https://eventkoi.com/docs/knowledge-base/set-up-eventkoi-lite/';

	/**
	 * Need more help: support forum.
	 */
	const SUPPORT_URL = 'https://wordpress.org/support/plugin/eventkoi-lite/';

	/**
	 * Signup endpoint on eventkoi.com for the email field on the last step.
	 * It adds the address to the EventKoi mailing list on MailerLite, so the
	 * MailerLite key stays on eventkoi.com and never ships in the plugin.
	 */
	const NEWSLETTER_URL = 'https://eventkoi.com/wp-json/eventkoi-site/v1/newsletter';

	/**
	 * Register REST routes.
	 *
	 * @return void
	 */
	public static function init() {
		$routes = array(
			'/onboarding/complete'   => 'complete',
			'/onboarding/demo-event' => 'store_demo_event',
			'/onboarding/tour'       => 'save_step',
			'/onboarding/restart'    => 'restart_tour',
			'/onboarding/subscribe'  => 'subscribe',
		);

		foreach ( $routes as $route => $callback ) {
			register_rest_route(
				EVENTKOI_API,
				$route,
				array(
					'methods'             => 'POST',
					'callback'            => array( self::class, $callback ),
					'permission_callback' => array( self::class, 'permission_check' ),
				)
			);
		}
	}

	/**
	 * Permission callback for onboarding routes.
	 *
	 * @param WP_REST_Request $request Request instance.
	 * @return bool
	 */
	public static function permission_check( WP_REST_Request $request ) {
		$nonce = $request->get_header( 'x_wp_nonce' );

		if ( ! $nonce ) {
			$nonce = $request->get_param( '_wpnonce' );
		}

		if ( ! $nonce || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return false;
		}

		return current_user_can( 'manage_options' );
	}

	/**
	 * Where an admin is in the tour.
	 *
	 * The tour is offered after the first activation on a site, never on an
	 * update, until someone finishes or closes it. It stops showing when it
	 * sat untouched for a week: the welcome a week after it was offered, a
	 * started tour a week after its last step.
	 *
	 * @param int $user_id User ID, the current user when 0.
	 * @return array{active:bool,step:int}
	 */
	public static function get_state( $user_id = 0 ) {
		$user_id = $user_id ? (int) $user_id : get_current_user_id();

		$step = (int) get_user_meta( $user_id, self::STEP_META, true );
		$step = ( $step >= 1 && $step <= self::LAST_STEP ) ? $step : 1;

		if ( ! $user_id || get_option( self::COMPLETED_OPTION ) || ! get_option( self::PROMPT_OPTION ) ) {
			return array(
				'active' => false,
				'step'   => $step,
			);
		}

		$started = (int) get_option( self::STARTED_OPTION, 0 );

		if ( ! $started ) {
			$started = time();
			update_option( self::STARTED_OPTION, $started, false );
		}

		$updated = (int) get_user_meta( $user_id, self::UPDATED_META, true );
		$last    = ( $step > 1 && $updated ) ? $updated : $started;

		return array(
			'active' => ( time() - $last ) <= self::STALE_AFTER,
			'step'   => $step,
		);
	}

	/**
	 * Offer the tour again and put an admin on a step.
	 *
	 * @param int $user_id User ID.
	 * @param int $step    Step to start on.
	 * @return void
	 */
	public static function restart( $user_id, $step = 1 ) {
		delete_option( self::COMPLETED_OPTION );
		update_option( self::PROMPT_OPTION, 'yes' );
		update_option( self::STARTED_OPTION, time(), false );

		self::set_step( $user_id, $step );
	}

	/**
	 * Store the step an admin is on.
	 *
	 * @param int $user_id User ID.
	 * @param int $step    Step number.
	 * @return void
	 */
	private static function set_step( $user_id, $step ) {
		$step = max( 1, min( self::LAST_STEP, (int) $step ) );

		update_user_meta( $user_id, self::STEP_META, $step );
		update_user_meta( $user_id, self::UPDATED_META, time() );
	}

	/**
	 * Mark onboarding as complete/dismissed.
	 *
	 * @return WP_REST_Response
	 */
	public static function complete() {
		update_option( self::COMPLETED_OPTION, 'yes' );
		delete_option( self::PROMPT_OPTION );
		update_option( self::LEGACY_COMPLETED_OPTION, 'yes' );
		delete_option( self::LEGACY_PROMPT_OPTION );

		$user_id = get_current_user_id();
		delete_user_meta( $user_id, self::STEP_META );
		delete_user_meta( $user_id, self::UPDATED_META );

		return rest_ensure_response(
			array(
				'success' => true,
			)
		);
	}

	/**
	 * Save the step the current admin is on.
	 *
	 * @param WP_REST_Request $request Request instance.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function save_step( WP_REST_Request $request ) {
		$step = absint( $request->get_param( 'step' ) );

		if ( $step < 1 || $step > self::LAST_STEP ) {
			return new WP_Error( 'eventkoi_invalid_step', __( 'Invalid tour step.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		self::set_step( get_current_user_id(), $step );

		return rest_ensure_response(
			array(
				'success' => true,
				'step'    => $step,
			)
		);
	}

	/**
	 * Offer the tour again, from the Dashboard's Begin plugin tour link.
	 *
	 * @param WP_REST_Request $request Request instance.
	 * @return WP_REST_Response
	 */
	public static function restart_tour( WP_REST_Request $request ) {
		$step = absint( $request->get_param( 'step' ) );

		self::restart( get_current_user_id(), $step ? $step : 1 );

		return rest_ensure_response(
			array(
				'success' => true,
			)
		);
	}

	/**
	 * Restart the tour from the Start tour link on the Plugins page.
	 *
	 * @return void
	 */
	public static function handle_start_tour() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Sorry, you are not allowed to do that.', 'eventkoi-lite' ), 403 );
		}

		check_admin_referer( 'eventkoi_start_tour' );

		self::restart( get_current_user_id(), 1 );

		wp_safe_redirect( admin_url( 'plugins.php' ) );
		exit;
	}

	/**
	 * Link that restarts the tour on the Plugins page.
	 *
	 * @return string
	 */
	public static function start_tour_url() {
		return wp_nonce_url( admin_url( 'admin-post.php?action=eventkoi_start_tour' ), 'eventkoi_start_tour' );
	}

	/**
	 * Add the email from the last step to the MailerLite list.
	 *
	 * Only sent when the admin types or confirms their email and clicks
	 * Email me.
	 *
	 * @param WP_REST_Request $request Request instance.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function subscribe( WP_REST_Request $request ) {
		$email = sanitize_email( (string) $request->get_param( 'email' ) );

		if ( ! is_email( $email ) ) {
			return new WP_Error( 'eventkoi_invalid_email', __( 'Please enter a valid email address.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$url = self::newsletter_url();

		if ( '' === $url ) {
			return new WP_Error( 'eventkoi_newsletter_unavailable', __( 'Email signup is not available right now.', 'eventkoi-lite' ), array( 'status' => 503 ) );
		}

		// Only the address is sent. The user agent leaves out the site address
		// WordPress adds by default.
		$response = wp_remote_post(
			$url,
			array(
				'timeout'    => 15,
				'user-agent' => 'EventKoi Lite/' . EVENTKOI_VERSION,
				'body'       => array(
					'email' => $email,
				),
			)
		);

		$code = is_wp_error( $response ) ? 0 : (int) wp_remote_retrieve_response_code( $response );

		if ( 400 === $code ) {
			return new WP_Error( 'eventkoi_invalid_email', __( 'Please enter a valid email address.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		if ( 429 === $code ) {
			return new WP_Error( 'eventkoi_newsletter_busy', __( 'Too many signups right now. Please try again later.', 'eventkoi-lite' ), array( 'status' => 429 ) );
		}

		if ( $code < 200 || $code >= 300 ) {
			return new WP_Error( 'eventkoi_newsletter_failed', __( 'Something went wrong. Please try again.', 'eventkoi-lite' ), array( 'status' => 502 ) );
		}

		return rest_ensure_response(
			array(
				'success' => true,
			)
		);
	}

	/**
	 * MailerLite form subscribe URL, if set.
	 *
	 * @return string
	 */
	public static function newsletter_url() {
		/**
		 * Filter the signup URL used by the email field on the tour's last step.
		 *
		 * @param string $url Subscribe URL, empty to turn the signup off.
		 */
		return esc_url_raw( (string) apply_filters( 'eventkoi_tour_newsletter_url', self::NEWSLETTER_URL ) );
	}

	/**
	 * Tour data for the admin screens.
	 *
	 * @return array
	 */
	public static function get_admin_context() {
		$can   = current_user_can( 'manage_options' );
		$state = $can ? self::get_state() : array(
			'active' => false,
			'step'   => 1,
		);
		$user  = wp_get_current_user();
		$base  = trailingslashit( EVENTKOI_PLUGIN_URL ) . 'templates/assets/onboarding/';

		return array(
			'canManage'   => $can,
			'active'      => $can && $state['active'],
			'step'        => $state['step'],
			'demoEventId' => (int) get_option( 'eventkoi_demo_event_id', 0 ),
			'rest'        => esc_url_raw( rest_url( EVENTKOI_API . '/onboarding' ) ),
			'nonce'       => wp_create_nonce( 'wp_rest' ),
			'adminUrl'    => admin_url( 'admin.php?page=eventkoi' ),
			'email'       => $user ? $user->user_email : '',
			'avatar'      => $base . 'lesley-sim.jpg',
			'signature'   => $base . 'lesley-sim-signature.png',
			'guideUrl'    => self::GUIDE_URL,
			'supportUrl'  => self::SUPPORT_URL,
		);
	}

	/**
	 * Tour data for the event and calendar pages the tour opens.
	 *
	 * Only for an admin who reached that step, on a page opened by the tour.
	 *
	 * @return array|null
	 */
	public static function get_front_context() {
		if ( ! is_user_logged_in() || ! current_user_can( 'manage_options' ) ) {
			return null;
		}

		// Read-only: picks which tour step to show, changes nothing.
		$requested = isset( $_GET['eventkoi_tour'] ) ? absint( wp_unslash( $_GET['eventkoi_tour'] ) ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		if ( ! in_array( $requested, array( 7, 11 ), true ) ) {
			return null;
		}

		$state = self::get_state();

		if ( ! $state['active'] || $state['step'] !== $requested ) {
			return null;
		}

		$admin_url = admin_url( 'admin.php?page=eventkoi' );
		$demo_id   = (int) get_option( 'eventkoi_demo_event_id', 0 );

		return array(
			'step'        => $requested,
			'continueUrl' => 7 === $requested
				? $admin_url . '#/events/' . $demo_id . '/main?eventkoi_tour=8'
				: $admin_url . '#/calendars?eventkoi_tour=12',
			'guideUrl'    => self::GUIDE_URL,
			'supportUrl'  => self::SUPPORT_URL,
		);
	}

	/**
	 * Store demo event ID so the onboarding flow can reuse it.
	 *
	 * @param WP_REST_Request $request Request instance.
	 * @return WP_REST_Response
	 */
	public static function store_demo_event( WP_REST_Request $request ) {
		$event_id = absint( $request->get_param( 'event_id' ) );

		if ( $event_id > 0 ) {
			update_option( 'eventkoi_demo_event_id', $event_id );
		} else {
			delete_option( 'eventkoi_demo_event_id' );
		}

		return rest_ensure_response(
			array(
				'success'  => true,
				'event_id' => $event_id,
			)
		);
	}
}
