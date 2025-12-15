<?php
/**
 * Elementor_Widgets
 */

namespace EventKoi\Core;

use EventKoi\Core\Elementor\Calendar_Widget;
use EventKoi\Core\Elementor\Event_Widget;

defined( 'ABSPATH' ) || exit;

class Elementor_Widgets {
	/**
	 * Elementor_Widgets constructor
	 */
	public function __construct() {
		add_action( 'elementor/widgets/register', array( $this, 'register_widget' ) );
		add_action( 'elementor/elements/categories_registered', array( $this, 'register_category' ) );
		add_action( 'elementor/editor/before_enqueue_scripts', array( $this, 'enqueue_editor_assets' ) );
	}

	/**
	 * Register the EventKoi calendar widget with Elementor.
	 *
	 * @param \Elementor\Widgets_Manager $widgets_manager Elementor widgets manager instance.
	 */
	public function register_widget( $widgets_manager ) {
		if ( ! class_exists( '\Elementor\Widget_Base' ) ) {
			return;
		}

		require_once EVENTKOI_PLUGIN_DIR . 'includes/core/elementor-widgets/class-widget-calendar.php';
		require_once EVENTKOI_PLUGIN_DIR . 'includes/core/elementor-widgets/class-widget-event.php';

		$widgets_manager->register( new Calendar_Widget() );
		$widgets_manager->register( new Event_Widget() );
	}

	/**
	 * Register our custom Elementor widget category.
	 *
	 * @param \Elementor\Elements_Manager $elements_manager Elementor elements manager instance.
	 */
	public function register_category( $elements_manager ) {
		if ( ! method_exists( $elements_manager, 'add_category' ) ) {
			return;
		}

		$elements_manager->add_category(
			'eventkoi',
			array(
				'title' => __( 'EventKoi', 'eventkoi' ),
				'icon'  => 'eicon-calendar',
			)
		);
	}

	/**
	 * Ensure Elementor editor iframe loads the same assets so the calendar can render in preview.
	 */
	public function enqueue_editor_assets() {
		Scripts::enqueue_frontend_assets();
	}
}