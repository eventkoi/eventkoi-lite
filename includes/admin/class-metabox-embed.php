<?php
/**
 * Embeddable native editor for third-party metaboxes.
 *
 * Renders the real WordPress classic edit screen for an event, stripped down
 * to only third-party metaboxes (ACF, Rank Math, Yoast, Pods, etc.), so it can
 * be shown inside an iframe in the EventKoi event editor. Because this is the
 * genuine post.php form, every core field stays present and populated (just
 * visually hidden), so the native save never blanks a field. Activated only
 * when the request carries the ek_embed flag on an event edit screen.
 *
 * @package EventKoi\Admin
 */

namespace EventKoi\Admin;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Metabox_Embed.
 */
class Metabox_Embed {

	/**
	 * Query flag that switches an event edit screen into embed mode.
	 */
	const FLAG = 'ek_embed';

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'admin_init', array( $this, 'maybe_init_embed' ), 1 );
		// Registered unconditionally: the save POST does not carry the GET
		// flags, so it is recognised via a hidden form marker instead.
		add_filter( 'redirect_post_location', array( $this, 'preserve_embed_redirect' ), 100 );
	}

	/**
	 * Whether the current request is an embed-mode event edit screen.
	 *
	 * @return bool
	 */
	private function is_embed_request() {
		global $pagenow;

		if ( ! is_admin() || 'post.php' !== ( $pagenow ?? '' ) ) {
			return false;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only view-routing flag, no state change.
		if ( empty( $_GET[ self::FLAG ] ) ) {
			return false;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only view-routing flag.
		$post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;

		if ( ! $post_id || 'eventkoi_event' !== get_post_type( $post_id ) ) {
			return false;
		}

		return current_user_can( 'edit_post', $post_id );
	}

	/**
	 * Wire the embed-mode hooks when the request qualifies.
	 *
	 * @return void
	 */
	public function maybe_init_embed() {
		if ( ! $this->is_embed_request() ) {
			return;
		}

		// Force the classic editor so third-party metaboxes render (and so the
		// screen carries the standard post.php form we can submit intact).
		add_filter( 'use_block_editor_for_post', '__return_false', 100 );

		add_filter( 'admin_body_class', array( $this, 'add_body_class' ) );
		add_action( 'admin_head', array( $this, 'print_embed_css' ), 999 );
		add_action( 'admin_footer', array( $this, 'print_embed_js' ), 999 );

		// Strip core + EventKoi metaboxes, leaving only third-party ones.
		add_action( 'add_meta_boxes', array( $this, 'strip_non_third_party_boxes' ), 9999 );

		// Marker so the save POST (which lacks the GET flags) can be recognised
		// and the redirect kept on the embedded screen.
		add_action( 'edit_form_top', array( $this, 'print_embed_marker_field' ) );
	}

	/**
	 * Output a hidden marker inside the post form so the save redirect can tell
	 * the submission came from the embedded editor.
	 *
	 * @return void
	 */
	public function print_embed_marker_field() {
		echo '<input type="hidden" name="_ek_embed" value="1" />';
	}

	/**
	 * Keep the post-save redirect on the embedded screen.
	 *
	 * Without this the redirect drops the embed flags and the event edit screen
	 * bounces back to the EventKoi React editor inside the iframe.
	 *
	 * @param string $location Redirect URL chosen by core after saving.
	 * @return string
	 */
	public function preserve_embed_redirect( $location ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Core already verified the edit nonce before this filter; this only reads a routing marker to preserve the view.
		if ( empty( $_POST['_ek_embed'] ) ) {
			return $location;
		}

		return add_query_arg(
			array(
				'eventkoi_native' => '1',
				self::FLAG        => '1',
			),
			$location
		);
	}

	/**
	 * Add a scoping body class.
	 *
	 * @param string $classes Existing classes.
	 * @return string
	 */
	public function add_body_class( $classes ) {
		return $classes . ' eventkoi-metabox-embed';
	}

	/**
	 * Remove core WordPress and EventKoi metaboxes from the embedded screen.
	 *
	 * Only third-party plugin panels should remain. The Publish box is kept so
	 * the embed has its own save control (independent of EventKoi's Save).
	 *
	 * @return void
	 */
	public function strip_non_third_party_boxes() {
		$screen = 'eventkoi_event';

		// Core boxes to remove per context. The submit (Publish) box is kept.
		$core = array(
			'normal'   => array( 'postexcerpt', 'trackbacksdiv', 'postcustom', 'commentstatusdiv', 'commentsdiv', 'revisionsdiv', 'slugdiv', 'authordiv' ),
			'side'     => array( 'formatdiv', 'pageparentdiv', 'postimagediv', 'categorydiv', 'tagsdiv-post_tag' ),
			'advanced' => array(),
		);

		foreach ( $core as $context => $ids ) {
			foreach ( $ids as $id ) {
				remove_meta_box( $id, $screen, $context );
			}
		}

		// Remove EventKoi's own taxonomy boxes (calendars, event categories, tags)
		// and any box whose id is namespaced to the plugin, so the embed shows
		// only external plugin panels.
		global $wp_meta_boxes;
		if ( empty( $wp_meta_boxes[ $screen ] ) || ! is_array( $wp_meta_boxes[ $screen ] ) ) {
			return;
		}

		foreach ( $wp_meta_boxes[ $screen ] as $context => $priorities ) {
			if ( ! is_array( $priorities ) ) {
				continue;
			}
			foreach ( $priorities as $priority => $boxes ) {
				if ( ! is_array( $boxes ) ) {
					continue;
				}
				foreach ( array_keys( $boxes ) as $box_id ) {
					if ( 0 === strpos( (string) $box_id, 'eventkoi' ) || 0 === strpos( (string) $box_id, 'tagsdiv-event' ) || false !== strpos( (string) $box_id, 'event_cal' ) || false !== strpos( (string) $box_id, 'eventkoi_event_cat' ) ) {
						remove_meta_box( $box_id, $screen, $context );
					}
				}
			}
		}
	}

	/**
	 * Print CSS that hides admin chrome and the core editor fields.
	 *
	 * Fields remain in the DOM (so the native save still submits their current
	 * values); they are only hidden from view.
	 *
	 * @return void
	 */
	public function print_embed_css() {
		?>
		<style id="eventkoi-metabox-embed-css">
			html.wp-toolbar { padding-top: 0 !important; }
			#adminmenumain, #wpadminbar, #wpfooter, #screen-meta, #screen-meta-links,
			.wrap > h1.wp-heading-inline, .wrap > .page-title-action,
			.wrap > hr.wp-header-end, #wpbody-content > .wrap > .notice,
			.notice, .updated, .update-nag, .error,
			#post-body-content, #titlediv, #postdivrich, #slugdiv {
				display: none !important;
			}
			html, body.wp-admin { background: transparent !important; }
			body { margin: 0 !important; padding: 0 !important; }
			#wpcontent, #wpbody, #wpbody-content { margin: 0 !important; padding: 0 !important; }
			#wpbody-content .wrap { margin: 0 !important; padding: 0 !important; }
			#poststuff { padding: 0 !important; margin: 0 !important; min-width: 0 !important; }
			#poststuff:after, #post-body:after { display: none !important; }

			/* Stack into one column: plugin fields first, update action last. */
			#post-body.columns-2 { display: flex !important; flex-direction: column !important; margin: 0 !important; }
			#post-body.columns-2 #postbox-container-1 { order: 2; float: none; width: 100% !important; margin: 0 !important; }
			#post-body.columns-2 #postbox-container-2 { order: 1; width: 100% !important; margin: 0 !important; }
			/* Collapse the empty sortable areas so they add no blank space. */
			.meta-box-sortables { min-height: 0 !important; }
			.meta-box-sortables:empty { display: none !important; }

			/* Keep each plugin's metabox as its own titled, collapsible card so it stays clear which fields belong to which plugin. Only the reorder arrows go. */
			.postbox { margin: 0 0 16px !important; }
			#postbox-container-2 .meta-box-sortables > .postbox:last-child,
			#postbox-container-1 .meta-box-sortables > .postbox:last-child { margin-bottom: 0 !important; }
			.postbox .handle-order-higher, .postbox .handle-order-lower { display: none !important; }

			/* Publish box becomes a single, plain Update button at the bottom. */
			#submitdiv { border: none !important; box-shadow: none !important; background: transparent !important; margin: 4px 0 0 !important; }
			#submitdiv > .postbox-header,
			#submitdiv #minor-publishing,
			#submitdiv #delete-action,
			#submitdiv .misc-pub-section { display: none !important; }
			#submitdiv .inside { margin: 0 !important; padding: 0 !important; border: none !important; }
			#submitdiv #major-publishing-actions {
				border-top: none !important;
				padding: 0 !important;
				margin: 0 !important;
				display: flex !important;
				justify-content: flex-start !important;
			}
			#submitdiv #publishing-action { float: none !important; padding: 0 !important; }
			#submitdiv #publishing-action .spinner { display: none !important; }
			#submitdiv .button-primary {
				height: auto !important;
				padding: 8px 22px !important;
				font-size: 13px !important;
				line-height: 1.4 !important;
				border-radius: 6px !important;
			}
		</style>
		<?php
	}

	/**
	 * Print JS that reports the document height to the parent window so the
	 * iframe can auto-size, and never sits behind a scrollbar.
	 *
	 * @return void
	 */
	public function print_embed_js() {
		$origin = esc_js( home_url() );
		?>
		<script id="eventkoi-metabox-embed-js">
		( function () {
			var lastHeight = 0;
			function measure() {
				var b = document.body, e = document.documentElement;
				return Math.max( b.scrollHeight, b.offsetHeight, e.scrollHeight, e.offsetHeight );
			}
			function report() {
				var h = measure();
				if ( Math.abs( h - lastHeight ) < 2 ) { return; }
				lastHeight = h;
				try {
					window.parent.postMessage( { eventkoiMetaboxEmbed: true, type: 'height', height: h }, '<?php echo $origin; // phpcs:ignore ?>' );
				} catch ( err ) {}
			}
			window.addEventListener( 'load', report );
			document.addEventListener( 'DOMContentLoaded', report );
			// ACF and SEO panels expand, add rows, and toggle, so keep syncing.
			setInterval( report, 700 );
			if ( window.ResizeObserver ) {
				try { new ResizeObserver( report ).observe( document.body ); } catch ( err ) {}
			}
		} )();
		</script>
		<?php
	}
}
