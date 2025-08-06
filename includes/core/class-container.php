<?php
/**
 * Container.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

use EKLIB\StellarWP\ContainerContract\ContainerInterface;
use EKLIB\lucatume\DI52\Container as DI52Container;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Container class for dependency injection.
 */
class Container implements ContainerInterface {

	/**
	 * The dependency injection container instance.
	 *
	 * @var DI52Container
	 */
	protected $container;

	/**
	 * Container constructor.
	 *
	 * @param DI52Container|null $container Optional. The container instance to use.
	 */
	public function __construct( $container = null ) {
		$this->container = $container ? $container : new DI52Container();
	}

	/**
	 * Binds an implementation to an identifier in the container.
	 *
	 * @param string     $id                The identifier.
	 * @param mixed      $implementation    The implementation.
	 * @param array|null $after_build_methods Optional. Methods to call after binding.
	 *
	 * @return void
	 */
	public function bind( string $id, $implementation = null, ?array $after_build_methods = null ) {
		$this->container->bind( $id, $implementation, $after_build_methods );
	}

	/**
	 * Retrieves an entry from the container by its identifier.
	 *
	 * @param string $id The identifier.
	 *
	 * @return mixed The resolved entry.
	 */
	public function get( string $id ) {
		return $this->container->get( $id );
	}

	/**
	 * Retrieves the underlying container instance.
	 *
	 * @return DI52Container The container instance.
	 */
	public function get_container() {
		return $this->container;
	}

	/**
	 * Checks if the container has an entry for the given identifier.
	 *
	 * @param string $id The identifier.
	 *
	 * @return bool True if the identifier exists, false otherwise.
	 */
	public function has( string $id ) {
		return $this->container->has( $id );
	}

	/**
	 * Registers a singleton implementation in the container.
	 *
	 * @param string     $id                The identifier.
	 * @param mixed      $implementation    The implementation.
	 * @param array|null $after_build_methods Optional. Methods to call after binding.
	 *
	 * @return void
	 */
	public function singleton( string $id, $implementation = null, ?array $after_build_methods = null ) {
		$this->container->singleton( $id, $implementation, $after_build_methods );
	}

	/**
	 * Forwards calls to the underlying container instance.
	 *
	 * @param string $name The method name.
	 * @param array  $args The arguments.
	 *
	 * @return mixed The method result.
	 */
	public function __call( $name, $args ) {
		return call_user_func_array( array( $this->container, $name ), $args );
	}
}
