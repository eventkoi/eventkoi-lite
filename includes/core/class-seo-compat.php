<?php
/**
 * SEO plugin compatibility.
 *
 * @package EventKoi\Core
 */

namespace EventKoi\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Keeps third-party SEO caches in sync with event changes.
 *
 * Rank Math registers its sitemap cache invalidation only in admin and cron
 * requests, so event saves that go through REST (the event editor, frontend
 * submissions, importers) leave its cached sitemap stale until it is purged
 * by hand. Invalidate it ourselves whenever an event changes.
 */
class SEO_Compat {

	/**
	 * Whether an invalidation has been queued for this request.
	 *
	 * @var bool
	 */
	private static $queued = false;

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'save_post_eventkoi_event', array( __CLASS__, 'queue_sitemap_invalidation' ) );
		add_action( 'deleted_post', array( __CLASS__, 'queue_on_delete' ), 10, 2 );
		add_action( 'rank_math/vars/register_extra_replacements', array( __CLASS__, 'register_rank_math_variables' ) );
		add_action( 'wpseo_register_extra_replacements', array( __CLASS__, 'register_yoast_variables' ) );
	}

	/**
	 * Event fields offered to SEO plugins as replacement variables.
	 *
	 * Event data lives in fields that are rendered on demand, not in post meta,
	 * so an SEO plugin's own custom-field variable (Rank Math's
	 * %customfield(x)%, Yoast's %%cf_x%%) has nothing to read. These expose the
	 * same values the blocks and shortcodes use, as plain text.
	 *
	 * @return array Variable name => field definition.
	 */
	public static function variables() {
		return array(
			'eventkoi_datetime'              => array(
				'field' => 'event_datetime',
				'name'  => __( 'Event date and time', 'eventkoi-lite' ),
				'desc'  => __( "The event's date and time.", 'eventkoi-lite' ),
			),
			'eventkoi_datetime_with_summary' => array(
				'field' => 'event_datetime_with_summary',
				'name'  => __( 'Event date and time with summary', 'eventkoi-lite' ),
				'desc'  => __( "The event's date and time, followed by its recurrence summary.", 'eventkoi-lite' ),
			),
			'eventkoi_date'                  => array(
				'field' => 'event_date',
				'name'  => __( 'Event date', 'eventkoi-lite' ),
				'desc'  => __( "The event's date, without the time.", 'eventkoi-lite' ),
			),
			'eventkoi_time'                  => array(
				'field' => 'event_time',
				'name'  => __( 'Event time', 'eventkoi-lite' ),
				'desc'  => __( "The event's time, without the date.", 'eventkoi-lite' ),
			),
			'eventkoi_recurrence'            => array(
				'field' => 'event_rulesummary',
				'name'  => __( 'Event recurrence', 'eventkoi-lite' ),
				'desc'  => __( 'A summary of how the event repeats.', 'eventkoi-lite' ),
			),
			'eventkoi_location'              => array(
				'field' => 'event_location',
				'name'  => __( 'Event location', 'eventkoi-lite' ),
				'desc'  => __( "The event's location.", 'eventkoi-lite' ),
			),
			'eventkoi_timezone'              => array(
				'field' => 'event_timezone',
				'name'  => __( 'Event timezone', 'eventkoi-lite' ),
				'desc'  => __( "The event's timezone.", 'eventkoi-lite' ),
			),
		);
	}

	/**
	 * Register the variables with Rank Math.
	 */
	public static function register_rank_math_variables() {
		if ( ! function_exists( 'rank_math_register_var_replacement' ) ) {
			return;
		}

		foreach ( self::variables() as $name => $variable ) {
			$field = $variable['field'];

			rank_math_register_var_replacement(
				$name,
				array(
					'name'        => $variable['name'],
					'description' => $variable['desc'],
					'variable'    => $name,
				),
				static function () use ( $field ) {
					return self::resolve( $field );
				}
			);
		}
	}

	/**
	 * Register the variables with Yoast SEO.
	 */
	public static function register_yoast_variables() {
		if ( ! function_exists( 'wpseo_register_var_replacement' ) ) {
			return;
		}

		foreach ( self::variables() as $name => $variable ) {
			$field = $variable['field'];

			wpseo_register_var_replacement(
				'%%' . $name . '%%',
				static function () use ( $field ) {
					return self::resolve( $field );
				},
				'advanced',
				$variable['desc']
			);
		}
	}

	/**
	 * Render one event field as plain text for the post being displayed.
	 *
	 * @param string $field Event data field key.
	 * @return string Plain text, or an empty string off an event.
	 */
	public static function resolve( $field ) {
		$event_id = self::current_event_id();

		if ( ! $event_id ) {
			return '';
		}

		// SEO plugins resolve variables mid-request, including in the admin and
		// over AJAX for their own previews. Constructing an Event repoints every
		// static renderer for the rest of the request, so whatever was being
		// rendered before has to be put back or the page around us changes.
		$previous = Event::current_id();

		new Event( $event_id );

		$value = self::to_plain_text( Event::render_meta( $field ) );

		if ( $previous !== $event_id ) {
			new Event( $previous ? $previous : null );
		}

		return $value;
	}

	/**
	 * The event currently being rendered, if there is one.
	 *
	 * @return int Event ID, or 0.
	 */
	private static function current_event_id() {
		$event_id = (int) get_queried_object_id();

		if ( ! $event_id ) {
			$post = get_post();

			$event_id = $post instanceof \WP_Post ? (int) $post->ID : 0;
		}

		if ( ! $event_id || 'eventkoi_event' !== get_post_type( $event_id ) ) {
			return 0;
		}

		return $event_id;
	}

	/**
	 * Flatten rendered field markup into something a meta tag can hold.
	 *
	 * @param mixed $value Rendered field value.
	 * @return string
	 */
	private static function to_plain_text( $value ) {
		if ( ! is_string( $value ) || '' === $value ) {
			return '';
		}

		// Placeholders that stand in for a missing value on the page itself.
		// "No location available." is worse than nothing in a meta description.
		if ( false !== strpos( $value, 'eventkoi-no-location' )
			|| false !== strpos( $value, 'eventkoi-no-events' ) ) {
			return '';
		}

		// Several dates are separated by <br>, which strip_tags would run
		// together into a single unreadable string.
		$value = (string) preg_replace( '#<br\s*/?>#i', ', ', $value );
		$value = wp_strip_all_tags( $value );
		$value = html_entity_decode( $value, ENT_QUOTES, 'UTF-8' );
		$value = (string) preg_replace( '/\s+/u', ' ', $value );

		return trim( $value, " \t\n\r\0\x0B," );
	}

	/**
	 * Queue a Rank Math sitemap cache invalidation, once per request.
	 */
	public static function queue_sitemap_invalidation() {
		if ( self::$queued || ! class_exists( '\RankMath\Sitemap\Cache' ) ) {
			return;
		}

		self::$queued = true;

		add_action( 'shutdown', array( __CLASS__, 'invalidate_sitemap_cache' ) );
	}

	/**
	 * Queue invalidation when an event is deleted outright.
	 *
	 * @param int           $post_id Post ID.
	 * @param \WP_Post|null $post    Post object.
	 */
	public static function queue_on_delete( $post_id, $post = null ) {
		if ( $post instanceof \WP_Post && 'eventkoi_event' === $post->post_type ) {
			self::queue_sitemap_invalidation();
		}
	}

	/**
	 * Drop Rank Math's cached event sitemap so the next request regenerates it.
	 */
	public static function invalidate_sitemap_cache() {
		\RankMath\Sitemap\Cache::invalidate_storage( 'eventkoi_event' );
	}
}
