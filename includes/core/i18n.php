<?php
/**
 * Plugin i18n loader.
 *
 * @package EventKoi
 */

namespace EventKoi\Core;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register i18n hook.
 */
function register_i18n() {
	add_action( 'plugins_loaded', __NAMESPACE__ . '\\load_textdomain' );
}

/**
 * Load plugin textdomain.
 *
 * WordPress auto-loads `wp-content/languages/plugins/eventkoi-lite-{locale}.mo`
 * for plugins on the .org repo, but it never checks the plugin's bundled
 * languages folder unless we point at it explicitly. Passing the path also
 * lets Loco Translate's "Author" save location work out of the box.
 *
 * Resulting search order:
 * 1. wp-content/languages/plugins/eventkoi-lite-{locale}.mo (Loco System / WP.org)
 * 2. wp-content/plugins/eventkoi-lite/languages/eventkoi-lite-{locale}.mo (Loco Author / bundled)
 */
function load_textdomain() {
	\load_plugin_textdomain(
		'eventkoi-lite',
		false,
		dirname( \plugin_basename( EVENTKOI_PLUGIN_FILE ) ) . '/languages'
	);
}
