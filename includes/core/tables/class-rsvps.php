<?php
/**
 * RSVPs.
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
 * RSVPs.
 */
class Rsvps extends Table {

	/**
	 * Schema version.
	 */
	const SCHEMA_VERSION = '1.1.0';

	/**
	 * Table name.
	 *
	 * @var $base_table_name
	 */
	protected static $base_table_name = 'eventkoi_rsvps';

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
	protected static $schema_slug = 'eventkoi-rsvps';

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
                `event_id` BIGINT(20) UNSIGNED NOT NULL,
                `instance_ts` BIGINT(20) UNSIGNED NOT NULL,
                `user_id` BIGINT(20) UNSIGNED DEFAULT NULL,
                `name` VARCHAR(150) DEFAULT NULL,
                `email` VARCHAR(150) NOT NULL,
                `status` VARCHAR(30) NOT NULL DEFAULT 'going',
                `guests` INT(10) UNSIGNED NOT NULL DEFAULT 0,
                `checkin_token` CHAR(36) DEFAULT NULL,
                `checked_in` DATETIME DEFAULT NULL,
                `checked_in_count` INT(10) UNSIGNED DEFAULT NULL,
                `checkin_status` VARCHAR(20) NOT NULL DEFAULT 'none',
                `created` DATETIME NOT NULL,
                `updated` DATETIME NOT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `checkin_token_uniq` (`checkin_token`),
                UNIQUE KEY `event_instance_email_uniq` (`event_id`, `instance_ts`, `email`),
                INDEX `event_id_idx` (`event_id`),
                INDEX `instance_ts_idx` (`instance_ts`),
                INDEX `email_idx` (`email`),
                INDEX `status_idx` (`status`)
            ) {$charset_collate};
        ";
	}
}
