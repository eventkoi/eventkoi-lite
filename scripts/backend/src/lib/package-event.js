/**
 * Whether the single-package toggle applies to an event.
 *
 * Mirrors Event::is_package() in PHP. The date_type test is the important one:
 * switching an event to recurring leaves standard_type and event_days behind in
 * meta, so a gate that only looks at those two shows the toggle on recurring
 * events, where the saved value is never honoured. A recurring series pass is a
 * separate feature.
 *
 * A missing date_type means an unsaved new event, which the date picker already
 * treats as standard.
 *
 * @param {Object} event Event editor state.
 * @return {boolean} True when the event can be sold as one package.
 */
export function isSinglePackageEligible(event) {
  const dateType = String(event?.date_type || "standard");

  if (dateType !== "standard" || event?.standard_type !== "selected") {
    return false;
  }

  return Array.isArray(event?.event_days) && event.event_days.length > 1;
}
