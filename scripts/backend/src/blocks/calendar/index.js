import { registerBlockType } from "@wordpress/blocks";
import { __ } from "@wordpress/i18n";
import { attributes } from "./attributes";
import Edit from "./edit";
import "./editor.scss";
import { icon } from "./icon.js";
import save from "./save";

registerBlockType("eventkoi/calendar", {
  apiVersion: 2,
  title: __("EK Events Calendar", "eventkoi"),
  category: "eventkoi-blocks",
  icon: icon,
  example: {
    attributes: {},
  },
  description: __("Add an EventKoi calendar.", "newsletter-glue"),
  keywords: ["eventkoi", "events"],
  attributes: attributes,
  supports: {
    layout: {
      type: "constrained",
      allowJustification: false,
      allowWide: false,
    },
  },
  edit: Edit,
  save,
});
