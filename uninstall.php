<?php
/**
 * Fired when the plugin is uninstalled.
 *
 * @package EventKoi
 */

// Exit if accessed directly.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// EventKoi Pro keeps its settings in the same options, so while Pro is
// installed, active or not, they belong to it.
if ( ! function_exists( 'get_plugins' ) ) {
	require_once ABSPATH . 'wp-admin/includes/plugin.php';
}

foreach ( get_plugins() as $eventkoi_plugin ) {
	if ( 'eventkoi' === ( $eventkoi_plugin['TextDomain'] ?? '' ) ) {
		return;
	}
}

// Delete plugin options.
delete_option( 'eventkoi_settings' );
delete_option( 'eventkoi_api_key' );
