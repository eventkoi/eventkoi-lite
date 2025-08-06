<?php
/**
 * Admin redirects.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Admin
 */

namespace EventKoi\Admin;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles admin redirects for specific post types.
 */
class Redirects {

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'admin_init', array( static::class, 'admin_redirect' ) );
	}

	/**
	 * Redirect users when attempting to create a new event via default WP UI.
	 *
	 * Redirects `/wp-admin/post-new.php?post_type=event` to the EventKoi app page.
	 */
	public static function admin_redirect() {
		global $pagenow;

		if ( 'post-new.php' !== $pagenow ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( isset( $_GET['post_type'] ) && 'event' === sanitize_key( $_GET['post_type'] ) ) {
			// Prevent redirect issues if headers already sent.
			if ( ! headers_sent() ) {
				wp_safe_redirect( admin_url( 'admin.php?page=eventkoi#/events/add' ) );
				exit;
			}
		}
	}
}
