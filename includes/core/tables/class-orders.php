<?php
/**
 * Orders.
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
 * Orders.
 */
class Orders extends Table {

	/**
	 * Schema version.
	 */
	const SCHEMA_VERSION = '0.0.262';

	/**
	 * Table name.
	 *
	 * @var $base_table_name
	 */
	protected static $base_table_name = 'ek_orders';

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
	protected static $schema_slug = 'eventkoi-orders';

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
                `checkout_id` VARCHAR(100) NOT NULL,
                `payment_id` VARCHAR(100) DEFAULT NULL,
                `charge_id` VARCHAR(100) DEFAULT NULL,
                `customer_id` VARCHAR(100) DEFAULT NULL,
                `ticket_id` BIGINT(20) UNSIGNED NOT NULL,
                `quantity` INT(10) UNSIGNED NOT NULL DEFAULT 1,
                `subtotal`   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                `total`      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                `item_price` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
                `currency` VARCHAR(10) NOT NULL DEFAULT 'usd',
                `payment_status` VARCHAR(50) NOT NULL DEFAULT '',
                `status` VARCHAR(50) NOT NULL DEFAULT '',
                `created` INT(10) UNSIGNED NOT NULL,
                `expires` INT(10) UNSIGNED NOT NULL,
                `last_updated` INT(10) UNSIGNED NOT NULL,
                `live` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
                `billing_type` VARCHAR(50) DEFAULT NULL,
                `billing_name` VARCHAR(150) DEFAULT NULL,
                `billing_email` VARCHAR(150) DEFAULT NULL,
                `billing_phone` VARCHAR(50) DEFAULT NULL,
                `billing_address` TEXT DEFAULT NULL,
                `billing_data` LONGTEXT DEFAULT NULL,
                `ip_address` VARCHAR(45) DEFAULT NULL,
                `gateway` VARCHAR(20) NOT NULL DEFAULT 'stripe',
                PRIMARY KEY (`id`),
                UNIQUE KEY `checkout_id_uniq` (`checkout_id`),
                INDEX `payment_id_idx` (`payment_id`),
                INDEX `charge_id_idx` (`charge_id`),
                INDEX `customer_id_idx` (`customer_id`),
                INDEX `ticket_id_idx` (`ticket_id`),
                INDEX `status_idx` (`status`),
                INDEX `created_idx` (`created`),
                INDEX `last_updated_idx` (`last_updated`)
            ) {$charset_collate};
        ";
	}
}
