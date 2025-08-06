<?php
/**
 * Blocks.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

use EventKoi\Core\Event;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * EventKoi Blocks handler.
 */
class Blocks {

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_filter( 'block_categories_all', array( __CLASS__, 'register_block_category' ), 99, 2 );
		add_filter( 'wp_kses_allowed_html', array( __CLASS__, 'allow_svg_in_content' ), 10, 2 );
		add_filter( 'render_block_eventkoi/calendar', array( __CLASS__, 'render_calendar_block' ), 88, 2 );
		add_filter( 'render_block_eventkoi/list', array( __CLASS__, 'render_list_block' ), 89, 2 );
		add_filter( 'render_block', array( __CLASS__, 'render_event_block' ), 99, 2 );
	}

	/**
	 * Registers the EventKoi block category.
	 *
	 * @param array $categories List of existing block categories.
	 * @return array Updated list of block categories.
	 */
	public static function register_block_category( $categories ) {
		$eventkoi_category = array(
			'slug'  => 'eventkoi-blocks',
			/* translators: Custom block category for EventKoi plugin. */
			'title' => __( 'EventKoi', 'eventkoi' ),
		);

		return array_merge( array( $eventkoi_category ), $categories );
	}

	/**
	 * Allow SVG and related tags in content.
	 *
	 * @param array  $tags    Allowed tags.
	 * @param string $context Sanitization context.
	 * @return array Modified tags.
	 */
	public static function allow_svg_in_content( $tags, $context ) {
		if ( 'post' !== $context ) {
			return $tags;
		}

		$tags['svg'] = array(
			'class'       => true,
			'xmlns'       => true,
			'width'       => true,
			'height'      => true,
			'fill'        => true,
			'viewbox'     => true,
			'role'        => true,
			'aria-hidden' => true,
			'focusable'   => true,
		);

		$tags['path'] = array(
			'd'               => true,
			'transform'       => true,
			'fill'            => true,
			'stroke'          => true,
			'stroke-linecap'  => true,
			'stroke-width'    => true,
			'stroke-linejoin' => true,
		);

		$tags['g'] = array(
			'transform' => true,
		);

		return $tags;
	}

	/**
	 * Render calendar block.
	 *
	 * @param string $block_content Block content.
	 * @param array  $block         Block data.
	 * @return string
	 */
	public static function render_calendar_block( $block_content, $block ) {
		return wp_kses_post( self::render_calendar_type( 'calendar', $block['attrs'] ) );
	}

	/**
	 * Render list block.
	 *
	 * @param string $block_content Block content.
	 * @param array  $block         Block data.
	 * @return string
	 */
	public static function render_list_block( $block_content, $block ) {
		return wp_kses_post( self::render_calendar_type( 'list', $block['attrs'] ) );
	}

	/**
	 * Render event block with dynamic replacements.
	 *
	 * @param string $block_content Original content.
	 * @param array  $block         Block data.
	 * @return string Rendered content.
	 */
	public static function render_event_block( $block_content, $block ) {
		if ( is_tax( 'event_cal' ) ) {
			return $block_content;
		}

		$event = new Event( get_the_ID() );

		// Add data-event attribute if needed.
		if (
			! empty( $block['attrs']['className'] ) &&
			strpos( $block['attrs']['className'], 'eventkoi-root' ) !== false &&
			strpos( $block_content, 'data-event=' ) === false
		) {
			$id = $event->get_id();

			$block_content = preg_replace_callback(
				'/<(?P<tag>\w+)(?P<before_class>[^>]*)class="(?P<class>[^"]*eventkoi-root[^"]*)"(?P<after_class>[^>]*)>/',
				function ( $matches ) use ( $id ) {
					return sprintf(
						'<%1$s%2$sclass="%3$s" data-event="%4$d"%5$s>',
						$matches['tag'],
						$matches['before_class'],
						$matches['class'],
						$id,
						$matches['after_class']
					);
				},
				$block_content,
				1
			);
		}

		// Handle metadata bindings.
		if (
			isset( $block['blockName'], $block['attrs']['metadata']['bindings']['content']['args']['key'] ) &&
			'core/paragraph' === $block['blockName']
		) {
			$output = self::maybe_render_bound_paragraph( $block, $event );
			if ( null !== $output ) {
				return $output;
			}
		}

		// Replace other text bindings.
		$bindings     = new \EventKoi\Core\Bindings();
		$allowed_keys = array_keys( $bindings->get_allowed_keys() );

		if ( ! has_shortcode( $block_content, 'eventkoi' ) ) {
			foreach ( $allowed_keys as $base_key ) {
				$pattern = '/\b' . preg_quote( $base_key, '/' ) . '(_\d+)?\b/';

				$block_content = preg_replace_callback(
					$pattern,
					function ( $matches ) use ( $event ) {
						return $event::render_meta( $matches[0] );
					},
					$block_content
				);
			}
		}

		// Fix protocol duplication.
		return str_replace(
			array( 'http://http://', 'https://https://', 'http://https://' ),
			array( 'http://', 'https://', 'https://' ),
			$block_content
		);
	}

	/**
	 * Render a bound paragraph if matched.
	 *
	 * @param array $block Block array.
	 * @param Event $event Event instance.
	 * @return string|null
	 */
	private static function maybe_render_bound_paragraph( $block, $event ) {
		$key = $block['attrs']['metadata']['bindings']['content']['args']['key'] ?? '';

		if ( 'event_location' === $key ) {
			return self::build_div_wrapper( $block['attrs'], 'eventkoi-locations', $event::rendered_location() );
		}

		if ( 'event_details' === $key ) {
			return self::build_div_wrapper( $block['attrs'], 'eventkoi-details', $event::rendered_details() );
		}

		if ( 'event_gmap' === $key ) {
			return '<div class="eventkoi-gmap"></div>';
		}

		return null;
	}

	/**
	 * Render a calendar or list view block.
	 *
	 * @param string $type  'calendar' or 'list'.
	 * @param array  $attrs Block attributes.
	 * @return string HTML output.
	 */
	private static function render_calendar_type( $type, $attrs ) {
		$cal_id   = (int) get_option( 'default_event_cal', 0 );
		$calendar = new \EventKoi\Core\Calendar( $cal_id );

		if ( 'calendar' === $type ) {
			$args = array(
				'calendars' => $attrs['calendars'] ?? '',
				'startday'  => ! empty( $attrs['startday'] ) ? esc_attr( $attrs['startday'] ) : $calendar::get_startday(),
				'timeframe' => ! empty( $attrs['timeframe'] ) ? esc_attr( $attrs['timeframe'] ) : $calendar::get_timeframe(),
				'color'     => ! empty( $attrs['color'] ) ? esc_attr( $attrs['color'] ) : eventkoi_default_calendar_color(),
			);
		} else {
			$args = array(
				'calendars'        => $attrs['calendars'] ?? '',
				'show_image'       => isset( $attrs['showImage'] ) ? 'no' : 'yes',
				'show_location'    => isset( $attrs['showLocation'] ) ? 'no' : 'yes',
				'show_description' => isset( $attrs['showDescription'] ) ? 'no' : 'yes',
				'border_style'     => $attrs['borderStyle'] ?? 'dotted',
				'border_size'      => $attrs['borderSize'] ?? '2px',
			);
		}

		return eventkoi_get_calendar_content( $cal_id, $type, $args );
	}

	/**
	 * Build styled <div> wrapper from block attributes.
	 *
	 * @param array  $attrs     Block attributes.
	 * @param string $css_class Base class name.
	 * @param string $content   Inner content.
	 * @return string HTML output.
	 */
	private static function build_div_wrapper( $attrs, $css_class, $content ) {
		if ( isset( $attrs['className'] ) ) {
			$css_class .= ' ' . sanitize_html_class( $attrs['className'] );
		}

		// Theme fontSize and color class support.
		if ( ! empty( $attrs['fontSize'] ) ) {
			$css_class .= ' has-' . sanitize_html_class( $attrs['fontSize'] ) . '-font-size';
		}
		if ( ! empty( $attrs['textColor'] ) ) {
			$css_class .= ' has-' . sanitize_html_class( $attrs['textColor'] ) . '-color';
		}

		$style = '';
		if ( isset( $attrs['style'] ) && is_array( $attrs['style'] ) ) {
			$style_parts = array();

			if ( ! empty( $attrs['style']['typography']['fontSize'] ) ) {
				$style_parts[] = 'font-size: ' . esc_attr( $attrs['style']['typography']['fontSize'] );
			}

			if ( ! empty( $attrs['style']['color']['text'] ) ) {
				$style_parts[] = 'color: ' . esc_attr( $attrs['style']['color']['text'] );
			}

			if ( ! empty( $attrs['style']['elements']['link']['color']['text'] ) ) {
				$style_parts[] = '--wp--style--color--link: ' . esc_attr( $attrs['style']['elements']['link']['color']['text'] );
			}

			if ( ! empty( $style_parts ) ) {
				$style = ' style="' . esc_attr( implode( '; ', $style_parts ) ) . '"';
			}
		}

		return sprintf(
			'<div class="%1$s"%2$s>%3$s</div>',
			esc_attr( trim( $css_class ) ),
			$style,
			$content
		);
	}


	/**
	 * Get default block-based event template.
	 *
	 * @return string HTML output.
	 */
	public static function get_default_template() {
		ob_start();

		include_once EVENTKOI_PLUGIN_DIR . 'templates/parts/event.php';

		$content = ob_get_clean();

		return apply_filters( 'eventkoi_get_default_template', $content );
	}
}
