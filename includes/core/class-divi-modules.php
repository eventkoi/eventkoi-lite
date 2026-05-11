<?php
/**
 * Divi module registration for EventKoi Lite.
 *
 * Lite ships the Calendar + Event modules only; Loop + dynamic content tokens
 * are Pro-only.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Divi_Modules.
 */
class Divi_Modules {
	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'et_builder_ready', array( $this, 'register_modules' ) );
		add_action( 'init', array( $this, 'register_pro_fallbacks' ), 20 );
	}

	/**
	 * Register empty handlers for Pro-only Divi module slugs so content
	 * authored with Pro degrades silently instead of leaking raw tag text
	 * when the site is running Lite.
	 */
	public function register_pro_fallbacks() {
		add_shortcode( 'et_pb_eventkoi_loop', '__return_empty_string' );
	}

	/**
	 * Is Divi active.
	 *
	 * @return bool
	 */
	public static function is_divi_active() {
		return defined( 'ET_BUILDER_VERSION' );
	}

	/**
	 * Register the EventKoi Lite modules with Divi.
	 */
	public function register_modules() {
		if ( ! self::is_divi_active() ) {
			return;
		}

		$base_dir = EVENTKOI_PLUGIN_DIR . 'includes/core/divi-modules/';

		require_once $base_dir . 'class-et-builder-module-eventkoicalendar.php';
		require_once $base_dir . 'class-et-builder-module-eventkoievent.php';

		new \ET_Builder_Module_EventkoiCalendar();
		new \ET_Builder_Module_EventkoiEvent();
	}
}
