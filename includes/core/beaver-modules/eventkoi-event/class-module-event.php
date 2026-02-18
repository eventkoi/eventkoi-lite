<?php
/**
 * EventKoi Beaver Builder Calendar Module.
 *
 * @package EventKoi
 */

class EventKoi_Beaver_Event_Module extends FLBuilderModule {
	public function __construct() {
		parent::__construct( array(
			'name'            => __( 'EK Event', 'eventkoi' ),
			'description'     => __( 'Display Event Data', 'eventkoi' ),
			'group'           => __( 'EventKoi', 'eventkoi' ),
			'category'        => __( 'EventKoi', 'eventkoi' ),
			'dir'             => EVENTKOI_PLUGIN_DIR . 'includes/core/beaver-modules/eventkoi-event/',
			'url'             => EVENTKOI_PLUGIN_URL . 'includes/core/beaver-modules/eventkoi-event/',
			'editor_export'   => true,
			'enabled'         => true,
			'partial_refresh' => true,
		) );
	}
}
