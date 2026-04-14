<?php
/**
 * Fires during plugin activation.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

use EKLIB\StellarWP\Schema\Register;
use EKLIB\StellarWP\Schema\Activation;
use EKLIB\StellarWP\Schema\Config;
use EKLIB\StellarWP\DB\DB;
use EventKoi\Core\Container;
use EventKoi\Core\Tables\Charges;
use EventKoi\Core\Tables\Customers;
use EventKoi\Core\Tables\Order_Notes;
use EventKoi\Core\Tables\Orders;
use EventKoi\Core\Tables\Recurrence_Overrides;
use EventKoi\Core\Tables\Rsvps;
use EventKoi\Core\Tables\Ticket_Orders;
use EventKoi\Core\Tables\Tickets;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Activator.
 */
class Activator {

	/**
	 * Activate the plugin.
	 *
	 * @return void
	 */
	public static function activate() {
		// Generate and store a persistent site instance ID.
		if ( ! get_option( 'eventkoi_site_instance_id' ) ) {
			update_option( 'eventkoi_site_instance_id', wp_generate_uuid4() );
		}

		// Generate and store a developer-friendly API key.
		if ( ! get_option( 'eventkoi_api_key' ) ) {
			update_option( 'eventkoi_api_key', 'eventkoi_' . strtolower( preg_replace( '/[^a-z0-9]/i', '', wp_generate_password( 20, false, false ) ) ) );
		}

		// Flag that the plugin was just activated so we can show the quick start prompt.
		if ( ! get_option( 'eventkoi_quick_start_completed' ) ) {
			update_option( 'eventkoi_show_quick_start_prompt', 'yes' );
		}

		// Create/update database tables.
		self::create_tables();

		// Queue a one-time rewrite rules flush after activation.
		update_option( 'eventkoi_flush_needed', 'yes' );
	}

	/**
	 * Create/update database tables.
	 *
	 * @return void
	 */
	private static function create_tables() {
		global $wpdb;

		try {
			$config_container = new Container();
			Config::set_container( $config_container );
			Config::set_db( DB::class );

			Register::tables(
				array(
					Orders::class,
					Charges::class,
					Customers::class,
					Order_Notes::class,
					Recurrence_Overrides::class,
					Rsvps::class,
					Tickets::class,
					Ticket_Orders::class,
				)
			);

			Activation::activate();
		} catch ( \Throwable $exception ) {
			if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				error_log( 'EventKoi Lite schema activation failed: ' . $exception->getMessage() ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			}
		}

		// Fallback: Create tables manually if they don't exist.
		$charset_collate = $wpdb->get_charset_collate();

		$tickets_table       = $wpdb->prefix . 'eventkoi_tickets';
		$ticket_orders_table = $wpdb->prefix . 'eventkoi_ticket_orders';
		$orders_table        = $wpdb->prefix . 'eventkoi_orders';
		$charges_table       = $wpdb->prefix . 'eventkoi_charges';
		$customers_table     = $wpdb->prefix . 'eventkoi_customers';
		$order_notes_table   = $wpdb->prefix . 'eventkoi_order_notes';

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$tickets_exists       = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $tickets_table ) );
		$ticket_orders_exists = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $ticket_orders_table ) );
		$orders_exists        = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $orders_table ) );
		$charges_exists       = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $charges_table ) );
		$customers_exists     = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $customers_table ) );
		$order_notes_exists   = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $order_notes_table ) );
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		if ( ! $orders_exists ) {
			dbDelta( "CREATE TABLE {$orders_table} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				checkout_id varchar(100) NOT NULL,
				payment_id varchar(100) DEFAULT NULL,
				charge_id varchar(100) DEFAULT NULL,
				customer_id varchar(100) DEFAULT NULL,
				ticket_id bigint(20) unsigned NOT NULL,
				quantity int(10) unsigned NOT NULL DEFAULT '1',
				subtotal decimal(10,2) NOT NULL DEFAULT '0.00',
				total decimal(10,2) NOT NULL DEFAULT '0.00',
				item_price decimal(8,2) NOT NULL DEFAULT '0.00',
				currency varchar(10) NOT NULL DEFAULT 'usd',
				payment_status varchar(50) NOT NULL DEFAULT '',
				status varchar(50) NOT NULL DEFAULT '',
				created int(10) unsigned NOT NULL,
				expires int(10) unsigned NOT NULL,
				last_updated int(10) unsigned NOT NULL,
				live tinyint(1) unsigned NOT NULL DEFAULT '0',
				billing_type varchar(50) DEFAULT NULL,
				billing_name varchar(150) DEFAULT NULL,
				billing_email varchar(150) DEFAULT NULL,
				billing_phone varchar(50) DEFAULT NULL,
				billing_address text DEFAULT NULL,
				billing_data longtext DEFAULT NULL,
				ip_address varchar(45) DEFAULT NULL,
				gateway varchar(20) NOT NULL DEFAULT 'stripe',
				PRIMARY KEY (id),
				UNIQUE KEY checkout_id_uniq (checkout_id),
				KEY payment_id_idx (payment_id),
				KEY charge_id_idx (charge_id),
				KEY customer_id_idx (customer_id),
				KEY ticket_id_idx (ticket_id),
				KEY status_idx (status),
				KEY created_idx (created),
				KEY last_updated_idx (last_updated)
			) {$charset_collate};" );
		}

		if ( ! $charges_exists ) {
			dbDelta( "CREATE TABLE {$charges_table} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				order_id bigint(20) unsigned NOT NULL DEFAULT '0',
				checkout_id varchar(100) NOT NULL,
				payment_id varchar(100) NOT NULL,
				charge_id varchar(100) NOT NULL,
				amount decimal(10,2) unsigned NOT NULL DEFAULT '0.00',
				amount_captured decimal(10,2) unsigned NOT NULL DEFAULT '0.00',
				amount_refunded decimal(10,2) unsigned NOT NULL DEFAULT '0.00',
				fees decimal(10,2) unsigned NOT NULL DEFAULT '0.00',
				net decimal(10,2) unsigned NOT NULL DEFAULT '0.00',
				currency char(3) NOT NULL DEFAULT 'USD',
				quantity smallint(5) unsigned NOT NULL DEFAULT '1',
				status varchar(20) NOT NULL DEFAULT 'succeeded',
				created int(10) unsigned NOT NULL,
				live tinyint(1) unsigned NOT NULL DEFAULT '0',
				gateway varchar(20) NOT NULL DEFAULT 'stripe',
				PRIMARY KEY (id),
				UNIQUE KEY charge_id_idx (charge_id),
				KEY order_id_idx (order_id),
				KEY payment_id_idx (payment_id),
				KEY checkout_id_idx (checkout_id),
				KEY status_idx (status)
			) {$charset_collate};" );
		}

		if ( ! $customers_exists ) {
			dbDelta( "CREATE TABLE {$customers_table} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				user_id bigint(20) unsigned NOT NULL,
				customer_id varchar(100) NOT NULL,
				name varchar(150) DEFAULT NULL,
				email varchar(150) NOT NULL,
				city varchar(75) DEFAULT NULL,
				country char(2) DEFAULT NULL,
				line1 varchar(150) DEFAULT NULL,
				line2 varchar(150) DEFAULT NULL,
				postal_code varchar(20) DEFAULT NULL,
				state varchar(75) DEFAULT NULL,
				phone varchar(30) DEFAULT NULL,
				created int(10) unsigned NOT NULL,
				PRIMARY KEY (id),
				UNIQUE KEY customer_id_idx (customer_id),
				KEY user_id_idx (user_id),
				KEY email_idx (email)
			) {$charset_collate};" );
		}

		if ( ! $order_notes_exists ) {
			dbDelta( "CREATE TABLE {$order_notes_table} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				order_id bigint(20) unsigned NOT NULL,
				note_key varchar(100) NOT NULL,
				note_value text DEFAULT NULL,
				type enum('system','admin','user') NOT NULL DEFAULT 'system',
				created int(10) unsigned NOT NULL,
				PRIMARY KEY (id),
				KEY order_id_idx (order_id),
				KEY type_idx (type),
				KEY created_idx (created)
			) {$charset_collate};" );
		}

		if ( ! $tickets_exists ) {
			dbDelta( "CREATE TABLE {$tickets_table} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				event_id bigint(20) unsigned NOT NULL,
				name varchar(255) NOT NULL,
				description text,
				price decimal(10,2) NOT NULL DEFAULT '0.00',
				currency varchar(3) NOT NULL DEFAULT 'USD',
				quantity_available int(11) unsigned DEFAULT NULL,
				max_per_order int(11) unsigned DEFAULT NULL,
				quantity_sold int(11) unsigned NOT NULL DEFAULT '0',
				sale_start datetime DEFAULT NULL,
				sale_end datetime DEFAULT NULL,
				terms_conditions text,
				status varchar(20) NOT NULL DEFAULT 'active',
				sort_order int(11) NOT NULL DEFAULT '0',
				created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				PRIMARY KEY (id),
				KEY event_id (event_id),
				KEY status (status),
				KEY sort_order (sort_order)
			) {$charset_collate};" );
		}

		if ( ! $ticket_orders_exists ) {
			dbDelta( "CREATE TABLE {$ticket_orders_table} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				event_id bigint(20) unsigned NOT NULL,
				ticket_id bigint(20) unsigned NOT NULL,
				order_id varchar(255) NOT NULL,
				customer_name varchar(255) NOT NULL,
				customer_email varchar(255) NOT NULL,
				quantity int(11) unsigned NOT NULL DEFAULT '1',
				unit_price decimal(10,2) NOT NULL,
				total_amount decimal(10,2) NOT NULL,
				currency varchar(3) NOT NULL DEFAULT 'USD',
				payment_status varchar(20) NOT NULL DEFAULT 'pending',
				payment_intent_id varchar(255) DEFAULT NULL,
				charge_id varchar(255) DEFAULT NULL,
				refund_amount decimal(10,2) NOT NULL DEFAULT '0.00',
				checked_in tinyint(1) NOT NULL DEFAULT '0',
				checked_in_at datetime DEFAULT NULL,
				checkin_token varchar(255) DEFAULT NULL,
				status varchar(20) NOT NULL DEFAULT 'active',
				created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				PRIMARY KEY (id),
				UNIQUE KEY order_id (order_id),
				KEY event_id (event_id),
				KEY ticket_id (ticket_id),
				KEY customer_email (customer_email),
				KEY payment_status (payment_status),
				KEY status (status),
				KEY checkin_token (checkin_token)
			) {$charset_collate};" );
		}

		self::ensure_archive_columns( $orders_table, $ticket_orders_table );
	}

	/**
	 * Defensive column/index guard for the archive fields introduced in
	 * schema bumps 1.1.0 (orders) and 1.0.3 (ticket_orders).
	 */
	private static function ensure_archive_columns( $orders_table, $ticket_orders_table ) {
		global $wpdb;

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$has_is_archived = $wpdb->get_var( $wpdb->prepare( "SHOW COLUMNS FROM `{$orders_table}` LIKE %s", 'is_archived' ) );
		if ( ! $has_is_archived ) {
			$wpdb->query( "ALTER TABLE `{$orders_table}` ADD COLUMN `is_archived` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0, ADD INDEX `is_archived_idx` (`is_archived`)" );
		}

		$has_prev_status = $wpdb->get_var( $wpdb->prepare( "SHOW COLUMNS FROM `{$ticket_orders_table}` LIKE %s", 'archived_prev_status' ) );
		if ( ! $has_prev_status ) {
			$wpdb->query( "ALTER TABLE `{$ticket_orders_table}` ADD COLUMN `archived_prev_status` VARCHAR(20) DEFAULT NULL" );
		}
		// phpcs:enable
	}

	/**
	 * Run lightweight DB upgrades once per plugin version bump.
	 */
	public static function maybe_upgrade() {
		$stored  = get_option( 'eventkoi_db_version' );
		$current = defined( 'EVENTKOI_LITE_VERSION' ) ? EVENTKOI_LITE_VERSION : ( defined( 'EVENTKOI_VERSION' ) ? EVENTKOI_VERSION : '0' );

		if ( $stored === $current ) {
			return;
		}

		global $wpdb;
		$orders_table        = $wpdb->prefix . 'eventkoi_orders';
		$ticket_orders_table = $wpdb->prefix . 'eventkoi_ticket_orders';

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		self::ensure_archive_columns( $orders_table, $ticket_orders_table );

		update_option( 'eventkoi_db_version', $current );
	}
}
