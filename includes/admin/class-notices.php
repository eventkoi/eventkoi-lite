<?php
/**
 * Admin notices.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Admin
 */

namespace EventKoi\Admin;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Displays and manages dismissible admin notices.
 */
class Notices {

	/**
	 * Option name used to store dismissed state.
	 *
	 * @var string
	 */
	protected static $option_key = 'eventkoi_hide_block_notice';

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'admin_notices', array( static::class, 'render_notice' ) );
		add_action( 'wp_ajax_eventkoi_dismiss_notice', array( static::class, 'ajax_dismiss_notice' ) );
	}

	/**
	 * Renders the admin notice unless it has been dismissed.
	 */
	public static function render_notice() {
		if ( get_option( static::$option_key ) ) {
			return;
		}

		if ( ! current_user_can( 'edit_posts' ) ) {
			return;
		}

		// Inline CSS (only once per request).
		static $inline_done = false;
		if ( ! $inline_done ) {
			$inline_done = true;
			echo '<style>
			.eventkoi-admin-notice .eventkoi-notice-inner {
				display: flex;
				align-items: flex-start;
				gap: 10px;
				padding: 10px;
			}
			.eventkoi-admin-notice .eventkoi-notice-logo {
				flex-shrink: 0;
				margin-top: 10px;
				line-height: 0;
			}
			.eventkoi-admin-notice .eventkoi-notice-logo svg {
				width: 18px;
				height: auto;
				display: block;
			}
			.eventkoi-admin-notice .eventkoi-notice-content p {
				margin: 6px 0;
			}
		</style>';
		}

		?>
		<div class="notice notice-warning is-dismissible eventkoi-admin-notice" data-notice="list-block-removal">
			<div class="eventkoi-notice-inner">
				<div class="eventkoi-notice-logo" aria-hidden="true">
					<svg xmlns="http://www.w3.org/2000/svg" width="16.918" height="21.89" viewBox="0 0 16.918 21.89" focusable="false">
						<g transform="translate(0 -13.696)">
							<g transform="translate(0 13.696)">
								<path d="M6.19-72.725A3.818,3.818,0,0,0,4.837-75.38a3.359,3.359,0,0,0-2.484-.876A1.885,1.885,0,0,0,.611-74.9a1.612,1.612,0,0,0-.092,1.06,6.23,6.23,0,0,0,.518,1.178,8.55,8.55,0,0,1,.4.832,4.387,4.387,0,0,1,.224.775,7.582,7.582,0,0,0,.984,2.5,4.542,4.542,0,0,0,1.52,1.613,1.022,1.022,0,0,0,1.363-.107q.563-.391.693-2.332A18.33,18.33,0,0,0,6.19-72.725Zm-.09,7.2q-1.034,0-1.242,2.7a18.162,18.162,0,0,0,.413,5.442q.622,2.739,1.677,2.878,2.3.313,2.729-2.422a10.636,10.636,0,0,0-.736-5.668Q7.773-65.521,6.1-65.521Zm2.05-1.52a.88.88,0,0,0,.941.487,2.49,2.49,0,0,0,1.12-.657q.583-.539,1.389-1.4.481-.627.9-1.091a5.462,5.462,0,0,1,.805-.754,4.378,4.378,0,0,0,2.051-2.931,2.483,2.483,0,0,0-.917-2.533,2.674,2.674,0,0,0-2.914-.028A5.715,5.715,0,0,0,9.343-73.55,12.509,12.509,0,0,0,7.9-69.78,3.422,3.422,0,0,0,8.149-67.041Z" transform="translate(-0.467 76.356)" fill="#fb4409"></path>
							</g>
							<g transform="translate(7.301 20.061)">
								<path d="M34.564-32.511a2.816,2.816,0,0,0-.269,1.24,1.461,1.461,0,0,0,.269.913c.535.852.818,1.139,1.1,1.59a15.006,15.006,0,0,0,3.8,4.125q2.223,1.635,3.58.774a1.555,1.555,0,0,0,.865-1.448,3.235,3.235,0,0,0-.619-1.622A17.131,17.131,0,0,0,41.85-28.67l-.332-.386a20.805,20.805,0,0,0-2.5-2.265,10.6,10.6,0,0,0-2.8-1.656Q34.936-33.447,34.564-32.511Z" transform="translate(-34.295 33.134)" fill="#fb4409"></path>
							</g>
						</g>
					</svg>
				</div>

				<div class="eventkoi-notice-content">
					<p>
						<strong><?php esc_html_e( 'Warning:', 'eventkoi-lite' ); ?></strong>
						<?php esc_html_e( " EventKoi's Events List Block will be removed in the next release.", 'eventkoi-lite' ); ?>
					</p>
					<p>
						<strong><?php esc_html_e( 'Action required:', 'eventkoi-lite' ); ?></strong>
						<?php esc_html_e( ' Please switch your Events List Blocks to the new and more powerful EK Event Query Loop to keep your events displaying correctly.', 'eventkoi-lite' ); ?>
					</p>
					<p>
						<a
							href="<?php echo esc_url( 'https://eventkoi.com/blog/replace-events-list-block/' ); ?>"
							class="button button-primary"
							target="_blank"
							rel="noopener noreferrer"
						>
							<?php esc_html_e( 'Learn more', 'eventkoi-lite' ); ?>
						</a>
					</p>
				</div>
			</div>
		</div>
		<?php

		// Enqueue the JS that handles dismissal.
		wp_enqueue_script(
			'eventkoi-admin-notice',
			plugin_dir_url( EVENTKOI_PLUGIN_FILE ) . 'scripts/admin/admin-notice.js',
			array( 'jquery' ),
			EVENTKOI_VERSION,
			true
		);

		wp_localize_script(
			'eventkoi-admin-notice',
			'eventkoiNotice',
			array(
				'ajax_url'             => admin_url( 'admin-ajax.php' ),
				'nonce'                => wp_create_nonce( 'eventkoi_notice_nonce' ),
				'showListBlockWarning' => ! get_option( static::$option_key ),
			)
		);
	}

	/**
	 * Handles AJAX request to dismiss the notice.
	 */
	public static function ajax_dismiss_notice() {
		check_ajax_referer( 'eventkoi_notice_nonce', 'nonce' );

		update_option( static::$option_key, 1 );
		wp_send_json_success();
	}
}
