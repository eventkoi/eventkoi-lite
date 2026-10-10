<?php
/**
 * Bindings API.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

// Exit if accessed directly.
if (! defined('ABSPATH') ) {
    exit;
}

/**
 * Bindings.
 */
class Bindings
{

    /**
     * Constructor.
     */
    /**
     * Cron hook that removes the empty rows earlier versions wrote under the
     * binding keys.
     */
    public const STRAY_META_CLEANUP_HOOK = 'eventkoi_cleanup_stray_binding_meta';

    public function __construct()
    {
        add_action('init', array( $this, 'register_block_bindings' ));
        // Late, so taxonomies other plugins register on init already exist.
        add_action('init', array( $this, 'register_taxonomy_bindings' ), 999);
        add_filter('block_bindings_source_value', array( $this, 'filter_event_meta_values' ), 10, 5);
        add_filter('update_post_metadata', array( __CLASS__, 'skip_empty_binding_meta' ), 10, 4);
        add_filter('add_post_metadata', array( __CLASS__, 'skip_empty_binding_meta' ), 10, 4);
        add_action('eventkoi_updated', array( __CLASS__, 'schedule_stray_meta_cleanup' ));
        add_action(self::STRAY_META_CLEANUP_HOOK, array( __CLASS__, 'cleanup_stray_meta' ));
    }

    /**
     * Whether a meta key is one of the virtual binding keys.
     *
     * @param  string $meta_key Meta key.
     * @return bool
     */
    public static function is_binding_key( $meta_key )
    {
        return in_array((string) $meta_key, self::get_registered_binding_keys(), true);
    }

    /**
     * Keep an empty value from becoming a row under a binding key.
     *
     * The keys are registered as REST post meta so the block editor lists
     * them in its Attributes picker. When that editor saves a post it sends
     * every registered key back, with an empty string for the ones that hold
     * nothing, and WordPress would store each of them. On a site saving posts
     * and pages that added around fifty empty rows per save.
     *
     * An existing row can still be cleared, so real data is never trapped.
     *
     * @param  mixed  $check      Short-circuit value handed in by WordPress.
     * @param  int    $object_id  Post ID.
     * @param  string $meta_key   Meta key.
     * @param  mixed  $meta_value Value being written.
     * @return mixed True to skip the write, otherwise the incoming $check.
     */
    public static function skip_empty_binding_meta( $check, $object_id, $meta_key, $meta_value )
    {
        if (null !== $check || '' !== $meta_value || ! self::is_binding_key($meta_key) ) {
            return $check;
        }

        if (metadata_exists('post', (int) $object_id, $meta_key) ) {
            return $check;
        }

        return true;
    }

    /**
     * Queue the removal of the empty rows that saving any post from the block
     * editor used to write under every binding key (before the keys had a
     * registered default).
     */
    public static function schedule_stray_meta_cleanup()
    {
        if (! wp_next_scheduled(self::STRAY_META_CLEANUP_HOOK) ) {
            wp_schedule_single_event(time() + MINUTE_IN_SECONDS, self::STRAY_META_CLEANUP_HOOK);
        }
    }

    /**
     * Every key the bindings register as post meta.
     *
     * @return string[]
     */
    public static function get_registered_binding_keys()
    {
        return array_values(
            array_unique(
                array_merge(
                    array_diff(array_keys(self::get_allowed_keys()), array( 'event_calendar', 'event_calendar_url' )),
                    array_keys(self::get_taxonomy_keys())
                )
            )
        );
    }

    /**
     * Delete empty rows stored under the binding keys on posts that are not
     * events, one batch at a time, and come back for the rest.
     *
     * The binding keys never hold data: their values are rendered from the
     * event when a bound block renders. An empty row under one of them is
     * always a leftover from the block editor echoing the key back on save.
     * Event posts are left alone because event_timezone is real meta there.
     *
     * @param  int $batch Rows to remove in this run.
     * @return int Rows removed.
     */
    public static function cleanup_stray_meta( $batch = 2000 )
    {
        global $wpdb;

        $batch = max(1, (int) $batch);
        $keys  = self::get_registered_binding_keys();
        if (empty($keys) ) {
            return 0;
        }

        $placeholders = implode(',', array_fill(0, count($keys), '%s'));
        $rows         = $wpdb->get_results(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Placeholders only.
                "SELECT pm.meta_id, pm.post_id FROM {$wpdb->postmeta} pm INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id WHERE p.post_type <> 'eventkoi_event' AND pm.meta_value = '' AND pm.meta_key IN ( {$placeholders} ) ORDER BY pm.meta_id ASC LIMIT %d",
                array_merge($keys, array( $batch ))
            )
        );

        if (empty($rows) ) {
            return 0;
        }

        $meta_ids = array_map('intval', wp_list_pluck($rows, 'meta_id'));
        $id_slots = implode(',', array_fill(0, count($meta_ids), '%d'));
        $wpdb->query( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Placeholders only.
                "DELETE FROM {$wpdb->postmeta} WHERE meta_id IN ( {$id_slots} )",
                $meta_ids
            )
        );

        foreach ( array_unique(array_map('intval', wp_list_pluck($rows, 'post_id'))) as $post_id ) {
            wp_cache_delete($post_id, 'post_meta');
        }

        if (count($rows) === $batch ) {
            wp_schedule_single_event(time() + 30, self::STRAY_META_CLEANUP_HOOK);
        }

        return count($rows);
    }

    /**
     * Return the full list of allowed binding keys.
     *
     * @return array Associative array of key => label.
     */
    public static function get_allowed_keys()
    {
        return array(
        'event_title'                 => __('Event title', 'eventkoi-lite'),
        'event_details'               => __('Event details', 'eventkoi-lite'),
        'event_excerpt'               => __('Event excerpt', 'eventkoi-lite'),
        'event_timezone'              => __('Event timezone', 'eventkoi-lite'),
        'event_gmap'                  => __('Event Google Map', 'eventkoi-lite'),
        'event_image'                 => __('Event image', 'eventkoi-lite'),
        'event_image_url'             => __('Event image URL', 'eventkoi-lite'),
        'event_calendar_url'          => __('Event calendar URL', 'eventkoi-lite'),
        'event_calendar'              => __('Event calendar', 'eventkoi-lite'),
        'event_calendar_link'         => __('Event calendar link', 'eventkoi-lite'),
        'event_location'              => __('Event location', 'eventkoi-lite'),
        'event_location_name'           => __('Event location name', 'eventkoi-lite'),
        'event_location_address'        => __('Event location address', 'eventkoi-lite'),
        'event_location_unit'           => __('Event location apartment/unit', 'eventkoi-lite'),
        'event_location_city'           => __('Event location city', 'eventkoi-lite'),
        'event_location_state'          => __('Event location state', 'eventkoi-lite'),
        'event_location_country'        => __('Event location country', 'eventkoi-lite'),
        'event_location_zip'            => __('Event location post code', 'eventkoi-lite'),
        'event_datetime_with_summary' => __('Event date time with summary', 'eventkoi-lite'),
        'event_datetime'              => __('Event date time', 'eventkoi-lite'),
        'event_date'                  => __('Event date', 'eventkoi-lite'),
        'event_time'                  => __('Event time', 'eventkoi-lite'),
        'event_date_type'             => __('Event date type', 'eventkoi-lite'),
        'event_rulesummary'           => __('Recurring rule summary', 'eventkoi-lite'),
        'event_ticket_rsvp'           => __('Event RSVP / Tickets', 'eventkoi-lite'),
        'event_capacity'              => __('Event capacity', 'eventkoi-lite'),
        'event_capacity_remaining'    => __('Event capacity remaining', 'eventkoi-lite'),
        'event_capacity_sold'         => __('Event capacity sold', 'eventkoi-lite'),
        'event_sold_out'              => __('Event sold out label', 'eventkoi-lite'),
        'event_low_stock'             => __('Event low stock label', 'eventkoi-lite'),
        'event_ticket_count'          => __('Event ticket count', 'eventkoi-lite'),
        'event_ticket_summary'        => __('Event ticket summary', 'eventkoi-lite'),
        'event_sales_start'           => __('Event sales start', 'eventkoi-lite'),
        'event_sales_end'             => __('Event sales end', 'eventkoi-lite'),
        'event_ticket_price_from'     => __('Event ticket price from', 'eventkoi-lite'),
        'event_ticket_price_to'       => __('Event ticket price to', 'eventkoi-lite'),
        'event_price_from'              => __('Event price from (starting price)', 'eventkoi-lite'),
        'event_price_from_url'          => __('Event price from URL', 'eventkoi-lite'),
        'event_price_from_details'      => __('Event price from details', 'eventkoi-lite'),
        'event_ticket_price_range'    => __('Event ticket price range', 'eventkoi-lite'),
        'event_date_year'             => __('Event date year', 'eventkoi-lite'),
        'event_date_month'            => __('Event date month', 'eventkoi-lite'),
        'event_date_month_short'      => __('Event date month short', 'eventkoi-lite'),
        'event_date_day'              => __('Event date day', 'eventkoi-lite'),
        'event_date_day_name'         => __('Event date day name', 'eventkoi-lite'),
        'event_date_iso'              => __('Event date ISO', 'eventkoi-lite'),
        'event_rsvp_capacity'         => __('Event RSVP capacity', 'eventkoi-lite'),
        'event_rsvp_remaining'        => __('Event RSVP remaining', 'eventkoi-lite'),
        'event_rsvp_going'            => __('Event RSVP going', 'eventkoi-lite'),
        'event_rsvp_full'             => __('Event RSVP full label', 'eventkoi-lite'),
        );
    }

    /**
     * Attribute keys for the taxonomies attached to events.
     *
     * The event editor tells people a taxonomy is available as the
     * event_tax_<slug> attribute, so the block editor has to offer it in the
     * Attributes picker and resolve it like any other event attribute. Covers
     * every taxonomy shown on events; the calendar has its own attributes.
     *
     * @return array<string, string> Attribute key => label.
     */
    public static function get_taxonomy_keys()
    {
        $keys = array();

        foreach ( get_object_taxonomies('eventkoi_event', 'objects') as $taxonomy ) {
            if ('event_cal' === $taxonomy->name || empty($taxonomy->show_ui) ) {
                continue;
            }

            $keys[ 'event_tax_' . $taxonomy->name ] = (string) ( $taxonomy->labels->name ?? $taxonomy->label );
        }

        return $keys;
    }

    /**
     * Whether a binding key names one of the event taxonomy attributes.
     *
     * @param string $key Binding key.
     * @return bool
     */
    public static function is_taxonomy_key( $key )
    {
        $key = (string) $key;

        if (0 !== strpos($key, 'event_tax_') ) {
            return false;
        }

        return array_key_exists($key, self::get_taxonomy_keys());
    }

    /**
     * Offer the event taxonomy attributes in the block editor's Attributes picker.
     *
     * The picker lists registered post meta, so each key is registered the same
     * way the built-in event attributes are.
     */
    public function register_taxonomy_bindings()
    {
        $post_types = array( 'eventkoi_event', 'wp_template', 'wp_template_part', 'wp_block', 'page', 'post' );

        foreach ( array_keys(self::get_taxonomy_keys()) as $key ) {
            foreach ( $post_types as $post_type ) {
                register_meta(
                    $post_type,
                    $key,
                    array(
                    'show_in_rest' => true,
                    'single'       => true,
                    'type'         => 'string',
                    )
                );
            }
        }
    }

    /**
     * Register block bindings.
     */
    public function register_block_bindings()
    {
        $keys = self::get_allowed_keys();

        foreach ( $keys as $key => $label ) {
            // Only register meta if this key maps to actual post_meta.
            if (! in_array($key, array( 'event_calendar', 'event_calendar_url' ), true) ) {
                $post_types = array( 'eventkoi_event', 'wp_template', 'wp_template_part', 'wp_block', 'page', 'post' );

                foreach ( $post_types as $post_type ) {
                    register_meta(
                        $post_type,
                        $key,
                        array(
                        'show_in_rest' => true,
                        'single'       => true,
                        'type'         => 'string',
                        )
                    );
                }
            }
        }

        foreach ( array_keys($keys) as $key ) {
            register_block_bindings_source(
                'eventkoi/' . str_replace('_', '-', $key),
                array(
                'label'              => $keys[ $key ],
                'get_value_callback' => array( $this, 'get_event_meta' ),
                'uses_context'       => array( 'postId' ),
                )
            );
        }
    }

    /**
     * Get event meta (placeholder, unused).
     *
     * @param array  $_source_args    Source arguments. Unused.
     * @param object $_block_instance WP block instance. Unused.
     * @param string $_attribute_name Attribute name. Unused.
     */
    public function get_event_meta( $_source_args, $_block_instance, $_attribute_name )
    {
        unset($_source_args, $_block_instance, $_attribute_name);
        return null;
    }

    /**
     * Filter final values for event meta.
     *
     * @param mixed  $value          Existing value.
     * @param string $name           Source name.
     * @param array  $source_args    Binding args.
     * @param object $block_instance WP block instance.
     * @param string $attribute_name Attribute name.
     */
    public function filter_event_meta_values( $value, $name, $source_args, $block_instance, $attribute_name )
    {
        unset($attribute_name);

        if (! empty($source_args['id']) ) {
            $event_id = absint($source_args['id']);
        } elseif (isset($block_instance->context['postId']) ) {
            $event_id = absint($block_instance->context['postId']);
        } else {
            return $value;
        }

        if (is_string($name) && strpos($name, 'eventkoi/') === 0 ) {
            $event = new Event($event_id);
            return $event::render_meta($name);
        }

        if (! empty($source_args['key']) && array_key_exists($source_args['key'], self::get_allowed_keys()) ) {
            $event = new Event($event_id);
            return $event::render_meta($source_args['key']);
        }

        if (! empty($source_args['key']) && self::is_taxonomy_key($source_args['key']) ) {
            $event = new Event($event_id);
            return $event::render_meta((string) $source_args['key']);
        }

        return $value;
    }
}
