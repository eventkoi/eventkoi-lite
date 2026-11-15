<?php
/**
 * Divi 5 Event module.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core\Divi5
 */

namespace EventKoi\Core\Divi5;

defined( 'ABSPATH' ) || exit;

/**
 * Event_Module.
 */
class Event_Module extends Module_Base {

	/**
	 * Module slug.
	 *
	 * @return string
	 */
	protected static function slug() {
		return 'event';
	}
}
