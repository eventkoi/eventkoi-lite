<?php
/**
 * Element trees for the ready-made Elementor templates.
 *
 * Each layout mirrors the matching block template (single event, event
 * series, calendar page) using only widgets Elementor free renders: the
 * EventKoi Event and Calendar widgets plus core buttons. Layouts are built
 * with flex containers when the site has them and with sections and columns
 * otherwise, so the imported template opens natively in either editor mode.
 *
 * @package EventKoi
 */

namespace EventKoi\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Class Elementor_Layouts.
 */
class Elementor_Layouts {

	/**
	 * Whether to emit flex containers instead of sections and columns.
	 *
	 * @var bool
	 */
	private $containers;

	/**
	 * Constructor.
	 *
	 * @param bool $containers Emit flex containers.
	 */
	public function __construct( $containers = true ) {
		$this->containers = (bool) $containers;
	}

	/**
	 * Whether Elementor renders flex containers on this site.
	 *
	 * @return bool
	 */
	public static function site_uses_containers() {
		if ( ! class_exists( '\Elementor\Plugin' ) || empty( \Elementor\Plugin::$instance->experiments ) ) {
			return true;
		}

		return (bool) \Elementor\Plugin::$instance->experiments->is_feature_active( 'container' );
	}

	/**
	 * Build the element tree for a template key.
	 *
	 * @param string $key Template key: event, series or calendar.
	 * @return array Element tree, or an empty array for an unknown key.
	 */
	public function build( $key ) {
		switch ( $key ) {
			case 'event':
				return $this->event();
			case 'series':
				return $this->series();
			case 'calendar':
				return $this->calendar();
		}

		return array();
	}

	/**
	 * Single event page.
	 *
	 * @return array
	 */
	private function event() {
		return array(
			$this->page(
				array(
					$this->row(
						array(
							$this->column(
								65,
								array(
									$this->event_data(
										array(
											array( 'event_calendar_link', __( '← See all events in', 'eventkoi-lite' ) ),
											'event_title',
										),
										array(
											'event_title_typography_typography' => 'custom',
											'event_title_typography_font_size'  => $this->size( 36 ),
											'event_title_typography_font_weight' => '600',
											'event_title_typography_line_height' => $this->size( 1.2, 'em' ),
										)
									),
								)
							),
							$this->column( 35, $this->action_buttons( 'right' ) ),
						)
					),
					$this->row(
						array(
							$this->column(
								65,
								array(
									$this->event_data( array( 'event_image', 'event_details', 'event_custom_fields_with_name' ) ),
								)
							),
							$this->column(
								35,
								array(
									$this->event_data(
										array( 'event_datetime_with_summary', 'event_timezone', 'event_location' ),
										array_merge(
											$this->info_box(),
											array(
												'event_timezone_color' => '#999999',
											)
										)
									),
									$this->event_data( array( 'event_ticket_rsvp', 'event_gmap' ) ),
								)
							),
						)
					),
				)
			),
		);
	}

	/**
	 * Recurring event series page.
	 *
	 * @return array
	 */
	private function series() {
		return array(
			$this->page(
				array(
					$this->event_data(
						array(
							array( 'event_calendar_link', __( '← See all events in', 'eventkoi-lite' ) ),
							array( 'event_title', __( 'Series:', 'eventkoi-lite' ) ),
							array( 'event_datetime', __( 'Starts on', 'eventkoi-lite' ) ),
							array( 'event_rulesummary', __( 'Runs', 'eventkoi-lite' ) ),
						),
						array(
							'event_title_typography_typography' => 'custom',
							'event_title_typography_font_size'  => $this->size( 32 ),
							'event_title_typography_font_weight' => '600',
							'event_title_typography_line_height' => $this->size( 1.2, 'em' ),
						)
					),
					$this->row( $this->action_buttons( 'left' ), true ),
					$this->event_data( array( 'event_details', 'event_series_dates' ) ),
				)
			),
		);
	}

	/**
	 * Calendar page.
	 *
	 * @return array
	 */
	private function calendar() {
		return array(
			$this->page(
				array(
					$this->widget(
						'eventkoi-calendar',
						array(
							'calendars'     => 'current',
							'timeframe'     => 'month',
							'show_timezone' => 'yes',
						)
					),
				)
			),
		);
	}

	/**
	 * The Add to calendar and Share buttons the block templates carry.
	 *
	 * @param string $align Button alignment.
	 * @return array
	 */
	private function action_buttons( $align ) {
		return array(
			$this->button( __( '+ Add to calendar', 'eventkoi-lite' ), '#add-to-cal', $align ),
			$this->button( __( 'Share', 'eventkoi-lite' ), '#event-share', $align, 'fas fa-share-alt' ),
		);
	}

	/**
	 * Outer wrapper: constrained to 1100px and carrying the eventkoi-front
	 * class so the frontend styles scope to it like the block template.
	 *
	 * @param array $children Child elements.
	 * @return array
	 */
	private function page( array $children ) {
		if ( $this->containers ) {
			return $this->element(
				'container',
				array(
					'content_width'  => 'boxed',
					'boxed_width'    => $this->size( 1100 ),
					'flex_direction' => 'column',
					'flex_gap'       => $this->gap( 30 ),
					'padding'        => $this->dimensions( 40, 30, 40, 30 ),
					'css_classes'    => 'eventkoi-front',
				),
				$children
			);
		}

		return $this->element(
			'section',
			array(
				'layout'        => 'boxed',
				'content_width' => $this->size( 1100 ),
				'gap'           => 'no',
				'padding'       => $this->dimensions( 40, 30, 40, 30 ),
				'css_classes'   => 'eventkoi-front',
			),
			array(
				$this->element(
					'column',
					array(
						'_column_size' => 100,
						'_inline_size' => null,
					),
					$children
				),
			)
		);
	}

	/**
	 * A horizontal row of columns.
	 *
	 * @param array $children Columns, or widgets when $bare is true.
	 * @param bool  $bare     Children are widgets that share one row.
	 * @return array
	 */
	private function row( array $children, $bare = false ) {
		if ( $this->containers ) {
			return $this->element(
				'container',
				array(
					'content_width'         => 'full',
					'flex_direction'        => 'row',
					'flex_direction_mobile' => 'column',
					'flex_gap'              => $this->gap( 30 ),
					'flex_wrap'             => $bare ? 'wrap' : 'nowrap',
					'flex_align_items'      => $bare ? 'center' : 'flex-start',
				),
				$children,
				true
			);
		}

		if ( $bare ) {
			// Widgets side by side, as in the block template: one column each.
			$count    = max( 1, count( $children ) );
			$width    = (int) floor( 100 / $count );
			$children = array_map(
				function ( $child ) use ( $width ) {
					return $this->column( $width, array( $child ) );
				},
				$children
			);
		}

		return $this->element(
			'section',
			array(
				'layout' => 'full_width',
				'gap'    => 'wider',
			),
			$children,
			true
		);
	}

	/**
	 * One column of a row.
	 *
	 * @param int   $width    Width in percent.
	 * @param array $children Widgets.
	 * @return array
	 */
	private function column( $width, array $children ) {
		if ( $this->containers ) {
			return $this->element(
				'container',
				array(
					'content_width'  => 'full',
					'width'          => $this->size( $width, '%' ),
					'width_mobile'   => $this->size( 100, '%' ),
					'flex_direction' => 'column',
					'flex_gap'       => $this->gap( 20 ),
				),
				$children,
				true
			);
		}

		// Elementor only ships CSS for its standard column sizes, so the
		// nearest one is the fallback and the exact width goes on
		// _inline_size, which Elementor writes out as the column's own CSS.
		return $this->element(
			'column',
			array(
				'_column_size' => self::standard_column_size( $width ),
				'_inline_size' => 100 === (int) $width ? null : (int) $width,
			),
			$children
		);
	}

	/**
	 * The standard Elementor column size closest to a width.
	 *
	 * @param int $width Width in percent.
	 * @return int
	 */
	private static function standard_column_size( $width ) {
		$closest = 100;

		foreach ( array( 10, 11, 12, 14, 16, 20, 25, 30, 33, 40, 50, 60, 66, 70, 75, 80, 83, 90, 100 ) as $size ) {
			if ( abs( $size - $width ) < abs( $closest - $width ) ) {
				$closest = $size;
			}
		}

		return $closest;
	}

	/**
	 * An EventKoi Event widget showing the given data types for the current event.
	 *
	 * @param array $types    Data type keys in display order; an entry may be
	 *                        array( key, label ) to print text before the value.
	 * @param array $settings Extra widget settings (style controls).
	 * @return array
	 */
	private function event_data( array $types, array $settings = array() ) {
		$items = array();

		foreach ( $types as $type ) {
			$label = '';
			if ( is_array( $type ) ) {
				list( $type, $label ) = $type;
			}

			$items[] = array(
				'_id'       => self::id(),
				'data_type' => $type,
				'label'     => $label,
				'show'      => 'yes',
			);
		}

		return $this->widget(
			'eventkoi-event',
			array_merge(
				array(
					'event_id'         => '0',
					'event_data_items' => $items,
				),
				$settings
			)
		);
	}

	/**
	 * Style controls that draw the date and location box of the block template.
	 *
	 * @return array
	 */
	private function info_box() {
		return array(
			'_background_background' => 'classic',
			'_background_color'      => '#f3f3f3',
			'_border_border'         => 'solid',
			'_border_width'          => $this->dimensions( 1, 1, 1, 1 ),
			'_border_color'          => '#eeeeee',
			'_border_radius'         => $this->dimensions( 10, 10, 10, 10 ),
			'_padding'               => $this->dimensions( 30, 30, 30, 30 ),
		);
	}

	/**
	 * A core button styled like the outline buttons of the block template.
	 *
	 * @param string $text  Button text.
	 * @param string $url   Link URL.
	 * @param string $align left or right.
	 * @param string $icon  Optional Font Awesome class.
	 * @return array
	 */
	private function button( $text, $url, $align, $icon = '' ) {
		$settings = array(
			'text'                               => $text,
			'link'                               => array(
				'url'               => $url,
				'is_external'       => '',
				'nofollow'          => '',
				'custom_attributes' => '',
			),
			'size'                               => 'sm',
			'align'                              => $align,
			'button_text_color'                  => '#2d2d2d',
			'background_background'              => 'classic',
			'background_color'                   => '#ffffff',
			'hover_color'                        => '#2d2d2d',
			'button_background_hover_background' => 'classic',
			'button_background_hover_color'      => '#f3f3f3',
			'button_hover_border_color'          => '#dcdcdc',
			'border_border'                      => 'solid',
			'border_width'                       => $this->dimensions( 1, 1, 1, 1 ),
			'border_color'                       => '#dcdcdc',
			'border_radius'                      => $this->dimensions( 10, 10, 10, 10 ),
			'text_padding'                       => $this->dimensions( 10, 20, 10, 20 ),
		);

		if ( $this->containers ) {
			// Inside a flex row the button is an inline item, not a full-width block.
			$settings['_element_width'] = 'auto';
		}

		if ( '' !== $icon ) {
			$settings['selected_icon'] = array(
				'value'   => $icon,
				'library' => 'fa-solid',
			);
			$settings['icon_align']    = 'left';
		}

		return $this->widget( 'button', $settings );
	}

	/**
	 * A widget node.
	 *
	 * @param string $type     Widget type.
	 * @param array  $settings Widget settings.
	 * @return array
	 */
	private function widget( $type, array $settings ) {
		return array(
			'id'         => self::id(),
			'elType'     => 'widget',
			'widgetType' => $type,
			'settings'   => $settings,
			'elements'   => array(),
			'isInner'    => false,
		);
	}

	/**
	 * A structural node.
	 *
	 * @param string $type     section, column or container.
	 * @param array  $settings Element settings.
	 * @param array  $children Child elements.
	 * @param bool   $inner    Whether the node is nested inside another of its kind.
	 * @return array
	 */
	private function element( $type, array $settings, array $children, $inner = false ) {
		return array(
			'id'       => self::id(),
			'elType'   => $type,
			'settings' => $settings,
			'elements' => array_values( $children ),
			'isInner'  => (bool) $inner,
		);
	}

	/**
	 * A sized value.
	 *
	 * @param int|float $size Size.
	 * @param string    $unit Unit.
	 * @return array
	 */
	private function size( $size, $unit = 'px' ) {
		return array(
			'unit'  => $unit,
			'size'  => $size,
			'sizes' => array(),
		);
	}

	/**
	 * A flex gap.
	 *
	 * @param int $gap Gap in pixels.
	 * @return array
	 */
	private function gap( $gap ) {
		return array(
			'column'   => (string) $gap,
			'row'      => (string) $gap,
			'isLinked' => true,
			'unit'     => 'px',
			'size'     => $gap,
		);
	}

	/**
	 * A four-sided dimension.
	 *
	 * @param int $top    Top.
	 * @param int $right  Right.
	 * @param int $bottom Bottom.
	 * @param int $left   Left.
	 * @return array
	 */
	private function dimensions( $top, $right, $bottom, $left ) {
		return array(
			'unit'     => 'px',
			'top'      => (string) $top,
			'right'    => (string) $right,
			'bottom'   => (string) $bottom,
			'left'     => (string) $left,
			'isLinked' => ( $top === $right && $right === $bottom && $bottom === $left ),
		);
	}

	/**
	 * A fresh element id in Elementor's own format.
	 *
	 * @return string
	 */
	public static function id() {
		return substr( md5( wp_generate_uuid4() ), 0, 7 );
	}
}
