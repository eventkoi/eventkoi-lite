<?php
/**
 * EventKoi Event — Divi module.
 *
 * @package EventKoi
 */

defined( 'ABSPATH' ) || exit;

/**
 * ET_Builder_Module_EventkoiEvent.
 */
class ET_Builder_Module_EventkoiEvent extends ET_Builder_Module {

	/**
	 * Init module.
	 */
	public function init() {
		$this->name       = esc_html__( 'EventKoi Event', 'eventkoi-lite' );
		$this->plural     = esc_html__( 'EventKoi Events', 'eventkoi-lite' );
		$this->slug       = 'et_pb_eventkoi_event';
		$this->vb_support = 'off';

		$this->settings_modal_toggles = array(
			'general' => array(
				'toggles' => array(
					'main_content' => esc_html__( 'Event', 'eventkoi-lite' ),
				),
			),
		);
	}

	/**
	 * Fields.
	 *
	 * @return array
	 */
	public function get_fields() {
		return array(
			'eventkoi_event_id' => array(
				'label'            => esc_html__( 'Event', 'eventkoi-lite' ),
				'type'             => 'select',
				'option_category'  => 'basic_option',
				'options'          => $this->event_options(),
				'default'          => 'current',
				'default_on_front' => 'current',
				'description'      => esc_html__( 'Select an event to display. Use the current event when placed on an event template.', 'eventkoi-lite' ),
				'toggle_slug'      => 'main_content',
			),
			'eventkoi_data'     => array(
				'label'            => esc_html__( 'Data to render', 'eventkoi-lite' ),
				'type'             => 'select',
				'option_category'  => 'configuration',
				'options'          => \EventKoi\Core\Divi_Renderers::event_data_options(),
				'default_on_front' => 'full',
				'toggle_slug'      => 'main_content',
			),
		);
	}

	/**
	 * Render.
	 *
	 * @param array  $attrs       Attributes.
	 * @param string $content     Content.
	 * @param string $render_slug Slug.
	 * @return string
	 */
	public function render( $attrs, $content, $render_slug ) {
		unset( $attrs, $content, $render_slug );

		return \EventKoi\Core\Divi_Renderers::event( (array) $this->props );
	}

	/**
	 * Event dropdown options.
	 *
	 * @return array
	 */
	protected function event_options() {
		return \EventKoi\Core\Divi_Renderers::event_options();
	}
}
