<?php
/**
 * Ticket orders table schema.
 *
 * @package EventKoi\Core\Tables
 */

namespace EventKoi\Core\Tables;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use EKLIB\StellarWP\Schema\Tables\Contracts\Table;

/**
 * Ticket orders table.
 */
class Ticket_Orders extends Table {

	/**
	 * {@inheritdoc}
	 */
	const SCHEMA_VERSION = '1.0.3';

	/**
	 * Schema slug used for version tracking.
	 *
	 * @var string
	 */
	protected static $schema_slug = 'eventkoi-ticket-orders';

	/**
	 * Base table name.
	 *
	 * @var string
	 */
	protected static $base_table_name = 'eventkoi_ticket_orders';

	/**
	 * Table group.
	 *
	 * @var string
	 */
	protected static $group = 'eventkoi';

	/**
	 * {@inheritdoc}
	 */
	public function get_definition() {
		global $wpdb;

		$table_name      = self::table_name( true );
		$charset_collate = $wpdb->get_charset_collate();

		return "
			CREATE TABLE `{$table_name}` (
				`id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				`event_id` bigint(20) unsigned NOT NULL,
				`ticket_id` bigint(20) unsigned NOT NULL,
				`order_id` varchar(255) NOT NULL,
				`customer_name` varchar(255) NOT NULL,
				`customer_email` varchar(255) NOT NULL,
				`quantity` int(11) unsigned NOT NULL DEFAULT '1',
				`unit_price` decimal(10,2) NOT NULL,
				`total_amount` decimal(10,2) NOT NULL,
				`currency` varchar(3) NOT NULL DEFAULT 'USD',
				`payment_status` varchar(20) NOT NULL DEFAULT 'pending',
				`payment_intent_id` varchar(255) DEFAULT NULL,
				`charge_id` varchar(255) DEFAULT NULL,
				`refund_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
				`checked_in` tinyint(1) NOT NULL DEFAULT '0',
				`checked_in_at` datetime DEFAULT NULL,
				`checkin_token` varchar(255) DEFAULT NULL,
				`status` varchar(20) NOT NULL DEFAULT 'active',
				`archived_prev_status` varchar(20) DEFAULT NULL,
				`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
				`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				PRIMARY KEY (`id`),
				UNIQUE KEY `order_id` (`order_id`),
				KEY `event_id` (`event_id`),
				KEY `event_id_payment_status` (`event_id`, `payment_status`),
				KEY `ticket_id` (`ticket_id`),
				KEY `customer_email` (`customer_email`),
				KEY `payment_status` (`payment_status`),
				KEY `status` (`status`),
				KEY `checkin_token` (`checkin_token`),
				KEY `created_at` (`created_at`)
			) {$charset_collate};
		";
	}
}
