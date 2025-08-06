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
	 * Init.
	 */
	public function __construct() {
		add_action( 'init', array( __CLASS__, 'register_plugin_templates' ) );

		add_action( 'single_template', array( __CLASS__, 'single_event' ) );
		add_action( 'taxonomy_template', array( __CLASS__, 'single_calendar' ) );

		add_filter( 'pre_get_document_title', array( __CLASS__, 'maybe_override_instance_title' ) );

		add_action( 'wp_head', array( __CLASS__, 'maybe_output_canonical_tag' ) );
		add_action( 'wp_head', array( __CLASS__, 'maybe_output_robots_tag' ), 1 );

		add_action( 'template_redirect', array( __CLASS__, 'maybe_block_trashed_instance' ) );

		add_filter( 'template_include', array( __CLASS__, 'force_instance_block_template' ), 50 );
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

		register_block_template( eventkoi_plugin_name() . '//single-event', apply_filters( 'eventkoi_event_template_args', $args ) );
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

		if ( 'event' === $post->post_type && is_singular( 'event' ) ) {
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
	 * Override document title with instance-specific title if present.
	 *
	 * @param string $title Original document title.
	 * @return string
	 */
	public static function maybe_override_instance_title( $title ) {
		if ( ! is_singular( 'event' ) ) {
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
		if ( ! is_singular( 'event' ) ) {
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
		if ( ! is_singular( 'event' ) ) {
			return;
		}

		$instance_ts = eventkoi_get_instance_id();

		if ( empty( $instance_ts ) ) {
			return;
		}

		echo '<meta name="robots" content="noindex,follow" />' . "\n";
	}

	/**
	 * Prevent viewing a trashed recurring instance by redirecting to base event page.
	 */
	public static function maybe_block_trashed_instance() {
		if ( ! is_singular( 'event' ) ) {
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
	 * @return string
	 */
	public static function force_instance_block_template( $template ) {
		if ( ! is_singular( 'event' ) || ! get_the_ID() ) {
			return $template;
		}

		$instance_ts = eventkoi_get_instance_id();

		if ( empty( $instance_ts ) ) {
			return $template;
		}

		$event         = new \EventKoi\Core\Event( get_the_ID() );
		$overrides     = $event->get_recurrence_overrides();
		$override      = $overrides[ $instance_ts ] ?? array();
		$template_slug = $override['template'] ?? '';

		if ( empty( $template_slug ) || 'default' === $template_slug ) {
			return $template;
		}

		$template_post = get_page_by_path( $template_slug, OBJECT, 'wp_template' );

		if ( ! $template_post || empty( $template_post->post_content ) ) {
			return $template;
		}

		$theme_slug = wp_get_theme()->get_stylesheet();
		$block_id   = $theme_slug . '//' . $template_slug;

		global $_wp_current_template_id, $_wp_current_template_content;

		$_wp_current_template_id      = $block_id;
		$_wp_current_template_content = $template_post->post_content;

		return $template;
	}
}
