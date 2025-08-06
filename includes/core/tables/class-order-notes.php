<?php
/**
 * Order Notes.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core\Tables
 */

namespace EventKoi\Core\Tables;

use EKLIB\StellarWP\Schema\Tables\Contracts\Table;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Order Notes Table.
 */
class Order_Notes extends Table {

	/**
	 * Schema version.
	 */
	const SCHEMA_VERSION = '0.0.260';

	/**
	 * Table name.
	 *
	 * @var string
	 */
	protected static $base_table_name = 'ek_order_notes';

	/**
	 * Group.
	 *
	 * @var string
	 */
	protected static $group = 'eventkoi';

	/**
	 * Schema slug.
	 *
	 * @var string
	 */
	protected static $schema_slug = 'eventkoi-order-notes';

	/**
	 * UID column.
	 *
	 * @var string
	 */
	protected static $uid_column = 'id';

	/**
	 * Get the SQL schema definition.
	 */
	protected function get_definition() {
		global $wpdb;

		$table_name      = self::table_name( true );
		$charset_collate = $wpdb->get_charset_collate();

		return "
            CREATE TABLE `{$table_name}` (
                `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
                `order_id` BIGINT(20) UNSIGNED NOT NULL,
                `note_key` VARCHAR(100) NOT NULL,
                `note_value` TEXT DEFAULT NULL,
                `type` ENUM('system', 'admin', 'user') NOT NULL DEFAULT 'system',
                `created` INT(10) UNSIGNED NOT NULL,
                PRIMARY KEY (`id`),
                INDEX order_id_idx (`order_id`),
                INDEX type_idx (`type`),
                INDEX created_idx (`created`)
            ) {$charset_collate};
        ";
	}
}
