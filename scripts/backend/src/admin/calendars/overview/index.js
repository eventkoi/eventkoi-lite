import apiRequest from "@wordpress/api-fetch";
import { __, sprintf } from "@wordpress/i18n";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { AddButton } from "@/components/add-button";
import { ProLaunch } from "@/components/dashboard/pro-launch";
import { DataTable } from "@/components/data-table";
import { Heading } from "@/components/heading";
import { LogoIcon } from "@/components/logo-icon";
import { SortButton } from "@/components/sort-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  CheckCheck,
  CircleCheck,
  CircleDotDashed,
  Copy,
  Link2,
} from "lucide-react";

const multiColumnSearch = (row, columnId, filterValue) => {
  const searchableRowContent = `${row.original.name} ${row.original.slug}`;
  return searchableRowContent.toLowerCase().includes(filterValue.toLowerCase());
};

const HintContext = createContext({
  showTourHints: false,
  hintStep: 1,
  onLinkClick: () => {},
});

function CalendarNameCell({ row }) {
  const { showTourHints, hintStep, onLinkClick } = useContext(HintContext);
  const isDefaultCal =
    parseInt(row.original.id) === parseInt(eventkoi_params.default_cal);
  const url = `#/calendars/${row.original.id}/main`;

  return (
    <div className="grid space-y-1">
      <div className="flex gap-2 items-start text-foreground">
        <span className="inline">
          <a
            href={url}
            className="inline font-medium hover:underline hover:decoration-dotted underline-offset-4"
          >
            {row.getValue("name")}
          </a>
          <CalendarLinkIcon
            url={row.original.url}
            isDefaultCal={isDefaultCal}
            calendarId={row.original.id}
            showTourHints={showTourHints}
            hintStep={hintStep}
            onLinkClick={onLinkClick}
          />
        </span>
        {isDefaultCal && (
          <Badge variant="outline" className="font-normal">
            Default
          </Badge>
        )}
      </div>
    </div>
  );
}

function ShortcodeCell({ row }) {
  const value = row.getValue("shortcode");
  const [copied, setCopied] = useState(false);
  const [tooltipKey, setTooltipKey] = useState(0);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTooltipKey((k) => k + 1);
    setTimeout(() => {
      setCopied(false);
      setTooltipKey((k) => k + 1);
    }, 1500);
  };

  return (
    <div className="relative text-foreground w-full max-w-[220px]">
      <Input type="text" value={value} readOnly className="w-full pr-10" />
      <TooltipProvider delayDuration={0}>
        <Tooltip key={tooltipKey}>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="absolute h-8 right-[5px] top-[4px] border-none cursor-pointer hover:bg-input"
              onClick={handleCopy}
              aria-label="Copy shortcode"
            >
              {copied ? (
                <CheckCheck className="h-4 w-4 transition-all duration-200" />
              ) : (
                <Copy className="h-4 w-4 transition-all duration-200" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent
            className="bg-zinc-900 text-white px-3 py-1.5 text-sm rounded-md shadow-lg"
            side="top"
            sideOffset={8}
          >
            {copied ? "Copied!" : "Copy shortcode"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

const columns = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center min-h-6">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all rows"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center min-h-6">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <SortButton title="Calendar name" column={column} />
    ),
    cell: CalendarNameCell,
    filterFn: multiColumnSearch,
    sortingFn: "alphanumeric",
  },
  {
    accessorKey: "slug",
    header: ({ column }) => <SortButton title="Slug" column={column} />,
    cell: ({ row }) => (
      <div className="text-foreground">{row.getValue("slug")}</div>
    ),
    filterFn: multiColumnSearch,
    sortingFn: "alphanumeric",
  },
  {
    accessorKey: "shortcode",
    header: ({ column }) => <SortButton title="Shortcode" column={column} />,
    cell: ShortcodeCell,
    filterFn: multiColumnSearch,
    sortingFn: "alphanumeric",
  },
  {
    accessorKey: "count",
    header: ({ column }) => <SortButton title="Events count" column={column} />,
    cell: ({ row }) => (
      <div className="text-foreground text-right">{row.getValue("count")}</div>
    ),
    filterFn: multiColumnSearch,
    sortingFn: "alphanumeric",
  },
];

function CalendarLinkIcon({
  url,
  isDefaultCal,
  calendarId,
  showTourHints,
  hintStep,
  onLinkClick,
}) {
  const searchParams = new URLSearchParams(window.location.search);
  const hashQuery = (window.location.hash || "").split("?")[1] || "";
  const hashParams = new URLSearchParams(hashQuery);

  const onboarding =
    searchParams.get("onboarding") === "demo-event" ||
    hashParams.get("onboarding") === "demo-event";
  const demoId =
    hashParams.get("demo_event_id") || searchParams.get("demo_event_id");

  const href = useMemo(() => {
    let finalUrl = url || "";
    const includeTourParams = onboarding && showTourHints && hintStep === 2;

    if (includeTourParams && url) {
      try {
        const linkUrl = new URL(url, window.location.origin);
        linkUrl.searchParams.set("onboarding", "demo-event");
        if (demoId) {
          linkUrl.searchParams.set("demo_event_id", demoId);
        }
        finalUrl = linkUrl.toString();
      } catch {
        finalUrl = url;
      }
    }

    return finalUrl;
  }, [url, onboarding, demoId, showTourHints, hintStep]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="ms-2 text-muted-foreground hover:text-foreground shrink-0 eventkoi-calendar-link-icon"
      data-default-cal-link={isDefaultCal ? "true" : undefined}
      aria-label="View public calendar"
      data-calendar-id={calendarId}
      onClick={(event) => {
        onLinkClick?.();
        // Ensure query params are preserved by opening explicitly.
        try {
          event.preventDefault();
          window.open(href, "_blank", "noopener,noreferrer");
        } catch {
          // Fallback to default navigation if window.open fails.
        }
      }}
    >
      <Link2 className="w-5 h-5 inline-block" />
    </a>
  );
}

export function CalendarsOverview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const onboardingFlag = searchParams.get("onboarding") || "";
  const demoEventId =
    parseInt(
      searchParams.get("demo_event_id") ||
        (window?.eventkoi_params?.demo_event_id ?? 0),
      10
    ) || 0;
  const onboardingHintParam = useMemo(() => {
    const parsed = parseInt(searchParams.get("hint"), 10);
    if (!Number.isFinite(parsed)) return null;
    return Math.min(Math.max(parsed, 1), 2);
  }, [searchParams]);
  const hintStep = onboardingHintParam || 1;
  const dataQueryKey = useMemo(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("hint");
    params.delete("onboarding");
    params.delete("demo_event_id");
    return params.toString();
  }, [searchParams]);

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoToast, setShowDemoToast] = useState(
    onboardingFlag === "demo-event"
  );
  const [showTourHints, setShowTourHints] = useState(
    onboardingFlag === "demo-event"
  );
  const [hintPosition, setHintPosition] = useState(null);
  const [demoStepComplete, setDemoStepComplete] = useState(false);
  const [showDoneWidget, setShowDoneWidget] = useState(false);
  const [tourCancelled, setTourCancelled] = useState(false);

  const sidebarSteps = useMemo(
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

  const fetchResults = async () => {
    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/calendars`,
        method: "get",
      });
      setData(response);
    } catch (error) {
      console.error("Failed to load calendars:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchResults();
  }, [dataQueryKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const flag =
      window.localStorage.getItem("eventkoi_onboarding_demo_complete") === "1";
    setDemoStepComplete(flag);
  }, []);

  useEffect(() => {
    if (onboardingFlag === "demo-event") {
      if (tourCancelled) {
        return;
      }
      if (!showDemoToast) setShowDemoToast(true);
      if (!showTourHints && !demoStepComplete) setShowTourHints(true);
      try {
        window.localStorage.setItem("eventkoi_onboarding_active", "1");
      } catch {
        // Ignore localStorage issues.
      }
    }
  }, [
    onboardingFlag,
    onboardingHintParam,
    showDemoToast,
    showTourHints,
    demoStepComplete,
    tourCancelled,
  ]);

  useEffect(() => {
    if (onboardingFlag !== "demo-event" || onboardingHintParam) return;
    const params = new URLSearchParams(searchParams);
    params.set("hint", "1");
    navigate(
      { search: params.toString() ? `?${params.toString()}` : "" },
      { replace: true }
    );
  }, [onboardingFlag, onboardingHintParam, searchParams, navigate]);

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

  const renderSidebarSteps = () => {
    return (
      <div className="space-y-1">
        <div className="h-[1px] w-full bg-border" />
        <div className="h-1" />
        {sidebarSteps.map((step, index) => {
          const effectiveKey = step.sidebarKey ?? step.key;
          const isComplete = effectiveKey === "event" && demoStepComplete;
          const isActive = effectiveKey === "view";

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
  };

  const updateHintPosition = useCallback(() => {
    if (!showTourHints) return;

    let target = null;
    const ringClasses = ["ring-2", "ring-[#fb4409]", "rounded-sm"];

    if (hintStep === 2) {
      target = document.querySelector('[data-default-cal-link="true"]');
      if (target) {
        target.classList.add("eventkoi-cal-link-highlight");
        ringClasses.forEach((cls) => target.classList.add(cls));
      }
    }

    if (!target) {
      target = document.querySelector(".eventkoi-calendars-heading h1");
    }

    if (!target) {
      setHintPosition(null);
      const prev = document.querySelector(".eventkoi-cal-link-highlight");
      if (prev) {
        prev.classList.remove("eventkoi-cal-link-highlight");
        ringClasses.forEach((cls) => prev.classList.remove(cls));
      }
      if (showTourHints) {
        setTimeout(() => {
          updateHintPosition();
        }, 250);
      }
      return;
    }

    const rect = target.getBoundingClientRect();
    setHintPosition({
      top: hintStep === 2 ? rect.top - 27 : rect.top - 17,
      left: hintStep === 2 ? rect.right + 14 : rect.right + 22,
    });
  }, [showTourHints, hintStep]);

  useEffect(() => {
    updateHintPosition();
    if (!showTourHints) return;

    const handler = () => updateHintPosition();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [showTourHints, hintStep, updateHintPosition]);

  useEffect(() => {
    if (!showTourHints) return;
    updateHintPosition();
  }, [data, showTourHints, hintStep, updateHintPosition]);

  useEffect(() => {
    if (!showTourHints || hintStep !== 2) {
      const prev = document.querySelector(".eventkoi-cal-link-highlight");
      if (prev) {
        prev.classList.remove("eventkoi-cal-link-highlight");
        const ringClasses = ["ring-2", "ring-[#fb4409]", "rounded-sm"];
        ringClasses.forEach((cls) => prev.classList.remove(cls));
      }
      return;
    }

    const target = document.querySelector('[data-default-cal-link="true"]');
    if (target) {
      target.classList.add("eventkoi-cal-link-highlight");
      const ringClasses = ["ring-2", "ring-[#fb4409]", "rounded-sm"];
      ringClasses.forEach((cls) => target.classList.add(cls));
    }
  }, [showTourHints, hintStep]);

  useEffect(() => {
    if (!showTourHints || onboardingFlag !== "demo-event") return;
  }, [showTourHints, onboardingFlag]);

  const handleCalendarLinkClick = useCallback(() => {
    setShowTourHints(false);
    setDemoStepComplete(true);
    setShowDoneWidget(true);
    window?.localStorage?.setItem("eventkoi_onboarding_demo_complete", "1");
  }, []);

  const onboardingToast = showDemoToast ? (
    showDoneWidget ? (
      <div
        className="eventkoi-onboarding-widget fixed bottom-8 right-8 z-50 w-[250px] rounded-lg shadow-md"
        style={{
          boxSizing: "border-box",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div className="flex items-center gap-2 bg-[#EDFBF8] p-4 rounded-t-lg">
          <span className="text-[18px]" aria-hidden="true">
            🥳
          </span>
          <div className="text-[14px] font-semibold text-[#0D5342] leading-tight">
            <span className="block">
              {__("EventKoi Plugin Tour Completed!", "eventkoi")}
            </span>
          </div>
          <button
            type="button"
            className="ml-auto p-0 text-[#555] hover:text-black transition-colors leading-none -mt-1"
            aria-label={__("Close", "eventkoi")}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
            }}
            onClick={() => {
              setShowDemoToast(false);
              clearOnboardingParams();
            }}
          >
            ×
          </button>
        </div>
        <div className="p-4 border border-solid border-border bg-white rounded-b-lg flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <div className="text-[14px] text-[#161616] font-medium text-center w-full">
              {__("What you can do next:", "eventkoi")}
            </div>
            <Button
              asChild
              className="w-full h-10 text-[12px] rounded-sm font-medium text-[#FBFBFB] bg-[#161616] hover:bg-black"
              data-eventkoi-dashboard
              style={{ boxSizing: "border-box" }}
            >
              <a
                className="no-underline"
                href={`${
                  window.eventkoi_params?.admin_page ||
                  "/wp-admin/admin.php?page=eventkoi"
                }#/dashboard`}
              >
                {__("Go to EventKoi Dashboard", "eventkoi")}
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full rounded-sm border border-solid border-[#161616] py-2 h-10 text-[12px] font-medium hover:bg-white text-[#161616] whitespace-normal"
              style={{ boxSizing: "border-box" }}
            >
              <a
                className="no-underline text-[#161616] text-center"
                href="https://eventkoi.com/docs/knowledge-base/how-to-customise-the-default-events-template/"
                target="_blank"
                rel="noopener noreferrer"
              >
                {__("Learn how to customize an Event Template", "eventkoi")}
              </a>
            </Button>
          </div>
          <div className="h-[1px] w-full bg-border" />
          <p className="text-[12px] text-[#555] m-0">
            {__(
              "You can restart this Tour any time in the EventKoi Dashboard.",
              "eventkoi"
            )}
          </p>
        </div>
      </div>
    ) : (
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
              setShowDemoToast(false);
              clearOnboardingParams();
              setTourCancelled(true);
              setShowTourHints(false);
              setHintPosition(null);
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
    )
  ) : null;

  const onboardingHint =
    showTourHints && hintPosition ? (
      <div className="pointer-events-none fixed inset-0 z-[100001]">
        <div
          className="pointer-events-auto absolute max-w-xs bg-[#161616] border border-border shadow-lg rounded-lg p-4 flex flex-col gap-2"
          style={{ top: hintPosition.top, left: hintPosition.left }}
        >
          <div className="absolute top-6 -left-2 w-0 h-0 border-y-[10px] border-y-transparent border-r-[10px] border-r-[#161616]" />
          <button
            type="button"
            className="absolute top-2 right-2 text-[#FBFBFB] hover:text-white transition-colors text-2xl leading-none"
            onClick={() => {
              setShowTourHints(false);
              clearOnboardingParams();
              setTourCancelled(true);
              setHintPosition(null);
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
          <div className="text-[16px] font-semibold text-[#FBFBFB] flex flex-col pr-6">
            {hintStep === 2 && (
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
              {hintStep === 1
                ? __("Welcome to your Calendars", "eventkoi-lite")
                : __("Take action: Click link icon", "eventkoi-lite")}
            </span>
          </div>
          <p className="text-sm text-[#FBFBFB]">
            {hintStep === 1 ? (
              __(
                "Here, you can create new calendars, edit existing ones, and more.",
                "eventkoi-lite"
              )
            ) : (
              <>
                {__(
                  "Click the icon to view the frontend calendar.",
                  "eventkoi-lite"
                )}
                <span className="block mt-1">
                  {__("This is your last step in the tour.", "eventkoi-lite")}
                </span>
              </>
            )}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[14px] text-[#FBFBFB]">
              {sprintf(
                /* translators: 1: current step number, 2: total steps */
                __("%1$s of %2$s", "eventkoi-lite"),
                hintStep,
                2
              )}
            </span>
            <div className="flex items-center gap-2">
              {hintStep === 1 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-[26px] font-medium text-[#FBFBFB] hover:underline hover:bg-transparent hover:text-[#FBFBFB]"
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.set("onboarding", "demo-event");
                    params.set("hint", "1");
                    const targetId =
                      demoEventId ||
                      parseInt(
                        window?.eventkoi_params?.demo_event_id ?? 0,
                        10
                      ) ||
                      0;
                    if (targetId) {
                      params.set("demo_event_id", String(targetId));
                      navigate(
                        `/events/${targetId}/main?${params.toString()}`,
                        { replace: false }
                      );
                    } else {
                      navigate(`/events?${params.toString()}`, {
                        replace: false,
                      });
                    }
                  }}
                >
                  {__("Back", "eventkoi-lite")}
                </Button>
              )}
              {hintStep === 1 ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-[26px] font-medium"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.set("hint", "2");
                    navigate(
                      {
                        search: params.toString()
                          ? `?${params.toString()}`
                          : "",
                      },
                      { replace: false }
                    );
                  }}
                >
                  {__("Next", "eventkoi-lite")}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-[26px] font-medium text-[#FBFBFB] hover:underline hover:bg-transparent hover:text-[#FBFBFB]"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.set("hint", "1");
                    navigate(
                      {
                        search: params.toString()
                          ? `?${params.toString()}`
                          : "",
                      },
                      { replace: false }
                    );
                  }}
                >
                  {__("Back", "eventkoi-lite")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <HintContext.Provider
      value={{ showTourHints, hintStep, onLinkClick: handleCalendarLinkClick }}
    >
      <div className="flex flex-col gap-8">
        <div className="mx-auto flex w-full gap-2 justify-between">
          <Heading className="eventkoi-calendars-heading">Calendars</Heading>
          <AddButton title="Add calendar" url="/calendars/add" locked />
        </div>
        <DataTable
          data={data}
          columns={columns}
          empty="No calendars are found."
          base="calendars"
          hideStatusFilters
          isLoading={isLoading}
          fetchResults={fetchResults}
          hideCategories
          hideDateRange
        />
        <ProLaunch headline="Upgrade to access Unlimited Calendars" minimal />
      </div>

      {onboardingToast}
      {onboardingHint}
    </HintContext.Provider>
  );
}
