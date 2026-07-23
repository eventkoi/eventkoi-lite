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
