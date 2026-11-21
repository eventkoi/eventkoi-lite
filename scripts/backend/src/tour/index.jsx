import { createRoot } from "react-dom/client";

import "@/tour/tour.css";
import { Tour } from "@/tour/tour";

function mount() {
  const ctx = window.eventkoiTour;

  if (!ctx || !ctx.canManage || !ctx.rest) return;
  if (document.getElementById("eventkoi-tour-root")) return;

  const el = document.createElement("div");
  el.id = "eventkoi-tour-root";
  document.body.appendChild(el);

  createRoot(el).render(<Tour />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
