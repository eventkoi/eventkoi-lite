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
	add_filter( 'load_script_translation_file', __NAMESPACE__ . '\\load_script_translation_file', 10, 3 );
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

/**
 * Resolve EventKoi Lite JavaScript translation JSON files from common locations.
 *
 * @param string|false $file   Resolved translation file path.
 * @param string       $handle Script handle.
 * @param string       $domain Text domain.
 * @return string|false
 */
function load_script_translation_file( $file, $handle, $domain ) {
	if ( 'eventkoi-lite' !== $domain || ! in_array( $handle, array( 'eventkoi-admin', 'eventkoi-frontend' ), true ) ) {
		return $file;
	}

	if ( $file && is_readable( $file ) ) {
		return $file;
	}

	$locale          = determine_locale();
	$handle_filename = sprintf( 'eventkoi-lite-%1$s-%2$s.json', $locale, $handle );
	$basename        = $file ? basename( $file ) : $handle_filename;
	$paths           = array(
		WP_LANG_DIR . '/plugins',
		WP_LANG_DIR . '/loco/plugins',
		EVENTKOI_PLUGIN_DIR . 'languages',
	);

	foreach ( $paths as $path ) {
		foreach ( array_unique( array( $basename, $handle_filename ) ) as $filename ) {
			$candidate = trailingslashit( $path ) . $filename;
			if ( is_readable( $candidate ) ) {
				return $candidate;
			}
		}
	}

	return $file;
}
