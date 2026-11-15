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
		return __( 'EventKoi Event', 'eventkoi-lite' );
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
				'label' => __( 'Event Options', 'eventkoi-lite' ),
			)
		);

		$this->add_control(
			'event_id',
			array(
				'label'       => __( 'Select Event', 'eventkoi-lite' ),
				'type'        => Controls_Manager::SELECT2,
				'options'     => array( '0' => __( 'Current event', 'eventkoi-lite' ) ) + $this->get_events(),
				'multiple'    => false,
				'label_block' => true,
				'default'     => '0',
				'description' => __( 'Current event shows the event being viewed, so one template works for every event.', 'eventkoi-lite' ),
			)
		);

		$this->add_control(
			'event_data_items',
			array(
				'label'       => __( 'Event Data Items', 'eventkoi-lite' ),
				'type'        => Controls_Manager::REPEATER,
				'fields'      => array(
					array(
						'name'        => 'data_type',
						'label'       => __( 'Data Type', 'eventkoi-lite' ),
						'type'        => Controls_Manager::SELECT,
						'default'     => 'event_title',
						'options'     => $this->get_event_data_options(),
						'label_block' => true,
					),
					array(
						'name'        => 'label',
						'label'       => __( 'Label', 'eventkoi-lite' ),
						'type'        => Controls_Manager::TEXT,
						'default'     => '',
						'placeholder' => __( 'Text shown before the value', 'eventkoi-lite' ),
						'label_block' => true,
					),
					array(
						'name'         => 'show',
						'label'        => __( 'Show', 'eventkoi-lite' ),
						'type'         => Controls_Manager::SWITCHER,
						'label_on'     => __( 'Show', 'eventkoi-lite' ),
						'label_off'    => __( 'Hide', 'eventkoi-lite' ),
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
					'label'    => __( 'Typography', 'eventkoi-lite' ),
					'selector' => '{{WRAPPER}} .eventkoi-elementor-widget .eventkoi-data.eventkoi-data-' . esc_attr( $data_type_key ) . ', {{WRAPPER}} .eventkoi-elementor-widget .eventkoi-shortcode.eventkoi-data-' . esc_attr( $data_type_key ),
				)
			);

			// Color
			$this->add_control(
				$data_type_key . '_color',
				array(
					'label'     => __( 'Text Color', 'eventkoi-lite' ),
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
					'label'     => __( 'Background Color', 'eventkoi-lite' ),
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
					'label'     => __( 'Alignment', 'eventkoi-lite' ),
					'type'      => Controls_Manager::CHOOSE,
					'options'   => array(
						'left'   => array(
							'title' => __( 'Left', 'eventkoi-lite' ),
							'icon'  => 'eicon-text-align-left',
						),
						'center' => array(
							'title' => __( 'Center', 'eventkoi-lite' ),
							'icon'  => 'eicon-text-align-center',
						),
						'right'  => array(
							'title' => __( 'Right', 'eventkoi-lite' ),
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
					'label'      => __( 'Margin', 'eventkoi-lite' ),
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
					'label'      => __( 'Padding', 'eventkoi-lite' ),
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

		// 0 = "Current event": the shortcode resolves the event from the page
		// being viewed, so one layout serves every event page.
		$event_id = absint( $settings['event_id'] ?? 0 );

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

			// Generate shortcode: [eventkoi id=X data=Y]. Without an id the
			// shortcode resolves the current event from context.
			$shortcode = $event_id > 0
				? sprintf( '[eventkoi id=%d data=%s]', $event_id, esc_attr( $data_type ) )
				: sprintf( '[eventkoi data=%s]', esc_attr( $data_type ) );

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

			// An optional label sits inline before the value, the way the block
			// templates put text around a token ("Starts on", "Series:").
			$label = sanitize_text_field( (string) ( $item['label'] ?? '' ) );
			if ( '' !== $label && '' !== trim( (string) $shortcode_output ) ) {
				$wrapper = '<div class="eventkoi-data eventkoi-data-' . esc_attr( $data_type ) . '">';
				$labelled = $wrapper . '<span class="eventkoi-label">' . esc_html( $label ) . '</span> ';

				$shortcode_output = false !== strpos( $shortcode_output, $wrapper )
					? preg_replace( '/' . preg_quote( $wrapper, '/' ) . '/', $labelled, $shortcode_output, 1 )
					: $labelled . $shortcode_output . '</div>';
			}

			// Rows the plugin renders itself (the ticket and RSVP box with its
			// no-script form, the map mount, the series dates loop) carry
			// forms and data attributes the description filter would strip,
			// and are already escaped at the source. Everything else goes
			// through the same allowed set the event description uses.
			$output[] = in_array( $data_type, array( 'event_ticket_rsvp', 'event_gmap', 'event_series_dates' ), true )
				? $shortcode_output
				: wp_kses( $shortcode_output, \EventKoi\Core\Event::get_description_allowed_html() );
		}

		if ( ! empty( $output ) ) {
			echo '<div class="eventkoi-elementor-widget">';
			echo implode( '', $output ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Each row is escaped above or rendered by the plugin's own escaped renderers.
			echo '</div>';
			return;
		}

		// Editor-only placeholder: "Current event" has nothing to resolve
		// inside the Elementor editor, and a silently blank widget reads as
		// broken. Frontend output stays empty on non-event pages.
		if ( 0 === $event_id
			&& class_exists( '\Elementor\Plugin' )
			&& \Elementor\Plugin::$instance->editor->is_edit_mode() ) {
			echo '<div class="eventkoi-elementor-widget" style="padding:16px;border:1px dashed #ccc;border-radius:6px;color:#6b7280;font-size:13px;">';
			echo esc_html__( 'Current event data will display here on event pages.', 'eventkoi-lite' );
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
		// The shared list, so this widget offers the same fields as the block
		// and the other builders, summaries and series dates included.
		return eventkoi_get_event_data_options();
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

