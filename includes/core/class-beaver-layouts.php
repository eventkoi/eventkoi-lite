<?php
/**
 * Layout definitions for the ready-made Beaver Builder templates.
 *
 * Builds the node lists Beaver Builder stores for a layout: the same three
 * pages the Elementor templates carry (single event, event series, calendar),
 * put together from the EventKoi Event and Calendar modules and Beaver's own
 * buttons, so every part stays editable in the builder.
 *
 * @package EventKoi
 */

namespace EventKoi\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Class Beaver_Layouts.
 */
class Beaver_Layouts {

	/**
	 * Slug Beaver Builder registers the EventKoi Event module under (it
	 * takes the module's file name).
	 */
	const EVENT_MODULE = 'class-module-event';

	/**
	 * Slug Beaver Builder registers the EventKoi Calendar module under.
	 */
	const CALENDAR_MODULE = 'class-module-calendar';

	/**
	 * Nodes collected for the layout being built, keyed by node id.
	 *
	 * @var array<string, \stdClass>
	 */
	private $nodes = array();

	/**
	 * Running counter that keeps generated node ids unique within a layout.
	 *
	 * @var int
	 */
	private $counter = 0;

	/**
	 * Build the node list for a template.
	 *
	 * @param string $key Template key: event, series or calendar.
	 * @return array<string, \stdClass>
	 */
	public function build( $key ) {
		$this->nodes   = array();
		$this->counter = 0;

		switch ( $key ) {
			case 'event':
				$this->event();
				break;
			case 'series':
				$this->series();
				break;
			case 'calendar':
				$this->calendar();
				break;
		}

		return $this->nodes;
	}

	/**
	 * Single event page.
	 */
	private function event() {
		$top = $this->row( 0, true, false );

		$this->event_data(
			$this->column( $top, 0, 65 ),
			0,
			array(
				array( 'event_calendar_link', __( '← See all events in', 'eventkoi-lite' ) ),
				'event_title',
			),
			$this->title_style( 36 )
		);
		$this->action_buttons( $this->column( $top, 1, 35 ), 0, 'right' );

		$body = $this->row( 1, false, true );

		$this->event_data(
			$this->column( $body, 0, 65 ),
			0,
			array( 'event_image', 'event_details', 'event_custom_fields_with_name' )
		);

		$side = $this->column( $body, 1, 35 );

		// The date and location box is a nested column so its background,
		// border and padding are ordinary column settings in the builder.
		$this->event_data(
			$this->nested_column( $side, 0, $this->info_box() ),
			0,
			array( 'event_datetime_with_summary', 'event_timezone', 'event_location' ),
			array_merge( array( 'event_timezone_color' => '999999' ), $this->margins( 0, 0 ) )
		);
		$this->event_data(
			$this->nested_column( $side, 1 ),
			0,
			array( 'event_ticket_rsvp', 'event_gmap' ),
			$this->margins( 20, 0 )
		);
	}

	/**
	 * Recurring event series page.
	 */
	private function series() {
		$column = $this->column( $this->row( 0, true, true ), 0, 100 );

		$this->event_data(
			$column,
			0,
			array(
				array( 'event_calendar_link', __( '← See all events in', 'eventkoi-lite' ) ),
				array( 'event_title', __( 'Series:', 'eventkoi-lite' ) ),
				array( 'event_datetime', __( 'Starts on', 'eventkoi-lite' ) ),
				array( 'event_rulesummary', __( 'Runs', 'eventkoi-lite' ) ),
			),
			$this->title_style( 32 )
		);
		$this->action_buttons( $column, 1, 'left' );
		$this->event_data( $column, 2, array( 'event_details', 'event_series_dates' ) );
	}

	/**
	 * Calendar page.
	 */
	private function calendar() {
		$column = $this->column( $this->row( 0, true, true ), 0, 100 );

		$this->module(
			$column,
			0,
			self::CALENDAR_MODULE,
			array(
				'calendars_source' => 'current',
				'timeframe'        => 'month',
				'show_timezone'    => 'yes',
			)
		);
	}

	/**
	 * Typography that sets the event title like the block template heading.
	 *
	 * @param int $size Font size in pixels.
	 * @return array
	 */
	private function title_style( $size ) {
		return array(
			'event_title_typography' => array(
				'font_size'   => array(
					'length' => (string) $size,
					'unit'   => 'px',
				),
				'font_weight' => '600',
				'line_height' => array(
					'length' => '1.2',
					'unit'   => 'em',
				),
			),
		);
	}

	/**
	 * Column settings that draw the date and location box of the block template.
	 *
	 * @return array
	 */
	private function info_box() {
		return array(
			'bg_type'        => 'color',
			'bg_color'       => 'f3f3f3',
			'border'         => array(
				'style'  => 'solid',
				'color'  => 'eeeeee',
				'width'  => $this->sides( 1 ),
				'radius' => array(
					'top_left'     => '10',
					'top_right'    => '10',
					'bottom_left'  => '10',
					'bottom_right' => '10',
				),
			),
			'padding_top'    => '30',
			'padding_right'  => '30',
			'padding_bottom' => '30',
			'padding_left'   => '30',
		);
	}

	/**
	 * The Add to calendar and Share buttons the block templates carry.
	 *
	 * @param string $parent   Column node id.
	 * @param int    $position Position inside the column.
	 * @param string $align    left or right.
	 */
	private function action_buttons( $parent, $position, $align ) {
		$buttons = array(
			array( __( '+ Add to calendar', 'eventkoi-lite' ), '#add-to-cal', '' ),
			array( __( 'Share', 'eventkoi-lite' ), '#event-share', 'fas fa-share-alt' ),
		);

		$style = array(
			'align'              => $align,
			'style'              => 'flat',
			'bg_color'           => 'ffffff',
			'bg_hover_color'     => 'f3f3f3',
			'text_color'         => '2d2d2d',
			'text_hover_color'   => '2d2d2d',
			'border'             => array(
				'style'  => 'solid',
				'color'  => 'dcdcdc',
				'width'  => $this->sides( 1 ),
				'radius' => array(
					'top_left'     => '10',
					'top_right'    => '10',
					'bottom_left'  => '10',
					'bottom_right' => '10',
				),
			),
			'border_hover_color' => 'dcdcdc',
		);

		// Beaver's button group keeps the two buttons on one line; sites
		// without that module get two ordinary buttons instead.
		if ( $this->has_module( 'button-group' ) ) {
			$items = array();
			foreach ( $buttons as $button ) {
				$items[] = $this->button_settings( $button, array() );
			}

			$this->module(
				$parent,
				$position,
				'button-group',
				array_merge(
					$style,
					array(
						'items'                 => $items,
						'layout'                => 'horizontal',
						'width'                 => '',
						'button_spacing'        => '10',
						'button_padding_top'    => '10',
						'button_padding_right'  => '20',
						'button_padding_bottom' => '10',
						'button_padding_left'   => '20',
					)
				)
			);

			return;
		}

		foreach ( $buttons as $index => $button ) {
			$this->module(
				$parent,
				$position + $index,
				'button',
				(array) $this->button_settings(
					$button,
					array_merge(
						$style,
						array(
							'width'          => 'auto',
							'padding_top'    => '10',
							'padding_right'  => '20',
							'padding_bottom' => '10',
							'padding_left'   => '20',
						)
					)
				)
			);
		}
	}

	/**
	 * Settings for one button.
	 *
	 * @param array $button Text, link and optional Font Awesome class.
	 * @param array $extra  Extra settings.
	 * @return \stdClass
	 */
	private function button_settings( array $button, array $extra ) {
		list( $text, $link, $icon ) = $button;

		return (object) array_merge(
			array(
				'text'          => $text,
				'link'          => $link,
				'link_target'   => '_self',
				'link_nofollow' => 'no',
				'icon'          => $icon,
				'icon_position' => 'before',
			),
			$extra
		);
	}

	/**
	 * An EventKoi Event module following the page's event.
	 *
	 * @param string $parent   Column node id.
	 * @param int    $position Position inside the column.
	 * @param array  $types    Data type keys in display order; an entry may be
	 *                         array( key, label ) to print text before the value.
	 * @param array  $settings Extra module settings (style fields).
	 * @return string Node id.
	 */
	private function event_data( $parent, $position, array $types, array $settings = array() ) {
		$items = array();

		foreach ( $types as $type ) {
			$label = '';
			if ( is_array( $type ) ) {
				list( $type, $label ) = $type;
			}

			$items[] = (object) array(
				'data_type' => $type,
				'label'     => $label,
				'show'      => 'yes',
			);
		}

		return $this->module(
			$parent,
			$position,
			self::EVENT_MODULE,
			array_merge(
				array(
					'event_id'         => '',
					'event_data_items' => $items,
				),
				$settings
			)
		);
	}

	/**
	 * A row constrained to 1100px. The first row of a page carries the
	 * eventkoi-front class so the frontend styles scope to the layout like
	 * the block template.
	 *
	 * @param int  $position Position on the page.
	 * @param bool $top      Whether this is the first row (top padding).
	 * @param bool $bottom   Whether this is the last row (bottom padding).
	 * @return string Column group node id.
	 */
	private function row( $position, $top, $bottom ) {
		$row = $this->node(
			'row',
			null,
			$position,
			$this->with_defaults(
				'row',
				'',
				array(
					'width'                  => 'full',
					'content_width'          => 'fixed',
					'max_content_width'      => '1100',
					'max_content_width_unit' => 'px',
					'class'                  => 'eventkoi-front',
					'padding_top'            => $top ? '40' : '0',
					'padding_right'          => '30',
					'padding_bottom'         => $bottom ? '40' : '30',
					'padding_left'           => '30',
				)
			)
		);

		return $this->node( 'column-group', $row, 0, new \stdClass() );
	}

	/**
	 * A column.
	 *
	 * @param string $group    Column group node id.
	 * @param int    $position Position in the group.
	 * @param int    $width    Width in percent.
	 * @param array  $settings Extra column settings.
	 * @return string Node id.
	 */
	private function column( $group, $position, $width, array $settings = array() ) {
		return $this->node(
			'column',
			$group,
			$position,
			$this->with_defaults(
				'column',
				'',
				array_merge(
					array(
						'size'            => (string) $width,
						'size_responsive' => '100',
					),
					$settings
				)
			)
		);
	}

	/**
	 * A full-width column nested inside another column.
	 *
	 * @param string $parent   Outer column node id.
	 * @param int    $position Position inside the outer column.
	 * @param array  $settings Extra column settings.
	 * @return string Node id.
	 */
	private function nested_column( $parent, $position, array $settings = array() ) {
		$group = $this->node( 'column-group', $parent, $position, new \stdClass() );

		return $this->column( $group, 0, 100, $settings );
	}

	/**
	 * A module.
	 *
	 * @param string $parent   Column node id.
	 * @param int    $position Position inside the column.
	 * @param string $type     Module slug.
	 * @param array  $settings Module settings.
	 * @return string Node id.
	 */
	private function module( $parent, $position, $type, array $settings ) {
		$settings['type'] = $type;

		return $this->node( 'module', $parent, $position, $this->with_defaults( 'module', $type, $settings ) );
	}

	/**
	 * Add a node to the layout.
	 *
	 * @param string      $type     Node type.
	 * @param string|null $parent   Parent node id.
	 * @param int         $position Position among its siblings.
	 * @param \stdClass   $settings Node settings.
	 * @return string Node id.
	 */
	private function node( $type, $parent, $position, $settings ) {
		$id = self::id( ++$this->counter );

		$node           = new \stdClass();
		$node->node     = $id;
		$node->type     = $type;
		$node->parent   = $parent;
		$node->position = (int) $position;
		$node->settings = $settings;

		$this->nodes[ $id ] = $node;

		return $id;
	}

	/**
	 * Our settings on top of the builder's own defaults for that node type,
	 * so a saved template looks like one made in the builder.
	 *
	 * @param string $type     Node type: row, column or module.
	 * @param string $module   Module slug for module nodes.
	 * @param array  $settings Settings to apply.
	 * @return \stdClass
	 */
	private function with_defaults( $type, $module, array $settings ) {
		$defaults = new \stdClass();

		if ( class_exists( '\FLBuilderModel' ) ) {
			if ( 'row' === $type && method_exists( '\FLBuilderModel', 'get_row_defaults' ) ) {
				$defaults = \FLBuilderModel::get_row_defaults();
			} elseif ( 'column' === $type && method_exists( '\FLBuilderModel', 'get_col_defaults' ) ) {
				$defaults = \FLBuilderModel::get_col_defaults();
			} elseif ( 'module' === $type && $this->has_module( $module ) && method_exists( '\FLBuilderModel', 'get_module_defaults' ) ) {
				$defaults = \FLBuilderModel::get_module_defaults( $module );
			}
		}

		$merged = is_object( $defaults ) ? clone $defaults : new \stdClass();

		foreach ( $settings as $name => $value ) {
			$merged->{$name} = $value;
		}

		return $merged;
	}

	/**
	 * Whether a Beaver Builder module is registered on this site.
	 *
	 * @param string $slug Module slug.
	 * @return bool
	 */
	private function has_module( $slug ) {
		return class_exists( '\FLBuilderModel' )
			&& isset( \FLBuilderModel::$modules )
			&& is_array( \FLBuilderModel::$modules )
			&& isset( \FLBuilderModel::$modules[ $slug ] );
	}

	/**
	 * Module margins, so boxes inside the side column line up at their edges.
	 *
	 * @param int $top  Top margin in pixels.
	 * @param int $rest Right, bottom and left margin in pixels.
	 * @return array
	 */
	private function margins( $top, $rest ) {
		return array(
			'margin_top'    => (string) $top,
			'margin_right'  => (string) $rest,
			'margin_bottom' => (string) $rest,
			'margin_left'   => (string) $rest,
		);
	}

	/**
	 * The same value on all four sides.
	 *
	 * @param int $value Value.
	 * @return array
	 */
	private function sides( $value ) {
		return array(
			'top'    => (string) $value,
			'right'  => (string) $value,
			'bottom' => (string) $value,
			'left'   => (string) $value,
		);
	}

	/**
	 * A node id in the 13 character shape Beaver Builder uses.
	 *
	 * @param int $counter Position in the layout, to keep ids unique.
	 * @return string
	 */
	public static function id( $counter = 0 ) {
		return substr( md5( uniqid( 'ek' . $counter, true ) ), 0, 13 );
	}
}
