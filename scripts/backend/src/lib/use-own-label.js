import { useCallback, useEffect, useRef } from "react";

let counter = 0;

/**
 * Points a switch, radio or checkbox at the label already tied to it, so its
 * name can be read from the control itself.
 */
export function useOwnLabel(forwardedRef) {
  const localRef = useRef(null);

  const setRef = useCallback(
    (node) => {
      localRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef]
  );

  useEffect(() => {
    const el = localRef.current;
    if (!el || el.getAttribute("aria-label")) {
      return;
    }
    if (el.getAttribute("aria-labelledby") && !el.dataset.ekOwnLabel) {
      return;
    }

    const label =
      (el.id &&
        document.querySelector(`label[for="${window.CSS.escape(el.id)}"]`)) ||
      el.closest("label");

    if (!label) {
      return;
    }

    if (!label.id) {
      counter += 1;
      label.id = `${el.id || `ek-control-${counter}`}-label`;
    }

    if (el.getAttribute("aria-labelledby") !== label.id) {
      el.setAttribute("aria-labelledby", label.id);
      el.dataset.ekOwnLabel = "1";
    }
  });

  return setRef;
}
