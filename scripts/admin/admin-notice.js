/**
 * EventKoi Admin Notice Dismissal Script.
 *
 * Handles AJAX dismissal of persistent admin notices.
 */

jQuery(document).ready(function ($) {
	$(document).on('click', '.eventkoi-admin-notice .notice-dismiss', function () {
		var $notice = $(this).closest('.eventkoi-admin-notice');
		var notice = $notice.data('notice');

		$.post(eventkoiNotice.ajax_url, {
			action: 'eventkoi_dismiss_notice',
			nonce: eventkoiNotice.nonce,
			notice: notice,
		});
	});
});
