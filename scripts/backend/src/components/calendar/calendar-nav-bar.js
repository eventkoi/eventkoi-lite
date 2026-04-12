import apiRequest from "@wordpress/api-fetch";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ProBadge } from "@/components/pro-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ChevronDown } from "lucide-react";

import { showToast, showToastError } from "@/lib/toast";

export function CalendarNavBar({ loading, setLoading, calendar, setCalendar }) {
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);

  let disabled = (!calendar?.id && !calendar?.name) || saving;

  const saveCalendar = async (status) => {
    if (!calendar.name) {
      setNameError(true);
      document.getElementById("calendar-name").focus();
      document.getElementById("calendar-name").classList.add("eventkoi-error");
      return;
    }
    setSaving(true);
    await apiRequest({
      path: `${eventkoi_params.api}/update_calendar`,
      method: "post",
      data: {
        calendar: calendar,
        status: status,
      },
      headers: {
        "EVENTKOI-API-KEY": eventkoi_params.api_key,
      },
    })
      .then((response) => {
        setSaving(false);
        if (!response.error) {
          setCalendar(response);
          showToast(response);

          if (response.update_endpoint) {
            window.location.hash = window.location.hash.replace(
              "add",
              response.id
            );
          }
        } else {
          showToastError(response.error);
        }
      })
      .catch((error) => {
        setSaving(false);
      });
  };

  return (
    <div className="flex gap-1 md:gap-2">
      <Button
        variant="link"
        disabled={disabled || !calendar.url}
        onClick={() => window.open(calendar?.url, "_blank")}
      >
        Preview
      </Button>
      <div className="flex items-center gap-[1px]">
        <Button
          variant="default"
          className="rounded-r-none"
          disabled={disabled}
          onClick={() => {
            saveCalendar("publish");
          }}
        >
          {calendar?.id ? "Save" : "Publish"}
        </Button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              size="icon"
              className="rounded-l-none"
              disabled={disabled}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 z-[510000]" align="end">
            <DropdownMenuItem
              disabled
              className="opacity-60"
            >
              Create duplicate calendar
              <ProBadge />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
