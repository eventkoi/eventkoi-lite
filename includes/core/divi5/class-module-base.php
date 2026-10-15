<?php
/**
 * Shared plumbing for the Divi 5 modules.
 *
 * Each module only supplies its slug and inner HTML. Registration, the
 * Divi wrapper markup, design settings (background, spacing, border, ...),
 * custom CSS and script data are handled here the way Divi's own modules
 * do it.
 *
 * Only loaded when the Divi 5 module library is present, because it
 * implements a Divi interface.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core\Divi5
 */

namespace EventKoi\Core\Divi5;

defined( 'ABSPATH' ) || exit;

use ET\Builder\Framework\DependencyManagement\Interfaces\DependencyInterface;
use ET\Builder\FrontEnd\BlockParser\BlockParserStore;
use ET\Builder\FrontEnd\Module\Style;
use ET\Builder\Packages\Module\Module;
use ET\Builder\Packages\Module\Options\Css\CssStyle;
use ET\Builder\Packages\Module\Options\Element\ElementScriptData;
use ET\Builder\Packages\Module\Options\Text\TextClassnames;
use ET\Builder\Packages\ModuleLibrary\ModuleRegistration;
use EventKoi\Core\Divi5_Modules;

/**
 * Module_Base.
 */
abstract class Module_Base implements DependencyInterface {

	/**
	 * Module slug: calendar, event or loop.
	 *
	 * @return string
	 */
	abstract protected static function slug();

	/**
	 * Register the block type with Divi on init.
	 */
	public function load() {
		add_action(
			'init',
			function () {
				$slug = static::slug();

				ModuleRegistration::register_module(
					Divi5_Modules::module_dir( $slug ),
					array(
						'render_callback' => array( static::class, 'render_callback' ),
						'attributes'      => Divi5_Modules::module_attributes( $slug ),
					)
				);
			}
		);
	}

	/**
	 * Front end render callback.
	 *
	 * @param array     $attrs    Block attributes saved by the builder.
	 * @param string    $content  Rendered inner blocks.
	 * @param \WP_Block $block    Parsed block.
	 * @param object    $elements ModuleElements instance.
	 * @return string
	 */
	public static function render_callback( $attrs, $content, $block, $elements ) {
		unset( $content );

		$attrs  = is_array( $attrs ) ? $attrs : array();
		$parent = BlockParserStore::get_parent( $block->parsed_block['id'], $block->parsed_block['storeInstance'] );
		$inner  = Divi5_Modules::render( static::slug(), $attrs );

		return Module::render(
			array(
				'orderIndex'          => $block->parsed_block['orderIndex'],
				'storeInstance'       => $block->parsed_block['storeInstance'],
				'id'                  => $block->parsed_block['id'],
				'name'                => $block->block_type->name,
				'moduleCategory'      => $block->block_type->category,
				'attrs'               => $attrs,
				'elements'            => $elements,
				'classnamesFunction'  => array( static::class, 'module_classnames' ),
				'stylesComponent'     => array( static::class, 'module_styles' ),
				'scriptDataComponent' => array( static::class, 'module_script_data' ),
				'parentAttrs'         => $parent->attrs ?? array(),
				'parentId'            => $parent->id ?? '',
				'parentName'          => $parent->blockName ?? '', // phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase -- Divi block parser property.
				'children'            => array(
					$elements->style_components( array( 'attrName' => 'module' ) ),
					$inner,
				),
			)
		);
	}

	/**
	 * Module CSS classes.
	 *
	 * @param array $args classnamesInstance + attrs.
	 */
	public static function module_classnames( $args ) {
		$classnames_instance = $args['classnamesInstance'];
		$attrs               = $args['attrs'] ?? array();

		$text_classnames = TextClassnames::text_options_classnames( $attrs['module']['advanced']['text'] ?? array() );
		if ( $text_classnames ) {
			$classnames_instance->add( $text_classnames, true );
		}
	}

	/**
	 * Module styles: the design tab options plus custom CSS.
	 *
	 * @param array $args Style arguments from Divi.
	 */
	public static function module_styles( $args ) {
		$attrs                       = $args['attrs'] ?? array();
		$elements                    = $args['elements'];
		$settings                    = $args['settings'] ?? array();
		$default_printed_style_attrs = $args['defaultPrintedStyleAttrs'] ?? array();

		Style::add(
			array(
				'id'            => $args['id'],
				'name'          => $args['name'],
				'orderIndex'    => $args['orderIndex'],
				'storeInstance' => $args['storeInstance'],
				'styles'        => array(
					$elements->style(
						array(
							'attrName'   => 'module',
							'styleProps' => array(
								'defaultPrintedStyleAttrs' => $default_printed_style_attrs['module']['decoration'] ?? array(),
								'disabledOn'               => array(
									'disabledModuleVisibility' => $settings['disabledModuleVisibility'] ?? null,
								),
								'advancedStyles'           => array(
									array(
										'componentName' => 'divi/text',
										'props'         => array(
											'selector' => $args['orderClass'],
											'attr'     => $attrs['module']['advanced']['text'] ?? array(),
											'defaultPrintedStyleAttr' => $default_printed_style_attrs['module']['advanced']['text'] ?? array(),
										),
									),
								),
							),
						)
					),
					CssStyle::style(
						array(
							'selector'  => $args['orderClass'],
							'attr'      => $attrs['css'] ?? array(),
							'cssFields' => static::custom_css(),
						)
					),
				),
			)
		);
	}

	/**
	 * Script data for animations, links and similar module options.
	 *
	 * @param array $args Script data arguments from Divi.
	 */
	public static function module_script_data( $args ) {
		$attrs = $args['attrs'] ?? array();

		ElementScriptData::set(
			array(
				'id'            => $args['id'] ?? '',
				'selector'      => $args['selector'] ?? '',
				'attrs'         => array_merge(
					$attrs['module']['decoration'] ?? array(),
					array(
						'link' => $attrs['module']['advanced']['link'] ?? array(),
					)
				),
				'storeInstance' => $args['storeInstance'] ?? null,
			)
		);
	}

	/**
	 * Custom CSS fields from module.json.
	 *
	 * @return array
	 */
	public static function custom_css() {
		$metadata = Divi5_Modules::module_metadata( static::slug() );

		return isset( $metadata['customCssFields'] ) && is_array( $metadata['customCssFields'] ) ? $metadata['customCssFields'] : array();
	}
}
