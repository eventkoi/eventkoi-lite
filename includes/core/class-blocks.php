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
	 * Stores Query Loop IDs that are namespaced for EventKoi.
	 *
	 * @var array
	 */
	private static $event_query_loop_ids = array();

	/**
	 * Cached attributes for EventKoi Query Loop instances keyed by queryId.
	 *
	 * @var array
	 */
	private static $event_query_loop_attrs = array();

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'init', array( __CLASS__, 'register_event_data_block_type' ) );
		add_action( 'enqueue_block_editor_assets', array( __CLASS__, 'enqueue_shortcode_image_preview_script' ) );
		add_filter( 'render_block_eventkoi/event-data', array( __CLASS__, 'render_event_data_block' ), 10, 2 );
		add_filter( 'pre_render_block', array( __CLASS__, 'mark_eventkoi_query_loop' ), 5, 2 );
		add_filter( 'query_loop_block_query_vars', array( __CLASS__, 'filter_event_query_loop' ), 10, 2 );
		add_filter( 'register_block_type_args', array( __CLASS__, 'register_core_query_attributes' ), 10, 2 );
		add_filter( 'render_block', array( __CLASS__, 'render_eventkoi_image' ), 9, 2 );
		add_filter( 'render_block', array( __CLASS__, 'render_shortcodes_in_image_src' ), 8, 2 );
		add_filter( 'render_block', array( __CLASS__, 'render_eventkoi_query_loop' ), 10, 2 );

		add_filter( 'block_categories_all', array( __CLASS__, 'register_block_category' ), 99, 2 );
		add_filter( 'wp_kses_allowed_html', array( __CLASS__, 'allow_svg_in_content' ), 10, 2 );
		add_filter( 'render_block_eventkoi/calendar', array( __CLASS__, 'render_calendar_block' ), 88, 2 );
		add_filter( 'render_block_eventkoi/list', array( __CLASS__, 'render_list_block' ), 89, 2 );
		add_filter( 'render_block', array( __CLASS__, 'render_event_block' ), 99, 2 );
	}

	/**
	 * Render standalone Event Data blocks (e.g., inside Query Loop).
	 *
	 * @param string $block_content Default block content.
	 * @param array  $block         Parsed block data.
	 * @return string
	 */
	public static function render_event_data_block( $block_content, $block ) {
		$attributes = $block['attrs'] ?? array();
		$field      = isset( $attributes['field'] ) ? sanitize_key( $attributes['field'] ) : 'title';
		$event_id   = isset( $attributes['eventId'] ) ? absint( $attributes['eventId'] ) : 0;

		// Prefer event from context (injected by EventKoi Query Loop).
		$context_event = $block['context']['eventkoi_event'] ?? null;

		if ( ! $event_id ) {
			$post = get_post();
			if ( $post instanceof \WP_Post && 'eventkoi_event' === $post->post_type ) {
				$event_id = $post->ID;
			}
		}

		if ( empty( $context_event ) && ! $event_id ) {
			return '';
		}

		$event = $context_event ? $context_event : eventkoi_get_event( $event_id );

		if ( empty( $event ) || is_wp_error( $event ) ) {
			return '';
		}

		$value = self::get_event_field_value( $field, $event, array(), ! empty( $context_event ) );

		if ( '' === trim( (string) $value ) ) {
			return '';
		}

		$field_key = sanitize_html_class( $field );
		$classes   = array(
			'ek-event-' . $field_key,
		);

		if ( ! empty( $attributes['className'] ) ) {
			$extra_classes = preg_split( '/\s+/', (string) $attributes['className'] );
			if ( is_array( $extra_classes ) ) {
				foreach ( $extra_classes as $extra_class ) {
					$classes[] = sanitize_html_class( $extra_class );
				}
			}
		}

		// Prefer saved markup so block supports classes/styles carry over.
		if ( ! empty( $block_content ) ) {
			// Replace the first inner HTML segment with the dynamic value.
			$rendered = preg_replace(
				'#>(.*?)</#s',
				'>' . wp_kses_post( $value ) . '</',
				$block_content,
				1
			);

			// Also handle inline style attributes containing preset shorthands.
			$rendered = preg_replace_callback(
				'/(style=["\'])([^"\']*)(["\'])/i',
				static function ( $m ) {
					return $m[1] . self::normalize_preset_styles( $m[2] ) . $m[3];
				},
				$rendered
			);

			return self::normalize_preset_styles( $rendered );
		}

		$normalized_classes = array_unique(
			array_filter(
				array_map(
					static function ( $class ) {
						return trim( $class );
					},
					$classes
				)
			)
		);

		$extra_attributes = array(
			'class' => implode( ' ', $normalized_classes ),
		);

			// Ensure block supports (e.g., colors, spacing) have the current block context.
			$prev_block_to_render                = \WP_Block_Supports::$block_to_render ?? null;
			\WP_Block_Supports::$block_to_render = $block;
			$wrapper_attributes                  = get_block_wrapper_attributes( $extra_attributes );
			\WP_Block_Supports::$block_to_render = $prev_block_to_render;

		$output = sprintf(
			'<div %1$s>%2$s</div>',
			$wrapper_attributes,
			wp_kses_post( $value )
		);

		return self::normalize_preset_styles( $output );
	}

	/**
	 * Server-register the event-data block so block supports work on the frontend.
	 */
	public static function register_event_data_block_type() {
		register_block_type(
			'eventkoi/event-data',
			array(
				'api_version' => 2,
				'attributes'  => array(
					'field'                 => array(
						'type'    => 'string',
						'default' => 'title',
					),
					'tagName'               => array(
						'type'    => 'string',
						'default' => 'div',
					),
					'className'             => array(
						'type' => 'string',
					),
					'textColor'             => array(
						'type' => 'string',
					),
					'backgroundColor'       => array(
						'type' => 'string',
					),
					'gradient'              => array(
						'type' => 'string',
					),
					'customTextColor'       => array(
						'type' => 'string',
					),
					'customBackgroundColor' => array(
						'type' => 'string',
					),
					'customGradient'        => array(
						'type' => 'string',
					),
					'align'                 => array(
						'type' => 'string',
					),
					'eventId'               => array(
						'type'    => 'integer',
						'default' => 0,
					),
					'style'                 => array(
						'type' => 'object',
					),
				),
				'supports'    => array(
					'color'      => array(
						'text'       => true,
						'background' => true,
						'link'       => true,
					),
					'typography' => array(
						'fontSize'                 => true,
						'lineHeight'               => true,
						'__experimentalFontFamily' => true,
						'fontStyle'                => true,
						'__experimentalFontStyle'  => true,
					),
					'spacing'    => array(
						'margin'  => true,
						'padding' => true,
					),
					'align'      => array( 'left', 'center', 'right' ),
				),
			)
		);
	}

	/**
	 * Enqueue a tiny editor helper to resolve [eventkoi ... image_url] shortcodes in core/image previews.
	 */
	public static function enqueue_shortcode_image_preview_script() {
		$handle = 'eventkoi-shortcode-image-preview';

		if ( wp_script_is( $handle, 'enqueued' ) ) {
			return;
		}

		wp_register_script(
			$handle,
			'',
			array( 'wp-hooks', 'wp-compose', 'wp-element', 'wp-data', 'wp-api-fetch' ),
			false,
			true
		);

		$inline = <<<JS
( function( wp ) {
	const { addFilter } = wp.hooks;
	const { createHigherOrderComponent } = wp.compose;
	const { useEffect, useState } = wp.element;
	const apiFetch = wp.apiFetch;

	const shortcodePattern = /\\[eventkoi[^\\]]+\\]/i;

	const withEventkoiShortcodeImage = createHigherOrderComponent( ( BlockEdit ) => {
		return ( props ) => {
			if ( props.name !== 'core/image' ) {
				return wp.element.createElement( BlockEdit, props );
			}

			const url = props?.attributes?.url;
			const [ resolvedUrl, setResolvedUrl ] = useState( null );
			const [ lastRequested, setLastRequested ] = useState( null );

			useEffect( () => {
				if ( ! url || ! shortcodePattern.test( url ) ) {
					setResolvedUrl( null );
					setLastRequested( null );
					return;
				}

				const shortcodeMatch = url.match( /\\[eventkoi([^\\]]*)\\]/i );
				const inner = shortcodeMatch ? shortcodeMatch[1] : '';
				const dataMatch =
					inner.match( /data\\s*=\\s*"([^"]+)"/i ) ||
					inner.match( /data\\s*=\\s*'([^']+)'/i ) ||
					inner.match( /data\\s*=\\s*([^\\s\\]]+)/i );
				const dataVal = dataMatch ? ( dataMatch[1] || dataMatch[2] || dataMatch[3] || '' ) : '';
				const targets = dataVal
					.toLowerCase()
					.split( ',' )
					.map( ( v ) => v.trim() )
					.filter( Boolean );

				if ( ! targets.some( ( t ) => t === 'image_url' || t === 'event_image_url' ) ) {
					setResolvedUrl( null );
					setLastRequested( null );
					return;
				}

				if ( url === lastRequested && resolvedUrl ) {
					return;
				}

				setLastRequested( url );

				apiFetch( {
					path: '/eventkoi/v1/shortcode/resolve',
					method: 'POST',
					data: { code: url },
				} ).then( ( res ) => {
					if ( res && res.value ) {
						setResolvedUrl( res.value );
					} else {
						setResolvedUrl( null );
					}
				} ).catch( () => setResolvedUrl( null ) );
			}, [ url ] );

			if ( resolvedUrl ) {
				const mergedProps = {
					...props,
					attributes: {
						...props.attributes,
						url: resolvedUrl,
						href: props.attributes?.href || resolvedUrl,
					},
				};

				return wp.element.createElement( BlockEdit, mergedProps );
			}

			return wp.element.createElement( BlockEdit, props );
		};
	}, 'withEventkoiShortcodeImage' );

	addFilter( 'editor.BlockEdit', 'eventkoi/shortcode-image-preview', withEventkoiShortcodeImage );
} )( window.wp );
JS;

		wp_add_inline_script( $handle, $inline );
		wp_enqueue_script( $handle );
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
			'title' => __( 'EventKoi', 'eventkoi-lite' ),
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
			strpos( $block['attrs']['className'], 'eventkoi-front' ) !== false &&
			strpos( $block_content, 'data-event=' ) === false
		) {
			$id = $event->get_id();

			$block_content = preg_replace_callback(
				'/<(?P<tag>\w+)(?P<before_class>[^>]*)class="(?P<class>[^"]*eventkoi-front[^"]*)"(?P<after_class>[^>]*)>/',
				function ( $matches ) use ( $id ) {
					return sprintf(
						'<%1$s%2$sclass="%3$s" data-event="%4$d" role="main"%5$s>',
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

		$block_content = str_replace(
			'share.png" alt=""',
			'share.png" alt="' . esc_attr__( 'Share this event', 'eventkoi-lite' ) . '"',
			$block_content
		);

		$block_content = str_replace(
			'pin.png" alt=""',
			'pin.png" alt="" role="presentation" aria-hidden="true"',
			$block_content
		);
		$block_content = str_replace(
			'date.png" alt=""',
			'date.png" alt="" role="presentation" aria-hidden="true"',
			$block_content
		);

		// Fix protocol duplication.
		return str_replace(
			array( 'http://http://', 'https://https://', 'http://https://' ),
			array( 'http://', 'https://', 'https://' ),
			$block_content
		);
	}

	/**
	 * Override core/image when eventkoi_event is in context to use event thumbnail.
	 *
	 * @param string $block_content Original content.
	 * @param array  $block         Parsed block.
	 * @return string
	 */
	public static function render_eventkoi_image( $block_content, $block ) {
		if ( ( $block['blockName'] ?? '' ) !== 'core/image' ) {
			return $block_content;
		}

		$event = $block['context']['eventkoi_event'] ?? null;

		if ( empty( $event ) || empty( $event['thumbnail'] ) ) {
			return $block_content;
		}

		$attrs = $block['attrs'] ?? array();
		$url   = $event['thumbnail'];
		$alt   = ! empty( $attrs['alt'] ) ? $attrs['alt'] : ( $event['title'] ?? '' );

		$classes = array();
		if ( ! empty( $attrs['className'] ) ) {
			$class_list = preg_split( '/\s+/', $attrs['className'] );
			foreach ( (array) $class_list as $cls ) {
				if ( $cls ) {
					$classes[] = sanitize_html_class( $cls );
				}
			}
		}

		$style_attr = '';
		if ( ! empty( $attrs['style'] ) && is_array( $attrs['style'] ) ) {
			$style_pairs = self::style_array_to_css( $attrs['style'] );
			if ( ! empty( $style_pairs ) ) {
				$style_attr = ' style="' . esc_attr( implode( ';', $style_pairs ) ) . '"';
			}
		}

		$img_html = sprintf(
			'<img src="%1$s" alt="%2$s"%3$s />',
			esc_url( $url ),
			esc_attr( $alt ),
			$style_attr
		);

		// Wrap in link if event URL present.
		if ( ! empty( $event['url'] ) ) {
			$img_html = sprintf(
				'<a href="%1$s" class="ek-event-image-link" rel="bookmark">%2$s</a>',
				esc_url( $event['url'] ),
				$img_html
			);
		}

		$class_attr = ! empty( $classes ) ? ' class="' . esc_attr( implode( ' ', $classes ) ) . '"' : '';

		return sprintf( '<figure%1$s>%2$s</figure>', $class_attr, $img_html );
	}

	/**
	 * Resolve shortcodes used inside core/image src|href attributes.
	 *
	 * This lets users drop [eventkoi id=... data=event_image_url] into the URL
	 * field without breaking markup.
	 *
	 * @param string $block_content Original content.
	 * @param array  $block         Parsed block.
	 * @return string Modified content.
	 */
	public static function render_shortcodes_in_image_src( $block_content, $block ) {
		if ( ( $block['blockName'] ?? '' ) !== 'core/image' ) {
			return $block_content;
		}

		$attrs = $block['attrs'] ?? array();
		$url   = $attrs['url'] ?? '';

		if ( empty( $url ) || strpos( $url, '[' ) === false ) {
			return $block_content;
		}

		// Only resolve when shortcode is eventkoi and data requests an image URL.
		if ( ! preg_match( '/\\[eventkoi([^\\]]*)\\]/i', $url, $matches ) ) {
			return $block_content;
		}

		$inner     = $matches[1];
		$data_attr = '';

		if ( preg_match( '/data\\s*=\\s*"([^"]+)"/i', $inner, $dmatch ) ) {
			$data_attr = $dmatch[1];
		} elseif ( preg_match( "/data\\s*=\\s*'([^']+)'/i", $inner, $dmatch ) ) {
			$data_attr = $dmatch[1];
		} elseif ( preg_match( '/data\\s*=\\s*([^\\s\\]]+)/i', $inner, $dmatch ) ) {
			$data_attr = $dmatch[1];
		}

		$targets = array_map( 'trim', explode( ',', strtolower( $data_attr ) ) );

		if ( empty( array_intersect( $targets, array( 'image_url', 'event_image_url' ) ) ) ) {
			return $block_content;
		}

		$resolved = trim( wp_strip_all_tags( do_shortcode( $url ) ) );

		if ( empty( $resolved ) || $resolved === $url ) {
			return $block_content;
		}

		$resolved = esc_url_raw( $resolved );

		if ( ! $resolved ) {
			return $block_content;
		}

		// Swap src and href (if present) with the resolved value.
		$block_content = preg_replace(
			'~src="[^"]*"~',
			'src="' . esc_url( $resolved ) . '"',
			$block_content,
			1
		);

		$block_content = preg_replace(
			'~href="[^"]*"~',
			'href="' . esc_url( $resolved ) . '"',
			$block_content,
			1
		);

		return $block_content;
	}

	/**
	 * Track Query Loop instances using the EventKoi namespace.
	 *
	 * Stores queryIds so they can be detected inside query_loop_block_query_vars
	 * when only a WP_Block (e.g., core/post-template) is available.
	 *
	 * @param string|null $pre_render Short-circuit value.
	 * @param array       $block      Parsed block or WP_Block instance.
	 * @return string|null
	 */
	public static function mark_eventkoi_query_loop( $pre_render, $block ) {
		static $ek_query_ids = array();

		$is_query_block = false;
		$attrs          = array();

		if ( is_object( $block ) ) {
			$is_query_block = ( $block->name ?? '' ) === 'core/query';
			$attrs          = $block->attributes ?? array();
		} elseif ( is_array( $block ) ) {
			$is_query_block = ( $block['blockName'] ?? '' ) === 'core/query';
			$attrs          = $block['attrs'] ?? array();
		}

		$is_eventkoi_namespace = ( $attrs['namespace'] ?? '' ) === 'eventkoi/event-query-loop';
		$is_eventkoi_class     = ! empty( $attrs['className'] ) && false !== strpos( $attrs['className'], 'eventkoi-query-loop' );

		if ( $is_query_block && ( $is_eventkoi_namespace || $is_eventkoi_class ) ) {
			$query_id = isset( $attrs['queryId'] ) ? absint( $attrs['queryId'] ) : 0;
			if ( $query_id ) {
				$ek_query_ids[ $query_id ]                 = true;
				self::$event_query_loop_attrs[ $query_id ] = $attrs;
			}
		}

		// Expose cached IDs for the filter to reference.
		self::$event_query_loop_ids = $ek_query_ids;

		return $pre_render;
	}

	/**
	 * Ensure core/query supports EventKoi-specific attributes server-side.
	 *
	 * @param array  $args Block type args.
	 * @param string $name Block type name.
	 * @return array
	 */
	public static function register_core_query_attributes( $args, $name ) {
		if ( 'core/query' !== $name ) {
			return $args;
		}

		if ( ! isset( $args['attributes'] ) || ! is_array( $args['attributes'] ) ) {
			$args['attributes'] = array();
		}

		$args['attributes']['calendars']             = array(
			'type'    => 'array',
			'default' => array(),
		);
		$args['attributes']['startDate']             = array(
			'type'    => 'string',
			'default' => '',
		);
		$args['attributes']['endDate']               = array(
			'type'    => 'string',
			'default' => '',
		);
		$args['attributes']['includeInstances']      = array(
			'type'    => 'boolean',
			'default' => false,
		);
		$args['attributes']['showInstancesForEvent'] = array(
			'type'    => 'boolean',
			'default' => false,
		);
		$args['attributes']['instanceParentId']      = array(
			'type'    => 'integer',
			'default' => 0,
		);
		$args['attributes']['eventkoiSig']           = array(
			'type'    => 'string',
			'default' => '',
		);

		// Ensure namespace survives parsing (needed for variation detection).
		if ( ! isset( $args['attributes']['namespace'] ) ) {
			$args['attributes']['namespace'] = array(
				'type' => 'string',
			);
		}

		return $args;
	}

	/**
	 * Adjust core/query vars for the EventKoi Query Loop variation.
	 *
	 * Applies calendar tax filters and forces the event post type while leaving
	 * the existing template and pagination blocks untouched.
	 *
	 * @param array $query_vars WP_Query args generated by the Query Loop block.
	 * @param array $block      Parsed block data or WP_Block instance.
	 * @return array Filtered query vars.
	 */
	public static function filter_event_query_loop( $query_vars, $block ) {
		$is_object    = is_object( $block );
		$block_name   = $is_object ? ( $block->name ?? '' ) : ( $block['blockName'] ?? '' );
		$attrs        = $is_object ? ( $block->attributes ?? array() ) : ( $block['attrs'] ?? array() );
		$parsed_attrs = array();
		$query_id     = 0;
		$cache_query  = false;

		if ( $is_object && isset( $block->parsed_block['attrs'] ) && is_array( $block->parsed_block['attrs'] ) ) {
			$parsed_attrs = $block->parsed_block['attrs'];
			$query_id     = isset( $block->parsed_block['attrs']['queryId'] ) ? absint( $block->parsed_block['attrs']['queryId'] ) : 0;
		} elseif ( ! $is_object && isset( $block['attrs'] ) && is_array( $block['attrs'] ) ) {
			$parsed_attrs = $block['attrs'];
			$query_id     = isset( $block['attrs']['queryId'] ) ? absint( $block['attrs']['queryId'] ) : 0;
		}

		// When invoked for inner blocks (e.g., post-template), use cached attrs via queryId.
		if ( ! $query_id && $is_object && isset( $block->context['queryId'] ) ) {
			$query_id = absint( $block->context['queryId'] );
		} elseif ( ! $query_id && ! $is_object && isset( $block['context']['queryId'] ) ) {
			$query_id = absint( $block['context']['queryId'] );
		}

		if ( $query_id && isset( self::$event_query_loop_attrs[ $query_id ] ) ) {
			$parsed_attrs = wp_parse_args( self::$event_query_loop_attrs[ $query_id ], $parsed_attrs );
		}

		// Prefer parsed attributes (full set), fall back to hydrated attributes.
		$attrs = wp_parse_args( $attrs, $parsed_attrs );

		$is_eventkoi = false;

		$is_eventkoi_namespace = ( $attrs['namespace'] ?? '' ) === 'eventkoi/event-query-loop';
		$is_eventkoi_class     = ! empty( $attrs['className'] ) && false !== strpos( $attrs['className'], 'eventkoi-query-loop' );

		if ( 'core/query' === $block_name && ( $is_eventkoi_namespace || $is_eventkoi_class ) ) {
			$is_eventkoi = true;
			if ( $query_id ) {
				$cache_query = true;
			}
		} elseif ( is_object( $block ) && isset( $block->context['queryId'] ) && ! empty( self::$event_query_loop_ids[ $block->context['queryId'] ] ) ) {
			$is_eventkoi = true;
			if ( ! $query_id ) {
				$query_id = absint( $block->context['queryId'] );
			}
			if ( $query_id && isset( self::$event_query_loop_attrs[ $query_id ] ) ) {
				$attrs = wp_parse_args( $attrs, self::$event_query_loop_attrs[ $query_id ] );
			}
		}

		// Cache attrs for this EventKoi query loop for downstream child blocks.
		if ( $cache_query && $query_id ) {
			self::$event_query_loop_ids[ $query_id ]   = true;
			self::$event_query_loop_attrs[ $query_id ] = $attrs;
		}

		if ( ! $is_eventkoi ) {
			return $query_vars;
		}

		$calendar_ids = array_filter( array_map( 'absint', $attrs['calendars'] ?? array() ) );

		$query_vars['post_type'] = 'eventkoi_event';

		// Do not enforce tax_query here; frontend render uses Calendar::get_events directly.
		unset( $query_vars['tax_query'] );

		return $query_vars;
	}

	/**
	 * Custom frontend render for the EventKoi Query Loop variation.
	 * Uses Calendar::get_events (with instances) instead of WP_Query while preserving saved inner block markup.
	 *
	 * @param string $block_content Default rendered content.
	 * @param array  $block         Parsed block data.
	 * @return string
	 */
	public static function render_eventkoi_query_loop( $block_content, $block ) {
		if ( is_admin() ) {
			return $block_content;
		}

		$block_name = $block['blockName'] ?? '';
		$attrs      = $block['attrs'] ?? array();

		if ( 'core/query' !== $block_name ) {
			return $block_content;
		}

		$is_eventkoi = ( $attrs['namespace'] ?? '' ) === 'eventkoi/event-query-loop';
		if ( ! $is_eventkoi ) {
			return $block_content;
		}

		$query             = $attrs['query'] ?? array();
		$per_page          = isset( $query['perPage'] ) ? absint( $query['perPage'] ) : 6;
		$order             = isset( $query['order'] ) ? sanitize_text_field( $query['order'] ) : 'desc';
		$orderby           = isset( $query['orderBy'] ) ? sanitize_key( $query['orderBy'] ) : 'modified';
		$calendar_ids      = array_filter( array_map( 'absint', $attrs['calendars'] ?? array() ) );
		$include_instances = ! empty( $attrs['includeInstances'] );

		$show_instances_for_event = ! empty( $attrs['showInstancesForEvent'] ) && ! empty( $attrs['instanceParentId'] );
		$instance_parent_id       = isset( $attrs['instanceParentId'] ) ? absint( $attrs['instanceParentId'] ) : 0;

		$start_date = ! empty( $attrs['startDate'] ) ? sanitize_text_field( $attrs['startDate'] ) : '';
		$end_date   = ! empty( $attrs['endDate'] ) ? sanitize_text_field( $attrs['endDate'] ) : '';

		$paged = isset( $_GET['ek_page'] ) ? max( 1, absint( $_GET['ek_page'] ) ) : 1; // phpcs:ignore WordPress.Security.NonceVerification.Recommended.

		// Sanitize orderby to allowed values.
		$allowed_orderby = array( 'modified', 'date', 'title', 'start_date', 'event_start' );
		if ( ! in_array( $orderby, $allowed_orderby, true ) ) {
			$orderby = 'modified';
		}

		// Auto-derive the parent event when rendering a singular recurring event page.
		if ( $include_instances && empty( $instance_parent_id ) && is_singular( 'eventkoi_event' ) ) {
			$current_event_id = get_queried_object_id();
			if ( $current_event_id ) {
				$event = new Event( $current_event_id );
				if ( method_exists( Event::class, 'get_date_type' ) && 'recurring' === $event::get_date_type() ) {
					$instance_parent_id       = $current_event_id;
					$show_instances_for_event = true;
				}
			}
		}

		// Normalize includeInstances+parent.
		if ( $include_instances && $show_instances_for_event && empty( $instance_parent_id ) && ! empty( $_GET['parent_event'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$instance_parent_id = absint( $_GET['parent_event'] );
		}

		if ( $show_instances_for_event && $include_instances && $instance_parent_id > 0 ) {
			$event_data = \EventKoi\Core\Calendar::get_events(
				array(),
				true,
				array(
					'include'    => array( $instance_parent_id ),
					'per_page'   => $per_page,
					'page'       => $paged,
					'order'      => $order,
					'orderby'    => $orderby,
					'start_date' => $start_date,
					'end_date'   => $end_date,
				)
			);
		} else {
			$event_data = \EventKoi\Core\Calendar::get_events(
				$calendar_ids,
				$include_instances,
				array(
					'per_page'   => $per_page,
					'order'      => $order,
					'orderby'    => $orderby,
					'page'       => $paged,
					'start_date' => $start_date,
					'end_date'   => $end_date,
				)
			);
		}

		$events       = $event_data['items'] ?? array();
		$total_events = $event_data['total'] ?? count( $events );
		$total_pages  = $per_page > 0 ? (int) ceil( $total_events / $per_page ) : 1;

		if ( empty( $events ) ) {
			return '<p class="ek-no-events">' . esc_html__( 'No events found.', 'eventkoi-lite' ) . '</p>';
		}

		$wrapper_class     = ! empty( $attrs['className'] ) ? $attrs['className'] : 'eventkoi-query-loop';
		$rendered          = '';
		$has_post_template = false;

		if ( ! empty( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) {
			foreach ( $block['innerBlocks'] as $inner ) {
				$name = $inner['blockName'] ?? '';

				if ( 'core/post-template' === $name ) {
					$rendered         .= self::render_eventkoi_post_template( $inner, $events );
					$has_post_template = true;
					continue;
				}

				if ( 'core/query-pagination' === $name && $total_pages > 1 ) {
					$rendered .= self::render_eventkoi_pagination( $inner, $paged, $total_pages );
					continue;
				}

				// Render any other saved blocks as-is to preserve order.
				$rendered .= render_block( $inner );
			}
		}

		if ( ! $has_post_template ) {
			return $block_content;
		}

		return self::normalize_preset_styles(
			sprintf(
				'<div class="%1$s">%2$s</div>',
				esc_attr( $wrapper_class ),
				$rendered
			)
		);
	}

	/**
	 * Normalize preset style shorthands (e.g., var:preset|spacing|20) into CSS variables.
	 *
	 * @param string $html HTML string potentially containing shorthand preset vars.
	 * @return string Normalized HTML.
	 */
	private static function normalize_preset_styles( $html ) {
		if ( empty( $html ) ) {
			return $html;
		}

		// Convert shorthand var:preset|spacing|20 to CSS variable var(--wp--preset--spacing--20).
		$html = preg_replace_callback(
			'/var:preset\|([a-z0-9_-]+)\|([a-z0-9_-]+)/i',
			static function ( $matches ) {
				return 'var(--wp--preset--' . $matches[1] . '--' . $matches[2] . ')';
			},
			$html
		);

		// Also normalize occurrences with optional whitespace.
		$html = preg_replace_callback(
			'/var\s*:\s*preset\s*\|\s*([a-z0-9_-]+)\s*\|\s*([a-z0-9_-]+)/i',
			static function ( $matches ) {
				return 'var(--wp--preset--' . $matches[1] . '--' . $matches[2] . ')';
			},
			$html
		);

		return $html;
	}

	/**
	 * Convert a Gutenberg style array into simple CSS declarations.
	 *
	 * Supports common image-related style keys such as border radius.
	 *
	 * @param array $style Style array from block attributes.
	 * @return array List of CSS declaration strings.
	 */
	private static function style_array_to_css( $style ) {
		if ( empty( $style ) || ! is_array( $style ) ) {
			return array();
		}

		$pairs = array();

		foreach ( $style as $key => $value ) {
			// Handle shadow support explicitly (string or array) → box-shadow.
			if ( 'shadow' === $key ) {
				if ( is_array( $value ) ) {
					foreach ( $value as $v ) {
						if ( ! empty( $v ) && ! is_array( $v ) ) {
							$pairs[] = 'box-shadow:' . $v;
						}
					}
				} elseif ( ! empty( $value ) && ! is_array( $value ) ) {
					$pairs[] = 'box-shadow:' . $value;
				}
				continue;
			}

			if ( is_array( $value ) ) {
				switch ( $key ) {
					case 'color':
						if ( ! empty( $value['text'] ) ) {
							$pairs[] = 'color:' . $value['text'];
						}
						if ( ! empty( $value['background'] ) ) {
							$pairs[] = 'background-color:' . $value['background'];
						}
						break;
					case 'typography':
						if ( ! empty( $value['fontSize'] ) ) {
							$pairs[] = 'font-size:' . $value['fontSize'];
						}
						if ( ! empty( $value['lineHeight'] ) ) {
							$pairs[] = 'line-height:' . $value['lineHeight'];
						}
						if ( ! empty( $value['fontStyle'] ) ) {
							$pairs[] = 'font-style:' . $value['fontStyle'];
						}
						break;
					case 'border':
						if ( ! empty( $value['radius'] ) ) {
							if ( is_array( $value['radius'] ) ) {
								foreach ( $value['radius'] as $dir => $v ) {
									if ( empty( $v ) || is_array( $v ) ) {
										continue;
									}
									$normalized_dir = strtolower( preg_replace( '/([a-z])([A-Z])/', '$1-$2', $dir ) );
									$normalized_dir = str_replace( '_', '-', $normalized_dir );
									$pairs[]        = 'border-' . $normalized_dir . '-radius:' . $v;
								}
							} elseif ( ! is_array( $value['radius'] ) ) {
								$pairs[] = 'border-radius:' . $value['radius'];
							}
						}
						if ( ! empty( $value['color'] ) && ! is_array( $value['color'] ) ) {
							$pairs[] = 'border-color:' . $value['color'];
						}
						if ( ! empty( $value['style'] ) && ! is_array( $value['style'] ) ) {
							$pairs[] = 'border-style:' . $value['style'];
						}
						if ( ! empty( $value['width'] ) ) {
							if ( is_array( $value['width'] ) ) {
								foreach ( $value['width'] as $dir => $v ) {
									if ( empty( $v ) || is_array( $v ) ) {
										continue;
									}
									$normalized_dir = strtolower( preg_replace( '/([a-z])([A-Z])/', '$1-$2', $dir ) );
									$normalized_dir = str_replace( '_', '-', $normalized_dir );
									$pairs[]        = 'border-' . $normalized_dir . '-width:' . $v;
								}
							} elseif ( ! is_array( $value['width'] ) ) {
								$pairs[] = 'border-width:' . $value['width'];
							}
						}
						break;
					case 'spacing':
						if ( ! empty( $value['margin'] ) && is_array( $value['margin'] ) ) {
							foreach ( $value['margin'] as $dir => $v ) {
								if ( ! empty( $v ) && ! is_array( $v ) ) {
									$pairs[] = 'margin-' . $dir . ':' . $v;
								}
							}
						}
						if ( ! empty( $value['padding'] ) && is_array( $value['padding'] ) ) {
							foreach ( $value['padding'] as $dir => $v ) {
								if ( ! empty( $v ) && ! is_array( $v ) ) {
									$pairs[] = 'padding-' . $dir . ':' . $v;
								}
							}
						}
						break;
					default:
						foreach ( $value as $sub_key => $sub_value ) {
							if ( empty( $sub_value ) || is_array( $sub_value ) ) {
								continue;
							}
							$pairs[] = $key . '-' . $sub_key . ':' . $sub_value;
						}
						break;
				}
				continue;
			}

			if ( empty( $value ) || is_array( $value ) ) {
				continue;
			}

			$pairs[] = $key . ':' . $value;
		}

		return $pairs;
	}

	/**
	 * Render pagination respecting the saved block order and attributes.
	 *
	 * @param array $pagination_block Parsed pagination block.
	 * @param int   $paged            Current page number.
	 * @param int   $total_pages      Total pages.
	 * @return string
	 */
	protected static function render_eventkoi_pagination( $pagination_block, $paged, $total_pages ) {
		$attrs       = $pagination_block['attrs'] ?? array();
		$children    = $pagination_block['innerBlocks'] ?? array();
		$class       = array( 'wp-block-query-pagination', 'eventkoi-pagination' );
		$layout      = $attrs['layout']['type'] ?? 'flex';
		$justify     = $attrs['layout']['justifyContent'] ?? '';
		$orientation = $attrs['layout']['orientation'] ?? '';
		$arrow_opt   = $attrs['paginationArrow'] ?? '';
		$show_label  = true;

		if ( isset( $pagination_block['context']['showLabel'] ) ) {
			$show_label = (bool) $pagination_block['context']['showLabel'];
		} elseif ( isset( $attrs['showLabel'] ) ) {
			$show_label = (bool) $attrs['showLabel'];
		}

		if ( ! empty( $attrs['className'] ) ) {
			$class[] = sanitize_html_class( $attrs['className'] );
		}

		if ( 'flex' === $layout ) {
			$class[] = 'is-layout-flex';
			$class[] = 'wp-block-query-pagination-is-layout-flex';
		}

		if ( 'vertical' === $orientation ) {
			$class[] = 'is-layout-vertical';
		}

		if ( ! empty( $justify ) ) {
			$class[] = 'is-content-justification-' . sanitize_html_class( $justify );
		}

		if ( empty( $children ) ) {
			$children = array(
				array(
					'blockName' => 'core/query-pagination-previous',
					'attrs'     => array(),
				),
				array(
					'blockName' => 'core/query-pagination-numbers',
					'attrs'     => array(),
				),
				array(
					'blockName' => 'core/query-pagination-next',
					'attrs'     => array(),
				),
			);
		}

		$segments = array();
		foreach ( $children as $child ) {
			$name  = $child['blockName'] ?? '';
			$cattr = $child['attrs'] ?? array();

			if ( 'core/query-pagination-previous' === $name ) {
				$label      = ! empty( $cattr['label'] ) ? $cattr['label'] : __( 'Previous', 'eventkoi-lite' );
				$target     = $paged > 1 ? $paged - 1 : 0;
				$segments[] = self::build_pagination_link( 'previous', $label, $arrow_opt, $target, $show_label );
			} elseif ( 'core/query-pagination-next' === $name ) {
				$label      = ! empty( $cattr['label'] ) ? $cattr['label'] : __( 'Next', 'eventkoi-lite' );
				$target     = $paged < $total_pages ? $paged + 1 : 0;
				$segments[] = self::build_pagination_link( 'next', $label, $arrow_opt, $target, $show_label );
			} elseif ( 'core/query-pagination-numbers' === $name ) {
				$segments[] = self::build_pagination_numbers( $paged, $total_pages );
			}
		}

		return sprintf(
			'<nav class="%1$s" aria-label="%2$s">%3$s</nav>',
			esc_attr( implode( ' ', array_filter( $class ) ) ),
			esc_attr__( 'Pagination', 'eventkoi-lite' ),
			implode( '', $segments )
		);
	}

	/**
	 * Build numbered pagination links.
	 *
	 * @param int $current Current page.
	 * @param int $total   Total pages.
	 * @return string
	 */
	protected static function build_pagination_numbers( $current, $total ) {
		$links = paginate_links(
			array(
				'base'      => add_query_arg( 'ek_page', '%#%' ),
				'format'    => '',
				'current'   => $current,
				'total'     => $total,
				'prev_next' => false,
				'type'      => 'array',
			)
		);

		if ( empty( $links ) || ! is_array( $links ) ) {
			return '';
		}

		return '<div class="wp-block-query-pagination-numbers">' . implode( '', $links ) . '</div>';
	}

	/**
	 * Build previous/next pagination link HTML.
	 *
	 * @param string $type       Link type (previous|next).
	 * @param string $label      Link label.
	 * @param string $arrow_opt  Arrow style key.
	 * @param int    $target     Target page number (0 = disabled).
	 * @param bool   $show_label Whether to output the label text.
	 * @return string
	 */
	protected static function build_pagination_link( $type, $label, $arrow_opt, $target, $show_label ) {
		$is_disabled = ( 0 === $target );
		$classes     = array( 'wp-block-query-pagination-' . $type );
		$arrow_html  = '';

		if ( 'arrow' === $arrow_opt || 'chevron' === $arrow_opt ) {
			$arrow_class = ( 'chevron' === $arrow_opt ) ? 'is-arrow-chevron' : 'is-arrow-arrow';
			$arrow_char  = 'previous' === $type
				? ( 'chevron' === $arrow_opt ? '«' : '←' )
				: ( 'chevron' === $arrow_opt ? '»' : '→' );

			$arrow_html = sprintf(
				'<span class="wp-block-query-pagination-%1$s-arrow %2$s" aria-hidden="true">%3$s</span>',
				esc_attr( $type ),
				esc_attr( $arrow_class ),
				esc_html( $arrow_char )
			);
		}

		$label_output = $show_label ? esc_html( $label ) : '';

		if ( $is_disabled ) {
			return sprintf(
				'<span class="%1$s" aria-disabled="true">%2$s%3$s</span>',
				esc_attr( implode( ' ', $classes ) ),
				'previous' === $type ? $arrow_html : '',
				$label_output . ( 'next' === $type ? $arrow_html : '' )
			);
		}

		$url = add_query_arg( 'ek_page', $target );

		return sprintf(
			'<a class="%1$s" href="%2$s">%3$s%4$s</a>',
			esc_attr( implode( ' ', $classes ) ),
			esc_url( $url ),
			'previous' === $type ? $arrow_html : '',
			$label_output . ( 'next' === $type ? $arrow_html : '' )
		);
	}

	/**
	 * Render the post template block with injected event data.
	 *
	 * @param array $post_template_block Parsed post-template block.
	 * @param array $events              Events to render.
	 * @return string
	 */
	protected static function render_eventkoi_post_template( $post_template_block, $events ) {
		$post_template_attrs = $post_template_block['attrs'] ?? array();

		$layout         = $post_template_attrs['layout'] ?? array();
		$layout_type    = $layout['type'] ?? 'default';
		$layout_cols    = isset( $layout['columnCount'] ) ? absint( $layout['columnCount'] ) : 1;
		$template_cls   = array( 'wp-block-post-template' );
		$template_style = '';

		if ( 'grid' === $layout_type ) {
			$template_cls[] = 'is-layout-grid';
			if ( $layout_cols ) {
				$template_cls[] = 'columns-' . $layout_cols;
				$template_style = sprintf( 'display:grid;grid-template-columns:repeat(%d,minmax(0,1fr));gap:var(--wp--style--block-gap,1.5rem);', $layout_cols );
			}
		} else {
			$template_cls[] = 'is-layout-flow';
		}

		if ( ! empty( $post_template_attrs['className'] ) ) {
			$template_cls[] = sanitize_html_class( $post_template_attrs['className'] );
		}

		$template_class_attr = implode( ' ', array_filter( $template_cls ) );

		ob_start();
		?>
		<ul class="<?php echo esc_attr( $template_class_attr ); ?>"<?php echo $template_style ? ' style="' . esc_attr( $template_style ) . '"' : ''; ?>>
			<?php foreach ( $events as $event ) : ?>
				<li class="wp-block-post">
					<?php
					if ( ! empty( $post_template_block['innerBlocks'] ) ) {
						foreach ( $post_template_block['innerBlocks'] as $row_block ) {
							$prepared = self::inject_event_context( $row_block, $event );
							echo render_block( $prepared ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
						}
					}
					?>
				</li>
			<?php endforeach; ?>
		</ul>
		<?php

		return ob_get_clean();
	}

	/**
	 * Inject event-specific context and attributes into a block tree.
	 *
	 * @param array $block  Parsed block array.
	 * @param array $event  Event data to inject.
	 * @return array Prepared block with context.
	 */
	protected static function inject_event_context( $block, $event ) {
		if ( empty( $block ) || ! is_array( $block ) ) {
			return $block;
		}

		$block['context']                   = isset( $block['context'] ) && is_array( $block['context'] ) ? $block['context'] : array();
		$block['context']['eventkoi_event'] = $event;

		$block_name = $block['blockName'] ?? '';

		if ( 'eventkoi/event-data' === $block_name ) {
			// Already injected above; no further processing needed here.
		} elseif ( 'core/image' === $block_name ) {
			$block['attrs'] = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();
			if ( ! empty( $event['thumbnail'] ) ) {
				$block['attrs']['url'] = $event['thumbnail'];
				if ( empty( $block['attrs']['alt'] ) ) {
					$block['attrs']['alt'] = $event['title'] ?? '';
				}

				if ( ! empty( $block['innerHTML'] ) ) {
					$block['innerHTML'] = self::replace_img_src(
						$block['innerHTML'],
						$event['thumbnail'],
						$event['title'] ?? ''
					);
				}
			}
		}

		if ( ! empty( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) {
			$block['innerBlocks'] = array_map(
				function ( $inner ) use ( $event ) {
					return self::inject_event_context( $inner, $event );
				},
				$block['innerBlocks']
			);
		}

		return $block;
	}

	/**
	 * Replace the first img src in HTML with provided URL/alt.
	 *
	 * @param string $html  Original HTML.
	 * @param string $src   New src URL.
	 * @param string $alt   New alt text.
	 * @return string Modified HTML.
	 */
	private static function replace_img_src( $html, $src, $alt ) {
		if ( empty( $html ) || empty( $src ) ) {
			return $html;
		}

		$replacement = sprintf(
			'<img src="%s" alt="%s" loading="lazy" decoding="async" />',
			esc_url( $src ),
			esc_attr( $alt )
		);

		return preg_replace( '#<img[^>]+>#', $replacement, $html, 1 );
	}

	/**
	 * Retrieve event field markup for a given event-data block.
	 *
	 * Defaults to rendering the title if no field attribute is provided.
	 *
	 * @param string $field      Field name from the event-data block (e.g. title, timeline, excerpt, location, image).
	 * @param array  $event      The event data array.
	 * @param array  $attributes The parent block attributes.
	 * @param bool   $link_title Whether to wrap titles in a link (used inside Query Loop).
	 * @return string HTML for the given event field, or empty string if hidden.
	 */
	private static function get_event_field_value( $field, $event, $attributes, $link_title = true ) {
		// Default to title if missing or empty.
		if ( empty( $field ) ) {
			$field = 'title';
		}

		$field = strtolower( $field );

		// Normalize aliases.
		$aliases = array(
			'description' => 'excerpt',
			'datetime'    => 'timeline',
		);

		if ( isset( $aliases[ $field ] ) ) {
			$field = $aliases[ $field ];
		}

		if ( empty( $event ) || is_wp_error( $event ) || ! is_array( $event ) ) {
			return '';
		}

		$map = array(
			'title'    => ! empty( $event['title'] )
				? sprintf(
					$link_title && ! empty( $event['url'] ?? '' )
					? '<span class="ek-event-title--inner"><a href="%1$s" rel="bookmark">%2$s</a></span>'
					: '<span class="ek-event-title--inner">%2$s</span>',
					esc_url( $event['url'] ?? '' ),
					esc_html( $event['title'] )
				)
				: '',
			'timeline' => ! empty( $event['datetime'] )
				? ( function () use ( $event ) {
				$start_iso = $event['start_date_iso'] ?? '';
				$end_iso   = '';

				if ( empty( $start_iso ) && ! empty( $event['event_days'][0]['start_date'] ) ) {
					$start_dt = new \DateTimeImmutable( $event['event_days'][0]['start_date'], new \DateTimeZone( 'UTC' ) );
					$start_iso = $start_dt->format( 'Y-m-d\TH:i:s\Z' );
				}

				if ( empty( $end_iso ) && ! empty( $event['event_days'][0]['end_date'] ) ) {
					$end_dt = new \DateTimeImmutable( $event['event_days'][0]['end_date'], new \DateTimeZone( 'UTC' ) );
					if ( ! empty( $event['event_days'][0]['all_day'] ) ) {
						$end_dt = $end_dt->modify( '+1 day' )->setTime( 0, 0, 0 );
					}
					$end_iso = $end_dt->format( 'Y-m-d\TH:i:s\Z' );
				}

				if ( empty( $start_iso ) && ! empty( $event['start'] ) ) {
					$start_iso = $event['start'];
				}

				if ( empty( $end_iso ) && ! empty( $event['end'] ) ) {
					$end_iso = $event['end'];
				}

				if ( empty( $start_iso ) && ! empty( $event['recurrence_rules'][0]['start_date'] ) ) {
					$start_dt = new \DateTimeImmutable( $event['recurrence_rules'][0]['start_date'], new \DateTimeZone( 'UTC' ) );
					$start_iso = $start_dt->format( 'Y-m-d\TH:i:s\Z' );
				}

				if ( empty( $end_iso ) && ! empty( $event['recurrence_rules'][0]['end_date'] ) ) {
					$end_dt = new \DateTimeImmutable( $event['recurrence_rules'][0]['end_date'], new \DateTimeZone( 'UTC' ) );
					if ( ! empty( $event['recurrence_rules'][0]['all_day'] ) ) {
						$end_dt = $end_dt->modify( '+1 day' )->setTime( 0, 0, 0 );
					}
					$end_iso = $end_dt->format( 'Y-m-d\TH:i:s\Z' );
				}

				// Absolute fallback to wp_start_ts/wp_end_ts if provided.
				if ( empty( $start_iso ) && ! empty( $event['wp_start_ts'] ) ) {
					$start_iso = gmdate( 'Y-m-d\TH:i:s\Z', (int) $event['wp_start_ts'] );
				}
				if ( empty( $end_iso ) && ! empty( $event['wp_end_ts'] ) ) {
					$end_iso = gmdate( 'Y-m-d\TH:i:s\Z', (int) $event['wp_end_ts'] );
				}

				$tz        = $event['timezone']
					?? $event['timezone_display']
					?? wp_timezone_string();

				$is_all_day = ! empty( $event['allDay'] )
					|| ! empty( $event['event_days'][0]['all_day'] )
					|| ! empty( $event['recurrence_rules'][0]['all_day'] );

				$wrapped = sprintf(
					'<span class="ek-datetime" data-start="%1$s" data-end="%2$s" data-tz="%3$s" data-all-day="%4$s">%5$s</span>',
					esc_attr( $start_iso ),
					esc_attr( $end_iso ),
					esc_attr( $tz ),
					$is_all_day ? '1' : '0',
					wp_kses_post( $event['datetime'] )
				);

				return '<div class="ek-event-timeline--inner">' . $wrapped . '</div>';
				} )()
				: '',
			'excerpt'  => ! empty( $event['description'] )
				? '<div class="ek-event-excerpt--inner ek-event-excerpt-default">' . wp_kses_post( $event['description'] ) . '</div>'
				: '',
			'location' => ! empty( $event['location_line'] )
				? '<div class="ek-event-location--inner">' . esc_html( $event['location_line'] ) . '</div>'
				: '',
			'image'    => ! empty( $event['thumbnail'] )
				? sprintf(
					'<a href="%1$s" class="ek-event-image-link" rel="bookmark"><img src="%2$s" alt="%3$s" class="rounded-xl w-full h-auto object-cover ek-event-image-default" loading="lazy" decoding="async" /></a>',
					esc_url( $event['url'] ?? '' ),
					esc_url( $event['thumbnail'] ),
					esc_attr( $event['title'] ?? '' )
				)
				: '',
		);

		$visibility = array(
			'title'    => $attributes['showTitle'] ?? true,
			'timeline' => $attributes['showDatetime'] ?? true,
			'excerpt'  => $attributes['showDescription'] ?? true,
			'location' => $attributes['showLocation'] ?? true,
			'image'    => $attributes['showImage'] ?? true,
		);

		if ( empty( $visibility[ $field ] ) ) {
			return '';
		}

		return $map[ $field ] ?? '';
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
		$cal_id   = (int) get_option( 'eventkoi_default_event_cal', 0 );
		$calendar = new \EventKoi\Core\Calendar( $cal_id );

		if ( 'calendar' === $type ) {
			$args = array(
				'calendars'     => $attrs['calendars'] ?? '',
				'startday'      => ! empty( $attrs['startday'] ) ? esc_attr( $attrs['startday'] ) : $calendar::get_startday(),
				'timeframe'     => ! empty( $attrs['timeframe'] ) ? esc_attr( $attrs['timeframe'] ) : $calendar::get_timeframe(),
				'color'         => ! empty( $attrs['color'] ) ? esc_attr( $attrs['color'] ) : eventkoi_default_calendar_color(),
				'default_month' => ! empty( $attrs['default_month'] ) ? esc_attr( $attrs['default_month'] ) : '',
				'default_year'  => ! empty( $attrs['default_year'] ) ? esc_attr( $attrs['default_year'] ) : '',
				'context'       => 'block',
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

		$args['layout'] = $attrs['layout'] ?? array();
		$args['align']  = $attrs['align'] ?? '';

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

		// Use the new helper.
		$template_path = eventkoi_locate_template( 'event.php' );

		// Include the resolved template file.
		include $template_path;

		$content = ob_get_clean();

		return apply_filters( 'eventkoi_get_default_template', $content );
	}
}
