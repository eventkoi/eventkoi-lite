<?php
/**
 * Post types.
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
 * Post_Types.
 */
class Post_Types {

	/**
	 * Init.
	 */
	public function __construct() {
		add_action( 'init', array( __CLASS__, 'register_taxonomies' ), 5 );
		add_action( 'init', array( __CLASS__, 'register_post_types' ), 5 );
		add_action( 'eventkoi_after_register_post_type', array( __CLASS__, 'maybe_flush_rewrite_rules' ) );
		add_action( 'eventkoi_flush_rewrite_rules', array( __CLASS__, 'flush_rewrite_rules' ) );
		// Allow EventKoi orderby values through the core wp/v2/eventkoi_event
		// endpoint so the Event Query Loop block's editor preview doesn't 400.
		add_filter( 'rest_eventkoi_event_collection_params', array( __CLASS__, 'extend_rest_orderby_enum' ), 10, 1 );
		add_filter( 'rest_eventkoi_event_query', array( __CLASS__, 'translate_rest_orderby_query' ), 10, 2 );

		add_filter( 'get_edit_post_link', array( __CLASS__, 'update_edit_event_link' ), 10, 2 );
		add_filter( 'get_edit_term_link', array( __CLASS__, 'update_edit_calendar_link' ), 10, 4 );
	}

	/**
	 * Register taxonomy.
	 */
	public static function register_taxonomies() {
		if ( ! is_blog_installed() || taxonomy_exists( 'event_cal' ) ) {
			return;
		}

		do_action( 'eventkoi_register_taxonomy' );

		$permalinks = eventkoi_get_permalink_structure();

		register_taxonomy(
			'event_cal',
			apply_filters( 'eventkoi_taxonomy_objects_event_cal', array( 'eventkoi_event' ) ),
			apply_filters(
				'eventkoi_taxonomy_args_event_cal',
				array(
					'hierarchical'          => true,
					'update_count_callback' => '_update_post_term_count',
					'label'                 => __( 'Calendars', 'eventkoi-lite' ),
					'labels'                => array(
						'name'                  => __( 'Event calendars', 'eventkoi-lite' ),
						'singular_name'         => __( 'Calendar', 'eventkoi-lite' ),
						'menu_name'             => _x( 'Calendars', 'Admin menu name', 'eventkoi-lite' ),
						'search_items'          => __( 'Search calendars', 'eventkoi-lite' ),
						'all_items'             => __( 'All calendars', 'eventkoi-lite' ),
						'parent_item'           => __( 'Parent calendar', 'eventkoi-lite' ),
						'parent_item_colon'     => __( 'Parent calendar:', 'eventkoi-lite' ),
						'edit_item'             => __( 'Edit calendar', 'eventkoi-lite' ),
						'update_item'           => __( 'Update calendar', 'eventkoi-lite' ),
						'add_new_item'          => __( 'Add new calendar', 'eventkoi-lite' ),
						'new_item_name'         => __( 'New calendar name', 'eventkoi-lite' ),
						'not_found'             => __( 'No calendars found', 'eventkoi-lite' ),
						'item_link'             => __( 'Event Calendar Link', 'eventkoi-lite' ),
						'item_link_description' => __( 'A link to a event calendar.', 'eventkoi-lite' ),
						'template_name'         => _x( 'Events by Calendar', 'Template name', 'eventkoi-lite' ),
					),
					'show_in_rest'          => true,
					'show_ui'               => true,
					'query_var'             => true,
					'rewrite'               => array(
						'slug'         => $permalinks['category_rewrite_slug'],
						'with_front'   => false,
						'hierarchical' => true,
					),
				)
			)
		);

		do_action( 'eventkoi_after_register_taxonomy' );
	}

	/**
	 * Register post types.
	 */
	public static function register_post_types() {
		if ( ! is_blog_installed() || post_type_exists( 'eventkoi_event' ) ) {
			return;
		}

		do_action( 'eventkoi_register_post_type' );

		$permalinks    = eventkoi_get_permalink_structure();
		$supports      = array( 'title', 'editor', 'excerpt', 'thumbnail', 'custom-fields' );
		$theme_support = eventkoi_current_theme_support() ? 'yes' : 'no';

		if ( get_option( 'eventkoi_current_theme_support' ) !== $theme_support && update_option( 'eventkoi_current_theme_support', $theme_support ) ) {
			update_option( 'eventkoi_queue_flush_rewrite_rules', 'yes' );
		}

		register_post_type(
			'eventkoi_event',
			apply_filters(
				'event_register_post_type_args',
				array(
					'labels'              => array(
						'name'                  => __( 'Events', 'eventkoi-lite' ),
						'singular_name'         => __( 'Event', 'eventkoi-lite' ),
						'all_items'             => __( 'All Events', 'eventkoi-lite' ),
						'menu_name'             => _x( 'Events', 'Admin menu name', 'eventkoi-lite' ),
						'add_new'               => __( 'Add New', 'eventkoi-lite' ),
						'add_new_item'          => __( 'Add new event', 'eventkoi-lite' ),
						'edit'                  => __( 'Edit', 'eventkoi-lite' ),
						'edit_item'             => __( 'Edit event', 'eventkoi-lite' ),
						'new_item'              => __( 'New event', 'eventkoi-lite' ),
						'view_item'             => __( 'View event', 'eventkoi-lite' ),
						'view_items'            => __( 'View events', 'eventkoi-lite' ),
						'search_items'          => __( 'Search events', 'eventkoi-lite' ),
						'not_found'             => __( 'No events found', 'eventkoi-lite' ),
						'not_found_in_trash'    => __( 'No events found in trash', 'eventkoi-lite' ),
						'parent'                => __( 'Parent event', 'eventkoi-lite' ),
						'featured_image'        => __( 'Event image', 'eventkoi-lite' ),
						'set_featured_image'    => __( 'Set event image', 'eventkoi-lite' ),
						'remove_featured_image' => __( 'Remove event image', 'eventkoi-lite' ),
						'use_featured_image'    => __( 'Use as event image', 'eventkoi-lite' ),
						'insert_into_item'      => __( 'Insert into event', 'eventkoi-lite' ),
						'uploaded_to_this_item' => __( 'Uploaded to this event', 'eventkoi-lite' ),
						'filter_items_list'     => __( 'Filter events', 'eventkoi-lite' ),
						'items_list_navigation' => __( 'Events navigation', 'eventkoi-lite' ),
						'items_list'            => __( 'Events list', 'eventkoi-lite' ),
						'item_link'             => __( 'Event Link', 'eventkoi-lite' ),
						'item_link_description' => __( 'A link to an event.', 'eventkoi-lite' ),
					),
					'description'         => __( 'This is where you can browse events in this site.', 'eventkoi-lite' ),
					'public'              => true,
					'show_ui'             => true,
					'menu_icon'           => 'dashicons-archive',
					'capability_type'     => 'post',
					'map_meta_cap'        => true,
					'publicly_queryable'  => true,
					'exclude_from_search' => false,
					'hierarchical'        => false,
					'rewrite'             => $permalinks['event_rewrite_slug'] ? array(
						'slug'       => $permalinks['event_rewrite_slug'],
						'with_front' => false,
						'feeds'      => true,
					) : false,
					'query_var'           => true,
					'supports'            => $supports,
					'has_archive'         => false,
					'show_in_nav_menus'   => true,
					'show_in_menu'        => '_eventkoi',
					'show_in_rest'        => true,
				)
			)
		);

		do_action( 'eventkoi_after_register_post_type' );
	}

	/**
	 * Flush rules if needed.
	 */
	public static function maybe_flush_rewrite_rules() {
		if ( 'yes' === get_option( 'eventkoi_queue_flush_rewrite_rules' ) ) {
			update_option( 'eventkoi_queue_flush_rewrite_rules', 'no' );
			self::flush_rewrite_rules();
		}
	}

	/**
	 * Flush rewrite rules.
	 */
	public static function flush_rewrite_rules() {
		flush_rewrite_rules();
	}

	/**
	 * Update edit event link.
	 *
	 * @param string $link Edit link.
	 * @param int    $post_id Post ID.
	 */
	public static function update_edit_event_link( $link, $post_id ) {
		if ( ! empty( $_GET['eventkoi_native'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only link routing flag.
			return $link;
		}

		$event = new \EventKoi\Core\Event( $post_id );

		if ( $event::get_id() ) {
			return admin_url( 'admin.php?page=eventkoi#/events/' . $event::get_id() . '/main' );
		}

		return $link;
	}

	/**
	 * Update edit calendar link.
	 *
	 * @param string $location Edit link.
	 * @param int    $term_id Term ID.
	 * @param string $taxonomy Taxonomy name.
	 * @return string
	 */
	public static function update_edit_calendar_link( $location, $term_id, $taxonomy ) {
		if ( ! empty( $_GET['eventkoi_native'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only link routing flag.
			return $location;
		}

		if ( 'event_cal' === $taxonomy ) {
			return admin_url( 'admin.php?page=eventkoi#/calendars/' . absint( $term_id ) . '/main' );
		}

		return $location;
	}

	/**
	 * Extend wp/v2/eventkoi_event orderby enum to accept EventKoi values.
	 *
	 * @param array $params Collection params.
	 * @return array
	 */
	public static function extend_rest_orderby_enum( $params ) {
		if ( ! isset( $params['orderby']['enum'] ) || ! is_array( $params['orderby']['enum'] ) ) {
			return $params;
		}
		$extra = array( 'start_date', 'event_start', 'upcoming', 'past' );
		$params['orderby']['enum'] = array_values( array_unique( array_merge( $params['orderby']['enum'], $extra ) ) );
		return $params;
	}

	/**
	 * Translate EventKoi-only orderby values into WP_Query args at the REST
	 * layer so editor previews return meaningful order.
	 *
	 * @param array            $args    WP_Query args.
	 * @param \WP_REST_Request $request REST request.
	 * @return array
	 */
	public static function translate_rest_orderby_query( $args, $request ) {
		$orderby = (string) $request->get_param( 'orderby' );
		if ( 'start_date' === $orderby || 'event_start' === $orderby || 'upcoming' === $orderby ) {
			$args['meta_key'] = 'start_timestamp';
			$args['orderby']  = 'meta_value_num';
			if ( 'upcoming' === $orderby ) {
				$args['order']      = 'ASC';
				$args['meta_query'] = array(
					array(
						'key'     => 'start_timestamp',
						'value'   => time(),
						'compare' => '>=',
						'type'    => 'NUMERIC',
					),
				);
			}
		} elseif ( 'past' === $orderby ) {
			$args['meta_key']   = 'start_timestamp';
			$args['orderby']    = 'meta_value_num';
			$args['order']      = 'DESC';
			$args['meta_query'] = array(
				array(
					'key'     => 'start_timestamp',
					'value'   => time(),
					'compare' => '<',
					'type'    => 'NUMERIC',
				),
			);
		}
		return $args;
	}
}
