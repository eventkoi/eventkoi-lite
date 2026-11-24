import { createRoot } from "react-dom/client";

import "@/tour/tour.css";
import { Tour } from "@/tour/tour";

// Some themes and builders load their own Inter in wp-admin without a regular
// weight (Divi ships only 500 to 700). Regular text then renders as medium, so
// the tour falls back to the system font on those sites.
function siteInterLacksRegular() {
  try {
    const faces = [...document.fonts].filter((face) =>
      /^["']?inter["']?$/i.test(face.family)
    );
    if (!faces.length) return false;

    const toNumber = (value) =>
      value === "normal" ? 400 : value === "bold" ? 700 : parseInt(value, 10);

    return !faces.some((face) => {
      const range = String(face.weight).trim().split(/\s+/).map(toNumber);
      return range.length > 1
        ? range[0] <= 400 && range[1] >= 400
        : range[0] === 400;
    });
  } catch (error) {
    return false;
  }
}

function applyFont(el) {
  el.classList.toggle("ek-tour-system-font", siteInterLacksRegular());
}

function mount() {
  const ctx = window.eventkoiTour;

  if (!ctx || !ctx.canManage || !ctx.rest) return;
  if (document.getElementById("eventkoi-tour-root")) return;

  const el = document.createElement("div");
  el.id = "eventkoi-tour-root";
  document.body.appendChild(el);

  applyFont(el);
  window.addEventListener("load", () => applyFont(el));

  createRoot(el).render(<Tour />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
