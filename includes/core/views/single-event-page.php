<?php
/**
 * Single event page.
 *
 * @package EventKoi
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

if ( file_exists( get_stylesheet_directory() . '/eventkoi/templates/single-event-legacy.php' ) ) {
	require_once get_stylesheet_directory() . '/eventkoi/templates/single-event-legacy.php';
} elseif ( file_exists( get_template_directory() . '/eventkoi/templates/single-event-legacy.php' ) ) {
	require_once get_template_directory() . '/eventkoi/templates/single-event-legacy.php';
} elseif ( file_exists( EVENTKOI_PLUGIN_DIR . 'templates/single-event-legacy.php' ) ) {
	include_once EVENTKOI_PLUGIN_DIR . 'templates/single-event-legacy.php';
}
