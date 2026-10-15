<?php
/**
 * Divi 5 integration.
 *
 * Divi 5 replaces the shortcode modules with block based modules that are
 * described by a module.json file, rendered by a PHP callback and previewed
 * by a small React bundle inside the visual builder. This class wires those
 * three parts together for the Calendar and Event modules and hands
 * the builder the data it needs (calendars, events, taxonomy terms, labels).
 *
 * The Divi 4 shortcode modules in class-divi-modules.php keep working for
 * sites still on Divi 4. Divi 5 converts those shortcodes to these modules
 * through the conversion outlines that sit next to each module.json.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Divi5_Modules.
 */
class Divi5_Modules {

	/**
	 * Script handle of the visual builder bundle.
	 */
	const HANDLE = 'eventkoi-divi5';

	/**
	 * Module slugs this edition registers.
	 *
	 * @var string[]
	 */
	const MODULES = array( 'calendar', 'event' );

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'divi_module_library_modules_dependency_tree', array( $this, 'register_modules' ) );
		add_action( 'divi_visual_builder_assets_before_enqueue_scripts', array( $this, 'enqueue_builder_assets' ) );
		add_filter( 'divi_visual_builder_package_build_params_visual-builder', array( $this, 'load_bundle_before_builder' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_app_window_assets' ), 20 );
	}

	/**
	 * Path of the visual builder bundle.
	 *
	 * @return string
	 */
	public static function bundle_path() {
		return EVENTKOI_PLUGIN_DIR . 'scripts/divi/build/index.js';
	}

	/**
	 * Make the builder app depend on our bundle so the modules and icons are
	 * registered before the app boots, while both stay in the footer.
	 *
	 * @param array $params Divi package build params for visual-builder.
	 * @return array
	 */
	public function load_bundle_before_builder( $params ) {
		if ( ! self::is_active() || ! file_exists( self::bundle_path() ) || ! is_array( $params ) ) {
			return $params;
		}

		if ( ! isset( $params['script'] ) || ! is_array( $params['script'] ) ) {
			$params['script'] = array();
		}

		$deps = isset( $params['script']['deps'] ) && is_array( $params['script']['deps'] ) ? $params['script']['deps'] : array();
		if ( ! in_array( self::HANDLE, $deps, true ) ) {
			$deps[] = self::HANDLE;
		}
		$params['script']['deps'] = $deps;

		return $params;
	}

	/**
	 * Whether the Divi 5 module library is loaded.
	 *
	 * @return bool
	 */
	public static function is_active() {
		return class_exists( '\ET\Builder\Packages\ModuleLibrary\ModuleRegistration' )
			&& interface_exists( '\ET\Builder\Framework\DependencyManagement\Interfaces\DependencyInterface' );
	}

	/**
	 * Add our modules to the Divi 5 dependency tree.
	 *
	 * @param object $dependency_tree Divi DependencyTree.
	 */
	public function register_modules( $dependency_tree ) {
		if ( ! self::is_active() || ! is_object( $dependency_tree ) || ! method_exists( $dependency_tree, 'add_dependency' ) ) {
			return;
		}

		foreach ( self::MODULES as $slug ) {
			$class = __NAMESPACE__ . '\\Divi5\\' . ucfirst( $slug ) . '_Module';
			if ( class_exists( $class ) ) {
				$dependency_tree->add_dependency( new $class() );
			}
		}
	}

	/**
	 * Folder holding the module.json and conversion-outline.json files.
	 *
	 * @param string $slug Module slug.
	 * @return string
	 */
	public static function module_dir( $slug ) {
		return EVENTKOI_PLUGIN_DIR . 'includes/core/divi5/modules/' . sanitize_key( $slug ) . '/';
	}

	/**
	 * Decoded module.json.
	 *
	 * @param string $slug Module slug.
	 * @return array
	 */
	public static function module_metadata( $slug ) {
		static $cache = array();

		if ( isset( $cache[ $slug ] ) ) {
			return $cache[ $slug ];
		}

		$file = self::module_dir( $slug ) . 'module.json';
		$json = file_exists( $file ) ? file_get_contents( $file ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local plugin file.
		$data = json_decode( (string) $json, true );

		$cache[ $slug ] = is_array( $data ) ? $data : array();

		return $cache[ $slug ];
	}

	/**
	 * Block attributes for a module: the static ones from module.json plus
	 * one checkbox list per built taxonomy on the calendar module.
	 *
	 * @param string $slug Module slug.
	 * @return array
	 */
	public static function module_attributes( $slug ) {
		$metadata   = self::module_metadata( $slug );
		$attributes = isset( $metadata['attributes'] ) && is_array( $metadata['attributes'] ) ? $metadata['attributes'] : array();

		if ( 'calendar' === $slug ) {
			foreach ( self::taxonomy_definitions() as $definition ) {
				$attributes[ $definition['attr'] ] = array( 'type' => 'object' );
			}
		}

		return $attributes;
	}

	/**
	 * Taxonomy pickers offered on the calendar module (PROD-569), one per
	 * built taxonomy. Shared with the builder bundle so both sides describe
	 * the same attributes.
	 *
	 * @return array<int,array{slug:string,attr:string,label:string,description:string,options:array}>
	 */
	public static function taxonomy_definitions() {
		if ( ! class_exists( Taxonomies::class ) || ! method_exists( Taxonomies::class, 'term_options' ) ) {
			return array();
		}

		$definitions = array();

		foreach ( Taxonomies::term_options() as $taxonomy ) {
			$slug = sanitize_key( $taxonomy['slug'] ?? '' );
			if ( '' === $slug ) {
				continue;
			}

			$options = array();
			foreach ( (array) ( $taxonomy['terms'] ?? array() ) as $term ) {
				$options[] = array(
					'value' => (string) $term['id'],
					'label' => (string) $term['name'],
				);
			}

			$definitions[] = array(
				'slug'        => $slug,
				'attr'        => 'taxonomy_' . str_replace( '-', '_', $slug ),
				/* translators: %s: taxonomy name, e.g. "Locations". */
				'label'       => sprintf( __( 'Limit to %s', 'eventkoi-lite' ), (string) $taxonomy['label'] ),
				'description' => __( 'Leave empty to show every event.', 'eventkoi-lite' ),
				'options'     => $options,
			);
		}

		return $definitions;
	}

	/**
	 * Read a field value out of the Divi 5 attribute tree.
	 *
	 * @param array  $attrs   Module attributes.
	 * @param string $name    Attribute name.
	 * @param mixed  $fallback Value when the attribute was never set.
	 * @return mixed
	 */
	public static function attr_value( array $attrs, $name, $fallback = '' ) {
		if ( ! isset( $attrs[ $name ]['innerContent']['desktop'] ) || ! is_array( $attrs[ $name ]['innerContent']['desktop'] ) ) {
			return $fallback;
		}

		if ( ! array_key_exists( 'value', $attrs[ $name ]['innerContent']['desktop'] ) ) {
			return $fallback;
		}

		return $attrs[ $name ]['innerContent']['desktop']['value'];
	}

	/**
	 * Map Divi 5 attributes onto the flat settings the renderers expect.
	 *
	 * @param string $slug  Module slug.
	 * @param array  $attrs Module attributes.
	 * @return array
	 */
	public static function props_from_attrs( $slug, array $attrs ) {
		switch ( $slug ) {
			case 'calendar':
				$props = array(
					'eventkoi_calendar'             => self::attr_value( $attrs, 'calendar', 'default' ),
					'eventkoi_timeframe'            => self::attr_value( $attrs, 'timeframe', 'month' ),
					'eventkoi_show_calendar_filter' => self::attr_value( $attrs, 'showCalendarFilter', 'off' ),
					'eventkoi_show_timezone'        => self::attr_value( $attrs, 'showTimezone', 'on' ),
					'eventkoi_show_month_view'      => self::attr_value( $attrs, 'showMonthView', 'on' ),
					'eventkoi_show_week_view'       => self::attr_value( $attrs, 'showWeekView', 'on' ),
					'eventkoi_show_list_view'       => self::attr_value( $attrs, 'showListView', 'on' ),
					'eventkoi_week_start'           => self::attr_value( $attrs, 'weekStart', 'monday' ),
				);

				foreach ( self::taxonomy_definitions() as $definition ) {
					$props[ 'eventkoi_tax_' . $definition['slug'] ] = self::attr_value( $attrs, $definition['attr'], array() );
				}

				return $props;

			case 'event':
				return array(
					'eventkoi_event_id' => self::attr_value( $attrs, 'event', 'current' ),
					'eventkoi_data'     => self::attr_value( $attrs, 'data', 'full' ),
				);

		}

		return array();
	}

	/**
	 * Render a module from its Divi 5 attributes.
	 *
	 * @param string $slug  Module slug.
	 * @param array  $attrs Module attributes.
	 * @return string
	 */
	public static function render( $slug, array $attrs ) {
		$props = self::props_from_attrs( $slug, $attrs );

		switch ( $slug ) {
			case 'calendar':
				return Divi_Renderers::calendar( $props );
			case 'event':
				return Divi_Renderers::event( $props );
		}

		return '';
	}

	/**
	 * Turn a keyed options array into the list the builder fields expect.
	 *
	 * @param array $options value => label.
	 * @return array<int,array{value:string,label:string}>
	 */
	protected static function option_list( array $options ) {
		$list = array();
		foreach ( $options as $value => $label ) {
			$list[] = array(
				// The builder select cannot show an empty value, so the
				// "use the default" choice is stored as default and the
				// renderers treat anything that is not an ID as unset.
				'value' => '' === (string) $value ? 'default' : (string) $value,
				'label' => (string) $label,
			);
		}
		return $list;
	}

	/**
	 * Translated field labels, applied to the module metadata in the builder.
	 *
	 * @return array<string,array<string,array{label:string,description?:string}>>
	 */
	public static function field_labels() {
		return array(
			'calendar' => array(
				'group'              => array( 'label' => __( 'Calendar', 'eventkoi-lite' ) ),
				'calendar'           => array(
					'label'       => __( 'Calendar', 'eventkoi-lite' ),
					'description' => __( 'Leave empty to use the default calendar.', 'eventkoi-lite' ),
				),
				'timeframe'          => array( 'label' => __( 'Default timeframe', 'eventkoi-lite' ) ),
				'showCalendarFilter' => array( 'label' => __( 'Show calendar filter', 'eventkoi-lite' ) ),
				'showTimezone'       => array( 'label' => __( 'Show timezone', 'eventkoi-lite' ) ),
				'showMonthView'      => array( 'label' => __( 'Show Month view', 'eventkoi-lite' ) ),
				'showWeekView'       => array( 'label' => __( 'Show Week view', 'eventkoi-lite' ) ),
				'showListView'       => array( 'label' => __( 'Show List view', 'eventkoi-lite' ) ),
				'weekStart'          => array( 'label' => __( 'Week starts on', 'eventkoi-lite' ) ),
			),
			'event'    => array(
				'group' => array( 'label' => __( 'Event', 'eventkoi-lite' ) ),
				'event' => array(
					'label'       => __( 'Event', 'eventkoi-lite' ),
					'description' => __( 'Select an event to display. Use the current event when placed on an event template.', 'eventkoi-lite' ),
				),
				'data'  => array( 'label' => __( 'Data to render', 'eventkoi-lite' ) ),
			),
		);
	}

	/**
	 * Select options that depend on site content, filled into the metadata by
	 * the builder bundle.
	 *
	 * @return array<string,array<string,array>>
	 */
	public static function field_options() {
		return array(
			'calendar' => array(
				'calendar'  => self::option_list( Divi_Renderers::calendar_options( __( '— Default calendar —', 'eventkoi-lite' ) ) ),
				'timeframe' => self::option_list(
					array(
						'month' => __( 'Month', 'eventkoi-lite' ),
						'week'  => __( 'Week', 'eventkoi-lite' ),
						'list'  => __( 'List', 'eventkoi-lite' ),
					)
				),
				'weekStart' => self::option_list(
					array(
						'sunday'    => __( 'Sunday', 'eventkoi-lite' ),
						'monday'    => __( 'Monday', 'eventkoi-lite' ),
						'tuesday'   => __( 'Tuesday', 'eventkoi-lite' ),
						'wednesday' => __( 'Wednesday', 'eventkoi-lite' ),
						'thursday'  => __( 'Thursday', 'eventkoi-lite' ),
						'friday'    => __( 'Friday', 'eventkoi-lite' ),
						'saturday'  => __( 'Saturday', 'eventkoi-lite' ),
					)
				),
			),
			'event'    => array(
				'event' => self::option_list( Divi_Renderers::event_options() ),
				'data'  => self::option_list( Divi_Renderers::event_data_options() ),
			),
		);
	}

	/**
	 * Data handed to the builder bundle.
	 *
	 * @return array
	 */
	public static function builder_data() {
		return array(
			'modules'    => self::MODULES,
			'restUrl'    => esc_url_raw( rest_url( 'eventkoi/v1/divi/render' ) ),
			'nonce'      => wp_create_nonce( 'wp_rest' ),
			'postId'     => (int) get_queried_object_id(),
			'options'    => self::field_options(),
			'labels'     => self::field_labels(),
			'taxonomies' => self::taxonomy_definitions(),
			'i18n'       => array(
				'loading' => __( 'Loading…', 'eventkoi-lite' ),
				'empty'   => __( 'Nothing to show yet. Check the module settings.', 'eventkoi-lite' ),
				'error'   => __( 'The preview could not be loaded.', 'eventkoi-lite' ),
			),
		);
	}

	/**
	 * Register the visual builder bundle with Divi's package manager.
	 */
	public function enqueue_builder_assets() {
		if ( ! self::is_active() || ! class_exists( '\ET\Builder\VisualBuilder\Assets\PackageBuildManager' ) ) {
			return;
		}

		$file = self::bundle_path();
		if ( ! file_exists( $file ) ) {
			return;
		}

		\ET\Builder\VisualBuilder\Assets\PackageBuildManager::register_package_build(
			array(
				'name'    => self::HANDLE,
				'version' => EVENTKOI_VERSION . '.' . (string) filemtime( $file ),
				'script'  => array(
					'src'                => EVENTKOI_PLUGIN_URL . 'scripts/divi/build/index.js',
					'deps'               => array(
						'divi-module-library',
						'divi-vendor-wp-hooks',
					),
					// Footer, like Divi's own packages. In the head, WordPress hoists
					// the whole Divi dependency chain up with it, which breaks other
					// plugins' admin bar scripts inside the canvas.
					'args'               => array( 'in_footer' => true ),
					'enqueue_top_window' => false,
					'enqueue_app_window' => true,
					'data_app_window'    => self::builder_data(),
				),
			)
		);
	}

	/**
	 * The builder canvas is a normal page load, so the calendar script and
	 * styles have to be there for the module previews to mount.
	 */
	public function enqueue_app_window_assets() {
		if ( ! self::is_active() || ! function_exists( 'et_core_is_fb_enabled' ) || ! et_core_is_fb_enabled() ) {
			return;
		}

		// Only the canvas window renders modules; the top window is Divi's UI.
		if ( ! isset( $_GET['app_window'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read only check for Divi's canvas window flag.
			return;
		}

		Scripts::enqueue_frontend_assets();
	}
}
