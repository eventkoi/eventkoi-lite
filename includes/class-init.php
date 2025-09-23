<?php
/**
 * The main class used to run the plugin.
 *
 * @package EventKoi
 */

namespace EventKoi;

use EKLIB\StellarWP\Schema\Config;
use EKLIB\StellarWP\Schema\Register;
use EKLIB\StellarWP\DB\DB;
use EventKoi\Core\Container;
use EventKoi\Core\Tables\Orders;
use EventKoi\Core\Tables\Charges;
use EventKoi\Core\Tables\Customers;
use EventKoi\Core\Tables\Order_Notes;
use EventKoi\Core\Tables\Recurrence_Overrides;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Plugin Initialization Class.
 *
 * Responsible for setting up core functionality and admin components.
 */
class Init {

	/**
	 * Plugin container.
	 *
	 * @var Container
	 */
	private $container;

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->init_core();
		$this->register_tables();

		// Load admin components if in the admin area or WP CLI.
		if ( is_admin() || ( defined( 'WP_CLI' ) && WP_CLI ) ) {
			$this->init_admin();

			if ( defined( 'WP_CLI' ) && WP_CLI ) {
				error_reporting( E_ALL & ~E_DEPRECATED ); // phpcs:ignore.
				require_once EVENTKOI_PLUGIN_DIR . 'includes/cli/class-commands.php';
				\EventKoi\Cli\Commands::init();
			}
		}
	}

	/**
	 * Initialize core functionality.
	 */
	private function init_core() {
		// Include core functions.
		include_once EVENTKOI_PLUGIN_DIR . 'includes/core/core-functions.php';
		require_once EVENTKOI_PLUGIN_DIR . 'includes/helpers/instance.php';

		// Initialize the container and set it in Config.
		$this->container = new Container();
		Config::set_container( $this->container );
		Config::set_db( DB::class );

		// Register core components.
		$this->register_components( $this->get_core_components() );
	}

	/**
	 * Register core components by instantiating the given classes.
	 *
	 * @param array $components Array of component class names.
	 */
	private function register_components( array $components ) {
		foreach ( $components as $component ) {
			new $component();
		}
	}

	/**
	 * Get the list of core components to be initialized.
	 *
	 * @return array
	 */
	private function get_core_components() {
		return array(
			\EventKoi\Core\Install::class,
			\EventKoi\Core\Hooks::class,
			\EventKoi\Core\Post_Types::class,
			\EventKoi\Core\Template::class,
			\EventKoi\Core\Schema::class,
			\EventKoi\Core\Blocks::class,
			\EventKoi\Core\Scripts::class,
			\EventKoi\Core\Shortcodes::class,
			\EventKoi\Core\Bindings::class,
			\EventKoi\Core\ICal::class,
			\EventKoi\API\REST::class,
			\EventKoi\Core\Pretty_Instance_URLs::class,
		);
	}

	/**
	 * Initialize admin-specific components.
	 */
	private function init_admin() {
		$this->register_components( $this->get_admin_components() );
	}

	/**
	 * Get the list of admin components to be initialized.
	 *
	 * @return array
	 */
	private function get_admin_components() {
		return array(
			\EventKoi\Admin\Menus::class,
			\EventKoi\Admin\Redirects::class,
			\EventKoi\Admin\Scripts::class,
		);
	}

	/**
	 * Register custom database tables.
	 */
	private function register_tables() {
		add_action(
			'plugins_loaded',
			static function () {
				Register::tables(
					array(
						Customers::class,
						Recurrence_Overrides::class,
					)
				);
			}
		);
	}
}
