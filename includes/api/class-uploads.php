<?php
/**
 * REST API - Image Upload Endpoint.
 *
 * @package    EventKoi
 * @subpackage EventKoi\API
 */

namespace EventKoi\API;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use EventKoi\API\REST;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Class Uploads
 */
class Uploads {

	/**
	 * Register endpoint.
	 */
	public static function init() {
		register_rest_route(
			EVENTKOI_API,
			'/upload_image',
			array(
				array(
					'methods'             => 'POST',
					'callback'            => array( __CLASS__, 'upload_image' ),
					'permission_callback' => array( REST::class, 'private_api' ),
				),
				array(
					'methods'             => 'DELETE',
					'callback'            => array( __CLASS__, 'delete_image' ),
					'permission_callback' => array( REST::class, 'private_api' ),
				),
			)
		);
	}

	/**
	 * Handle image upload from URL or file.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function upload_image( $request ) {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';

		$params        = $request->get_json_params();
		$post_id       = absint( $request->get_param( 'post_id' ) );
		$attachment_id = absint( $request->get_param( 'attachment_id' ) );
		$url           = esc_url_raw( $request->get_param( 'url' ) );
		$file_obj      = $request->get_file_params();

		$raw_value     = $request->get_param( 'set_thumbnail' );
		$set_thumbnail = ( null === $raw_value || '1' === $raw_value || 1 === $raw_value || true === $raw_value );

		if ( ! $post_id || 'event' !== get_post_type( $post_id ) ) {
			return new \WP_Error( 'eventkoi_invalid_post', __( 'Invalid or missing event ID.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		// Reuse existing attachment directly.
		if ( $attachment_id && 'attachment' === get_post_type( $attachment_id ) ) {
			if ( true === $set_thumbnail ) {
				set_post_thumbnail( $post_id, $attachment_id );
			}

			return rest_ensure_response(
				array(
					'id'  => $attachment_id,
					'url' => wp_get_attachment_url( $attachment_id ),
				)
			);
		}

		// Handle URL upload (media sideload).
		if ( ! empty( $url ) && filter_var( $url, FILTER_VALIDATE_URL ) ) {
			$media_id = media_sideload_image( $url, $post_id, null, 'id' );

			if ( is_wp_error( $media_id ) ) {
				return new \WP_Error( 'eventkoi_remote_upload_failed', $media_id->get_error_message(), array( 'status' => 500 ) );
			}

			if ( true === $set_thumbnail ) {
				set_post_thumbnail( $post_id, $media_id );
			}

			return rest_ensure_response(
				array(
					'id'  => $media_id,
					'url' => wp_get_attachment_url( $media_id ),
				)
			);
		}

		// Handle file upload (e.g. drag/drop or camera).
		if ( empty( $file_obj['uploadedfile'] ) || ! is_array( $file_obj['uploadedfile'] ) ) {
			return new \WP_Error( 'eventkoi_no_file', __( 'No image file uploaded.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$file = $file_obj['uploadedfile'];

		if ( ! file_exists( $file['tmp_name'] ) || false === getimagesize( $file['tmp_name'] ) ) {
			return new \WP_Error( 'eventkoi_invalid_image', __( 'Uploaded file is not a valid image.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$max_size_mb = apply_filters( 'eventkoi_max_upload_size_mb', 5 );
		$max_bytes   = $max_size_mb * 1024 * 1024;

		// Translators: %s is the maximum file size allowed in megabytes.
		if ( filesize( $file['tmp_name'] ) > $max_bytes ) {
			return new \WP_Error(
				'eventkoi_file_too_large',
				/* translators: %s is the maximum file size allowed in megabytes. */
				sprintf( __( 'File exceeds maximum upload size of %s MB.', 'eventkoi-lite' ), $max_size_mb ),
				array( 'status' => 413 )
			);
		}

		$upload = wp_handle_upload(
			$file,
			array(
				'test_form' => false,
				'mimes'     => array(
					'jpg|jpeg|jpe' => 'image/jpeg',
					'png'          => 'image/png',
					'gif'          => 'image/gif',
					'webp'         => 'image/webp',
				),
			)
		);

		if ( isset( $upload['error'] ) ) {
			return new \WP_Error( 'eventkoi_upload_failed', $upload['error'], array( 'status' => 500 ) );
		}

		$filename    = $upload['file'];
		$wp_filetype = wp_check_filetype( $filename, null );

		$attachment = array(
			'post_mime_type' => $wp_filetype['type'],
			'post_title'     => sanitize_file_name( basename( $filename ) ),
			'post_content'   => '',
			'post_status'    => 'inherit',
		);

		$attach_id   = wp_insert_attachment( $attachment, $filename, $post_id );
		$attach_data = wp_generate_attachment_metadata( $attach_id, $filename );
		wp_update_attachment_metadata( $attach_id, $attach_data );

		if ( true === $set_thumbnail ) {
			set_post_thumbnail( $post_id, $attach_id );
		}

		return rest_ensure_response(
			array(
				'id'  => $attach_id,
				'url' => wp_get_attachment_url( $attach_id ),
			)
		);
	}

	/**
	 * Unset the featured image from an event.
	 *
	 * @param WP_REST_Request $request REST request.
	 * @return WP_REST_Response|\WP_Error REST response or error.
	 */
	public static function delete_image( $request ) {
		if ( ! ( $request instanceof \WP_REST_Request ) ) {
			return new \WP_Error(
				'eventkoi_invalid_request',
				__( 'Invalid request.', 'eventkoi-lite' ),
				array( 'status' => 400 )
			);
		}

		$params  = $request->get_json_params();
		$post_id = absint(
			$request->get_param( 'post_id' ) ??
			( is_array( $params ) ? ( $params['post_id'] ?? 0 ) : 0 )
		);

		if ( ! $post_id || get_post_type( $post_id ) !== 'event' ) {
			return new \WP_Error(
				'eventkoi_invalid_post',
				__( 'Invalid or missing event ID.', 'eventkoi-lite' ),
				array( 'status' => 400 )
			);
		}

		delete_post_thumbnail( $post_id );

		return rest_ensure_response(
			array(
				'success' => true,
			)
		);
	}
}
