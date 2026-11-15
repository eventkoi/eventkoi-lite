<?php
/**
 * Divi 5 Calendar module.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core\Divi5
 */

namespace EventKoi\Core\Divi5;

defined( 'ABSPATH' ) || exit;

/**
 * Calendar_Module.
 */
class Calendar_Module extends Module_Base {

	/**
	 * Module slug.
	 *
	 * @return string
	 */
	protected static function slug() {
		return 'calendar';
	}
}
