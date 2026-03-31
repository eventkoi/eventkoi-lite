import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { createSearchParams, Link, useSearchParams } from "react-router-dom";

export function StatusFilters({ statusFilters, base, data, counts }) {
  const [searchParams] = useSearchParams();
  const [countsState, setCountsState] = useState({});
  const formatNumber = (value) => Number(value || 0).toLocaleString();

  const queryStatus = searchParams.get("status");
  const eventStatus = searchParams.get("event_status");
  const calStatus = searchParams.get("calendar");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const perPage = searchParams.get("per_page");
  const search = searchParams.get("search");

  useEffect(() => {
    if (counts && Object.keys(counts).length) {
      setCountsState(counts);
    }
  }, [counts]);

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
        if (perPage) params.per_page = perPage;
        if (search) params.search = search;

        const hasCounts = !!countsState && Object.keys(countsState).length > 0;
        const count =
          !status.hideCount &&
          hasCounts &&
          Object.prototype.hasOwnProperty.call(countsState, status.key)
            ? countsState?.[status.key] ?? 0
            : "";

        return (
          <Link
            key={`status-${i}`}
            to={{
              pathname: "/" + base,
              search: createSearchParams(params).toString(),
            }}
            {...(selected ? { "aria-current": "page" } : {})}
            className={cn(
              "flex items-center hover:underline hover:decoration-dotted underline-offset-4 text-foreground",
              selected &&
                "underline decoration-dotted underline-offset-4 font-medium"
            )}
          >
            {status.title}
            {count !== "" && (
              <span className="ml-1">({formatNumber(count)})</span>
            )}
          </Link>
        );
      })}
    </>
  );
}
