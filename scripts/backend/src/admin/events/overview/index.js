import { AddButton } from "@/components/add-button";
import { DataTable } from "@/components/data-table";
import { Heading } from "@/components/heading";
import { LogoIcon } from "@/components/logo-icon";
import { SortButton } from "@/components/sort-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatWPtime } from "@/lib/date-utils";
import { showStaticToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import apiRequest from "@wordpress/api-fetch";
import { __, sprintf } from "@wordpress/i18n";
import {
  Ban,
  CircleAlert,
  CircleCheck,
  CircleDotDashed,
  Clock3,
  Link2,
  Repeat,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

const statuses = {
  live: "Live",
  completed: "Completed",
  tbc: "Date not set",
  upcoming: "Upcoming",
  publish: "Upcoming",
  draft: "Draft",
  trash: "Trash",
  recurring: "Recurring",
};

const multiColumnSearch = (row, _columnId, filterValue) => {
  const searchableRowContent = `${row.original.title} ${row.original.status}`;
  return searchableRowContent.toLowerCase().includes(filterValue.toLowerCase());
};

const sortStatusFn = (rowA, rowB) => {
  const order = [
    "live",
    "upcoming",
    "publish",
    "tbc",
    "draft",
    "completed",
    "trash",
  ];
  return (
    order.indexOf(rowA.original.status) - order.indexOf(rowB.original.status)
  );
};

export function EventsOverview() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [showDemoToast, setShowDemoToast] = useState(false);
  const [showTourHints, setShowTourHints] = useState(false);
  const [hintPosition, setHintPosition] = useState(null);
  const [hintStep, setHintStep] = useState(1);
  const [demoStepComplete, setDemoStepComplete] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarSteps = useMemo(
    () => [
      {
        key: "event",
        title: __("Publish demo event", "eventkoi-lite"),
      },
      {
        key: "view",
        title: __("View calendar", "eventkoi-lite"),
      },
    ],
    []
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const queryStatus = searchParams.get("status") || "";
  const eventStatus = searchParams.get("event_status") || "";
  const calStatus = searchParams.get("calendar") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
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

  const fetchStatusCounts = useCallback(async () => {
    try {
      const apiBase = window?.eventkoi_params?.api || "/wp-json/eventkoi/v1";
      const url = `${apiBase}/get_event_counts`;
      const counts = await apiRequest({ path: url, method: "GET" });
      setStatusCounts(counts || {});
    } catch (err) {
      console.warn("Could not fetch event counts:", err);
    }
  }, []);

  const fetchResults = useCallback(
    async (toastMessage = null) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          status: queryStatus,
          event_status: eventStatus,
          calendar: calStatus,
          from,
          to,
        });
        const apiURL = `${eventkoi_params.api}/events?${params.toString()}`;
        const response = await apiRequest({ path: apiURL, method: "get" });
        setData(response);
        fetchStatusCounts();
        showStaticToast(toastMessage);
      } catch (error) {
        console.error("Failed to load events:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [queryStatus, eventStatus, calStatus, from, to, fetchStatusCounts]
  );

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    fetchStatusCounts();
  }, [fetchStatusCounts]);

  useEffect(() => {
    if (onboardingFlag === "demo-event") {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("eventkoi_onboarding_demo_complete");
        window.localStorage.setItem("eventkoi_onboarding_active", "1");
      }
      setDemoStepComplete(false);
      setShowDemoToast(true);
      setShowTourHints(true);
      setHintStep(onboardingHintParam || 1);
    }
  }, [onboardingFlag, onboardingHintParam]);

  useEffect(() => {
    if (onboardingFlag !== "demo-event" || onboardingHintParam) return;
    const params = new URLSearchParams(searchParams);
    params.set("hint", "1");
    setSearchParams(params, { replace: true });
  }, [onboardingFlag, onboardingHintParam, searchParams, setSearchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFlag = () => {
      const flag =
        window.localStorage.getItem("eventkoi_onboarding_demo_complete") ===
        "1";
      setDemoStepComplete(flag);
    };

    syncFlag();
    window.addEventListener("storage", syncFlag);
    return () => window.removeEventListener("storage", syncFlag);
  }, []);

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

  const handleDismissTour = () => {
    setShowDemoToast(false);
    setShowTourHints(false);
    setHintStep(1);
    clearOnboardingParams();
    try {
      window.localStorage.removeItem("eventkoi_onboarding_active");
    } catch {
      // ignore
    }
  };

  const renderSidebarSteps = () => {
    return (
      <div className="space-y-1">
        <div className="h-[1px] w-full bg-border" />
        <div className="h-1" />
        {sidebarSteps.map((step, index) => {
          const effectiveKey = step.sidebarKey ?? step.key;
          const isComplete = effectiveKey === "event" && demoStepComplete;
          const isActive =
            effectiveKey === (demoStepComplete ? "view" : "event");

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

    if (hintStep === 2 && demoEventId) {
      target = document.querySelector(
        `a[href^="#/events/${demoEventId}/main"]`
      );
    }

    if (!target) {
      target =
        document.querySelector(
          '#adminmenu a[href*="admin.php?page=eventkoi#/events"]'
        ) || document.querySelector('#adminmenu a[href*="page=eventkoi"]');
    }

    if (!target) {
      setHintPosition(null);
      if (showTourHints) {
        setTimeout(() => {
          updateHintPosition();
        }, 250);
      }
      return;
    }

    const rect = target.getBoundingClientRect();
    setHintPosition({
      top: rect.top + rect.height / 2 - 23,
      left: rect.right + 16,
    });
  }, [showTourHints, hintStep, demoEventId]);

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
  }, [showTourHints, hintStep, data, updateHintPosition]);

  const hintHeading =
    hintStep === 1
      ? __("Welcome to your Events list", "eventkoi-lite")
      : __(
          'Take action: Click on "Classical Concert in the Park"',
          "eventkoi-lite"
        );

  const hintBody =
    hintStep === 1
      ? __(
          "Here, you can create new events, edit existing ones, search/filter, and more.",
          "eventkoi-lite"
        )
      : __(
          "Click the event to open it. We'll continue on the next page.",
          "eventkoi-lite"
        );

  const columns = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center min-h-6">
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
              aria-label="Select all"
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
        accessorKey: "title",
        header: ({ column }) => (
          <SortButton title="Event name" column={column} />
        ),
        cell: ({ row }) => {
          const { id, wp_status, url } = row.original;
          const isHighlighted =
            onboardingFlag === "demo-event" &&
            hintStep === 2 &&
            demoEventId &&
            parseInt(id, 10) === demoEventId;
          return (
            <div className="grid space-y-1">
              <div className="flex items-center gap-2 text-foreground">
                {/* Title + frontend link icon */}
                <a
                  href={
                    onboardingFlag === "demo-event" &&
                    demoEventId &&
                    parseInt(id, 10) === demoEventId
                      ? `#/events/${parseInt(
                          id,
                          10
                        )}/main?onboarding=demo-event`
                      : `#/events/${parseInt(id, 10)}/main`
                  }
                  className={cn(
                    "inline font-medium hover:underline hover:decoration-dotted underline-offset-4 break-words",
                    isHighlighted &&
                      "ring-2 ring-[#fb4409] ring-offset-2 ring-offset-white rounded-sm"
                  )}
                >
                  {row.getValue("title")}
                </a>
                {url && (
                  <a
                    href={url}
                    className="ms-2 text-muted-foreground hover:text-foreground shrink-0"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link2 className="w-5 h-5 inline-block" />
                  </a>
                )}

                {/* Status badges inline with title */}
                {["draft", "trash"].includes(wp_status) && (
                  <Badge variant="outline" className="font-normal">
                    {wp_status.charAt(0).toUpperCase() + wp_status.slice(1)}
                  </Badge>
                )}

                {row.original.date_type === "recurring" && (
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full border border-[#D0E6FB] bg-[#F0F8FF] text-foreground">
                    Recurring
                  </span>
                )}
              </div>
            </div>
          );
        },
        filterFn: multiColumnSearch,
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "status",
        header: ({ column }) => <SortButton title="Status" column={column} />,
        cell: ({ row }) => {
          const status = row.getValue("status");
          const iconMap = {
            completed: <CircleCheck className="w-4 h-4 text-success" />,
            draft: <CircleDotDashed className="w-4 h-4 text-primary/60" />,
            tbc: <CircleDotDashed className="w-4 h-4 text-primary/60" />,
            upcoming: <Clock3 className="w-4 h-4 text-[#48BEFA]" />,
            publish: <Clock3 className="w-4 h-4 text-[#48BEFA]" />,
            live: <CircleAlert className="w-4 h-4 text-destructive" />,
            trash: <Ban className="w-4 h-4 text-primary/40" />,
            recurring: <Repeat className="w-4 h-4 text-primary/60" />,
          };
          return (
            <div className="flex items-center space-x-2">
              {iconMap[status]}
              <div className="text-foreground">{statuses[status]}</div>
            </div>
          );
        },
        filterFn: multiColumnSearch,
        sortingFn: sortStatusFn,
      },
      {
        accessorKey: "rsvp_used",
        header: ({ column }) => (
          <SortButton title="RSVPs/Tickets" column={column} />
        ),
        cell: ({ row }) => {
          const used = row.original.rsvp_used ?? 0;
          const capacity = row.original.rsvp_capacity ?? 0;
          const isEnabled = row.original.rsvp_enabled !== false;
          return (
            <div className="text-foreground tabular-nums">
              {!isEnabled ? "—" : capacity > 0 ? `${used}/${capacity}` : used}
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
          const a = Number(rowA.original.rsvp_used || 0);
          const b = Number(rowB.original.rsvp_used || 0);
          return a - b;
        },
      },
      {
        accessorKey: "start_date_iso",
        header: ({ column }) => <SortButton title="Starts" column={column} />,
        cell: ({ row }) => {
          const {
            start_date_iso,
            timezone,
            recurrence_rules,
            event_days,
            date_type,
          } = row.original;

          const isAllDay =
            (date_type === "recurring" &&
              recurrence_rules?.[0]?.all_day === true) ||
            (["standard", "multi"].includes(date_type) &&
              event_days?.[0]?.all_day === true);

          return (
            <div className="text-foreground whitespace-pre-line">
              {formatWPtime(start_date_iso, {
                timezone,
                format: isAllDay ? "date" : "date-time",
              })}
            </div>
          );
        },
        filterFn: multiColumnSearch,
        sortingFn: "alphanumeric",
        sortUndefined: "last",
        invertSorting: true,
      },
      {
        accessorKey: "end_date_iso",
        header: ({ column }) => <SortButton title="Ends" column={column} />,
        cell: ({ row }) => {
          const {
            end_date_iso,
            timezone,
            recurrence_rules,
            event_days,
            date_type,
          } = row.original;

          const isAllDay =
            (date_type === "recurring" &&
              recurrence_rules?.[0]?.all_day === true) ||
            (["standard", "multi"].includes(date_type) &&
              event_days?.[event_days.length - 1]?.all_day === true);

          const isInfiniteRecurring =
            date_type === "recurring" &&
            recurrence_rules?.[0]?.ends === "never" &&
            !end_date_iso;

          return (
            <div className="text-foreground whitespace-pre-line">
              {isInfiniteRecurring
                ? "Never"
                : formatWPtime(end_date_iso, {
                    timezone,
                    format: isAllDay ? "date" : "date-time",
                  })}
            </div>
          );
        },
        filterFn: multiColumnSearch,
        sortingFn: "alphanumeric",
        sortUndefined: "last",
        invertSorting: true,
      },
      {
        accessorKey: "calendar",
        header: () => <>Calendar</>,
        cell: ({ row }) => {
          const calendar = row.original.calendar || [];
          return (
            <div className="text-foreground">
              {calendar.map((item, i) => (
                <span key={`calendar-${i}`}>
                  {item.name}
                  {i < calendar.length - 1 && ", "}
                </span>
              ))}
            </div>
          );
        },
        filterFn: multiColumnSearch,
      },
      {
        accessorKey: "modified_date",
        header: ({ column }) => (
          <SortButton title="Last modified" column={column} />
        ),
        cell: ({ row }) => {
          const raw = row.getValue("modified_date");
          const { timezone } = row.original;
          return (
            <div className="text-foreground whitespace-pre-line">
              {formatWPtime(raw, { timezone })}
            </div>
          );
        },
        filterFn: multiColumnSearch,
        sortingFn: (rowA, rowB, columnId) => {
          const a = Date.parse(rowA.getValue(columnId)) || 0;
          const b = Date.parse(rowB.getValue(columnId)) || 0;
          return a - b;
        },
        sortUndefined: "last",
      },
    ],
    [demoEventId, onboardingFlag, hintStep]
  );

  const statusFilters = [
    { key: "all", title: "All", hideCount: true, isSelected: true },
    { key: "publish", title: "Published" },
    { key: "draft", title: "Draft" },
    { key: "future", title: "Scheduled" },
    { key: "recurring", title: "Recurring" },
    { key: "trash", title: "Trash" },
  ];

  return (
    <div className="flex flex-col gap-8">
      {showDemoToast && (
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
              onClick={handleDismissTour}
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
      )}

      {showTourHints && (
        <div className="pointer-events-none fixed inset-0 z-[60]">
          <div
            className="absolute pointer-events-auto"
            style={
              hintPosition
                ? { top: hintPosition.top - 10, left: hintPosition.left }
                : { bottom: "7rem", right: "2rem" }
            }
          >
            <div className="relative max-w-xs bg-[#161616] border border-border shadow-lg rounded-lg p-4 flex flex-col gap-2">
              <div className="absolute -left-2 top-5 w-0 h-0 border-y-[12px] border-y-transparent border-r-[12px] border-r-[#161616]" />
              <button
                type="button"
                className="absolute top-2 right-2 text-[#FBFBFB] hover:text-white transition-colors text-2xl leading-none"
                onClick={handleDismissTour}
                aria-label={__("Close", "eventkoi-lite")}
              >
                ×
              </button>
              <div className="!mt-0 text-[16px] font-semibold text-[#FBFBFB] flex flex-col pr-6">
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
                <span>{hintHeading}</span>
              </div>
              <p className="text-sm text-[#FBFBFB]">{hintBody}</p>
              <div className="flex mt-2 items-center justify-between">
                <span className="text-[14px] block text-[#FBFBFB]">
                  {sprintf(__("%1$s of %2$s", "eventkoi-lite"), hintStep, 2)}
                </span>
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
      )}

      <div className="mx-auto flex w-full gap-2 justify-between">
        <Heading>Events</Heading>
        <AddButton title="Add event" url="/events/add" />
      </div>

      <DataTable
        data={data}
        columns={columns}
        empty={"No events are found."}
        base="events"
        titleColumnWidth="24%"
        statusFilters={statusFilters}
        isLoading={isLoading}
        fetchResults={fetchResults}
        queryStatus={queryStatus}
        eventStatus={eventStatus}
        calStatus={calStatus}
        from={from}
        to={to}
        hideCategories
        defaultSort={[{ id: "modified_date", desc: true }]}
        statusCounts={statusCounts}
        refreshStatusCounts={fetchStatusCounts}
      />
    </div>
  );
}
