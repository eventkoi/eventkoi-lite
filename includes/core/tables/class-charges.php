<?php
/**
 * Charges.
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
 * Charges.
 */
class Charges extends Table {

	/**
	 * Schema version.
	 */
	const SCHEMA_VERSION = '0.0.357';

	/**
	 * Table name.
	 *
	 * @var $base_table_name
	 */
	protected static $base_table_name = 'ek_charges';

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
	protected static $schema_slug = 'eventkoi-charges';

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
                `order_id` BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
                `checkout_id` VARCHAR(100) NOT NULL,
                `payment_id` VARCHAR(100) NOT NULL,
                `charge_id` VARCHAR(100) NOT NULL,
                `amount` DECIMAL(10,2) UNSIGNED NOT NULL DEFAULT 0.00,
                `amount_captured` DECIMAL(10,2) UNSIGNED NOT NULL DEFAULT 0.00,
                `amount_refunded` DECIMAL(10,2) UNSIGNED NOT NULL DEFAULT 0.00,
                `fees` DECIMAL(10,2) UNSIGNED NOT NULL DEFAULT 0.00,
                `net` DECIMAL(10,2) UNSIGNED NOT NULL DEFAULT 0.00,
                `currency` CHAR(3) NOT NULL DEFAULT 'USD',
                `quantity` SMALLINT(5) UNSIGNED NOT NULL DEFAULT 1,
                `status` VARCHAR(20) NOT NULL DEFAULT 'succeeded',
                `created` INT(10) UNSIGNED NOT NULL,
                `live` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
                `gateway` VARCHAR(20) NOT NULL DEFAULT 'stripe',
                PRIMARY KEY (`id`),
                UNIQUE KEY charge_id_idx (`charge_id`),
                INDEX order_id_idx (`order_id`),
                INDEX payment_id_idx (`payment_id`),
                INDEX checkout_id_idx (`checkout_id`),
                INDEX status_idx (`status`)
            ) {$charset_collate};
        ";
	}
}
