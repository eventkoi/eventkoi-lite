import { EventHeader } from "@/components/event/event-header";
import { EventTabs } from "@/components/event/event-tabs";
import { LogoIcon } from "@/components/logo-icon";
import { Button } from "@/components/ui/button";
import { Wrapper } from "@/components/wrapper";
import { EventEditContext } from "@/hooks/EventEditContext";
import { InstanceEditContext } from "@/hooks/InstanceEditContext";
import { useEventEdit } from "@/hooks/useEventEdit";
import { cn } from "@/lib/utils";
import apiRequest from "@wordpress/api-fetch";
import { __, sprintf } from "@wordpress/i18n";
import {
  ChevronLeft,
  CircleCheck,
  CircleDotDashed,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

export function buildInstanceData(event, timestamp, useOverride = true) {
  const override = useOverride
    ? event?.recurrence_overrides?.[timestamp] || {}
    : {};

  const keys = [
    "title",
    "description",
    "summary",
    "image",
    "image_id",
    "template",
    "locations",
  ];

  const result = {};

  for (const key of keys) {
    if (useOverride && override[key] !== undefined) {
      result[key] = override[key];
    } else if (event && Object.prototype.hasOwnProperty.call(event, key)) {
      result[key] = event[key];
    } else {
      result[key] = null;
    }
  }

  return result;
}

export function EventEdit() {
  const {
    loading,
    setLoading,
    event,
    setEvent,
    settings,
    notFound,
    restoreEvent,
  } = useEventEdit();

  const [isPublishing, setIsPublishing] = useState(false);
  const [disableAutoSave, setDisableAutoSave] = useState(false);
  const [instanceData, setInstanceData] = useState({});
  const [showOnboardingToast, setShowOnboardingToast] = useState(false);
  const [showOnboardingHint, setShowOnboardingHint] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [hintPosition, setHintPosition] = useState(null);
  const [hintBaseTop, setHintBaseTop] = useState(null);
  const hintMeasureRaf = useRef(null);
  const previewMeasureRaf = useRef(null);

  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { id, timestamp } = useParams();
  const isEditingInstance = location.pathname.includes("/instances/edit/");

  const onboardingHintParam = useMemo(() => {
    const params = new URLSearchParams(searchParams);
    const parsed = parseInt(params.get("hint"), 10);
    if (!Number.isFinite(parsed)) return null;
    return Math.min(Math.max(parsed, 1), 4);
  }, [searchParams]);

  // Safely compute default instance data (without override)
  const originalInstanceData = useMemo(() => {
    if (!isEditingInstance || !event || !timestamp) return null;
    return buildInstanceData(event, timestamp, false);
  }, [isEditingInstance, event, timestamp]);

  const resetInstanceData = async () => {
    if (!event?.id || !timestamp) return;

    try {
      await apiRequest({
        path: `${eventkoi_params.api}/reset_instance`,
        method: "POST",
        headers: {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
        },
        data: {
          event_id: event.id,
          timestamp,
        },
      });

      const newInstance = buildInstanceData(event, timestamp, false);
      setInstanceData(newInstance);
    } catch (error) {
      console.error("Failed to reset instance:", error);
    }
  };

  useEffect(() => {
    // only when creating new event
    if (!event?.id && window.location.hash.includes("/events/add/")) {
      (async () => {
        try {
          const draft = await apiRequest({
            path: `${eventkoi_params.api}/update_event`,
            method: "POST",
            data: {
              event: {
                title: "",
                excerpt: "(auto-draft)",
                wp_status: "draft",
              },
            },
            headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
          });

          if (draft?.id) {
            setEvent(draft);
            window.location.hash = window.location.hash.replace(
              "/events/add/",
              `/events/${draft.id}/`
            );
          }
        } catch (err) {
          console.error("❌ Failed to create auto-draft", err);
        }
      })();
    }
  }, []);

  useEffect(() => {
    if (isEditingInstance && event?.id && timestamp) {
      const instanceWithOverride = buildInstanceData(event, timestamp, true);
      setInstanceData(instanceWithOverride);
    }
  }, [isEditingInstance, event, timestamp]);

  const clearOnboardingParams = () => {
    const params = new URLSearchParams(location.search);
    params.delete("onboarding");
    params.delete("demo_event_id");
    params.delete("hint");
    navigate(
      { search: params.toString() ? `?${params.toString()}` : "" },
      { replace: true }
    );
  };

  const demoEventIdFromSearch = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const parsed = parseInt(params.get("demo_event_id"), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [location.search]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (showOnboardingHint && onboardingStep === 4) {
      window.localStorage.setItem("eventkoi_onboarding_demo_complete", "1");
    }
  }, [showOnboardingHint, onboardingStep]);

  const updateHintParam = (step, replace = false) => {
    const params = new URLSearchParams(searchParams);
    params.set("hint", String(step));
    navigate(
      { search: params.toString() ? `?${params.toString()}` : "" },
      { replace }
    );
  };

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (params.get("onboarding") === "demo-event") {
      setShowOnboardingToast(true);
      setShowOnboardingHint(true);
      const targetStep = onboardingHintParam || 1;
      setOnboardingStep(targetStep);
      try {
        window.localStorage.setItem("eventkoi_onboarding_active", "1");
      } catch {
        // Ignore localStorage issues.
      }
    }
  }, [location.search, onboardingHintParam, searchParams]);

  useEffect(() => {
    if (onboardingHintParam || searchParams.get("onboarding") !== "demo-event")
      return;
    const params = new URLSearchParams(searchParams);
    params.set("hint", "1");
    updateHintParam(1, true);
  }, [onboardingHintParam, searchParams, navigate]);

  useEffect(() => {
    const handler = () => {
      if (showOnboardingHint && onboardingStep === 2) {
        setOnboardingStep(3);
        updateHintParam(3);
      }
    };
    window.addEventListener("eventkoi:onboardingPublish", handler);
    return () =>
      window.removeEventListener("eventkoi:onboardingPublish", handler);
  }, [showOnboardingHint, onboardingStep]);

  useEffect(() => {
    if (!showOnboardingHint) return;
    window.dispatchEvent(
      new CustomEvent("eventkoi:onboardingStep", {
        detail: { step: onboardingStep },
      })
    );
  }, [showOnboardingHint, onboardingStep]);

  useEffect(() => {
    if (!showOnboardingHint || onboardingStep !== 4) {
      setHintPosition(null);
      const prev = document.querySelector(
        '#adminmenu a[href*="admin.php?page=eventkoi#/calendars"]'
      );
      if (prev) {
        prev.classList.remove("eventkoi-onboarding-highlight");
        prev.style.boxShadow = "";
        prev.style.borderRadius = "";
        prev.style.backgroundColor = "";
        prev.style.fontWeight = "";
      }
      return;
    }

    const updatePos = () => {
      const target =
        document.querySelector(
          '#adminmenu a[href*="admin.php?page=eventkoi#/calendars"]'
        ) || document.querySelector('#adminmenu a[href*="page=eventkoi"]');

      if (!target) {
        setHintPosition(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      setHintPosition({
        top: rect.top + rect.height / 2 - 33,
        left: rect.right + 12,
      });

      const href = target.getAttribute("href") || "";
      const [base] = href.split("#");
      const params = new URLSearchParams();
      params.set("onboarding", "demo-event");
      if (demoEventIdFromSearch || event?.id) {
        params.set("demo_event_id", demoEventIdFromSearch || event.id);
      }
      target.setAttribute("href", `${base}#/calendars?${params.toString()}`);

      target.classList.add("eventkoi-onboarding-highlight");
    };

    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [showOnboardingHint, onboardingStep]);

  useEffect(() => {
    if (!showOnboardingHint || onboardingStep !== 3) {
      if (onboardingStep !== 4) {
        setHintPosition(null);
      }
      return;
    }

    const updatePos = () => {
      const baseTop = hintBaseTop ?? 112;
      const target = document.querySelector(
        "[data-eventkoi-onboarding-preview]"
      );
      if (!target) {
        setHintPosition(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      const targetRight = Math.max(
        window.innerWidth - (rect.left + rect.width / 2) - 66,
        0
      );
      setHintPosition({
        right: targetRight,
        top: baseTop,
      });
    };

    const measure = (attempt = 0) => {
      updatePos();
      if (attempt < 10) {
        previewMeasureRaf.current = requestAnimationFrame(() =>
          measure(attempt + 1)
        );
      }
    };

    measure();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      if (previewMeasureRaf.current) {
        cancelAnimationFrame(previewMeasureRaf.current);
        previewMeasureRaf.current = null;
      }
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [showOnboardingHint, onboardingStep, hintBaseTop]);

  const updateHintBaseTop = useCallback(() => {
    const mainEl =
      document.querySelector("#eventkoi-app-root main") ||
      document.querySelector(".eventkoi-admin main") ||
      document.querySelector("main");

    if (!mainEl) return;
    const rect = mainEl.getBoundingClientRect();
    setHintBaseTop(Math.max(rect.top, 0));
  }, []);

  useEffect(() => {
    if (!showOnboardingHint || onboardingStep === 4) return;

    let attempts = 0;
    const measure = () => {
      updateHintBaseTop();
      attempts += 1;
      if (attempts < 10) {
        hintMeasureRaf.current = requestAnimationFrame(measure);
      }
    };

    measure();
    const handler = () => updateHintBaseTop();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      if (hintMeasureRaf.current) {
        cancelAnimationFrame(hintMeasureRaf.current);
        hintMeasureRaf.current = null;
      }
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [showOnboardingHint, onboardingStep, updateHintBaseTop]);

  const onboardingSteps = useMemo(
    () => [
      {
        key: "event",
        title: __("Publish demo event", "eventkoi-lite"),
      },
      {
        key: "view",
        title: __("View default calendar", "eventkoi-lite"),
      },
    ],
    []
  );

  const renderSidebarSteps = () => (
    <div className="space-y-1">
      <div className="h-[1px] w-full bg-border" />
      <div className="h-1" />
      {onboardingSteps.map((step) => {
        const isComplete = step.key === "event" && onboardingStep >= 4;
        const isActive = step.key === (onboardingStep >= 4 ? "view" : "event");

        return (
          <button
            key={step.key}
            type="button"
            className={cn(
              "w-full h-9 rounded-lg cursor-default border px-3 py-3 text-left transition bg-white text-[#161616] text-[14px] font-medium",
              "border-none flex items-center focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
              isActive && "bg-[#e6e6e6]",
              isComplete && "line-through text-[#137C63]"
            )}
          >
            <div className="flex items-center gap-2">
              {isComplete ? (
                <CircleCheck className="h-4 w-4 text-[#137C63]" />
              ) : (
                <CircleDotDashed className="h-4 w-4 text-[#161616]" />
              )}
              <span className="text-[14px] font-medium">{step.title}</span>
            </div>
          </button>
        );
      })}
      <div className="h-[1px] w-full bg-border" />
    </div>
  );

  // 🛑 Guard early render if event is not ready
  if (!event || (isEditingInstance && !originalInstanceData)) {
    return null;
  }

  if (event.wp_status === "trash") {
    return (
      <div className="flex-1 flex items-center justify-center text-sm flex-col gap-4 relative w-full">
        <div className="absolute top-4 left-4">
          <Button variant="link" asChild>
            <Link to="/events">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
        <TriangleAlert
          className="w-10 h-10 text-muted-foreground"
          strokeWidth={1}
        />
        <div className="text-base text-muted-foreground">
          Event has moved to Trash. Restore it before you can edit.
        </div>
        <div className="pt-4">
          <Button onClick={restoreEvent}>Restore event</Button>
        </div>
      </div>
    );
  }

  const computedHintTop = hintBaseTop ?? 112;

  const layout = (
    <>
      <EventHeader />
      <Wrapper
        className={isEditingInstance ? "max-w-[800px]" : "max-w-[1180px]"}
      >
        <div
          className={cn(
            "w-full mx-auto items-start gap-6",
            isEditingInstance
              ? "grid grid-cols-1"
              : "grid md:grid-cols-[180px_1fr] grid-cols-1"
          )}
        >
          {!isEditingInstance && <EventTabs />}
          <div className="grid">
            <Outlet
              context={{
                instanceData,
                setInstanceData,
              }}
            />
          </div>
        </div>
        <div className="h-10" />
      </Wrapper>
    </>
  );

  const onboardingToast = (
    <div className="fixed bottom-8 right-8 z-50 w-[250px] rounded-lg border border-border bg-white shadow-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <LogoIcon width="18" height="23" />
        <div className="text-[14px] font-semibold text-black">
          <span className="block">
            {__("EventKoi Plugin Tour", "eventkoi-lite")}
          </span>
        </div>
        <button
          type="button"
          className="ml-auto text-[#555] hover:text-black transition-colors text-2xl leading-none -mt-1"
          onClick={() => {
            setShowOnboardingToast(false);
            clearOnboardingParams();
            try {
              window.localStorage.removeItem("eventkoi_onboarding_active");
            } catch {
              // ignore
            }
          }}
          aria-label={__("Close", "eventkoi-lite")}
        >
          ×
        </button>
      </div>
      {renderSidebarSteps()}
      <div className="text-[12px] text-[#555]">
        {__(
          "You can restart this Tour any time in the EventKoi Dashboard.",
          "eventkoi-lite"
        )}
      </div>
    </div>
  );

  const onboardingHint = showOnboardingHint ? (
    <div className="pointer-events-none fixed inset-0 z-[100001]">
      <div
        className={cn(
          "pointer-events-auto max-w-xs bg-[#161616] border border-border shadow-lg rounded-lg p-4 flex flex-col gap-2",
          onboardingStep === 4
            ? "absolute"
            : onboardingStep === 3
            ? "fixed"
            : "fixed right-8"
        )}
        style={
          onboardingStep === 4 && hintPosition
            ? { top: hintPosition.top, left: hintPosition.left }
            : onboardingStep === 3
            ? {
                top: computedHintTop,
                right: hintPosition?.right ?? "8rem",
              }
            : { top: computedHintTop }
        }
      >
        {onboardingStep === 4 ? (
          <div className="absolute top-6 -left-2 w-0 h-0 border-y-[10px] border-y-transparent border-r-[10px] border-r-[#161616]" />
        ) : onboardingStep === 3 ? (
          <div className="absolute -top-2 right-10 w-0 h-0 border-x-[10px] border-x-transparent border-b-[10px] border-b-[#161616]" />
        ) : onboardingStep >= 2 ? (
          <div className="absolute -top-2 right-16 w-0 h-0 border-x-[10px] border-x-transparent border-b-[10px] border-b-[#161616]" />
        ) : null}
        <button
          type="button"
          className="absolute top-2 right-2 text-[#FBFBFB] hover:text-white transition-colors text-2xl leading-none"
          onClick={() => {
            setShowOnboardingHint(false);
            clearOnboardingParams();
          }}
          aria-label={__("Close", "eventkoi-lite")}
        >
          ×
        </button>
        <div className="text-[16px] font-semibold text-[#FBFBFB] flex flex-col pr-6">
          {(onboardingStep === 2 ||
            onboardingStep === 3 ||
            onboardingStep === 4) && (
            <span className="mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M10.5 3.07495L9 4.49995"
                  stroke="white"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3.82502 5.9999L1.65002 5.3999"
                  stroke="white"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4.50001 9L3.07501 10.5"
                  stroke="white"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5.40002 1.6499L6.00002 3.8249"
                  stroke="white"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6.77774 7.26749C6.74866 7.19898 6.74071 7.12334 6.75491 7.05028C6.76911 6.97722 6.80481 6.91007 6.85744 6.85744C6.91007 6.80481 6.97722 6.76911 7.05028 6.75491C7.12334 6.74071 7.19898 6.74866 7.26749 6.77774L15.5175 10.1527C15.5909 10.1829 15.6529 10.2355 15.6945 10.3031C15.7361 10.3707 15.7552 10.4497 15.749 10.5288C15.7429 10.608 15.7117 10.6831 15.6602 10.7434C15.6086 10.8037 15.5392 10.8461 15.462 10.8645L12.2002 11.6452C12.0656 11.6774 11.9425 11.7462 11.8445 11.844C11.7466 11.9419 11.6776 12.0649 11.6452 12.1995L10.8652 15.462C10.8471 15.5395 10.8047 15.6091 10.7443 15.6609C10.6839 15.7128 10.6086 15.744 10.5293 15.7502C10.4499 15.7564 10.3707 15.7372 10.303 15.6953C10.2353 15.6535 10.1827 15.5912 10.1527 15.5175L6.77774 7.26749Z"
                  stroke="white"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          )}
          <span>
            {onboardingStep === 1
              ? __("Welcome to your Events settings", "eventkoi-lite")
              : onboardingStep === 2
              ? __('Take action: Click on "Publish"', "eventkoi-lite")
              : onboardingStep === 3
              ? __('Take action: Click on "Preview" or "Save"', "eventkoi-lite")
              : __('Take action: Click on "Calendars"', "eventkoi-lite")}
          </span>
        </div>
        <p className="text-sm text-[#FBFBFB]">
          {onboardingStep === 1
            ? __(
                "This particular event is a demo, so we’ve pre-filled everything for you. Feel free to play around.",
                "eventkoi-lite"
              )
            : onboardingStep === 2
            ? __(
                "Once you have finished editing your event, you can publish it.",
                "eventkoi-lite"
              )
            : onboardingStep === 3
            ? __(
                "View the event you have created or make additional changes and save them.",
                "eventkoi-lite"
              )
            : __("We’re headed to your Calendars next.", "eventkoi-lite")}
        </p>
        <div className="flex items-center justify-between mt-2 gap-2">
          {onboardingStep !== 4 ? (
            <span className="text-[14px] text-[#FBFBFB]">
              {sprintf(__("%1$s of %2$s", "eventkoi-lite"), onboardingStep, 3)}
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {(onboardingStep === 1 ||
              onboardingStep === 2 ||
              onboardingStep === 3 ||
              onboardingStep === 4) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-[26px] font-medium text-[#FBFBFB] hover:underline hover:bg-transparent hover:text-[#FBFBFB]"
                onClick={() => {
                  if (onboardingStep === 1) {
                    const params = new URLSearchParams();
                    params.set("onboarding", "demo-event");
                    const targetDemoId =
                      demoEventIdFromSearch ||
                      event?.id ||
                      window?.eventkoi_params?.demo_event_id;
                    if (targetDemoId) {
                      params.set("demo_event_id", targetDemoId);
                    }
                    params.set("hint", "1");
                    navigate(`/events?${params.toString()}`, {
                      replace: false,
                    });
                    return;
                  }

                  const params = new URLSearchParams(searchParams);
                  const previous =
                    onboardingStep === 4 ? 3 : onboardingStep - 1;
                  params.set("hint", String(previous));
                  navigate(
                    {
                      search: params.toString() ? `?${params.toString()}` : "",
                    },
                    { replace: false }
                  );
                  setOnboardingStep(previous);
                }}
              >
                {__("Back", "eventkoi-lite")}
              </Button>
            )}
            {onboardingStep === 1 ? (
              <Button
                size="sm"
                variant="outline"
                className="h-[26px] font-medium"
                onClick={() => {
                  setOnboardingStep(2);
                  updateHintParam(2);
                }}
              >
                {__("Next", "eventkoi-lite")}
              </Button>
            ) : onboardingStep === 2 ? (
              <Button
                size="sm"
                variant="outline"
                className="h-[26px] font-medium"
                onClick={() => {
                  setOnboardingStep(3);
                  updateHintParam(3);
                }}
              >
                {__("Next", "eventkoi-lite")}
              </Button>
            ) : onboardingStep === 3 ? (
              <Button
                size="sm"
                variant="outline"
                className="h-[26px] font-medium"
                onClick={() => {
                  setOnboardingStep(4);
                  updateHintParam(4);
                }}
              >
                {__("Next", "eventkoi-lite")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <EventEditContext.Provider
      value={{
        event,
        setEvent,
        loading,
        setLoading,
        settings,
        restoreEvent,
        isPublishing,
        setIsPublishing,
        disableAutoSave,
        setDisableAutoSave,
      }}
    >
      {isEditingInstance ? (
        <InstanceEditContext.Provider
          value={{
            data: instanceData,
            setData: setInstanceData,
            originalData: originalInstanceData,
            setOriginalData: () => {},
            resetData: resetInstanceData,
            eventId: event.id,
            timestamp,
            setEvent,
          }}
        >
          {layout}
        </InstanceEditContext.Provider>
      ) : (
        layout
      )}

      {showOnboardingToast && onboardingToast}
      {onboardingHint}
    </EventEditContext.Provider>
  );
}
