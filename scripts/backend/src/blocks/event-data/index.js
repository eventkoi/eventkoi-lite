/**
 * EventKoi Event Data Block Registration.
 *
 * @package EventKoi
 */

import { registerBlockType } from "@wordpress/blocks";
import { __ } from "@wordpress/i18n";
import { attributes } from "./attributes";
import Edit from "./edit";
import "./editor.scss";
import { icon } from "./icon";
import save from "./save";

registerBlockType("eventkoi/event-data", {
  apiVersion: 2,
  title: __("EK Event Data", "eventkoi"),
  description: __(
    "Display specific details (title, location, time, etc.) from an event. Can be used alone or inside an Event Query.",
    "eventkoi"
  ),
  category: "eventkoi-blocks",
  icon,
  attributes,

  // ---------------------------------------------------------------------
  // Block supports.
  // These flags ensure the block can be selected, moved, and reordered.
  // ---------------------------------------------------------------------
  supports: {
    reusable: false,
    inserter: true, // Allow appearing in inserter.
    multiple: true, // Allow multiple instances.
    lock: false, // Disable full locking (can move).
    __experimentalMovable: true, // Explicitly enable move up/down handles.

    color: {
      text: true,
      background: true,
    },
    typography: {
      fontSize: true,
      lineHeight: true,
      __experimentalFontFamily: true,
      fontStyle: true,
      __experimentalFontStyle: true,
    },
    spacing: {
      margin: true,
      padding: true,
    },
    align: ["left", "center", "right"],
  },

  // ---------------------------------------------------------------------
  // Dynamic label for List View / breadcrumbs.
  // ---------------------------------------------------------------------
  __experimentalLabel: (attributes) => {
    const labels = {
      title: __("Title", "eventkoi"),
      excerpt: __("Excerpt / Description", "eventkoi"),
      timeline: __("Date and Time", "eventkoi"),
      location: __("Location", "eventkoi"),
      image: __("Image", "eventkoi"),
    };
    const label = labels[attributes.field] || __("Unknown", "eventkoi");
    return `Event data: ${label}`;
  },

  edit: Edit,
  save,
});
