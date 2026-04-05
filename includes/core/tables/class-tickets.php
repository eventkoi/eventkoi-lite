<?php
/**
 * Tickets table schema.
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
 * Tickets table.
 */
class Tickets extends Table {

	/**
	 * {@inheritdoc}
	 */
	const SCHEMA_VERSION = '1.0.3';

	/**
	 * Schema slug used for version tracking.
	 *
	 * @var string
	 */
	protected static $schema_slug = 'eventkoi-tickets';

	/**
	 * Base table name.
	 *
	 * @var string
	 */
	protected static $base_table_name = 'eventkoi_tickets';

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
				`name` varchar(255) NOT NULL,
				`description` text,
				`price` decimal(10,2) NOT NULL DEFAULT '0.00',
				`currency` varchar(3) NOT NULL DEFAULT 'USD',
				`quantity_available` int(11) unsigned DEFAULT NULL,
				`max_per_order` int(11) unsigned DEFAULT NULL,
				`quantity_sold` int(11) unsigned NOT NULL DEFAULT '0',
				`sale_start` datetime DEFAULT NULL,
				`sale_end` datetime DEFAULT NULL,
				`terms_conditions` text,
				`status` varchar(20) NOT NULL DEFAULT 'active',
				`sort_order` int(11) NOT NULL DEFAULT '0',
				`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
				`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				PRIMARY KEY (`id`),
				KEY `event_id` (`event_id`),
				KEY `event_id_status` (`event_id`, `status`),
				KEY `status` (`status`),
				KEY `sort_order` (`sort_order`)
			) {$charset_collate};
		";
	}
}
