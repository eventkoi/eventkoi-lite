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
		return __( 'EventKoi Calendar', 'eventkoi-lite' );
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
				'label' => __( 'Calendar Options', 'eventkoi-lite' ),
			)
		);

		$this->add_control(
			'calendars',
			array(
				'label'       => __( 'Select Calendar', 'eventkoi-lite' ),
				'type'        => Controls_Manager::SELECT2,
				'options'     => $this->get_calendar_options(),
				'multiple'    => false,
				'label_block' => true,
				'default'     => array(),
				'description' => __( 'Leave empty to use the default calendar.', 'eventkoi-lite' ),
			)
		);

		$this->add_control(
			'timeframe',
			array(
				'label'   => __( 'Timeframe defaults to', 'eventkoi-lite' ),
				'type'    => Controls_Manager::CHOOSE,
				'default' => 'month',
				'toggle'  => true,
				'options' => array(
					'month' => array(
						'title' => __( 'Month', 'eventkoi-lite' ),
						'icon'  => 'eicon-calendar',
					),
					'week'  => array(
						'title' => __( 'Week', 'eventkoi-lite' ),
						'icon'  => 'eicon-calendar',
					),
				),
			)
		);

		foreach ( array(
			'show_month_view' => __( 'Show Month view', 'eventkoi-lite' ),
			'show_week_view'  => __( 'Show Week view', 'eventkoi-lite' ),
			'show_list_view'  => __( 'Show List view', 'eventkoi-lite' ),
		) as $view_control => $view_label ) {
			$this->add_control(
				$view_control,
				array(
					'label'        => $view_label,
					'type'         => Controls_Manager::SWITCHER,
					'label_on'     => __( 'Yes', 'eventkoi-lite' ),
					'label_off'    => __( 'No', 'eventkoi-lite' ),
					'return_value' => 'yes',
					'default'      => 'yes',
				)
			);
		}

		$this->add_control(
			'default_month',
			array(
				'label'       => __( 'Default month to display', 'eventkoi-lite' ),
				'type'        => Controls_Manager::SELECT,
				'default'     => 'current',
				'options'     => $this->get_month_options(),
				'description' => __( 'Choose a fixed month or use the current month.', 'eventkoi-lite' ),
			)
		);

		$this->add_control(
			'default_year',
			array(
				'label'       => __( 'Default year to display', 'eventkoi-lite' ),
				'type'        => Controls_Manager::NUMBER,
				'default'     => '',
				'placeholder' => wp_date( 'Y' ),
				'description' => __( 'Leave empty to follow the current year or enter a four-digit year (e.g. 2025).', 'eventkoi-lite' ),
			)
		);

		$this->add_control(
			'week_starts_on',
			array(
				'label'   => __( 'Week starts on', 'eventkoi-lite' ),
				'type'    => Controls_Manager::SELECT,
				'default' => 'monday',
				'options' => $this->get_weekday_options(),
			)
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'style_section',
			array(
				'label' => __( "Day's Labels", 'eventkoi-lite' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			)
		);

		$this->add_group_control(
			\Elementor\Group_Control_Typography::get_type(),
			array(
				'label'    => __( 'Typography', 'eventkoi-lite' ),
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
				'label' => __( 'Normal', 'eventkoi-lite' ),
			)
		);

		$this->add_control(
			'table_header_label_color',
			array(
				'label'     => __( 'Color', 'eventkoi-lite' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => array(
					'{{WRAPPER}} table.fc-scrollgrid .fc-col-header-cell span' => 'color: {{VALUE}};',
				),
			)
		);

		$this->add_control(
			'table_header_label_bg_color',
			array(
				'label'     => __( 'Background Color', 'eventkoi-lite' ),
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
				'label' => __( 'Hover', 'eventkoi-lite' ),
			)
		);

		$this->add_control(
			'table_header_label_hover_color',
			array(
				'label'     => __( 'Color', 'eventkoi-lite' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => array(
					'{{WRAPPER}} table.fc-scrollgrid .fc-col-header-cell:hover span' => 'color: {{VALUE}};',
				),
			)
		);

		$this->add_control(
			'table_header_label_hover_bg_color',
			array(
				'label'     => __( 'Background Color', 'eventkoi-lite' ),
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
			'views'         => $this->get_visible_views( $settings ),
			'default_month' => $this->normalize_default_month( $settings['default_month'] ?? 'current' ),
			'default_year'  => $this->normalize_default_year( $settings['default_year'] ?? '' ),
			'context'       => 'block',
		);

		$calendar_id = \eventkoi_resolve_calendar_id( (int) get_option( 'eventkoi_default_event_cal', 0 ) );

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
			$options[ (string) $term->term_id ] = eventkoi_decode_term_name( $term->name );
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
			'current'   => __( 'Current month', 'eventkoi-lite' ),
			'january'   => __( 'January', 'eventkoi-lite' ),
			'february'  => __( 'February', 'eventkoi-lite' ),
			'march'     => __( 'March', 'eventkoi-lite' ),
			'april'     => __( 'April', 'eventkoi-lite' ),
			'may'       => __( 'May', 'eventkoi-lite' ),
			'june'      => __( 'June', 'eventkoi-lite' ),
			'july'      => __( 'July', 'eventkoi-lite' ),
			'august'    => __( 'August', 'eventkoi-lite' ),
			'september' => __( 'September', 'eventkoi-lite' ),
			'october'   => __( 'October', 'eventkoi-lite' ),
			'november'  => __( 'November', 'eventkoi-lite' ),
			'december'  => __( 'December', 'eventkoi-lite' ),
		);
	}

	/**
	 * Weekday choices.
	 *
	 * @return array
	 */
	private function get_weekday_options() {
		return array(
			'monday'    => __( 'Monday', 'eventkoi-lite' ),
			'tuesday'   => __( 'Tuesday', 'eventkoi-lite' ),
			'wednesday' => __( 'Wednesday', 'eventkoi-lite' ),
			'thursday'  => __( 'Thursday', 'eventkoi-lite' ),
			'friday'    => __( 'Friday', 'eventkoi-lite' ),
			'saturday'  => __( 'Saturday', 'eventkoi-lite' ),
			'sunday'    => __( 'Sunday', 'eventkoi-lite' ),
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
	 * Build the visible-views CSV from the three Show view switchers.
	 *
	 * Empty string means every view stays visible, matching the default.
	 *
	 * @param array $settings Widget settings.
	 * @return string CSV of month,week,list subset or ''.
	 */
	private function get_visible_views( $settings ) {
		$views = array();
		foreach ( array( 'month', 'week', 'list' ) as $view_key ) {
			if ( 'yes' === ( $settings[ 'show_' . $view_key . '_view' ] ?? 'yes' ) ) {
				$views[] = $view_key;
			}
		}

		return ( count( $views ) < 3 && ! empty( $views ) ) ? implode( ',', $views ) : '';
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
		if ( empty( $calendars ) ) {
			return array();
		}

		// A single-select SELECT2 stores its value as a scalar, so an
		// array-only guard silently threw the builder's calendar choice
		// away and every embed fell back to the site default calendar.
		if ( is_scalar( $calendars ) ) {
			$calendars = array_map( 'trim', explode( ',', (string) $calendars ) );
		}

		if ( ! is_array( $calendars ) ) {
			return array();
		}

		return array_values(
			array_filter(
				array_map( 'absint', $calendars )
			)
		);
	}
}
