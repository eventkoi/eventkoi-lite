<?php
/**
 * Single calendar page.
 *
 * @package EventKoi
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

if ( file_exists( get_stylesheet_directory() . '/eventkoi/templates/single-calendar.php' ) ) {
	require_once get_stylesheet_directory() . '/eventkoi/templates/single-calendar.php';
} elseif ( file_exists( get_template_directory() . '/eventkoi/templates/single-calendar.php' ) ) {
	require_once get_template_directory() . '/eventkoi/templates/single-calendar.php';
} elseif ( file_exists( EVENTKOI_PLUGIN_DIR . 'templates/single-calendar.php' ) ) {
	include_once EVENTKOI_PLUGIN_DIR . 'templates/single-calendar.php';
}
