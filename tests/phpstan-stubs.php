<?php
/**
 * Third-party base classes for static analysis only.
 *
 * Elementor, Divi and Beaver Builder are not composer dependencies, so PHPStan
 * cannot see the classes our builder integrations extend. These stubs are
 * referenced via `scanFiles` and are never loaded at runtime.
 *
 * @package EventKoi
 */

// phpcs:ignoreFile -- Analysis-only stub file with multiple namespaces by design.

namespace Elementor {

	/**
	 * Minimal Elementor widget base.
	 */
	abstract class Widget_Base {}
}

namespace {

	/**
	 * Minimal Divi module base.
	 */
	abstract class ET_Builder_Module {}

	/**
	 * Minimal Beaver Builder module base.
	 */
	abstract class FLBuilderModule {}
}
