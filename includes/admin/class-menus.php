<?php
/**
 * Admin menus.
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
 * Admin menu handler.
 */
class Menus {

	/**
	 * Init.
	 */
	public function __construct() {
		add_filter( 'plugin_row_meta', array( static::class, 'add_plugin_meta_links' ), 10, 2 );

		add_action( 'in_admin_header', array( static::class, 'remove_admin_notices' ), 99 );
		add_filter( 'admin_body_class', array( static::class, 'admin_body_class' ), 99 );

		add_action( 'admin_menu', array( static::class, 'admin_menu' ), 10 );
		add_filter( 'custom_menu_order', array( static::class, 'custom_menu_order' ) );

		add_action( 'admin_menu', array( static::class, 'menu_order_fix' ), 999 );
		add_action( 'admin_menu_editor-menu_replaced', array( static::class, 'menu_order_fix' ), 999 );

		add_action( 'admin_head', array( static::class, 'add_menu_css' ) );
	}

	/**
	 * Remove "Visit plugin site" link from plugin row and add custom links.
	 *
	 * @param array  $links Existing plugin meta links.
	 * @param string $file  Path to the plugin file.
	 * @return array Modified plugin meta links.
	 */
	public static function add_plugin_meta_links( $links, $file ) {
		if ( plugin_basename( EVENTKOI_PLUGIN_FILE ) !== $file ) {
			return $links;
		}

		// Remove the "Visit plugin site" link using its aria-label, which is always in English.
		$links = array_filter(
			$links,
			function ( $link ) {
				return false === strpos( $link, 'aria-label="Visit plugin site' );
			}
		);

		// Add our links.
		$links[] = '<a href="' . esc_url( admin_url( 'admin.php?page=eventkoi#/dashboard' ) ) . '">' . esc_html__( 'Dashboard', 'eventkoi' ) . '</a>';
		$links[] = '<a href="' . esc_url( admin_url( 'admin.php?page=eventkoi#/settings' ) ) . '">' . esc_html__( 'Settings', 'eventkoi' ) . '</a>';

		return $links;
	}

	/**
	 * Remove all admin notices on EventKoi pages.
	 */
	public static function remove_admin_notices() {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;

		if ( $screen && 'toplevel_page_eventkoi' === $screen->base ) {
			if ( apply_filters( 'eventkoi_remove_all_admin_notices', true ) ) {
				remove_all_actions( 'admin_notices' );
			}
		}
	}

	/**
	 * Adds custom class to admin <body> tag.
	 *
	 * @param string $classes Existing admin body classes.
	 * @return string Modified classes.
	 */
	public static function admin_body_class( $classes ) {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;

		if ( $screen && ( 'toplevel_page_eventkoi' === $screen->base || str_starts_with( $screen->id, 'eventkoi_' ) ) ) {
			$classes .= ' wp-eventkoi';
		}

		return $classes;
	}

	/**
	 * Register the main EventKoi admin menu and submenus.
	 */
	public static function admin_menu() {
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$page = isset( $_GET['page'] ) ? sanitize_key( $_GET['page'] ) : '';

		if ( 'eventkoi' === $page ) {
			add_filter( 'admin_footer_text', '__return_empty_string', 11 );
			remove_filter( 'update_footer', 'core_update_footer' );
		}

		add_menu_page(
			__( 'Events', 'eventkoi' ),
			__( 'Events', 'eventkoi' ),
			'manage_options',
			'eventkoi',
			array( static::class, 'load_admin' ),
			static::get_admin_icon(),
			'25.8765'
		);

		$menu_items = apply_filters(
			'eventkoi_admin_menu_items',
			array(
				'dashboard' => __( 'Dashboard', 'eventkoi' ),
				'events'    => __( 'Events', 'eventkoi' ),
				'calendars' => __( 'Calendars', 'eventkoi' ),
				// 'tickets'   => __( 'Tickets', 'eventkoi' ),
				'settings'  => __( 'Settings', 'eventkoi' ),
			)
		);

		foreach ( $menu_items as $slug => $label ) {
			add_submenu_page(
				'eventkoi',
				$label,
				$label,
				'manage_options',
				"admin.php?page=eventkoi#/$slug"
			);
		}
	}

	/**
	 * Return base64 encoded SVG for the admin menu icon.
	 *
	 * @return string Data URI.
	 */
	public static function get_admin_icon() {
		$svg = 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNi45MTgiIGhlaWdodD0iMjEuODkiIHZpZXdCb3g9IjAgMCAxNi45MTggMjEuODkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgLTEzLjY5NikiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMTMuNjk2KSI+PHBhdGggZD0iTTYuMTktNzIuNzI1QTMuODE4LDMuODE4LDAsMCwwLDQuODM3LTc1LjM4YTMuMzU5LDMuMzU5LDAsMCwwLTIuNDg0LS44NzZBMS44ODUsMS44ODUsMCwwLDAsLjYxMS03NC45YTEuNjEyLDEuNjEyLDAsMCwwLS4wOTIsMS4wNiw2LjIzLDYuMjMsMCwwLDAsLjUxOCwxLjE3OCw4LjU1LDguNTUsMCwwLDEsLjQuODMyLDQuMzg3LDQuMzg3LDAsMCwxLC4yMjQuNzc1LDcuNTgyLDcuNTgyLDAsMCwwLC45ODQsMi41LDQuNTQyLDQuNTQyLDAsMCwwLDEuNTIsMS42MTMsMS4wMjIsMS4wMjIsMCwwLDAsMS4zNjMtLjEwN3EuNTYzLS4zOTEuNjkzLTIuMzMyQTE4LjMzLDE4LjMzLDAsMCwwLDYuMTktNzIuNzI1Wm0tLjA5LDcuMnEtMS4wMzQsMC0xLjI0MiwyLjdhMTguMTYyLDE4LjE2MiwwLDAsMCwuNDEzLDUuNDQycS42MjIsMi43MzksMS42NzcsMi44NzgsMi4zLjMxMywyLjcyOS0yLjQyMmExMC42MzYsMTAuNjM2LDAsMCwwLS43MzYtNS42NjhRNy43NzMtNjUuNTIxLDYuMS02NS41MjFabTIuMDUtMS41MmEuODguODgsMCwwLDAsLjk0MS40ODcsMi40OSwyLjQ5LDAsMCwwLDEuMTItLjY1N3EuNTgzLS41MzksMS4zODktMS40LjQ4MS0uNjI3LjktMS4wOTFhNS40NjIsNS40NjIsMCwwLDEsLjgwNS0uNzU0LDQuMzc4LDQuMzc4LDAsMCwwLDIuMDUxLTIuOTMxLDIuNDgzLDIuNDgzLDAsMCwwLS45MTctMi41MzMsMi42NzQsMi42NzQsMCwwLDAtMi45MTQtLjAyOEE1LjcxNSw1LjcxNSwwLDAsMCw5LjM0My03My41NSwxMi41MDksMTIuNTA5LDAsMCwwLDcuOS02OS43OCwzLjQyMiwzLjQyMiwwLDAsMCw4LjE0OS02Ny4wNDFaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMC40NjcgNzYuMzU2KSIgZmlsbD0iI2ZmZmZmZiIgLz48L2c+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNy4zMDEgMjAuMDYxKSI+PHBhdGggZD0iTTM0LjU2NC0zMi41MTFhMi44MTYsMi44MTYsMCwwLDAtLjI2OSwxLjI0LDEuNDYxLDEuNDYxLDAsMCwwLC4yNjkuOTEzYy41MzUuODUyLjgxOCwxLjEzOSwxLjEsMS41OWExNS4wMDYsMTUuMDA2LDAsMCwwLDMuOCw0LjEyNXEyLjIyMywxLjYzNSwzLjU4Ljc3NGExLjU1NSwxLjU1NSwwLDAsMCwuODY1LTEuNDQ4LDMuMjM1LDMuMjM1LDAsMCwwLS42MTktMS42MjJBMTcuMTMxLDE3LjEzMSwwLDAsMCw0MS44NS0yOC42N2wtLjMzMi0uMzg2YTIwLjgwNSwyMC44MDUsMCwwLDAtMi41LTIuMjY1LDEwLjYsMTAuNiwwLDAsMC0yLjgtMS42NTZRMzQuOTM2LTMzLjQ0NywzNC41NjQtMzIuNTExWiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTM0LjI5NSAzMy4xMzQpIiBmaWxsPSIjZmZmZmZmIiAvPjwvZz48L2c+PC9zdmc+';

		return 'data:image/svg+xml;base64,' . $svg;
	}

	/**
	 * Renders the EventKoi React app wrapper.
	 */
	public static function load_admin() {
		echo '<div id="eventkoi-admin" class="eventkoi-admin"></div>';
	}

	/**
	 * Allow custom menu ordering.
	 *
	 * @param bool $enabled Whether menu order is enabled.
	 * @return bool
	 */
	public static function custom_menu_order( $enabled ) {
		return $enabled || current_user_can( 'manage_options' );
	}

	/**
	 * Removes the parent EventKoi submenu item.
	 */
	public static function menu_order_fix() {
		global $submenu;

		if ( empty( $submenu['eventkoi'] ) || ! is_array( $submenu['eventkoi'] ) ) {
			return;
		}

		foreach ( $submenu['eventkoi'] as $index => $item ) {
			if ( isset( $item[2] ) && 'eventkoi' === $item[2] ) {
				unset( $submenu['eventkoi'][ $index ] );
			}
		}
	}

	/**
	 * Inline admin CSS for SVG menu icon.
	 */
	public static function add_menu_css() {
		echo '<style>#adminmenu li.toplevel_page_eventkoi div.wp-menu-image.svg { background-size: 12px auto !important; }</style>';
	}
}
