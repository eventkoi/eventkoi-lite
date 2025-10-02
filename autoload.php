<?php
/**
 * Plugin autoloader.
 *
 * @package EventKoi
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

spl_autoload_register( 'eventkoi_autoloader' );

/**
 * Autoload plugin classes.
 *
 * @param string $class_name The fully-qualified class name.
 */
function eventkoi_autoloader( $class_name ) {
	$parent_namespace  = 'EventKoi';
	$classes_subfolder = 'includes';

	// Only handle classes from our namespace.
	if ( ! str_starts_with( $class_name, $parent_namespace . '\\' ) ) {
		return;
	}

	$base_dir = plugin_dir_path( __FILE__ ) . $classes_subfolder . '/';

	// Strip namespace and convert to path.
	$class_file = substr( $class_name, strlen( $parent_namespace . '\\' ) );
	$class_file = str_replace( '_', '-', strtolower( $class_file ) );

	$parts                = explode( '\\', $class_file );
	$last_index           = count( $parts ) - 1;
	$parts[ $last_index ] = 'class-' . $parts[ $last_index ];
	$relative_path        = implode( '/', $parts ) . '.php';

	$full_path = $base_dir . $relative_path;

	if ( file_exists( $full_path ) ) {
		require_once $full_path;
	}
}
