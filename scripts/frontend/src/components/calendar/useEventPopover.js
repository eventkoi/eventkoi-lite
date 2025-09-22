"use client";

import { useEffect, useRef, useState } from "react";

export function useEventPopover() {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [anchorPos, setAnchorPos] = useState(null);
  const ignoreNextOutsideClick = useRef(false);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (ignoreNextOutsideClick.current) {
        ignoreNextOutsideClick.current = false;
        return;
      }

      const clickedInsidePopover = e.target.closest("[data-event-popover]");
      const clickedInsideDropdown = e.target.closest(
        "[data-radix-popper-content-wrapper]"
      );

      const dropdownIsOpen =
        document.body.getAttribute("data-calendar-menu-open") === "true";
      const shareModalIsOpen =
        document.body.getAttribute("data-share-modal-open") === "true";

      if (
        !clickedInsidePopover &&
        !clickedInsideDropdown &&
        !dropdownIsOpen &&
        !shareModalIsOpen
      ) {
        setSelectedEvent(null);
        setAnchorPos(null);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return {
    selectedEvent,
    setSelectedEvent,
    anchorPos,
    setAnchorPos,
    ignoreNextOutsideClick,
  };
}
