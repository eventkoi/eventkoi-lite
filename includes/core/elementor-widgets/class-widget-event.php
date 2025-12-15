<?php
/**
 * Event Data Widget.
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
class Event_Widget extends Widget_Base {

	/**
	 * Widget slug.
	 */
	public function get_name() {
		return 'eventkoi-event';
	}

	/**
	 * Widget label shown in Elementor.
	 */
	public function get_title() {
		return __( 'EventKoi Event', 'eventkoi' );
	}

	/**
	 * Widget icon.
	 */
	public function get_icon() {
		return 'eicon-single-page';
	}

	/**
	 * Widget keywords.
	 *
	 * @return array
	 */
	public function get_keywords() {
		return array( 'event', 'eventkoi' );
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
			'section_content',
			array(
				'label' => __( 'Event Options', 'eventkoi' ),
			)
		);

		$this->add_control(
			'event_id',
			array(
				'label'       => __( 'Select Event', 'eventkoi' ),
				'type'        => Controls_Manager::SELECT2,
				'options'     => $this->get_events(),
				'multiple'    => false,
				'label_block' => true,
				'default'     => '',
				'description' => __( 'Choose the event to display.', 'eventkoi' ),
			)
		);

		$this->add_control(
			'event_data_items',
			array(
				'label'       => __( 'Event Data Items', 'eventkoi' ),
				'type'        => Controls_Manager::REPEATER,
				'fields'      => array(
					array(
						'name'        => 'data_type',
						'label'       => __( 'Data Type', 'eventkoi' ),
						'type'        => Controls_Manager::SELECT,
						'default'     => 'event_title',
						'options'     => $this->get_event_data_options(),
						'label_block' => true,
					),
					array(
						'name'         => 'show',
						'label'        => __( 'Show', 'eventkoi' ),
						'type'         => Controls_Manager::SWITCHER,
						'label_on'     => __( 'Show', 'eventkoi' ),
						'label_off'    => __( 'Hide', 'eventkoi' ),
						'return_value' => 'yes',
						'default'      => 'yes',
					),
				),
				'default'     => $this->get_default_event_data_items(),
				'title_field' => '<# var options = ' . wp_json_encode( $this->get_event_data_options() ) . '; var label = options[data_type] || data_type; #>{{{ label }}}',
			)
		);

		$this->end_controls_section();

		// Add style controls for each event data type
		$this->register_style_controls();
	}

	/**
	 * Register style controls for each event data type.
	 */
	private function register_style_controls() {
		$data_types = $this->get_event_data_options();

		foreach ( $data_types as $data_type_key => $data_type_label ) {
			$this->start_controls_section(
				'section_style_' . $data_type_key,
				array(
					'label' => $data_type_label,
					'tab'   => Controls_Manager::TAB_STYLE,
				)
			);

			// Typography
			$this->add_group_control(
				\Elementor\Group_Control_Typography::get_type(),
				array(
					'name'     => $data_type_key . '_typography',
					'label'    => __( 'Typography', 'eventkoi' ),
					'selector' => '{{WRAPPER}} .eventkoi-elementor-widget .eventkoi-data.eventkoi-data-' . esc_attr( $data_type_key ) . ', {{WRAPPER}} .eventkoi-elementor-widget .eventkoi-shortcode.eventkoi-data-' . esc_attr( $data_type_key ),
				)
			);

			// Color
			$this->add_control(
				$data_type_key . '_color',
				array(
					'label'     => __( 'Text Color', 'eventkoi' ),
					'type'      => Controls_Manager::COLOR,
					'selectors' => array(
						'{{WRAPPER}} .eventkoi-elementor-widget .eventkoi-data.eventkoi-data-' . esc_attr( $data_type_key )      => 'color: {{VALUE}};',
						'{{WRAPPER}} .eventkoi-elementor-widget .eventkoi-shortcode.eventkoi-data-' . esc_attr( $data_type_key ) => 'color: {{VALUE}};',
					),
				)
			);

			// Background Color
			$this->add_control(
				$data_type_key . '_background_color',
				array(
					'label'     => __( 'Background Color', 'eventkoi' ),
					'type'      => Controls_Manager::COLOR,
					'selectors' => array(
						'{{WRAPPER}} .eventkoi-elementor-widget .eventkoi-data.eventkoi-data-' . esc_attr( $data_type_key )      => 'background-color: {{VALUE}};',
						'{{WRAPPER}} .eventkoi-elementor-widget .eventkoi-shortcode.eventkoi-data-' . esc_attr( $data_type_key ) => 'background-color: {{VALUE}};',
					),
				)
			);

			// Alignment
			$this->add_responsive_control(
				$data_type_key . '_align',
				array(
					'label'     => __( 'Alignment', 'eventkoi' ),
					'type'      => Controls_Manager::CHOOSE,
					'options'   => array(
						'left'   => array(
							'title' => __( 'Left', 'eventkoi' ),
							'icon'  => 'eicon-text-align-left',
						),
						'center' => array(
							'title' => __( 'Center', 'eventkoi' ),
							'icon'  => 'eicon-text-align-center',
						),
						'right'  => array(
							'title' => __( 'Right', 'eventkoi' ),
							'icon'  => 'eicon-text-align-right',
						),
					),
					'default'   => '',
					'selectors' => array(
						'{{WRAPPER}} .eventkoi-elementor-widget .eventkoi-data.eventkoi-data-' . esc_attr( $data_type_key )      => 'text-align: {{VALUE}};',
						'{{WRAPPER}} .eventkoi-elementor-widget .eventkoi-shortcode.eventkoi-data-' . esc_attr( $data_type_key ) => 'text-align: {{VALUE}};',
					),
				)
			);

			// Spacing
			$this->add_responsive_control(
				$data_type_key . '_margin',
				array(
					'label'      => __( 'Margin', 'eventkoi' ),
					'type'       => Controls_Manager::DIMENSIONS,
					'size_units' => array( 'px', 'em', '%' ),
					'selectors'  => array(
						'{{WRAPPER}} .eventkoi-elementor-widget .eventkoi-data.eventkoi-data-' . esc_attr( $data_type_key )      => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
						'{{WRAPPER}} .eventkoi-elementor-widget .eventkoi-shortcode.eventkoi-data-' . esc_attr( $data_type_key ) => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
					),
				)
			);

			$this->add_responsive_control(
				$data_type_key . '_padding',
				array(
					'label'      => __( 'Padding', 'eventkoi' ),
					'type'       => Controls_Manager::DIMENSIONS,
					'size_units' => array( 'px', 'em', '%' ),
					'selectors'  => array(
						'{{WRAPPER}} .eventkoi-elementor-widget .eventkoi-data.eventkoi-data-' . esc_attr( $data_type_key )      => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
						'{{WRAPPER}} .eventkoi-elementor-widget .eventkoi-shortcode.eventkoi-data-' . esc_attr( $data_type_key ) => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
					),
				)
			);

			$this->end_controls_section();
		}
	}

	/**
	 * Render widget output.
	 */
	protected function render() {
		$settings = $this->get_settings_for_display();

		$event_id = absint( $settings['event_id'] ?? 0 );
		if ( 0 === $event_id ) {
			return;
		}

		$event_data_items = $settings['event_data_items'] ?? array();
		if ( empty( $event_data_items ) ) {
			return;
		}

		$output = array();

		foreach ( $event_data_items as $item ) {
			// Only render items that are marked as "show"
			if ( empty( $item['show'] ) || 'yes' !== $item['show'] ) {
				continue;
			}

			$data_type = sanitize_text_field( $item['data_type'] ?? '' );
			if ( empty( $data_type ) ) {
				continue;
			}

			// Generate shortcode: [eventkoi id=X data=Y]
			$shortcode = sprintf(
				'[eventkoi id=%d data=%s]',
				$event_id,
				esc_attr( $data_type )
			);

			$shortcode_output = do_shortcode( $shortcode );

			if ( ! empty( $shortcode_output ) ) {
				$shortcode_output = str_replace(
					'<div class="eventkoi-shortcode">',
					'<div class="eventkoi-shortcode eventkoi-data-' . esc_attr( $data_type ) . '">',
					$shortcode_output
				);
				$shortcode_output = str_replace(
					'<div class="eventkoi-data">',
					'<div class="eventkoi-data eventkoi-data-' . esc_attr( $data_type ) . '">',
					$shortcode_output
				);
			}

			$output[] = $shortcode_output;
		}

		if ( ! empty( $output ) ) {
			echo '<div class="eventkoi-elementor-widget">';
			echo wp_kses_post( implode( '', $output ) );
			echo '</div>';
		}
	}

	/**
	 * Return all events.
	 *
	 * @return array
	 */
	private function get_events() {
		$options    = array();
		$all_events = get_posts(
			array(
				'post_type'      => 'eventkoi_event',
				'posts_per_page' => - 1,
				'post_status'    => 'publish',
			)
		);

		if ( is_wp_error( $all_events ) ) {
			return $options;
		}

		foreach ( $all_events as $event_post ) {
			$options[ (string) $event_post->ID ] = $event_post->post_title;
		}

		return $options;
	}

	/**
	 * Get available event data options.
	 *
	 * @return array
	 */
	private function get_event_data_options() {
		return array(
			'event_title'                 => __( 'Event Title', 'eventkoi' ),
			'event_details'               => __( 'Event Details', 'eventkoi' ),
			'event_timezone'              => __( 'Event Timezone', 'eventkoi' ),
			'event_gmap'                  => __( 'Event Google Map', 'eventkoi' ),
			'event_image'                 => __( 'Event Image', 'eventkoi' ),
			'event_image_url'             => __( 'Event Image URL', 'eventkoi' ),
			'event_calendar_url'          => __( 'Event Calendar URL', 'eventkoi' ),
			'event_calendar'              => __( 'Event Calendar', 'eventkoi' ),
			'event_calendar_link'         => __( 'Event Calendar Link', 'eventkoi' ),
			'event_location'              => __( 'Event Location', 'eventkoi' ),
			'event_datetime_with_summary' => __( 'Event Datetime with Summary', 'eventkoi' ),
			'event_datetime'              => __( 'Event Datetime', 'eventkoi' ),
			'event_date_type'             => __( 'Event Date Type', 'eventkoi' ),
			'event_rulesummary'           => __( 'Event Rule Summary', 'eventkoi' ),
		);
	}

	/**
	 * Get default event data items for the repeater.
	 *
	 * @return array
	 */
	private function get_default_event_data_items() {
		return array(
			array(
				'data_type' => 'event_title',
				'show'      => 'yes',
			),
			array(
				'data_type' => 'event_datetime',
				'show'      => 'yes',
			),
			array(
				'data_type' => 'event_location',
				'show'      => 'yes',
			),
			array(
				'data_type' => 'event_details',
				'show'      => 'yes',
			),
		);
	}
}

