<?php
/**
 * EventKoi Event — Divi module.
 *
 * @package EventKoi
 */

defined('ABSPATH') || exit;

/**
 * ET_Builder_Module_EventkoiEvent.
 */
class ET_Builder_Module_EventkoiEvent extends ET_Builder_Module
{

    /**
     * Init module.
     */
    public function init()
    {
        $this->name       = esc_html__('EventKoi Event', 'eventkoi-lite');
        $this->plural     = esc_html__('EventKoi Events', 'eventkoi-lite');
        $this->slug       = 'et_pb_eventkoi_event';
        $this->vb_support = 'off';

        $this->settings_modal_toggles = array(
        'general' => array(
        'toggles' => array(
        'main_content' => esc_html__('Event', 'eventkoi-lite'),
        ),
        ),
        );
    }

    /**
     * Fields.
     *
     * @return array
     */
    public function get_fields()
    {
        return array(
        'eventkoi_event_id' => array(
        'label'           => esc_html__('Event', 'eventkoi-lite'),
        'type'            => 'select',
        'option_category' => 'basic_option',
        'options'         => $this->event_options(),
        'default'         => 'current',
        'default_on_front' => 'current',
        'description'     => esc_html__('Select an event to display. Use the current event when placed on an event template.', 'eventkoi-lite'),
        'toggle_slug'     => 'main_content',
        ),
        'eventkoi_data'     => array(
        'label'            => esc_html__('Data to render', 'eventkoi-lite'),
        'type'             => 'select',
        'option_category'  => 'configuration',
        'options'          => array(
                    'full'                        => esc_html__('Full event', 'eventkoi-lite'),
                    'event_title'                 => esc_html__('Title', 'eventkoi-lite'),
                    'event_details'               => esc_html__('Details', 'eventkoi-lite'),
                    'event_image'                 => esc_html__('Image', 'eventkoi-lite'),
                    'event_datetime'              => esc_html__('Date & time', 'eventkoi-lite'),
                    'event_date'                  => esc_html__('Date only', 'eventkoi-lite'),
                    'event_time'                  => esc_html__('Time only', 'eventkoi-lite'),
                    'event_datetime_with_summary' => esc_html__('Date, time & recurring summary', 'eventkoi-lite'),
                    'event_location'              => esc_html__('Location', 'eventkoi-lite'),
                    'event_location_name'         => esc_html__('Location Name', 'eventkoi-lite'),
                    'event_location_address'      => esc_html__('Location Address', 'eventkoi-lite'),
                    'event_location_unit'         => esc_html__('Location Apartment/Unit', 'eventkoi-lite'),
                    'event_location_city'         => esc_html__('Location City', 'eventkoi-lite'),
                    'event_location_state'        => esc_html__('Location State', 'eventkoi-lite'),
                    'event_location_country'      => esc_html__('Location Country', 'eventkoi-lite'),
                    'event_location_zip'          => esc_html__('Location Post Code', 'eventkoi-lite'),
                    'event_gmap'                  => esc_html__('Google map', 'eventkoi-lite'),
                    'event_rulesummary'           => esc_html__('Recurring summary', 'eventkoi-lite'),
                    'event_ticket_rsvp'           => esc_html__('Ticket / RSVP', 'eventkoi-lite'),
                    'event_url'                   => esc_html__('Event URL', 'eventkoi-lite'),
                    'event_capacity'              => esc_html__('Capacity', 'eventkoi-lite'),
                    'event_capacity_remaining'    => esc_html__('Capacity remaining', 'eventkoi-lite'),
                    'event_capacity_sold'         => esc_html__('Capacity sold', 'eventkoi-lite'),
                    'event_sold_out'              => esc_html__('Sold out label', 'eventkoi-lite'),
                    'event_low_stock'             => esc_html__('Low stock label', 'eventkoi-lite'),
                    'event_ticket_count'          => esc_html__('Ticket count', 'eventkoi-lite'),
                    'event_ticket_summary'        => esc_html__('Ticket summary', 'eventkoi-lite'),
                    'event_sales_start'           => esc_html__('Sales start', 'eventkoi-lite'),
                    'event_sales_end'             => esc_html__('Sales end', 'eventkoi-lite'),
                    'event_ticket_price_from'     => esc_html__('Ticket price from', 'eventkoi-lite'),
                    'event_ticket_price_to'       => esc_html__('Ticket price to', 'eventkoi-lite'),
                    'event_ticket_price_range'    => esc_html__('Ticket price range', 'eventkoi-lite'),
                    'event_date_year'             => esc_html__('Date — year', 'eventkoi-lite'),
                    'event_date_month'            => esc_html__('Date — month', 'eventkoi-lite'),
                    'event_date_month_short'      => esc_html__('Date — month short', 'eventkoi-lite'),
                    'event_date_day'              => esc_html__('Date — day', 'eventkoi-lite'),
                    'event_date_day_name'         => esc_html__('Date — day name', 'eventkoi-lite'),
                    'event_date_iso'              => esc_html__('Date — ISO', 'eventkoi-lite'),
                    'event_rsvp_capacity'         => esc_html__('RSVP capacity', 'eventkoi-lite'),
                    'event_rsvp_remaining'        => esc_html__('RSVP remaining', 'eventkoi-lite'),
                    'event_rsvp_going'            => esc_html__('RSVP going', 'eventkoi-lite'),
                    'event_rsvp_full'             => esc_html__('RSVP full label', 'eventkoi-lite'),
        ),
        'default_on_front' => 'full',
        'toggle_slug'      => 'main_content',
        ),
        );
    }

    /**
     * Render.
     *
     * @param  array  $attrs       Attributes.
     * @param  string $content     Content.
     * @param  string $render_slug Slug.
     * @return string
     */
    public function render( $attrs, $content, $render_slug )
    {
        unset($attrs, $content, $render_slug);

        $selected = $this->props['eventkoi_event_id'] ?? 'current';
        $event_id = ( '' === $selected || 'current' === $selected ) ? 0 : absint($selected);
        if (! $event_id ) {
            $current = get_the_ID();
            if ($current && 'eventkoi_event' === get_post_type($current) ) {
                $event_id = (int) $current;
            }
        }

        if (! $event_id ) {
            return '';
        }

        $data = sanitize_key($this->props['eventkoi_data'] ?? 'full');

        if ('full' === $data ) {
            $items  = array( 'event_title', 'event_datetime', 'event_location', 'event_details' );
            $output = '';
            foreach ( $items as $key ) {
                $output .= do_shortcode(sprintf('[eventkoi id=%d data=%s]', $event_id, $key));
            }
        } else {
            $output = do_shortcode(sprintf('[eventkoi id=%d data=%s]', $event_id, $data));
        }

        if ('' === trim($output) ) {
            return '';
        }

        return sprintf('<div class="eventkoi-divi-event">%s</div>', $output);
    }

    /**
     * Event dropdown options.
     *
     * @return array
     */
    protected function event_options()
    {
        $options = array( 'current' => esc_html__('— Current event —', 'eventkoi-lite') );

        $limit = (int) apply_filters('eventkoi_divi_event_options_limit', 200);
        $posts = get_posts(
            array(
            'post_type'        => 'eventkoi_event',
            'posts_per_page'   => max(1, $limit),
            'post_status'      => array( 'publish', 'draft', 'future', 'private' ),
            'orderby'          => 'modified',
            'order'            => 'DESC',
            'suppress_filters' => true,
            )
        );

        foreach ( $posts as $post ) {
            $options[ (string) $post->ID ] = $post->post_title;
        }

        return $options;
    }
}
