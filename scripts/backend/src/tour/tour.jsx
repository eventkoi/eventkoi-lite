import { useCallback, useEffect, useRef, useState } from "react";

import {
  FinalModal,
  HelpBox,
  Popover,
  ResumeButton,
  WelcomePopover,
} from "@/tour/components";
import {
  isCalendarsList,
  isDemoEditor,
  isSettingsDefault,
  readLocation,
  stepRoute,
  STEPS,
} from "@/tour/steps";
import {
  beginTour,
  endTour,
  finishTour,
  getTourState,
  goToStep,
  subscribeTour,
  tourContext,
} from "@/tour/store";

const GAP = 14; // Space between the anchor and the arrow tip.
const MARGIN = 12; // Space kept from the edges of the screen.
const MOBILE = 783; // WordPress collapses the admin menu below this width.

function viewport() {
  return {
    width: document.documentElement.clientWidth || window.innerWidth,
    height: window.innerHeight,
    top:
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--wp-admin--admin-bar--height"
        ),
        10
      ) || 32,
  };
}

function isShown(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function findAnchor(selector) {
  if (!selector) return null;
  const matches = document.querySelectorAll(selector);
  for (const el of matches) {
    if (isShown(el)) return el;
  }
  return null;
}

/**
 * Work out where a popover goes.
 *
 * @param {HTMLElement|null} anchor    Element it points at.
 * @param {string}           placement right, below or corner.
 * @param {number}           width     Popover width.
 * @param {number}           height    Popover height.
 * @return {{ top: number, left: number, arrow: string|null, arrowOffset: number }}
 */
function place(anchor, placement, width, height) {
  const vp = viewport();
  const clampLeft = (left) =>
    Math.max(MARGIN, Math.min(left, vp.width - width - MARGIN));
  const clampTop = (top) =>
    Math.max(vp.top + MARGIN, Math.min(top, vp.height - height - MARGIN));

  const corner = (below) => ({
    top: clampTop((below ?? vp.top + 72) + 24),
    left: clampLeft(vp.width - width - 24),
    arrow: null,
    arrowOffset: 0,
  });

  if (!anchor) {
    return corner();
  }

  const rect = anchor.getBoundingClientRect();
  const centerY = rect.top + rect.height / 2;

  // Small screens: under the anchor, full width, arrow pointing up at it.
  if (vp.width < MOBILE && placement !== "corner") {
    const centerX = rect.left + rect.width / 2;
    const left = MARGIN;
    return {
      top: rect.bottom + GAP,
      left,
      arrow: "top",
      arrowOffset: Math.max(18, Math.min(centerX - left, width - 18)),
    };
  }

  // Keep the popover on screen only while its anchor is; once the anchor
  // scrolls away the popover goes with it, so it never points at nothing.
  const anchorOnScreen = centerY >= vp.top && centerY <= vp.height;
  const fitTop = (top) => (anchorOnScreen ? clampTop(top) : top);

  if (placement === "corner") {
    return corner(rect.bottom);
  }

  if (placement === "below") {
    const centerX = rect.left + rect.width / 2;
    const left = clampLeft(centerX - (width - 40));
    return {
      top: fitTop(rect.bottom + GAP),
      left,
      arrow: "top",
      arrowOffset: Math.max(18, Math.min(centerX - left, width - 18)),
    };
  }

  // Right of the anchor, arrow pointing at its middle.
  const top = fitTop(centerY - 30);
  return {
    top,
    left: Math.min(rect.right + GAP, vp.width - width - MARGIN),
    arrow: "left",
    arrowOffset: Math.max(18, Math.min(centerY - top, height - 18)),
  };
}

function needsScroll(el) {
  const rect = el.getBoundingClientRect();
  const vp = viewport();

  if (rect.bottom < vp.top + 40 || rect.top > vp.height - 40) {
    return true;
  }

  // Small screens put the popover under its anchor: keep room for it.
  return vp.width < MOBILE && rect.bottom > vp.height * 0.5;
}

function samePosition(a, b) {
  return (
    !!a &&
    !!b &&
    Math.round(a.top) === Math.round(b.top) &&
    Math.round(a.left) === Math.round(b.left) &&
    a.arrow === b.arrow &&
    Math.round(a.arrowOffset) === Math.round(b.arrowOffset)
  );
}

/**
 * Keep a popover next to its anchor while the page scrolls, resizes and
 * renders, and outline the anchor on steps that ask for a click.
 */
function usePlacement(selector, placement, highlight, popRef) {
  const [position, setPosition] = useState(null);

  useEffect(() => {
    let frame = 0;
    let outlined = null;
    let scrolled = false;

    const tick = () => {
      const anchor = findAnchor(selector);

      // Bring the anchor into view once when the step opens, and again
      // after the window is resized.
      if (anchor && !scrolled) {
        scrolled = true;
        if (needsScroll(anchor)) {
          anchor.scrollIntoView({
            block: viewport().width < MOBILE ? "start" : "center",
            behavior: "smooth",
          });
        }
      }
      const pop = popRef.current;
      const next = place(
        anchor,
        placement,
        pop?.offsetWidth || 376,
        pop?.offsetHeight || 160
      );

      setPosition((prev) => (samePosition(prev, next) ? prev : next));

      if (highlight && anchor !== outlined) {
        outlined?.classList.remove("ek-tour-target");
        anchor?.classList.add("ek-tour-target");
        outlined = anchor;
      }

      frame = window.requestAnimationFrame(tick);
    };

    const onResize = () => {
      scrolled = false;
    };

    frame = window.requestAnimationFrame(tick);
    window.addEventListener("resize", onResize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      outlined?.classList.remove("ek-tour-target");
    };
  }, [selector, placement, highlight, popRef]);

  return position;
}

function useLocationWatch(screen) {
  const [loc, setLoc] = useState(() => readLocation(screen));

  useEffect(() => {
    let href = window.location.href;
    const update = () => {
      if (window.location.href === href) return;
      href = window.location.href;
      setLoc(readLocation(screen));
    };

    // The app uses a hash router, which does not fire hashchange on
    // navigation, so check the address as well as listening for changes.
    const timer = window.setInterval(update, 250);
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("hashchange", update);
      window.removeEventListener("popstate", update);
    };
  }, [screen]);

  return loc;
}

function removeTourParam() {
  const hash = (window.location.hash || "").replace(/^#/, "");
  const [path, query = ""] = hash.split("?");
  const params = new URLSearchParams(query);

  if (!params.has("eventkoi_tour")) return;

  params.delete("eventkoi_tour");
  const rest = params.toString();
  window.history.replaceState(
    window.history.state,
    "",
    `#${path}${rest ? `?${rest}` : ""}`
  );
  window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
}

function StepPopover({ step, def, demoId, onClose, onBack, onNext }) {
  const popRef = useRef(null);
  const selector = def.anchor ? def.anchor(demoId) : null;
  const position = usePlacement(selector, def.placement, !!def.highlight, popRef);

  return (
    <Popover
      ref={popRef}
      step={step}
      def={def}
      position={position}
      onClose={onClose}
      onBack={onBack}
      onNext={onNext}
    />
  );
}

function Welcome({ def, onClose }) {
  const popRef = useRef(null);
  const position = usePlacement(def.anchor(), def.placement, false, popRef);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(false);

  const begin = async () => {
    setStarting(true);
    setError(false);
    try {
      await beginTour();
    } catch {
      setStarting(false);
      setError(true);
    }
  };

  return (
    <WelcomePopover
      ref={popRef}
      def={def}
      position={position}
      onClose={onClose}
      onBegin={begin}
      starting={starting}
      error={error}
    />
  );
}

export function Tour() {
  const ctx = tourContext();
  const [tour, setTour] = useState(getTourState());
  const loc = useLocationWatch(ctx.screen);

  useEffect(() => subscribeTour(setTour), []);

  const demoId = tour.demoEventId;
  const step = tour.step;

  // The Continue Tour buttons on the event and calendar pages. They only
  // move an admin who is already on that step one step on.
  useEffect(() => {
    const param = loc.params.get("eventkoi_tour");
    if (!param) return;

    if (tour.active && param === "8" && step === 7) goToStep(8);
    if (tour.active && param === "12" && step === 11) goToStep(12);
    removeTourParam();
  }, [loc, tour.active, step]);

  // Steps that move on when the admin opens the page the tour pointed at.
  useEffect(() => {
    if (!tour.active) return;

    const now = readLocation(ctx.screen);

    if (step === 3 && isDemoEditor(now, demoId)) {
      goToStep(4);
    } else if (step === 8 && isCalendarsList(now)) {
      goToStep(9);
    } else if (step === 12 && isSettingsDefault(now)) {
      goToStep(13);
    }
  }, [loc, tour.active, step, demoId, ctx.screen]);

  // Back in the admin from the event or calendar page without Continue
  // Tour (browser Back, or a bookmark): carry on with the next step. Only
  // when the page is opened, never right after Preview or the link icon.
  useEffect(() => {
    const resume = () => {
      const current = getTourState();
      if (!current.active) return;

      const now = readLocation(ctx.screen);

      if (current.step === 7 && isDemoEditor(now, current.demoEventId)) {
        goToStep(8);
      } else if (current.step === 11 && isCalendarsList(now)) {
        goToStep(12);
      }
    };

    const onPageShow = (event) => {
      if (event.persisted) resume();
    };

    resume();
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [ctx.screen]);

  const goBack = useCallback(
    (target) => {
      const route = stepRoute(target, demoId);
      const targetDef = STEPS[target];
      const now = readLocation(ctx.screen);

      // Going back to a step on another page: open that page first, so the
      // step is not skipped again on arrival.
      if (route && targetDef && !targetDef.on(now, demoId)) {
        window.location.hash = `#${route}`;
      }

      goToStep(target);
    },
    [demoId, ctx.screen]
  );

  const goNext = useCallback((def) => {
    if (def.nextClicks) {
      document.querySelector(def.nextClicks)?.click();
      return;
    }
    if (def.next) goToStep(def.next);
  }, []);

  if (!tour.active) return null;

  const def = STEPS[step];

  // Mid-tour on another EventKoi page: offer to go back to the step.
  if (loc.app && step >= 2 && (!def || !def.on(loc, demoId))) {
    const resume = () => {
      // The event and calendar pages are left with Continue Tour, which
      // moves the tour on, so resume at the step after them.
      const target = step === 7 ? 8 : step === 11 ? 12 : step;
      const route = stepRoute(target, demoId);
      if (target !== step) goToStep(target);
      if (route) window.location.hash = `#${route}`;
    };

    return (
      <>
        <ResumeButton onClick={resume} raised={!tour.helpHidden} />
        {!tour.helpHidden && <HelpBox />}
      </>
    );
  }

  if (!def || !def.on(loc, demoId)) return null;

  if (def.variant === "final") {
    return <FinalModal onClose={endTour} onDone={finishTour} />;
  }

  return (
    <>
      {def.variant === "welcome" ? (
        <Welcome def={def} onClose={endTour} />
      ) : (
        <StepPopover
          key={step}
          step={step}
          def={def}
          demoId={demoId}
          onClose={endTour}
          onBack={() => goBack(def.back)}
          onNext={() => goNext(def)}
        />
      )}
      {!tour.helpHidden && <HelpBox />}
    </>
  );
}
