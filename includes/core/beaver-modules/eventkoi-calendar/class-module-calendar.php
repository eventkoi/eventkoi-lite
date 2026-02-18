<?php
/**
 * EventKoi Beaver Builder Event Data Module.
 *
 * @package EventKoi
 */

class EventKoi_Beaver_Calendar_Module extends FLBuilderModule {
	public function __construct() {
		parent::__construct( array(
			'name'            => __( 'EK Calendar', 'eventkoi' ),
			'description'     => __( 'Display EventKoi Calendar', 'eventkoi' ),
			'group'           => __( 'EventKoi', 'eventkoi' ),
			'category'        => __( 'EventKoi', 'eventkoi' ),
			'dir'             => EVENTKOI_PLUGIN_DIR . 'includes/core/beaver-modules/eventkoi-calendar/',
			'url'             => EVENTKOI_PLUGIN_URL . 'includes/core/beaver-modules/eventkoi-calendar/',
			'editor_export'   => true,
			'enabled'         => true,
			'partial_refresh' => true,
		) );
	}
}
