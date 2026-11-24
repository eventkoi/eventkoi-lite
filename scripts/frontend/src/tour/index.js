import { __ } from "@wordpress/i18n";

// Plugin tour steps 7 and 11 happen on the site: the event page and the
// calendar page the tour opened. They show a Continue Tour button and the
// Need more help box. Inline styles, so a theme cannot restyle them.

const HELP_HIDDEN_KEY = "eventkoi_tour_help_hidden";
const FONT =
  'inter, -apple-system, blinkmacsystemfont, "Segoe UI", roboto, oxygen-sans, ubuntu, cantarell, "Helvetica Neue", sans-serif';

const LOGO_PATHS = [
  [
    "M6.19-72.725A3.818,3.818,0,0,0,4.837-75.38a3.359,3.359,0,0,0-2.484-.876A1.885,1.885,0,0,0,.611-74.9a1.612,1.612,0,0,0-.092,1.06,6.23,6.23,0,0,0,.518,1.178,8.55,8.55,0,0,1,.4.832,4.387,4.387,0,0,1,.224.775,7.582,7.582,0,0,0,.984,2.5,4.542,4.542,0,0,0,1.52,1.613,1.022,1.022,0,0,0,1.363-.107q.563-.391.693-2.332A18.33,18.33,0,0,0,6.19-72.725Zm-.09,7.2q-1.034,0-1.242,2.7a18.162,18.162,0,0,0,.413,5.442q.622,2.739,1.677,2.878,2.3.313,2.729-2.422a10.636,10.636,0,0,0-.736-5.668Q7.773-65.521,6.1-65.521Zm2.05-1.52a.88.88,0,0,0,.941.487,2.49,2.49,0,0,0,1.12-.657q.583-.539,1.389-1.4.481-.627.9-1.091a5.462,5.462,0,0,1,.805-.754,4.378,4.378,0,0,0,2.051-2.931,2.483,2.483,0,0,0-.917-2.533,2.674,2.674,0,0,0-2.914-.028A5.715,5.715,0,0,0,9.343-73.55,12.509,12.509,0,0,0,7.9-69.78,3.422,3.422,0,0,0,8.149-67.041Z",
    "translate(-0.467 76.356)",
    "translate(0 13.696)",
  ],
  [
    "M34.564-32.511a2.816,2.816,0,0,0-.269,1.24,1.461,1.461,0,0,0,.269.913c.535.852.818,1.139,1.1,1.59a15.006,15.006,0,0,0,3.8,4.125q2.223,1.635,3.58.774a1.555,1.555,0,0,0,.865-1.448,3.235,3.235,0,0,0-.619-1.622A17.131,17.131,0,0,0,41.85-28.67l-.332-.386a20.805,20.805,0,0,0-2.5-2.265,10.6,10.6,0,0,0-2.8-1.656Q34.936-33.447,34.564-32.511Z",
    "translate(-34.295 33.134)",
    "translate(7.301 20.061)",
  ],
];

const SVG_NS = "http://www.w3.org/2000/svg";

function el(tag, styles = {}, attrs = {}) {
  const node = document.createElement(tag);
  // Set as important so the theme's own link and text rules cannot change them.
  Object.entries(styles).forEach(([key, value]) => {
    node.style.setProperty(
      key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()),
      value,
      "important"
    );
  });
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function lucide(paths, size = 16, color = "#2b2b2b") {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", color);
  svg.setAttribute("stroke-width", "1.5");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.style.flex = "none";
  paths.forEach((d) => {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  });
  return svg;
}

function logo() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "18");
  svg.setAttribute("viewBox", "0 0 16.918 21.89");
  svg.setAttribute("aria-hidden", "true");
  svg.style.flex = "none";
  const outer = document.createElementNS(SVG_NS, "g");
  outer.setAttribute("transform", "translate(0 -13.696)");
  LOGO_PATHS.forEach(([d, pathTransform, groupTransform]) => {
    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("transform", groupTransform);
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    path.setAttribute("transform", pathTransform);
    path.setAttribute("fill", "#fb4409");
    group.appendChild(path);
    outer.appendChild(group);
  });
  svg.appendChild(outer);
  return svg;
}

const ICONS = {
  arrowLeft: ["m12 19-7-7 7-7", "M19 12H5"],
  bookOpen: [
    "M12 7v14",
    "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
  ],
  inbox: [
    "M22 12h-6l-2 3h-4l-2-3H2",
    "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
  ],
  x: ["M18 6 6 18", "m6 6 12 12"],
};

function helpHidden() {
  try {
    return window.localStorage.getItem(HELP_HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

function hideHelpBox(box) {
  try {
    window.localStorage.setItem(HELP_HIDDEN_KEY, "1");
  } catch {
    // Storage blocked: the box just hides for this page.
  }
  box.remove();
}

function helpLink(href, icon, label) {
  const link = el(
    "a",
    {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      margin: "0 16px",
      padding: "12px 6px",
      color: "#161616",
      fontFamily: FONT,
      fontSize: "15px",
      fontWeight: "400",
      fontStyle: "normal",
      letterSpacing: "normal",
      textTransform: "none",
      lineHeight: "20px",
      textDecoration: "none",
      boxShadow: "none",
      border: "0",
      background: "transparent",
    },
    { href, target: "_blank", rel: "noopener noreferrer" }
  );
  link.appendChild(lucide(icon));
  link.appendChild(document.createTextNode(label));
  link.addEventListener("mouseenter", () => {
    link.style.setProperty("text-decoration", "underline", "important");
  });
  link.addEventListener("mouseleave", () => {
    link.style.setProperty("text-decoration", "none", "important");
  });
  return link;
}

function buildHelpBox(tour) {
  const box = el(
    "aside",
    {
      width: "240px",
      padding: "0 0 8px",
      background: "#f7f7f7",
      border: "1px solid #aaaaaa",
      borderRadius: "6px",
      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.16)",
      boxSizing: "border-box",
    },
    { "aria-label": __("Need more help?", "eventkoi-lite") }
  );

  const head = el("div", {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: "0 16px 8px",
    padding: "18px 28px 14px 6px",
    borderBottom: "1px solid #dcdcdc",
  });
  head.appendChild(logo());
  const title = el("span", {
    fontFamily: FONT,
    fontSize: "15px",
    fontWeight: "600",
    fontStyle: "normal",
    letterSpacing: "normal",
    textTransform: "none",
    lineHeight: "20px",
    color: "#161616",
  });
  title.textContent = __("Need more help?", "eventkoi-lite");
  head.appendChild(title);

  const close = el(
    "button",
    {
      position: "absolute",
      top: "14px",
      right: "-6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "24px",
      height: "24px",
      margin: "0",
      padding: "0",
      background: "transparent",
      border: "0",
      borderRadius: "4px",
      boxShadow: "none",
      cursor: "pointer",
      minHeight: "0",
    },
    { type: "button", "aria-label": __("Close help", "eventkoi-lite") }
  );
  close.appendChild(lucide(ICONS.x, 15));
  close.addEventListener("click", () => hideHelpBox(box));
  head.appendChild(close);
  box.appendChild(head);

  box.appendChild(
    helpLink(tour.guideUrl, ICONS.bookOpen, __("Read setup guide", "eventkoi-lite"))
  );
  box.appendChild(
    helpLink(tour.supportUrl, ICONS.inbox, __("Contact support", "eventkoi-lite"))
  );

  return box;
}

function buildContinueButton(tour) {
  const button = el(
    "a",
    {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
      width: "240px",
      height: "44px",
      margin: "0",
      padding: "0 16px",
      background: "#161616",
      border: "0",
      borderRadius: "4px",
      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.16)",
      boxSizing: "border-box",
      color: "#ffffff",
      fontFamily: FONT,
      fontSize: "15px",
      fontWeight: "500",
      fontStyle: "normal",
      letterSpacing: "normal",
      textTransform: "none",
      lineHeight: "44px",
      textDecoration: "none",
    },
    { href: tour.continueUrl }
  );
  button.appendChild(lucide(ICONS.arrowLeft, 16, "#ffffff"));
  button.appendChild(document.createTextNode(__("Continue Tour", "eventkoi-lite")));
  button.addEventListener("mouseenter", () => {
    button.style.setProperty("background", "#000000", "important");
  });
  button.addEventListener("mouseleave", () => {
    button.style.setProperty("background", "#161616", "important");
  });
  return button;
}

function mount() {
  const tour = window.eventkoiTourFront;
  if (!tour || !tour.continueUrl || document.getElementById("eventkoi-tour-front")) {
    return;
  }

  const wrap = el(
    "div",
    {
      position: "fixed",
      right: "24px",
      bottom: "24px",
      zIndex: "99999",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: "12px",
      fontFamily: FONT,
      textAlign: "left",
    },
    { id: "eventkoi-tour-front" }
  );

  wrap.appendChild(buildContinueButton(tour));
  if (!helpHidden()) {
    wrap.appendChild(buildHelpBox(tour));
  }

  document.body.appendChild(wrap);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
