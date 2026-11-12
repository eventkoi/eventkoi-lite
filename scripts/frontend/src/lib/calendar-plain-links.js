/**
 * FullCalendar draws day numbers and weekday names as <a> tags with no href.
 * They are plain text, so they are marked as such and their full date or
 * weekday name moves to the cell, where screen readers read it.
 */
const PLAIN_LINKS = "a.fc-daygrid-day-number, a.fc-col-header-cell-cushion";

const settlePlainLink = (link) => {
  if (link.hasAttribute("href") || link.hasAttribute("data-navlink")) {
    return;
  }

  const label = link.getAttribute("aria-label");
  const cell = link.closest("td, th");

  if (label && cell) {
    if (cell.getAttribute("aria-label") !== label) {
      cell.setAttribute("aria-label", label);
    }
    if (cell.getAttribute("aria-labelledby") === link.id && link.id) {
      cell.removeAttribute("aria-labelledby");
    }
    link.removeAttribute("aria-label");
  }

  if (link.getAttribute("role") !== "presentation") {
    link.setAttribute("role", "presentation");
  }
};

export const watchPlainCalendarLinks = (root) => {
  if (!root || typeof MutationObserver === "undefined") {
    return () => {};
  }

  const settle = () => {
    root.querySelectorAll(PLAIN_LINKS).forEach(settlePlainLink);
    // The hours table in week view is hidden from screen readers and holds
    // no data, so it is marked as layout only.
    root
      .querySelectorAll('table[aria-hidden="true"]:not([role])')
      .forEach((table) => table.setAttribute("role", "presentation"));
  };

  settle();

  const observer = new MutationObserver(settle);
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-label", "aria-labelledby", "role"],
  });

  return () => observer.disconnect();
};
