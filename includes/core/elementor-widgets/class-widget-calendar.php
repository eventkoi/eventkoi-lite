<?php
/**
 * Elementor Calendar Widget.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core\Elementor
 */

namespace EventKoi\Core\Elementor;

use Elementor\Controls_Manager;
use Elementor\Widget_Base;

defined( 'ABSPATH' ) || exit;

/**
 * Elementor widget that renders the EventKoi calendar.
 */
class Calendar_Widget extends Widget_Base {

	/**
	 * Widget slug.
	 */
	public function get_name() {
		return 'eventkoi-calendar';
	}

	/**
	 * Widget label shown in Elementor.
	 */
	public function get_title() {
		return __( 'EventKoi Calendar', 'eventkoi' );
	}

	/**
	 * Widget icon.
	 */
	public function get_icon() {
		return 'eicon-calendar';
	}

	/**
	 * Widget keywords.
	 *
	 * @return array
	 */
	public function get_keywords() {
		return array( 'event', 'calendar', 'schedule', 'eventkoi' );
	}

	/**
	 * Categories.
	 *
	 * @return array
	 */
	public function get_categories() {
		return array( 'eventkoi' );
	}

	/**
	 * Frontend asset dependencies.
	 *
	 * @return array
	 */
	public function get_script_depends() {
		return array( 'eventkoi-frontend' );
	}

	/**
	 * Register widget controls.
	 */
	protected function register_controls() {
		$this->start_controls_section(
			'section_display',
			array(
				'label' => __( 'Calendar Options', 'eventkoi' ),
			)
		);

		$this->add_control(
			'calendars',
			array(
				'label'       => __( 'Select Calendar', 'eventkoi' ),
				'type'        => Controls_Manager::SELECT2,
				'options'     => $this->get_calendar_options(),
				'multiple'    => false,
				'label_block' => true,
				'default'     => array(),
				'description' => __( 'Leave empty to use the default calendar.', 'eventkoi' ),
			)
		);

		$this->add_control(
			'timeframe',
			array(
				'label'   => __( 'Timeframe defaults to', 'eventkoi' ),
				'type'    => Controls_Manager::CHOOSE,
				'default' => 'month',
				'toggle'  => true,
				'options' => array(
					'month' => array(
						'title' => __( 'Month', 'eventkoi' ),
						'icon'  => 'eicon-calendar',
					),
					'week'  => array(
						'title' => __( 'Week', 'eventkoi' ),
						'icon'  => 'eicon-calendar',
					),
				),
			)
		);

		$this->add_control(
			'default_month',
			array(
				'label'       => __( 'Default month to display', 'eventkoi' ),
				'type'        => Controls_Manager::SELECT,
				'default'     => 'current',
				'options'     => $this->get_month_options(),
				'description' => __( 'Choose a fixed month or use the current month.', 'eventkoi' ),
			)
		);

		$this->add_control(
			'default_year',
			array(
				'label'       => __( 'Default year to display', 'eventkoi' ),
				'type'        => Controls_Manager::NUMBER,
				'default'     => '',
				'placeholder' => wp_date( 'Y' ),
				'description' => __( 'Leave empty to follow the current year or enter a four-digit year (e.g. 2025).', 'eventkoi' ),
			)
		);

		$this->add_control(
			'week_starts_on',
			array(
				'label'   => __( 'Week starts on', 'eventkoi' ),
				'type'    => Controls_Manager::SELECT,
				'default' => 'monday',
				'options' => $this->get_weekday_options(),
			)
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'style_section',
			array(
				'label' => __( 'Day\'s Labels', 'eventkoi' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			)
		);

		$this->add_group_control(
			\Elementor\Group_Control_Typography::get_type(),
			array(
				'label'    => __( 'Typography', 'eventkoi' ),
				'name'     => 'table_header_label',
				'selector' => '{{WRAPPER}} table.fc-scrollgrid .fc-col-header-cell span',
			)
		);

		$this->start_controls_tabs(
			'table_header_label_tabs'
		);

		$this->start_controls_tab(
			'table_header_label_normal_tab',
			array(
				'label' => __( 'Normal', 'eventkoi' ),
			)
		);

		$this->add_control(
			'table_header_label_color',
			array(
				'label'     => __( 'Color', 'eventkoi' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => array(
					'{{WRAPPER}} table.fc-scrollgrid .fc-col-header-cell span' => 'color: {{VALUE}};',
				),
			)
		);

		$this->add_control(
			'table_header_label_bg_color',
			array(
				'label'     => __( 'Background Color', 'eventkoi' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => array(
					'{{WRAPPER}} table.fc-scrollgrid .fc-col-header-cell' => 'background-color: {{VALUE}};',
				),
			)
		);

		$this->end_controls_tab();

		$this->start_controls_tab(
			'table_header_label_hover_tab',
			array(
				'label' => __( 'Hover', 'eventkoi' ),
			)
		);

		$this->add_control(
			'table_header_label_hover_color',
			array(
				'label'     => __( 'Color', 'eventkoi' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => array(
					'{{WRAPPER}} table.fc-scrollgrid .fc-col-header-cell:hover span' => 'color: {{VALUE}};',
				),
			)
		);

		$this->add_control(
			'table_header_label_hover_bg_color',
			array(
				'label'     => __( 'Background Color', 'eventkoi' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => array(
					'{{WRAPPER}} table.fc-scrollgrid .fc-col-header-cell:hover' => 'background-color: {{VALUE}};',
				),
			)
		);

		$this->end_controls_tab();

		$this->end_controls_tabs();

		$this->end_controls_section();
	}

	/**
	 * Render widget output.
	 */
	protected function render() {
		$settings = $this->get_settings_for_display();

		$args = array(
			'calendars'     => $this->sanitize_calendar_selection( $settings['calendars'] ?? array() ),
			'startday'      => $this->sanitize_week_start( $settings['week_starts_on'] ?? '' ),
			'timeframe'     => $this->sanitize_timeframe( $settings['timeframe'] ?? '' ),
			'default_month' => $this->normalize_default_month( $settings['default_month'] ?? 'current' ),
			'default_year'  => $this->normalize_default_year( $settings['default_year'] ?? '' ),
			'context'       => 'block',
		);

		$calendar_id = (int) get_option( 'eventkoi_default_event_cal', 0 );

		echo wp_kses_post(
			eventkoi_get_calendar_content( $calendar_id, 'calendar', $args )
		);
	}

	/**
	 * Return available calendars.
	 *
	 * @return array
	 */
	private function get_calendar_options() {
		$options = array();
		$terms   = get_terms(
			array(
				'taxonomy'   => 'event_cal',
				'hide_empty' => false,
			)
		);

		if ( is_wp_error( $terms ) ) {
			return $options;
		}

		foreach ( $terms as $term ) {
			$options[ (string) $term->term_id ] = $term->name;
		}

		return $options;
	}

	/**
	 * Map of month choices.
	 *
	 * @return array
	 */
	private function get_month_options() {
		return array(
			'current'   => __( 'Current month', 'eventkoi' ),
			'january'   => __( 'January', 'eventkoi' ),
			'february'  => __( 'February', 'eventkoi' ),
			'march'     => __( 'March', 'eventkoi' ),
			'april'     => __( 'April', 'eventkoi' ),
			'may'       => __( 'May', 'eventkoi' ),
			'june'      => __( 'June', 'eventkoi' ),
			'july'      => __( 'July', 'eventkoi' ),
			'august'    => __( 'August', 'eventkoi' ),
			'september' => __( 'September', 'eventkoi' ),
			'october'   => __( 'October', 'eventkoi' ),
			'november'  => __( 'November', 'eventkoi' ),
			'december'  => __( 'December', 'eventkoi' ),
		);
	}

	/**
	 * Weekday choices.
	 *
	 * @return array
	 */
	private function get_weekday_options() {
		return array(
			'monday'    => __( 'Monday', 'eventkoi' ),
			'tuesday'   => __( 'Tuesday', 'eventkoi' ),
			'wednesday' => __( 'Wednesday', 'eventkoi' ),
			'thursday'  => __( 'Thursday', 'eventkoi' ),
			'friday'    => __( 'Friday', 'eventkoi' ),
			'saturday'  => __( 'Saturday', 'eventkoi' ),
			'sunday'    => __( 'Sunday', 'eventkoi' ),
		);
	}

	/**
	 * Sanitize timeframe value.
	 *
	 * @param string $value Provided value.
	 */
	private function sanitize_timeframe( $value ) {
		$value = strtolower( (string) $value );

		return in_array( $value, array( 'month', 'week' ), true ) ? $value : 'month';
	}

	/**
	 * Sanitize the selected week day.
	 *
	 * @param string $value Provided value.
	 *
	 * @return string
	 */
	private function sanitize_week_start( $value ) {
		$value   = strtolower( (string) $value );
		$options = array_keys( $this->get_weekday_options() );

		return in_array( $value, $options, true ) ? $value : 'monday';
	}

	/**
	 * Normalize month value for the renderer.
	 *
	 * @param string $value Month selected in control.
	 *
	 * @return string
	 */
	private function normalize_default_month( $value ) {
		$value = strtolower( (string) $value );

		if ( 'current' === $value || empty( $value ) ) {
			return '';
		}

		$options = array_keys( $this->get_month_options() );

		return in_array( $value, $options, true ) ? $value : '';
	}

	/**
	 * Normalize the year value.
	 *
	 * @param string $value Control value.
	 *
	 * @return string
	 */
	private function normalize_default_year( $value ) {
		$value = trim( (string) $value );

		if ( empty( $value ) ) {
			return '';
		}

		return preg_match( '/^\d{4}$/', $value ) ? $value : '';
	}

	/**
	 * Cast selected calendars to integers.
	 *
	 * @param array $calendars Selected calendars.
	 *
	 * @return array
	 */
	private function sanitize_calendar_selection( $calendars ) {
		if ( empty( $calendars ) || ! is_array( $calendars ) ) {
			return array();
		}

		return array_values(
			array_filter(
				array_map( 'absint', $calendars )
			)
		);
	}
}

