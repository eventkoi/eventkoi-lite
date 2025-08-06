<?php
/**
 * Customers.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core\Tables
 */

namespace EventKoi\Core\Tables;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use EKLIB\StellarWP\Schema\Tables\Contracts\Table;

/**
 * Customers.
 */
class Customers extends Table {

	/**
	 * Schema version.
	 */
	const SCHEMA_VERSION = '0.0.255';

	/**
	 * Table name.
	 *
	 * @var $base_table_name
	 */
	protected static $base_table_name = 'ek_customers';

	/**
	 * Group.
	 *
	 * @var $group
	 */
	protected static $group = 'eventkoi';

	/**
	 * Table slug.
	 *
	 * @var $schema_slug
	 */
	protected static $schema_slug = 'eventkoi-customers';

	/**
	 * UID column.
	 *
	 * @var $uid_column
	 */
	protected static $uid_column = 'id';

	/**
	 * Get definition.
	 */
	protected function get_definition() {
		global $wpdb;

		$table_name      = self::table_name( true );
		$charset_collate = $wpdb->get_charset_collate();

		return "
            CREATE TABLE `{$table_name}` (
                `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
                `user_id` BIGINT(20) UNSIGNED NOT NULL,
                `customer_id` VARCHAR(100) NOT NULL,
                `name` VARCHAR(150) DEFAULT NULL,
                `email` VARCHAR(150) NOT NULL,
                `city` VARCHAR(75) DEFAULT NULL,
                `country` CHAR(2) DEFAULT NULL,
                `line1` VARCHAR(150) DEFAULT NULL,
                `line2` VARCHAR(150) DEFAULT NULL,
                `postal_code` VARCHAR(20) DEFAULT NULL,
                `state` VARCHAR(75) DEFAULT NULL,
                `phone` VARCHAR(30) DEFAULT NULL,
                `created` INT(10) UNSIGNED NOT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY customer_id_idx (`customer_id`),
                INDEX user_id_idx (`user_id`),
                INDEX email_idx (`email`)
            ) {$charset_collate};
        ";
	}
}
