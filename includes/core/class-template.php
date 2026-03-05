<?php
/**
 * Template.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Template.
 */
class Template {
	/**
	 * Initial template_include path before third-party overrides.
	 *
	 * @var string
	 */
	private static $initial_template_include = '';

	/**
	 * Init.
	 */
	public function __construct() {
		add_action( 'init', array( __CLASS__, 'register_plugin_templates' ) );

		add_action( 'single_template', array( __CLASS__, 'single_event' ) );
		add_action( 'taxonomy_template', array( __CLASS__, 'single_calendar' ) );

		add_filter( 'pre_get_document_title', array( __CLASS__, 'maybe_override_instance_title' ) );

		add_action( 'wp_head', array( __CLASS__, 'maybe_output_canonical_tag' ) );
		add_action( 'wp_head', array( __CLASS__, 'maybe_output_robots_tag' ), 1 );
		add_action( 'wp_head', array( __CLASS__, 'maybe_output_viewport_meta' ), 0 );

		add_action( 'template_redirect', array( __CLASS__, 'maybe_block_trashed_instance' ) );

		add_filter( 'template_include', array( __CLASS__, 'force_instance_block_template' ), 50 );
		add_filter( 'template_include', array( __CLASS__, 'maybe_force_series_template' ), 52 );
		add_filter( 'template_include', array( __CLASS__, 'maybe_inject_rsvp_block_template_content' ), 60 );
		add_filter( 'template_include', array( __CLASS__, 'maybe_force_bb_layout_editor_template' ), 40 );
		add_filter( 'single_template', array( __CLASS__, 'maybe_force_bb_layout_editor_template' ), 40 );
		add_filter( 'singular_template', array( __CLASS__, 'maybe_force_bb_layout_editor_template' ), 40 );
		add_filter( 'template_include', array( __CLASS__, 'capture_initial_template_include' ), 1 );
		add_filter( 'template_include', array( __CLASS__, 'enforce_explicit_default_template' ), 9999 );
		add_filter( 'fl_builder_render_module_content', array( __CLASS__, 'maybe_replace_tokens_in_beaver_module_output' ), 20, 2 );
		add_filter( 'fl_theme_builder_template_include', array( __CLASS__, 'maybe_override_beaver_themer_template_include' ), 20, 2 );
		add_filter( 'deprecated_file_trigger_error', array( __CLASS__, 'maybe_disable_deprecated_file_warnings_for_bb_editor' ), 10, 1 );
		add_filter( 'redirect_canonical', array( __CLASS__, 'maybe_preserve_event_single_pagination' ), 20, 2 );

		add_filter( 'render_block', array( __CLASS__, 'maybe_inject_series_backlink' ), 8, 2 );
		add_filter( 'eventkoi_get_content', array( __CLASS__, 'maybe_inject_rsvp_shortcode' ), 20 );
	}

	/**
	 * Preserve paged URLs on single EventKoi event pages.
	 *
	 * WordPress canonical redirects typically strip `/page/{n}` on singular posts.
	 * Beaver Loop pagination on event singles uses those URLs, so keep them intact.
	 *
	 * @param string|false $redirect_url  Canonical redirect URL.
	 * @param string       $requested_url Original requested URL.
	 * @return string|false
	 */
	public static function maybe_preserve_event_single_pagination( $redirect_url, $requested_url ) {
		if ( ! is_singular( 'eventkoi_event' ) ) {
			return $redirect_url;
		}

		$requested_path   = (string) wp_parse_url( (string) $requested_url, PHP_URL_PATH );
		$has_page_segment = (bool) preg_match( '#/page/\d+/?$#', $requested_path );
		$has_paged_query  = isset( $_GET['paged'] ) || isset( $_GET['page'] );

		if ( $has_page_segment || $has_paged_query ) {
			return false;
		}

		return $redirect_url;
	}

	/**
	 * Register plugin templates.
	 */
	public static function register_plugin_templates() {

		$args = array(
			'title'       => __( 'Event', 'eventkoi' ),
			'description' => __( 'Default template for a single event view.', 'eventkoi' ),
			'content'     => self::get_default_event_template(),
		);

		register_block_template( eventkoi_plugin_name() . '//single-eventkoi_event', apply_filters( 'eventkoi_event_template_args', $args ) );

		// Event series template (for recurring events).
		$series_args = array(
			'title'       => __( 'Event Series', 'eventkoi' ),
			'description' => __( 'Template used when viewing a recurring event series.', 'eventkoi' ),
			'content'     => self::get_event_series_template(),
		);

		register_block_template(
			eventkoi_plugin_name() . '//single-eventkoi_event-series',
			apply_filters( 'eventkoi_event_series_template_args', $series_args )
		);
	}

	/**
	 * Load a single event template.
	 *
	 * @param string $single A single template.
	 */
	public static function single_event( $single ) {
		global $post;

		if ( eventkoi_current_theme_support() ) {
			return $single;
		}

		if ( is_singular( 'eventkoi_event' ) && isset( $post->post_type ) && 'eventkoi_event' === $post->post_type ) {
			$default_file = EVENTKOI_PLUGIN_DIR . 'includes/core/views/single-event-page.php';
			if ( file_exists( $default_file ) ) {
				$single = $default_file;
			}
		}

		return $single;
	}

	/**
	 * Load a single calendar template.
	 *
	 * @param string $single A single template.
	 */
	public static function single_calendar( $single ) {
		global $post;

		if ( is_tax( 'event_cal' ) ) {
			$default_file = EVENTKOI_PLUGIN_DIR . 'includes/core/views/single-calendar-page.php';
			if ( file_exists( $default_file ) ) {
				$single = $default_file;
			}
		}

		return $single;
	}

	/**
	 * Get default event template markup.
	 */
	public static function get_default_event_template() {
		ob_start();

		include_once EVENTKOI_PLUGIN_DIR . 'templates/single-event.php';

		$content = ob_get_clean();

		return apply_filters( 'eventkoi_get_default_event_template', $content );
	}

	/**
	 * Inject the RSVP shortcode into event templates when missing.
	 *
	 * @param string $content Template markup.
	 * @return string
	 */
	public static function maybe_inject_rsvp_shortcode( $content ) {
		if ( ! is_singular( 'eventkoi_event' ) ) {
			return $content;
		}

		return self::inject_rsvp_shortcode( $content );
	}

	/**
	 * Inject the RSVP shortcode into block template content when missing.
	 *
	 * @param string $template Template file path.
	 * @return string
	 */
	public static function maybe_inject_rsvp_block_template_content( $template ) {
		if ( ! wp_is_block_theme() || ! is_singular( 'eventkoi_event' ) ) {
			return $template;
		}

		global $_wp_current_template_content;

		if ( empty( $_wp_current_template_content ) ) {
			return $template;
		}

		$_wp_current_template_content = self::inject_rsvp_shortcode(
			$_wp_current_template_content
		);

		return $template;
	}

	/**
	 * Inject the RSVP shortcode markup into template content.
	 *
	 * @param string $content Template markup.
	 * @return string
	 */
	private static function inject_rsvp_shortcode( $content ) {
		if ( false !== strpos( $content, 'eventkoi_rsvp' ) || false !== strpos( $content, 'event_ticket_rsvp' ) ) {
			return $content;
		}

		$shortcode_block = "\n<!-- wp:paragraph {\"metadata\":{\"bindings\":{\"content\":{\"source\":\"core/post-meta\",\"args\":{\"key\":\"event_ticket_rsvp\"}}}}} -->\n<p></p>\n<!-- /wp:paragraph -->\n";
		$marker          = '<!-- wp:paragraph {"metadata":{"bindings":{"content":{"source":"core/post-meta","args":{"key":"event_gmap"}}}}} -->';

		if ( false !== strpos( $content, $marker ) ) {
			return str_replace( $marker, $shortcode_block . $marker, $content );
		}

		return $content . $shortcode_block;
	}

	/**
	 * Get default event series template markup.
	 *
	 * @return string
	 */
	public static function get_event_series_template() {
		ob_start();

		include_once EVENTKOI_PLUGIN_DIR . 'templates/single-event-series.php';

		$content = ob_get_clean();

		return apply_filters( 'eventkoi_get_event_series_template', $content );
	}

	/**
	 * Override document title with instance-specific title if present.
	 *
	 * @param string $title Original document title.
	 *
	 * @return string
	 */
	public static function maybe_override_instance_title( $title ) {
		if ( ! is_singular( 'eventkoi_event' ) ) {
			return $title;
		}

		$instance_ts = eventkoi_get_instance_id();

		if ( empty( $instance_ts ) ) {
			return $title;
		}

		$post_id = get_the_ID();

		if ( ! $post_id ) {
			return $title;
		}

		$event     = new \EventKoi\Core\Event( $post_id );
		$overrides = $event->get_recurrence_overrides();

		if (
			isset( $overrides[ $instance_ts ]['title'] ) &&
			is_string( $overrides[ $instance_ts ]['title'] ) &&
			! empty( $overrides[ $instance_ts ]['title'] )
		) {
			return wp_strip_all_tags( $overrides[ $instance_ts ]['title'] );
		}

		return $event->get_title();
	}

	/**
	 * Output canonical tag for recurring event instance.
	 */
	public static function maybe_output_canonical_tag() {
		if ( ! is_singular( 'eventkoi_event' ) ) {
			return;
		}

		$instance = eventkoi_get_instance_id();

		if ( empty( $instance ) ) {
			return;
		}

		$post_id       = get_the_ID();
		$canonical_url = get_permalink( $post_id );

		if ( empty( $canonical_url ) ) {
			return;
		}

		printf(
			'<link rel="canonical" href="%s" />' . "\n",
			esc_url( $canonical_url )
		);
	}

	/**
	 * Output robots noindex for recurring instances.
	 */
	public static function maybe_output_robots_tag() {
		if ( ! is_singular( 'eventkoi_event' ) ) {
			return;
		}

		$instance_ts = eventkoi_get_instance_id();

		if ( empty( $instance_ts ) ) {
			return;
		}

		echo '<meta name="robots" content="noindex,follow" />' . "\n";
	}

	/**
	 * Output viewport meta tag for responsive layouts.
	 *
	 * @return void
	 */
	public static function maybe_output_viewport_meta() {
		?>
		<meta name="viewport" content="<?php echo esc_attr( 'width=device-width, initial-scale=1' ); ?>"/>
		<?php
	}

	/**
	 * Prevent viewing a trashed recurring instance by redirecting to base event page.
	 */
	public static function maybe_block_trashed_instance() {
		if ( ! is_singular( 'eventkoi_event' ) ) {
			return;
		}

		$instance_ts = eventkoi_get_instance_id();

		if ( empty( $instance_ts ) ) {
			return;
		}

		$post_id = get_the_ID();

		if ( ! $post_id ) {
			return;
		}

		$event     = new \EventKoi\Core\Event( $post_id );
		$overrides = $event->get_recurrence_overrides();

		if (
			isset( $overrides[ $instance_ts ]['status'] )
			&& 'trash' === $overrides[ $instance_ts ]['status']
		) {
			wp_safe_redirect( get_permalink( $post_id ) );
			exit;
		}
	}

	/**
	 * Override the block template dynamically for specific instance.
	 *
	 * @param string $template Original template.
	 *
	 * @return string
	 */
	public static function force_instance_block_template( $template ) {
		if ( ! is_singular( 'eventkoi_event' ) || ! get_the_ID() ) {
			return $template;
		}

		$event = new \EventKoi\Core\Event( get_the_ID() );
		$instance_ts = eventkoi_get_instance_id();
		$overrides   = $event->get_recurrence_overrides();

		$selected_template_slug = $event::get_template();
		if ( ! empty( $instance_ts ) ) {
			$override = $overrides[ $instance_ts ] ?? array();
			if ( ! empty( $override['template'] ) ) {
				$selected_template_slug = sanitize_key( $override['template'] );
			}
		}

		// Fall back to global default template only when event does not explicitly set one.
		if ( empty( $selected_template_slug ) ) {
			$settings              = Settings::get();
			$default_template_slug = $settings['default_event_template'] ?? '';
			if ( ! empty( $default_template_slug ) && 'default' !== $default_template_slug ) {
				$selected_template_slug = sanitize_key( $default_template_slug );
			}
		}

		// Render Beaver templates (builder template or Themer layout).
		if ( ! empty( $selected_template_slug ) ) {
			$is_beaver_template = 0 === strpos( $selected_template_slug, 'bb__' );
			$is_beaver_themer   = 0 === strpos( $selected_template_slug, 'bbt__' );

			if ( $is_beaver_template || $is_beaver_themer ) {
				$beaver_slug = $is_beaver_themer
					? substr( $selected_template_slug, 5 )
					: substr( $selected_template_slug, 4 );
				$post_type   = $is_beaver_themer ? 'fl-theme-layout' : 'fl-builder-template';

				if ( ! empty( $beaver_slug ) ) {
					$template_obj = get_page_by_path( $beaver_slug, OBJECT, $post_type );

					if ( $template_obj instanceof \WP_Post && shortcode_exists( 'fl_builder_insert_layout' ) ) {
						$beaver_output = do_shortcode( '[fl_builder_insert_layout id="' . absint( $template_obj->ID ) . '"]' );
						$beaver_output = self::replace_event_tokens_in_builder_content( $beaver_output, $event );
						self::render_builder_template_content( $beaver_output );
					}
				}
			}
		}

		// Render elementor template
		if ( class_exists( '\Elementor\Plugin' ) ) {
			$template_slug = $selected_template_slug;
			$template_obj  = get_page_by_path( $template_slug, OBJECT, 'elementor_library' );

			if ( $template_obj instanceof \WP_Post ) {
				$elementor_output = \Elementor\Plugin::instance()->frontend->get_builder_content_for_display( $template_obj->ID );
				self::render_builder_template_content( $elementor_output );
			}
		}

		// Render bricks template
		if ( defined( 'BRICKS_VERSION' ) ) {
			$template_slug = $selected_template_slug;
			$template_obj  = get_page_by_path( $template_slug, OBJECT, 'bricks_template' );

			if ( $template_obj instanceof \WP_Post ) {
				$bricks_output = do_shortcode( '[bricks_template id="' . $template_obj->ID . '"]' );
				self::render_builder_template_content( $bricks_output );
			}
		}

		$event_template = $event::get_template();
		if ( ! empty( $event_template ) && 'default' !== $event_template ) {
			return $template;
		}
		if ( 'default' === $event_template ) {
			// On block themes, an explicit "Default template" selection should
			// always use EventKoi's block template, not third-party auto-layout rules.
			if ( wp_is_block_theme() ) {
				self::apply_default_block_event_template();
			}

			return $template;
		}

		if ( ! empty( $instance_ts ) ) {
			$override      = $overrides[ $instance_ts ] ?? array();
			$template_slug = $override['template'] ?? '';

			if ( ! empty( $template_slug ) && 'default' !== $template_slug ) {
				$template_post = get_page_by_path( $template_slug, OBJECT, 'wp_template' );

				if ( $template_post && ! empty( $template_post->post_content ) ) {
					$theme_slug = wp_get_theme()->get_stylesheet();
					$block_id   = $theme_slug . '//' . $template_slug;

					global $_wp_current_template_id, $_wp_current_template_content;

					$_wp_current_template_id      = $block_id;
					$_wp_current_template_content = $template_post->post_content;

					return $template;
				}
			}
		}

		if ( ! wp_is_block_theme() ) {
			return $template;
		}

		$settings              = Settings::get();
		$default_template_slug = $settings['default_event_template'] ?? '';

		if ( empty( $default_template_slug ) || 'default' === $default_template_slug ) {
			return $template;
		}

		$template_post = get_page_by_path( $default_template_slug, OBJECT, 'wp_template' );

		if ( ! $template_post || empty( $template_post->post_content ) ) {
			return $template;
		}

		$theme_slug = wp_get_theme()->get_stylesheet();
		$block_id   = $theme_slug . '//' . $default_template_slug;

		global $_wp_current_template_id, $_wp_current_template_content;

		$_wp_current_template_id      = $block_id;
		$_wp_current_template_content = $template_post->post_content;

		return $template;
	}

	/**
	 * Force Event Series template for recurring parent events.
	 *
	 * @param string $template Current resolved template.
	 *
	 * @return string
	 */
	public static function maybe_force_series_template( $template ) {
		if ( ! is_singular( 'eventkoi_event' ) ) {
			return $template;
		}

		$instance_ts = eventkoi_get_instance_id();

		// Skip if viewing a specific recurring instance.
		if ( ! empty( $instance_ts ) ) {
			return $template;
		}

		$event_id = get_the_ID();
		if ( ! $event_id ) {
			return $template;
		}

		// Load event data.
		$event = new \EventKoi\Core\Event( $event_id );
		$type  = $event::get_date_type();

		// Only apply if the event is recurring.
		if ( 'recurring' !== $type ) {
			return $template;
		}

		// Get the registered or saved Event Series block template.
		if ( ! function_exists( 'get_block_template' ) ) {
			return $template; // Fallback for older WordPress.
		}

		$template_obj = get_block_template(
			eventkoi_plugin_name() . '//single-eventkoi_event-series',
			'wp_template'
		);

		// Ensure it actually has content.
		if ( empty( $template_obj ) || empty( $template_obj->content ) ) {
			return $template;
		}

		$theme_slug   = wp_get_theme()->get_stylesheet();
		$template_obj = get_block_template(
			$theme_slug . '//single-eventkoi_event-series',
			'wp_template'
		);

		if ( empty( $template_obj ) || empty( $template_obj->content ) ) {
			return $template;
		}

		global $_wp_current_template_id, $_wp_current_template_content;

		$_wp_current_template_id      = $theme_slug . '//single-eventkoi_event-series';
		$_wp_current_template_content = $template_obj->content;

		return $template;
	}

	/**
	 * Force a block-theme-safe template when editing Beaver Themer layouts.
	 *
	 * Beaver's editor route can call get_header()/get_footer() on block themes,
	 * which triggers deprecated notices when header.php/footer.php don't exist.
	 *
	 * @param string $template Current template path.
	 *
	 * @return string
	 */
	public static function maybe_force_bb_layout_editor_template( $template ) {
		if ( ! wp_is_block_theme() ) {
			return $template;
		}

		$queried_object_id = get_queried_object_id();
		$post_type         = $queried_object_id ? get_post_type( $queried_object_id ) : '';
		$is_layout_editor  = is_singular( 'fl-theme-layout' ) || 'fl-theme-layout' === $post_type;

		if ( ! $is_layout_editor ) {
			return $template;
		}

		if ( ! isset( $_GET['fl_builder'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return $template;
		}

		$compat_template = EVENTKOI_PLUGIN_DIR . 'includes/core/views/bb-layout-editor-compat.php';
		if ( file_exists( $compat_template ) ) {
			return $compat_template;
		}

		return $template;
	}

	/**
	 * Override Beaver Themer template include for block-theme editor preview.
	 *
	 * @param string $template Beaver Themer template path.
	 * @param int    $layout_id The current Themer layout post ID.
	 *
	 * @return string
	 */
	public static function maybe_override_beaver_themer_template_include( $template, $layout_id ) {
		unset( $layout_id ); // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.Found

		if ( ! self::is_bb_themer_editor_request() ) {
			return $template;
		}

		$compat_template = EVENTKOI_PLUGIN_DIR . 'includes/core/views/bb-layout-editor-compat.php';
		if ( file_exists( $compat_template ) ) {
			return $compat_template;
		}

		return $template;
	}

	/**
	 * Capture initial template path before template engine overrides run.
	 *
	 * @param string $template Current template path.
	 *
	 * @return string
	 */
	public static function capture_initial_template_include( $template ) {
		if ( is_singular( 'eventkoi_event' ) ) {
			self::$initial_template_include = $template;
		}

		return $template;
	}

	/**
	 * Enforce EventKoi default template when event explicitly selects "default".
	 *
	 * This runs very late so third-party template engines (e.g. Beaver Themer)
	 * cannot override explicit EventKoi "Default template" selections on
	 * non-Beaver themes.
	 *
	 * @param string $template Current template path.
	 *
	 * @return string
	 */
	public static function enforce_explicit_default_template( $template ) {
		if ( ! is_singular( 'eventkoi_event' ) || ! get_the_ID() ) {
			return $template;
		}

		$event = new \EventKoi\Core\Event( get_the_ID() );

		if ( 'default' !== $event::get_template() ) {
			return $template;
		}

		$theme_slug = wp_get_theme()->get_stylesheet();
		$is_bb_theme = ( 'bb-theme' === $theme_slug );

		// Allow Beaver Theme to keep its native Themer behavior.
		if ( $is_bb_theme ) {
			return $template;
		}

		$default_file = EVENTKOI_PLUGIN_DIR . 'includes/core/views/single-event-page.php';

		// For block themes, force EventKoi default block template.
		if ( wp_is_block_theme() ) {
			self::apply_default_block_event_template();
			return ! empty( self::$initial_template_include ) ? self::$initial_template_include : $template;
		}

		// For classic themes, force EventKoi single event template file.
		if ( file_exists( $default_file ) ) {
			return $default_file;
		}

		return $template;
	}

	/**
	 * Inject a "Back to Event Series" link as the first element inside `.eventkoi-front` for recurring instances.
	 *
	 * @param string $block_content The rendered HTML of the block.
	 * @param array  $block The block data.
	 *
	 * @return string Modified block content.
	 */
	public static function maybe_inject_series_backlink( $block_content, $block ) {
		if ( ! is_singular( 'eventkoi_event' ) ) {
			return $block_content;
		}

		$instance_ts = function_exists( 'eventkoi_get_instance_id' ) ? eventkoi_get_instance_id() : null;

		// Only apply to specific instances (not parent event).
		if ( empty( $instance_ts ) ) {
			return $block_content;
		}

		$attrs = $block['attrs'] ?? array();
		$class = $attrs['className'] ?? '';

		// Only target the main event container.
		if ( strpos( $class, 'eventkoi-front' ) === false ) {
			return $block_content;
		}

		$post_id = get_the_ID();
		if ( ! $post_id ) {
			return $block_content;
		}

		$event = new \EventKoi\Core\Event( $post_id );

		// Ensure event is recurring.
		if ( method_exists( $event, 'get_date_type' ) && 'recurring' !== $event::get_date_type() ) {
			return $block_content;
		}

		$parent_url   = get_permalink( $post_id );
		$parent_title = $event->get_title();

		// Translators: %s is the linked event series title.
		$link_text = sprintf(
		/* translators: %s: linked event series title including the word "series". */
			esc_html__( '← See all events in the %s', 'eventkoi' ),
			sprintf(
				'<a href="%1$s" rel="bookmark">%2$s</a>',
				esc_url( $parent_url ),
				esc_html( $parent_title . ' series' )
			)
		);

		$back_link = sprintf(
			'<div class="eventkoi-back-to-series">%s</div>',
			$link_text
		);

		// Insert right after the opening tag of `.eventkoi-front`.
		$block_content = preg_replace(
			'/(<div[^>]*class="[^"]*eventkoi-front[^"]*"[^>]*>)/',
			'$1' . $back_link,
			$block_content,
			1
		);

		return $block_content;
	}

	/**
	 * Replace EventKoi token placeholders in builder-rendered HTML.
	 *
	 * Supports plain tokens such as:
	 * - event_title
	 * - event_details
	 * - event_field_{key}
	 * - event_fieldgroup_{key}
	 * - event_custom_fields / event_custom_fields_with_name
	 *
	 * @param string              $content Builder-rendered HTML.
	 * @param \EventKoi\Core\Event $event Event model for current singular event.
	 *
	 * @return string
	 */
	private static function replace_event_tokens_in_builder_content( $content, $event ) {
		if ( ! is_string( $content ) || '' === $content ) {
			return $content;
		}

		if ( ! ( $event instanceof \EventKoi\Core\Event ) ) {
			return $content;
		}

		$class_attribute_placeholders = array();
		$content = self::protect_class_attributes_for_builder_tokens( $content, $class_attribute_placeholders );

		// In Beaver editor context, render readable placeholders instead of
		// binding to whichever preview event/layout happens to be active.
		if ( self::is_beaver_builder_editor_request() ) {
			return self::replace_builder_tokens_with_labels( $content );
		}

		// Beaver URL fields may auto-prefix token values as http://event_image_url.
		// Normalize those protocol-prefixed placeholders first to avoid invalid URLs
		// like "http://https://...".
		$content = preg_replace_callback(
			'/https?:\/\/(event_[a-z0-9_-]+(?:_with_name)?)(?:\/)?/i',
			static function ( $matches ) use ( $event ) {
				$replacement = self::resolve_builder_url_token( $matches[1], $event );
				return '' !== $replacement ? esc_url( $replacement ) : $matches[0];
			},
			$content
		);

		$content = preg_replace_callback(
			'/\/\/(event_[a-z0-9_-]+(?:_with_name)?)(?:\/)?/i',
			static function ( $matches ) use ( $event ) {
				$replacement = self::resolve_builder_url_token( $matches[1], $event );
				return '' !== $replacement ? esc_url( $replacement ) : $matches[0];
			},
			$content
		);

		// Replace core event_* tokens.
		$content = preg_replace_callback(
			'/\bevent_[a-z0-9_-]+(?:_with_name)?\b/i',
			static function ( $matches ) use ( $event ) {
				return $event::render_meta( $matches[0] );
			},
			$content
		);

		// Replace custom field tokens.
		$content = preg_replace_callback(
			'/\bevent_field_[a-z0-9_-]+(?:_with_name)?\b/i',
			static function ( $matches ) use ( $event ) {
				return $event::render_meta( $matches[0] );
			},
			$content
		);

		$content = preg_replace_callback(
			'/\bevent_fieldgroup_[a-z0-9_-]+(?:_with_name)?\b/i',
			static function ( $matches ) use ( $event ) {
				return $event::render_meta( $matches[0] );
			},
			$content
		);

		$content = preg_replace_callback(
			'/\bevent_custom_fields(?:_with_name)?\b/i',
			static function ( $matches ) use ( $event ) {
				return $event::render_meta( $matches[0] );
			},
			$content
		);

		return self::restore_protected_builder_placeholders( $content, $class_attribute_placeholders );
	}

	/**
	 * Replace EventKoi plain tokens with human-readable labels for editor preview.
	 *
	 * @param string $content Builder-rendered HTML.
	 *
	 * @return string
	 */
	private static function replace_builder_tokens_with_labels( $content ) {
		$class_attribute_placeholders = array();
		$content = self::protect_class_attributes_for_builder_tokens( $content, $class_attribute_placeholders );

		$pattern = '/\bevent_(?:custom_fields(?:_with_name)?|field_[a-z0-9_-]+(?:_with_name)?|fieldgroup_[a-z0-9_-]+(?:_with_name)?|[a-z0-9_-]+(?:_with_name)?)\b/i';

		$content = preg_replace_callback(
			$pattern,
			function ( $matches ) {
				return esc_html( self::get_builder_token_label( $matches[0] ) );
			},
			$content
		);

		return self::restore_protected_builder_placeholders( $content, $class_attribute_placeholders );
	}

	/**
	 * Protect class attribute values from token replacement.
	 *
	 * @param string $content HTML content.
	 * @param array  $placeholder_map Placeholder map passed by reference.
	 *
	 * @return string
	 */
	private static function protect_class_attributes_for_builder_tokens( $content, &$placeholder_map ) {
		$placeholder_map = array();

		return preg_replace_callback(
			'/(\sclass\s*=\s*)(["\'])(.*?)\2/is',
			static function ( $matches ) use ( &$placeholder_map ) {
				$key = '__EK_CLASS_PLACEHOLDER_' . count( $placeholder_map ) . '__';
				$placeholder_map[ $key ] = $matches[3];

				return $matches[1] . $matches[2] . $key . $matches[2];
			},
			$content
		);
	}

	/**
	 * Restore protected placeholders back to class attribute values.
	 *
	 * @param string $content HTML content.
	 * @param array  $placeholder_map Placeholder map.
	 *
	 * @return string
	 */
	private static function restore_protected_builder_placeholders( $content, $placeholder_map ) {
		if ( empty( $placeholder_map ) ) {
			return $content;
		}

		return strtr( $content, $placeholder_map );
	}

	/**
	 * Get label text for a builder token.
	 *
	 * @param string $token Token key.
	 *
	 * @return string
	 */
	private static function get_builder_token_label( $token ) {
		$token = strtolower( (string) $token );
		$token = str_replace( '-', '_', $token );

		$allowed_labels = \EventKoi\Core\Bindings::get_allowed_keys();
		if ( isset( $allowed_labels[ $token ] ) ) {
			return (string) $allowed_labels[ $token ];
		}

		if ( 0 === strpos( $token, 'event_fieldgroup_' ) ) {
			return __( 'Event Field Group', 'eventkoi' );
		}

		if ( 0 === strpos( $token, 'event_field_' ) ) {
			return __( 'Event Field', 'eventkoi' );
		}

		if ( 0 === strpos( $token, 'event_custom_fields' ) ) {
			return __( 'Custom fields', 'eventkoi' );
		}

		$label = str_replace( 'event_', '', $token );
		$label = str_replace( '_', ' ', $label );

		return ucwords( $label );
	}

	/**
	 * Force EventKoi default single-event block template content for current request.
	 *
	 * @return void
	 */
	private static function apply_default_block_event_template() {
		if ( ! function_exists( 'get_block_template' ) ) {
			return;
		}

		$theme_slug   = wp_get_theme()->get_stylesheet();
		$template_obj = get_block_template(
			$theme_slug . '//single-eventkoi_event',
			'wp_template'
		);

		if ( empty( $template_obj ) || empty( $template_obj->content ) ) {
			$template_obj = get_block_template(
				eventkoi_plugin_name() . '//single-eventkoi_event',
				'wp_template'
			);
		}

		if ( empty( $template_obj ) || empty( $template_obj->content ) ) {
			return;
		}

		global $_wp_current_template_id, $_wp_current_template_content;

		$_wp_current_template_id      = $theme_slug . '//single-eventkoi_event';
		$_wp_current_template_content = $template_obj->content;
	}

	/**
	 * Render third-party builder output with theme-compatible wrappers.
	 *
	 * Block themes don't provide header.php/footer.php, so we need to render
	 * template-part based header/footer to avoid deprecated warnings.
	 *
	 * @param string $content Builder HTML content.
	 *
	 * @return void
	 */
	private static function render_builder_template_content( $content ) {
		if ( wp_is_block_theme() ) {
			$header = function_exists( 'eventkoi_get_header' ) ? eventkoi_get_header() : '';
			$footer = function_exists( 'eventkoi_get_footer' ) ? eventkoi_get_footer() : '';
			?>
			<!doctype html>
			<html <?php language_attributes(); ?>>
			<head>
				<meta charset="<?php bloginfo( 'charset' ); ?>">
				<?php wp_head(); ?>
			</head>
			<body <?php body_class(); ?>>
				<?php wp_body_open(); ?>
				<div class="wp-site-blocks">
					<?php echo $header; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					<?php do_action( 'eventkoi_before_event_content' ); ?>
					<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					<?php do_action( 'eventkoi_after_event_content' ); ?>
					<?php echo $footer; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				</div>
				<?php wp_footer(); ?>
			</body>
			</html>
			<?php
			exit;
		}

		get_header();
		echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		get_footer();
		exit;
	}

	/**
	 * Resolve a builder token intended for URL context.
	 *
	 * @param string               $token Token key (e.g. event_image_url).
	 * @param \EventKoi\Core\Event $event Event model.
	 *
	 * @return string
	 */
	private static function resolve_builder_url_token( $token, $event ) {
		$token = sanitize_key( $token );

		// If users put "event_image" in a URL field, treat it as image URL.
		if ( 'event_image' === $token ) {
			return (string) $event::rendered_image_url();
		}

		$value = $event::render_meta( $token );

		return is_string( $value ) ? $value : '';
	}

	/**
	 * Replace EventKoi plain tokens in Beaver module output for singular events.
	 *
	 * This ensures tokens are resolved when Beaver Themer renders via native
	 * template flow (e.g. BB theme + EventKoi "Default template").
	 *
	 * @param string $content Beaver module HTML.
	 * @param object $module Beaver module instance.
	 *
	 * @return string
	 */
	public static function maybe_replace_tokens_in_beaver_module_output( $content, $module ) {
		unset( $module ); // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.Found

		// In Beaver editor canvas, always show readable token labels.
		if ( self::is_beaver_builder_editor_request() ) {
			return self::replace_builder_tokens_with_labels( $content );
		}

		if ( ! is_singular( 'eventkoi_event' ) ) {
			return $content;
		}

		$event_id = absint( get_the_ID() );
		if ( $event_id && 'eventkoi_event' !== get_post_type( $event_id ) ) {
			$event_id = 0;
		}

		if ( 0 === $event_id ) {
			$queried_id = absint( get_queried_object_id() );
			if ( $queried_id && 'eventkoi_event' === get_post_type( $queried_id ) ) {
				$event_id = $queried_id;
			}
		}

		if ( 0 === $event_id ) {
			global $post;
			if ( isset( $post->ID ) && 'eventkoi_event' === get_post_type( $post->ID ) ) {
				$event_id = (int) $post->ID;
			}
		}

		if ( 0 === $event_id ) {
			$active_event_id = absint( \EventKoi\Core\Event::get_id() );
			if ( $active_event_id && 'eventkoi_event' === get_post_type( $active_event_id ) ) {
				$event_id = $active_event_id;
			}
		}

		if ( 0 === $event_id ) {
			return $content;
		}

		$event = new \EventKoi\Core\Event( $event_id );

		return self::replace_event_tokens_in_builder_content( $content, $event );
	}

	/**
	 * Disable deprecated-file notices for Beaver Themer editor on block themes.
	 *
	 * Beaver editor routes can trigger core checks for header.php/footer.php, which
	 * are not required on block themes. We suppress only this editor request.
	 *
	 * @param bool $trigger Whether to trigger deprecated-file warning.
	 *
	 * @return bool
	 */
	public static function maybe_disable_deprecated_file_warnings_for_bb_editor( $trigger ) {
		if ( self::is_bb_themer_editor_request() ) {
			return false;
		}

		return $trigger;
	}

	/**
	 * Detect Beaver Themer editor request context.
	 *
	 * @return bool
	 */
	private static function is_bb_themer_editor_request() {
		if ( ! wp_is_block_theme() ) {
			return false;
		}

		if ( ! isset( $_GET['fl_builder'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return false;
		}

		$request_uri = isset( $_SERVER['REQUEST_URI'] ) ? (string) wp_unslash( $_SERVER['REQUEST_URI'] ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		if ( false !== strpos( $request_uri, '/fl-theme-layout/' ) ) {
			return true;
		}

		$queried_object_id = get_queried_object_id();
		$post_type         = $queried_object_id ? get_post_type( $queried_object_id ) : '';

		return is_singular( 'fl-theme-layout' ) || 'fl-theme-layout' === $post_type;
	}

	/**
	 * Detect Beaver Builder editor request context.
	 *
	 * @return bool
	 */
	private static function is_beaver_builder_editor_request() {
		if ( isset( $_REQUEST['fl_builder'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return true;
		}

		if ( class_exists( 'FLBuilderModel' ) && method_exists( 'FLBuilderModel', 'is_builder_active' ) ) {
			return (bool) \FLBuilderModel::is_builder_active();
		}

		if ( isset( $_REQUEST['action'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$action = sanitize_key( wp_unslash( $_REQUEST['action'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			if ( 0 === strpos( $action, 'fl_builder' ) ) {
				return true;
			}
		}

		return false;
	}
}
