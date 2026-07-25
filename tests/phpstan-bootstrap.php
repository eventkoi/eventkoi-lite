<?php
/**
 * Constant definitions for static analysis only.
 *
 * PHPStan never executes the plugin, so the constants defined in eventkoi.php
 * at runtime are invisible to it. Declaring them here keeps the analysis honest
 * without adding any runtime code.
 *
 * @package EventKoi
 */

define( 'EVENTKOI_VERSION', '0.0.0' );
define( 'EVENTKOI_PLUGIN_DIR', __DIR__ . '/../' );
define( 'EVENTKOI_PLUGIN_URL', 'https://example.test/wp-content/plugins/eventkoi-lite/' );
define( 'EVENTKOI_PLUGIN_FILE', __DIR__ . '/../eventkoi.php' );
define( 'EVENTKOI_API', 'eventkoi/v1' );
