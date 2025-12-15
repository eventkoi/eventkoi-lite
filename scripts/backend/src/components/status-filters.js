import { cn } from "@/lib/utils";
import apiRequest from "@wordpress/api-fetch";
import { useEffect, useState } from "react";
import { createSearchParams, Link, useSearchParams } from "react-router-dom";

export function StatusFilters({ statusFilters, base, data, counts }) {
  const [searchParams] = useSearchParams();
  const [countsState, setCountsState] = useState({});

  const queryStatus = searchParams.get("status");
  const eventStatus = searchParams.get("event_status");
  const calStatus = searchParams.get("calendar");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  useEffect(() => {
    if (counts && Object.keys(counts).length) {
      setCountsState(counts);
      return;
    }

    if (base === "events" && typeof window !== "undefined") {
      const apiBase = window?.eventkoi_params?.api || "/wp-json/eventkoi/v1";
      const url = `${apiBase}/get_event_counts`;

      apiRequest({ path: url, method: "GET" })
        .then(setCountsState)
        .catch((err) => {
          console.warn("Could not fetch event counts:", err);
        });
    }
  }, [base, counts]);

  return (
    <>
      {statusFilters?.map((status, i) => {
        const selected =
          (!queryStatus && status.key === "all") || queryStatus === status.key;

        const params = {
          status: status.key,
        };

        if (eventStatus) params.event_status = eventStatus;
        if (calStatus) params.calendar = calStatus;
        if (from) params.from = from;
        if (to) params.to = to;

        const count =
          base === "events" && !status.hideCount
            ? countsState?.[status.key] ?? 0
            : "";

        return (
          <Link
            key={`status-${i}`}
            to={{
              pathname: "/" + base,
              search: createSearchParams(params).toString(),
            }}
            className={cn(
              "flex items-center hover:underline hover:decoration-dotted underline-offset-4 text-foreground",
              selected &&
                "underline decoration-dotted underline-offset-4 font-medium"
            )}
          >
            {status.title}
            {count !== "" && <span className="ml-1">({count})</span>}
          </Link>
        );
      })}
    </>
  );
}
