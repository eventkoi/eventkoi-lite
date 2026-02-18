<?php
/**
 * Frontend render template for the Calendar Module.
 *
 * @var object $module The module instance.
 * @var object $settings The module settings.
 * @var string $id The module ID.
 */

$weekdays        = array( 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday' );
$month_options   = array( 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december' );
$selected_week   = strtolower( sanitize_text_field( $settings->week_starts_on ?? 'monday' ) );
$selected_frame  = strtolower( sanitize_text_field( $settings->timeframe ?? 'month' ) );
$selected_month  = strtolower( sanitize_text_field( $settings->default_month ?? 'current' ) );
$selected_year   = trim( (string) ( $settings->default_year ?? '' ) );
$selected_cal    = absint( $settings->calendars ?? 0 );

$args = array(
	'calendars'     => $selected_cal > 0 ? array( $selected_cal ) : array(),
	'startday'      => in_array( $selected_week, $weekdays, true ) ? $selected_week : 'monday',
	'timeframe'     => in_array( $selected_frame, array( 'month', 'week' ), true ) ? $selected_frame : 'month',
	'default_month' => ( ! empty( $selected_month ) && 'current' !== $selected_month && in_array( $selected_month, $month_options, true ) ) ? $selected_month : '',
	'default_year'  => preg_match( '/^\d{4}$/', $selected_year ) ? $selected_year : '',
	'context'       => 'block',
);

$calendar_id = (int) get_option( 'eventkoi_default_event_cal', 0 );

echo '<div class="eventkoi-calendar-wrapper">';
echo wp_kses_post(
	eventkoi_get_calendar_content( $calendar_id, 'calendar', $args )
);
echo '</div>';
?>
<script>
	(function () {
		if ( typeof window.eventkoiInitCalendars === 'function' ) {
			window.eventkoiInitCalendars();
		}

		<?php if ( class_exists( 'FLBuilderModel' ) && FLBuilderModel::is_builder_active() ) : ?>
		var nodeClass = <?php echo wp_json_encode( 'fl-node-' . (string) $id ); ?>;
		var moduleNode = document.querySelector('.' + nodeClass);

		// In Beaver editor, overlays sit above module content and block pointer clicks.
		// Toggling this built-in class makes overlay content pass through while still
		// keeping overlay actions clickable.
		if (moduleNode) {
			moduleNode.addEventListener('mouseenter', function () {
				moduleNode.classList.add('fl-editable-focused');
			});

			moduleNode.addEventListener('mouseleave', function () {
				moduleNode.classList.remove('fl-editable-focused');
			});
		}

		// Beaver overlays can sit above Radix popover wrappers. Force wrapper
		// z-index for month/week/timezone popovers in BB editor.
		var bumpRadixPopovers = function () {
			var wrappers = document.querySelectorAll('[data-radix-popper-content-wrapper]');
			wrappers.forEach(function (wrapper) {
				if (!wrapper || !wrapper.style) {
					return;
				}

				wrapper.style.setProperty('z-index', '2147483647', 'important');
			});
		};

		bumpRadixPopovers();

		if (!window.eventkoiBbRadixObserverInstalled && typeof MutationObserver !== 'undefined') {
			window.eventkoiBbRadixObserverInstalled = true;
			window.eventkoiBbRadixObserver = new MutationObserver(function () {
				bumpRadixPopovers();
			});
			window.eventkoiBbRadixObserver.observe(document.body, { childList: true, subtree: true });
		}
		<?php endif; ?>
	})();
</script>
<?php
