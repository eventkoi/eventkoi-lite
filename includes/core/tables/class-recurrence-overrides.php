<?php
/**
 * Recurrence Overrides Table.
 *
 * @package EventKoi
 * @subpackage EventKoi\Core\Tables
 */

namespace EventKoi\Core\Tables;

use EKLIB\StellarWP\Schema\Tables\Contracts\Table;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Recurrence_Overrides.
 */
class Recurrence_Overrides extends Table {

	const SCHEMA_VERSION = '1.0.0';

	protected static $base_table_name = 'ek_recurrence_overrides';
	protected static $group           = 'eventkoi';
	protected static $schema_slug     = 'eventkoi-recurrence-overrides';
	protected static $uid_column      = 'id';

	/**
	 * Return the CREATE TABLE SQL definition.
	 */
	protected function get_definition() {
		global $wpdb;
		$table   = self::table_name( true );
		$collate = $wpdb->get_charset_collate();

		return "
			CREATE TABLE `{$table}` (
				`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
				`event_id` BIGINT UNSIGNED NOT NULL,
				`timestamp` BIGINT UNSIGNED NOT NULL,
				`data` LONGTEXT DEFAULT NULL,
				`modified_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY (`id`),
				UNIQUE KEY `event_instance_unique` (`event_id`, `timestamp`),
				KEY `event_idx` (`event_id`),
				KEY `timestamp_idx` (`timestamp`)
			) $collate;
		";
	}
}
