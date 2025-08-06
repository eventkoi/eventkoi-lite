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
	add_action( 'init', __NAMESPACE__ . '\\load_textdomain' );
}

/**
 * Load plugin textdomain.
 */
function load_textdomain() {
	load_plugin_textdomain(
		'eventkoi',
		false,
		dirname( plugin_basename( EVENTKOI_PLUGIN_FILE ) ) . '/languages'
	);
}
