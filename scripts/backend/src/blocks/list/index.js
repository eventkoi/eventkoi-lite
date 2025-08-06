import { registerBlockType } from "@wordpress/blocks";
import { __ } from "@wordpress/i18n";
import { attributes } from "./attributes";
import Edit from "./edit";
import "./editor.scss";
import { icon } from "./icon.js";
import save from "./save";

registerBlockType("eventkoi/list", {
  apiVersion: 2,
  title: __("EK Events List", "eventkoi"),
  category: "eventkoi-blocks",
  icon: icon,
  example: {
    attributes: {},
  },
  description: __("Add an EventKoi list of events.", "newsletter-glue"),
  keywords: ["eventkoi", "events"],
  attributes: attributes,
  edit: Edit,
  save,
});
