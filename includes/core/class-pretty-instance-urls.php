<?php
/**
 * Pretty instance URLs like /event/post-name/1750658400/.
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
 * Pretty URL support for instance timestamps.
 */
class Pretty_Instance_URLs {

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'add_rewrite_rules' ) );
		add_action( 'eventkoi_register_rewrites', array( $this, 'add_rewrite_rules' ) );
		add_filter( 'query_vars', array( $this, 'add_query_vars' ) );
		add_action( 'parse_request', array( $this, 'maybe_force_post_match' ) );
		add_action( 'template_redirect', array( $this, 'maybe_redirect_to_pretty_url' ) );
	}

	/**
	 * Add custom rewrite rule to support instance URLs.
	 */
	public function add_rewrite_rules() {
		if ( get_option( 'permalink_structure' ) ) {
			add_rewrite_rule(
				'^event/([^/]+)/([0-9]+)/?$',
				'index.php?post_type=event&name=$matches[1]&instance=$matches[2]',
				'top'
			);
		}
	}

	/**
	 * Allow 'instance' as a public query var.
	 *
	 * @param array $vars Query vars.
	 * @return array
	 */
	public function add_query_vars( $vars ) {
		$vars[] = 'instance';
		return $vars;
	}

	/**
	 * Force post match for /event/post-slug/123 URLs.
	 *
	 * @param \WP $wp WP instance.
	 */
	public function maybe_force_post_match( $wp ) {
		if (
			isset( $wp->query_vars['post_type'], $wp->query_vars['name'], $wp->query_vars['instance'] ) &&
			'event' === $wp->query_vars['post_type']
		) {
			$post = get_page_by_path( $wp->query_vars['name'], OBJECT, 'event' );

			if ( $post ) {
				$wp->query_vars['page_id'] = $post->ID;
				$wp->queried_object        = $post;
				$wp->queried_object_id     = $post->ID;
				$wp->is_single             = true;
				$wp->is_singular           = true;
				$wp->is_page               = false;
				$wp->is_404                = false;
				$wp->is_home               = false;
			}
		}
	}

	/**
	 * Redirect ?instance=123 to pretty /event/foo/123/.
	 */
	public function maybe_redirect_to_pretty_url() {
		if ( is_singular( 'event' ) && get_query_var( 'instance' ) ) {
			$instance  = get_query_var( 'instance' );
			$permalink = get_permalink();

			if ( $permalink && isset( $_SERVER['REQUEST_URI'] ) ) {
				$request_path = sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) );

				if ( ! preg_match( '#/[0-9]+/?$#', $request_path ) ) {
					$target_url = trailingslashit( $permalink ) . $instance . '/';

					if ( untrailingslashit( $request_path ) !== untrailingslashit( wp_parse_url( $target_url, PHP_URL_PATH ) ) ) {
						wp_safe_redirect( $target_url, 301 );
						exit;
					}
				}
			}
		}
	}
}
