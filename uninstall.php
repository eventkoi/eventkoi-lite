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

// Delete plugin options.
delete_option( 'eventkoi_settings' );
