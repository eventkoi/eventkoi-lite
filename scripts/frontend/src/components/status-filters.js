import apiRequest from "@wordpress/api-fetch";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { cn } from "@/lib/utils";

export function StatusFilters({ statusFilters, base, data }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryStatus = searchParams.get("status");

  const [counts, setCounts] = useState(eventkoi_params.counts[base]);

  useEffect(() => {
    apiRequest({
      path: `${eventkoi_params.api}/get_event_counts`,
      method: "get",
    })
      .then((response) => {
        setCounts(response);
      })
      .catch(() => {});
  }, [data]);

  return (
    <>
      {statusFilters?.map(function (status, i) {
        let selected =
          (!queryStatus && status.key === "all") || queryStatus === status.key;
        let count = counts[status.key];
        return (
          <Link
            key={`status-${i}`}
            to={`/${base}?status=${status.key}`}
            className={cn(
              "flex items-center hover:underline hover:decoration-dotted underline-offset-4 text-foreground",
              selected &&
                "underline decoration-dotted underline-offset-4 font-medium"
            )}
          >
            {status.title}
            {!status.hideCount && <> ({count})</>}
          </Link>
        );
      })}
    </>
  );
}
