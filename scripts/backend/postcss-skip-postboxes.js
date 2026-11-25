/**
 * Keep the Tailwind utilities out of other plugins' meta boxes.
 *
 * The block editor loads tailwind.css next to meta boxes that use the same
 * class names. WooCommerce reveals its product fields with an inline
 * display:block on elements that keep the class "hidden", which an !important
 * .hidden utility overrides. `:where()` adds no specificity, so nothing changes
 * for our own markup, which never sits in a .postbox.
 */
const parser = require("postcss-selector-parser");

const SKIP = ":where(:not(.postbox, .postbox *))";
const LEGACY_PSEUDO_ELEMENTS = [
  ":before",
  ":after",
  ":first-line",
  ":first-letter",
];

const isPseudoElement = (node) =>
  node.type === "pseudo" &&
  (node.value.startsWith("::") || LEGACY_PSEUDO_ELEMENTS.includes(node.value));

function skipPostboxes(selector) {
  let hasClass = false;
  selector.walkClasses(() => {
    hasClass = true;
  });
  if (!hasClass) return;

  // The last compound is the element the rule styles.
  let start = 0;
  selector.nodes.forEach((node, index) => {
    if (node.type === "combinator") start = index + 1;
  });

  const guard = parser().astSync(SKIP).first.first.clone();
  guard.spaces = { before: "", after: "" };

  const pseudo = selector.nodes.slice(start).find(isPseudoElement);
  if (pseudo) {
    selector.insertBefore(pseudo, guard);
  } else {
    selector.append(guard);
  }
}

const transform = parser((selectors) => selectors.each(skipPostboxes));

module.exports = () => ({
  postcssPlugin: "eventkoi-skip-postboxes",
  OnceExit(root) {
    root.walkRules((rule) => {
      const parent = rule.parent;
      if (parent.type === "atrule" && /keyframes$/.test(parent.name)) return;
      rule.selector = transform.processSync(rule.selector);
    });
  },
});
module.exports.postcss = true;
