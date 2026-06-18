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
	add_filter( 'pre_load_script_translations', __NAMESPACE__ . '\\pre_load_script_translations', 10, 4 );
}

/**
 * Serve JavaScript translations from the plugin's loaded .mo file.
 *
 * WordPress loads JS (React) translations from a JSON file whose name is hashed
 * from the *built* bundle path, while Loco Translate (and make-json) key their
 * JSON to the *source* files. The two never match, so translating the calendar,
 * RSVP modal, and other React UI in Loco had no effect even though the PHP .mo
 * was generated correctly.
 *
 * Building the Jed payload from the in-memory translations for our domain lets
 * the JS strings resolve from the exact same .mo a translator edits in Loco, so
 * there is nothing extra to generate, ship, or hash-match.
 *
 * @param string|false|null $translations Pre-resolved JSON, or null to continue.
 * @param string|false      $file         Resolved translation file path.
 * @param string            $handle       Script handle.
 * @param string            $domain       Text domain.
 * @return string|false|null
 */
function pre_load_script_translations( $translations, $file, $handle, $domain ) {
	if ( 'eventkoi-lite' !== $domain || ! in_array( $handle, array( 'eventkoi-admin', 'eventkoi-frontend' ), true ) ) {
		return $translations;
	}

	// If a real JSON file resolved (e.g. a proper make-json build artifact), let WP use it.
	if ( $file && is_readable( $file ) ) {
		return $translations;
	}

	$mo = \get_translations_for_domain( $domain );

	// WP_Translations (WP 6.5+) exposes `entries` through a magic getter with no
	// matching __isset, so empty() reports it empty even when populated. Read it
	// into a variable first so the check and the loop see the real entries.
	$entries = $mo ? $mo->entries : array();
	if ( empty( $entries ) ) {
		return $translations;
	}

	$plural_forms = 'nplurals=2; plural=(n != 1);';
	if ( method_exists( $mo, 'get_header' ) ) {
		$header = $mo->get_header( 'Plural-Forms' );
		if ( is_string( $header ) && '' !== $header ) {
			$plural_forms = $header;
		}
	}

	$messages = array(
		'' => array(
			'domain'       => 'messages',
			'lang'         => \determine_locale(),
			'plural-forms' => $plural_forms,
		),
	);

	foreach ( $entries as $entry ) {
		$has_translation = false;
		foreach ( (array) $entry->translations as $translation ) {
			if ( '' !== $translation ) {
				$has_translation = true;
				break;
			}
		}
		if ( ! $has_translation ) {
			continue;
		}

		// Jed glues context to the singular with the EOT (\4) separator.
		$key = '' !== (string) $entry->context
			? $entry->context . "\4" . $entry->singular
			: $entry->singular;

		$messages[ $key ] = array_values( (array) $entry->translations );
	}

	// Only the header means nothing translatable was found.
	if ( count( $messages ) <= 1 ) {
		return $translations;
	}

	return \wp_json_encode(
		array(
			'translation-revision-date' => '',
			'generator'                 => 'EventKoi',
			'domain'                    => 'messages',
			'locale_data'               => array( 'messages' => $messages ),
		)
	);
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
