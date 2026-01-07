import apiRequest from "@wordpress/api-fetch";
import { __, sprintf } from "@wordpress/i18n";
import { DateTime } from "luxon";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { DashboardOverview } from "@/admin/dashboard/overview";
import { LogoIcon } from "@/components/logo-icon";
import { ConfirmTimezoneFormatStep } from "@/components/onboarding/confirm-timezone-format";
import { SetCalendarDefaultsStep } from "@/components/onboarding/set-calendar-defaults";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { getUtcISOString, normalizeTimeZone } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { ArrowRight, CircleCheck, CircleDotDashed, Loader2 } from "lucide-react";

export function DashboardOnboarding() {
  const [open, setOpen] = useState(true);
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const steps = useMemo(
    () => [
      {
        key: "calendar",
        title: __("Set calendar defaults", "eventkoi-lite"),
        component: SetCalendarDefaultsStep,
      },
      {
        key: "datetime",
        title: __("Confirm timezone and date format", "eventkoi-lite"),
        component: ConfirmTimezoneFormatStep,
        sidebarHidden: true,
        sidebarKey: "calendar",
      },
    ],
    []
  );

  const initialStepIndex = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const stepKey = params.get("step");
    const idx = steps.findIndex((s) => s.key === stepKey);
    return idx >= 0 ? idx : 0;
  }, [location.search, steps]);

  const [activeIndex, setActiveIndex] = useState(initialStepIndex);

  const sidebarSteps = useMemo(
    () => steps.filter((step) => !step.sidebarHidden),
    [steps]
  );

  const sidebarLastIndexMap = useMemo(() => {
    const map = new Map();

    steps.forEach((step, index) => {
      const key = step.sidebarKey ?? step.key;
      map.set(key, index);
    });

    return map;
  }, [steps]);

  const activeSidebarKey =
    steps[activeIndex]?.sidebarKey ?? steps[activeIndex]?.key;

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => Math.min(steps.length - 1, prev + 1));
  }, [steps.length]);

  const isFirst = activeIndex === 0;
  const isLast = activeIndex === steps.length - 1;
  const ActiveStepComponent = steps[activeIndex]?.component;

  const persistDemoEventId = useCallback(async (eventId) => {
    if (!eventId) return;

    try {
      await apiRequest({
        path: `${eventkoi_params.api}/onboarding/demo-event`,
        method: "POST",
        data: { event_id: eventId },
      });

      window.eventkoi_params.demo_event_id = eventId;
    } catch (error) {
      console.error("Failed to persist demo event ID", error);
    }
  }, []);

  const fetchEventById = useCallback(async (eventId) => {
    try {
      return await apiRequest({
        path: `${eventkoi_params.api}/event?id=${eventId}`,
        method: "GET",
      });
    } catch (error) {
      return null;
    }
  }, []);

  const createDemoEventAndRedirect = useCallback(async () => {
    if (isCreatingDemo) return;

    setIsCreatingDemo(true);

    try {
      const tz = normalizeTimeZone(window?.eventkoi_params?.timezone || "UTC");
      const nowTz = DateTime.now().setZone(tz);

      const daysToSaturday = (6 - nowTz.weekday + 7) % 7 || 7; // luxon weekday: Mon=1, Sat=6
      const startTz = nowTz
        .plus({ days: daysToSaturday })
        .set({ hour: 13, minute: 0, second: 0, millisecond: 0 });
      const endTz = startTz.plus({ days: 7 });

      const startIso = getUtcISOString(
        startTz.toISO({ suppressMilliseconds: true }),
        tz
      );
      const endIso = getUtcISOString(
        endTz.toISO({ suppressMilliseconds: true }),
        tz
      );

      const demoImage = window?.eventkoi_params?.demo_event_image || "";

      const demoEvent = {
        title: __("Classical Concert in the Park", "eventkoi-lite"),
        description: __(
          "<p>A serene evening of classical music unfolds at the Singapore Botanic Gardens’ iconic Bandstand. Surrounded by lush greenery and gentle evening breezes, audiences can enjoy a live orchestral performance beneath the open sky. An enchanting blend of nature, culture, and timeless melodies in the heart of the city.</p>",
          "eventkoi-lite"
        ),
        summary: __("A ready-made listing to explore.", "eventkoi-lite"),
        date_type: "standard",
        event_days: [
          {
            start_date: startIso,
            end_date: endIso,
            all_day: false,
          },
        ],
        start_date: startIso,
        end_date: endIso,
        status: "draft",
        wp_status: "draft",
        type: "inperson",
        timezone: tz,
        timezone_display: true,
        standard_type: "continuous",
        image: demoImage,
        locations: [
          {
            id: "5d5799c6-ac2b-4d1d-869c-cf3282d0f83a",
            type: "physical",
            name: "Singapore Botanic Gardens Bandstand",
            address1: "6 Cluny Rd",
            address2: "",
            city: "Singapore",
            state: "",
            country: "Singapore",
            zip: "259573",
            embed_gmap: true,
            gmap_link:
              "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.774915409844!2d103.81382031158998!3d1.3103791616937597!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31da1a1ed7caf6ed%3A0x27edef434c3270e4!2sSingapore%20Botanic%20Gardens%20Bandstand!5e0!3m2!1sen!2ssg!4v1761213367640!5m2!1sen!2ssg",
            virtual_url: "",
            latitude: "",
            longitude: "",
          },
        ],
        location: {
          type: "physical",
          name: "Singapore Botanic Gardens Bandstand",
          address1: "6 Cluny Rd",
          address2: "",
          city: "Singapore",
          state: "",
          country: "Singapore",
          zip: "259573",
          embed_gmap: true,
          gmap_link:
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.774915409844!2d103.81382031158998!3d1.3103791616937597!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31da1a1ed7caf6ed%3A0x27edef434c3270e4!2sSingapore%20Botanic%20Gardens%20Bandstand!5e0!3m2!1sen!2ssg!4v1761213367640!5m2!1sen!2ssg",
          virtual_url: "",
          latitude: "",
          longitude: "",
        },
        address1: "6 Cluny Rd",
        address2: "",
        address3: "",
        city: "Singapore",
        state: "",
        country: "Singapore",
        zip: "259573",
        embed_gmap: true,
        gmap_link:
          "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.774915409844!2d103.81382031158998!3d1.3103791616937597!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31da1a1ed7caf6ed%3A0x27edef434c3270e4!2sSingapore%20Botanic%20Gardens%20Bandstand!5e0!3m2!1sen!2ssg!4v1761213367640!5m2!1sen!2ssg",
      };

      const existingId = Number(window?.eventkoi_params?.demo_event_id) || 0;
      const existing = existingId ? await fetchEventById(existingId) : null;
      const isNewDemo = !existing;

      if (existing?.wp_status === "trash") {
        try {
          await apiRequest({
            path: `${eventkoi_params.api}/restore_event`,
            method: "POST",
            headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
            data: { event_id: existingId },
          });
        } catch (error) {
          console.error("Failed to restore demo event", error);
        }
      }

      const firstSave = await apiRequest({
        path: `${eventkoi_params.api}/update_event`,
        method: "POST",
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
        data: {
          event: {
            ...demoEvent,
            // Only reuse an existing ID if the event still exists.
            id: existing?.id || undefined,
          },
        },
      });

      const targetId = firstSave?.id || existing?.id || existingId;

      // Always run a second update so meta persists (new events need it, existing can re-sync defaults).
      const saved = targetId
        ? await apiRequest({
            path: `${eventkoi_params.api}/update_event`,
            method: "POST",
            headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
            data: { event: { ...demoEvent, id: targetId } },
          })
        : firstSave;

      const params = new URLSearchParams({
        onboarding: "demo-event",
      });

      if (saved?.id) {
        params.set("demo_event_id", saved.id);
        await persistDemoEventId(saved.id);
      }

      if (isNewDemo && saved?.id) {
        window.localStorage.setItem("eventkoi_demo_event_id", saved.id);
      }

      navigate(`/events?${params.toString()}`, { replace: true });
    } catch (error) {
      console.error("Failed to create demo event during onboarding", error);
      setIsCreatingDemo(false);
    }
  }, [fetchEventById, isCreatingDemo, navigate, persistDemoEventId]);

  // Sync URL step param -> active index.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const stepKey = params.get("step");
    if (stepKey === "done") {
      setIsComplete(true);
      return;
    }

    setIsComplete(false);
    const idx = steps.findIndex((s) => s.key === stepKey);

    if (idx >= 0) {
      setActiveIndex(idx);
    }
  }, [location.search, steps]);

  // Keep URL in sync when user changes steps.
  useEffect(() => {
    if (isComplete) {
      return;
    }

    const params = new URLSearchParams(location.search);
    const currentKey = steps[activeIndex]?.key;

    if (!currentKey) {
      return;
    }

    if (params.get("step") === currentKey) {
      return;
    }

    params.set("step", currentKey);
    navigate({ search: `?${params.toString()}` });
  }, [activeIndex, steps, navigate, isComplete]);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      setOpen(nextOpen);

      // If the modal is closed, return to the regular dashboard.
      if (!nextOpen) {
        try {
          window.localStorage.removeItem("eventkoi_onboarding_wizard_active");
          window.localStorage.removeItem("eventkoi_onboarding_wizard_step");
        } catch {
          // Ignore localStorage issues.
        }
        navigate("/dashboard", { replace: true });
      }
    },
    [navigate]
  );

  const handlePrimaryAction = useCallback(() => {
    if (isComplete) {
      return;
    }

    if (isLast) {
      setIsComplete(true);
      try {
        window.localStorage.setItem("eventkoi_onboarding_wizard_done", "1");
        window.localStorage.removeItem("eventkoi_onboarding_wizard_active");
        window.localStorage.removeItem("eventkoi_onboarding_wizard_step");
      } catch {
        // Ignore localStorage issues.
      }
      const params = new URLSearchParams(location.search);
      params.set("step", "done");
      navigate({ search: `?${params.toString()}` });
      return;
    }

    const currentKey = steps[activeIndex]?.key;

    if (currentKey === "datetime") {
      createDemoEventAndRedirect();
      return;
    }

    goToNext();
  }, [
    activeIndex,
    createDemoEventAndRedirect,
    goToNext,
    handleOpenChange,
    isComplete,
    isLast,
    location.search,
    navigate,
    steps,
  ]);

  useEffect(() => {
    if (isComplete) return;
    const currentKey = steps[activeIndex]?.sidebarKey ?? steps[activeIndex]?.key;
    if (!currentKey) return;
    try {
      window.localStorage.setItem("eventkoi_onboarding_wizard_active", "1");
      window.localStorage.removeItem("eventkoi_onboarding_wizard_done");
      window.localStorage.setItem("eventkoi_onboarding_wizard_step", currentKey);
    } catch {
      // Ignore localStorage issues.
    }
  }, [activeIndex, isComplete, steps]);

  const handleStartTour = useCallback(() => {
    createDemoEventAndRedirect();
  }, [createDemoEventAndRedirect]);

  return (
    <div className="relative">
      <div className={open ? "blur-sm transition-all duration-200" : ""}>
        <DashboardOverview />
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn(
            "px-10 py-8 pr-[80px] pb-[80px] gap-10 max-w-3xl min-h-[300px]",
            isComplete && "max-w-[430px] pr-10 pb-[120px]"
          )}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1 m-0 text-xl cursor-default font-medium">
              <LogoIcon width="18" height="23" />
              <span>EventKoi</span>
            </DialogTitle>
            <DialogDescription className="hidden" />
          </DialogHeader>

          {isComplete ? (
            <div className="flex flex-col py-10 max-w-[325px] m-auto">
              <div className="">
                <div className="text-[24px] font-medium leading-7 text-black">
                  <span className="block">
                    {__("You're ready to", "eventkoi-lite")}
                  </span>
                  <span className="block">
                    {__("start using EventKoi!", "eventkoi-lite")}
                  </span>
                </div>
                <div className="text-[14px] text-[#808080] mt-4 font-normal">
                  <span>
                    {__(
                      "Take a quick 2-minute tour to learn how to:",
                      "eventkoi-lite"
                    )}
                  </span>
                </div>
                <div className="mt-4 space-y-4">
                  {[
                    __("Publish demo event", "eventkoi-lite"),
                    __("View your ready-made calendar", "eventkoi-lite"),
                  ].map((title) => (
                    <div
                      key={title}
                      className="flex items-center gap-2 rounded-lg border bg-white text-[#161616] text-[14px] font-medium"
                    >
                      <CircleCheck className="h-4 w-4 text-[#161616]" />
                      <span>{title}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <Button
                    className="w-full bg-[#161616] hover:bg-[#000] focus:bg-[#000] h-9 border-none cursor-pointer"
                    onClick={handleStartTour}
                    disabled={isCreatingDemo}
                  >
                    <div className="group flex items-center gap-2">
                      <span>
                        {isCreatingDemo
                          ? __("Creating demo event…", "eventkoi-lite")
                          : __("Start plugin tour", "eventkoi-lite")}
                      </span>
                      {isCreatingDemo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" />
                      )}
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-[80px] md:grid-cols-[200px,1fr]">
              <div className="space-y-2">
                <div className="text-[18px] font-medium text-black pb-3 leading-7">
                  {__("Onboarding wizard", "eventkoi-lite")}
                </div>
                <Separator />
                <div className="h-1" />
                {sidebarSteps.map((step) => {
                  const stepIndex = steps.findIndex(
                    (item) => item.key === step.key
                  );
                  const lastIndexForStep =
                    sidebarLastIndexMap.get(step.key) ?? stepIndex;
                  const isActive = activeSidebarKey === step.key;
                  const isComplete = activeIndex > lastIndexForStep;

                  return (
                    <button
                      key={step.key}
                      type="button"
                      onClick={() => setActiveIndex(stepIndex)}
                      className={cn(
                        "w-full h-9 rounded-lg border px-3 py-3 text-left transition bg-white text-[#161616] text-[14px] font-medium cursor-pointer",
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
                        <span className="text-[14px] font-medium">
                          {step.title}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-10 min-h-[400px]">
                <div className="flex-1 bg-white p-0">
                  {ActiveStepComponent ? (
                    <ActiveStepComponent onSkip={goToNext} />
                  ) : null}
                </div>

                <div className="mt-auto flex justify-end gap-4">
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setActiveIndex((prev) => Math.max(0, prev - 1))
                    }
                    disabled={isFirst}
                    className={cn(
                      "border-none bg-transparent cursor-pointer text-[#161616] text-[14px] h-9",
                      isFirst && "text-transparent pointer-none"
                    )}
                  >
                    {__("Back", "eventkoi-lite")}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#161616] border-[1px] cursor-pointer h-9 border-solid text-[#161616] text-[14px]"
                    onClick={handlePrimaryAction}
                    disabled={isCreatingDemo}
                  >
                    <div className="group flex items-center gap-2">
                      <span className="flex items-center gap-2">
                        {isCreatingDemo ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {__("Creating demo event…", "eventkoi-lite")}
                          </>
                        ) : isLast ? (
                          __("Finish setup", "eventkoi-lite")
                        ) : (
                          sprintf(
                            /* translators: %s: title of the next onboarding step. */
                            __("Next: %s", "eventkoi-lite"),
                            steps[activeIndex + 1]?.title ?? ""
                          )
                        )}
                      </span>
                      {!isCreatingDemo && (
                        <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" />
                      )}
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
