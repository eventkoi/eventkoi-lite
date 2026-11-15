import { __ } from "@wordpress/i18n";

/**
 * Hidden note for links that open a new tab, read by screen readers.
 */
export function NewTabNote() {
  return <span className="sr-only"> ({__("opens in new tab", "eventkoi-lite")})</span>;
}
