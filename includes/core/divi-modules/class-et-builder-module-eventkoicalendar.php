<?php
/**
 * EventKoi Calendar — Divi module.
 *
 * @package EventKoi
 */

defined( 'ABSPATH' ) || exit;

/**
 * ET_Builder_Module_EventkoiCalendar.
 */
class ET_Builder_Module_EventkoiCalendar extends ET_Builder_Module {

	/**
	 * Init module.
	 */
	public function init() {
		$this->name       = esc_html__( 'EventKoi Calendar', 'eventkoi-lite' );
		$this->plural     = esc_html__( 'EventKoi Calendars', 'eventkoi-lite' );
		$this->slug       = 'et_pb_eventkoi_calendar';
		$this->vb_support = 'off';

		$this->settings_modal_toggles = array(
			'general' => array(
				'toggles' => array(
					'main_content' => esc_html__( 'Calendar', 'eventkoi-lite' ),
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
			'eventkoi_calendar'   => array(
				'label'           => esc_html__( 'Calendar', 'eventkoi-lite' ),
				'type'            => 'select',
				'option_category' => 'basic_option',
				'options'         => $this->calendar_options(),
				'default'         => '',
				'description'     => esc_html__( 'Leave empty to use the default calendar.', 'eventkoi-lite' ),
				'toggle_slug'     => 'main_content',
			),
			'eventkoi_timeframe'  => array(
				'label'            => esc_html__( 'Default timeframe', 'eventkoi-lite' ),
				'type'             => 'select',
				'option_category'  => 'configuration',
				'options'          => array(
					'month' => esc_html__( 'Month', 'eventkoi-lite' ),
					'week'  => esc_html__( 'Week', 'eventkoi-lite' ),
				),
				'default_on_front' => 'month',
				'toggle_slug'      => 'main_content',
			),
			'eventkoi_show_month_view' => array(
				'label'            => esc_html__( 'Show Month view', 'eventkoi-lite' ),
				'type'             => 'yes_no_button',
				'option_category'  => 'configuration',
				'options'          => array(
					'on'  => esc_html__( 'Yes', 'eventkoi-lite' ),
					'off' => esc_html__( 'No', 'eventkoi-lite' ),
				),
				'default_on_front' => 'on',
				'toggle_slug'      => 'main_content',
			),
			'eventkoi_show_week_view' => array(
				'label'            => esc_html__( 'Show Week view', 'eventkoi-lite' ),
				'type'             => 'yes_no_button',
				'option_category'  => 'configuration',
				'options'          => array(
					'on'  => esc_html__( 'Yes', 'eventkoi-lite' ),
					'off' => esc_html__( 'No', 'eventkoi-lite' ),
				),
				'default_on_front' => 'on',
				'toggle_slug'      => 'main_content',
			),
			'eventkoi_show_list_view' => array(
				'label'            => esc_html__( 'Show List view', 'eventkoi-lite' ),
				'type'             => 'yes_no_button',
				'option_category'  => 'configuration',
				'options'          => array(
					'on'  => esc_html__( 'Yes', 'eventkoi-lite' ),
					'off' => esc_html__( 'No', 'eventkoi-lite' ),
				),
				'default_on_front' => 'on',
				'toggle_slug'      => 'main_content',
			),
			'eventkoi_show_timezone' => array(
				'label'            => esc_html__( 'Show timezone', 'eventkoi-lite' ),
				'type'             => 'yes_no_button',
				'option_category'  => 'configuration',
				'options'          => array(
					'on'  => esc_html__( 'Yes', 'eventkoi-lite' ),
					'off' => esc_html__( 'No', 'eventkoi-lite' ),
				),
				'default_on_front' => 'on',
				'toggle_slug'      => 'main_content',
			),
			'eventkoi_week_start' => array(
				'label'            => esc_html__( 'Week starts on', 'eventkoi-lite' ),
				'type'             => 'select',
				'option_category'  => 'configuration',
				'options'          => array(
					'sunday'    => esc_html__( 'Sunday', 'eventkoi-lite' ),
					'monday'    => esc_html__( 'Monday', 'eventkoi-lite' ),
					'tuesday'   => esc_html__( 'Tuesday', 'eventkoi-lite' ),
					'wednesday' => esc_html__( 'Wednesday', 'eventkoi-lite' ),
					'thursday'  => esc_html__( 'Thursday', 'eventkoi-lite' ),
					'friday'    => esc_html__( 'Friday', 'eventkoi-lite' ),
					'saturday'  => esc_html__( 'Saturday', 'eventkoi-lite' ),
				),
				'default_on_front' => 'monday',
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

		return \EventKoi\Core\Divi_Renderers::calendar( (array) $this->props );
	}

	/**
	 * Calendar dropdown options.
	 *
	 * @return array
	 */
	protected function calendar_options() {
		return \EventKoi\Core\Divi_Renderers::calendar_options( esc_html__( '— Default calendar —', 'eventkoi-lite' ) );
	}
}
