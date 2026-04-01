import apiRequest from "@wordpress/api-fetch";
import { __ } from "@wordpress/i18n";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ChevronDown } from "lucide-react";

import { showToast } from "@/lib/toast";

export function EventNavBar({ loading, setLoading, event, setEvent }) {
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);

  let disabled = (!event?.id && !event?.title) || saving;

  const trashEvent = async () => {
    setLoading(true);
    await apiRequest({
      path: `${eventkoi_params.api}/delete_event`,
      method: "post",
      data: {
        event_id: event?.id,
      },
      headers: {
        "EVENTKOI-API-KEY": eventkoi_params.api_key,
      },
    })
      .then((response) => {
        setLoading(false);
        navigate("/events");
        showToast(response);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  const duplicateEvent = async () => {
    setSaving(true);
    setLoading(true);
    const originalId = event?.id;
    await apiRequest({
      path: `${eventkoi_params.api}/duplicate_event`,
      method: "post",
      data: {
        event_id: event?.id,
      },
      headers: {
        "EVENTKOI-API-KEY": eventkoi_params.api_key,
      },
    })
      .then((response) => {
        setSaving(false);
        setLoading(false);
        setEvent(response);
        showToast(response);

        if (response.update_endpoint) {
          window.location.hash = window.location.hash.replace(
            originalId,
            response.id
          );
        }
      })
      .catch(() => {
        setSaving(false);
        setLoading(false);
      });
  };

  const saveEvent = async (status) => {
    setSaving(true);
    await apiRequest({
      path: `${eventkoi_params.api}/update_event`,
      method: "post",
      data: {
        event: event,
        status: status,
      },
      headers: {
        "EVENTKOI-API-KEY": eventkoi_params.api_key,
      },
    })
      .then((response) => {
        setSaving(false);
        setEvent(response);
        showToast(response);

        if (response.update_endpoint) {
          window.location.hash = window.location.hash.replace(
            "add",
            response.id
          );
        }
      })
      .catch((error) => {
        setSaving(false);
      });
  };

  return (
    <div className="flex gap-2">
      {event?.wp_status === "draft" && (
        <Button
          variant="ghost"
          disabled={disabled}
          onClick={() => {
            saveEvent("draft");
          }}
        >
          {__("Save draft", "eventkoi")}
        </Button>
      )}
      <Button
        variant="link"
        disabled={disabled}
        onClick={() => window.open(event?.url, "_blank")}
      >
        {__("Preview", "eventkoi")}
      </Button>
      <div className="flex items-center gap-[1px]">
        <Button
          variant="default"
          className="rounded-r-none"
          disabled={disabled}
          onClick={() => {
            saveEvent("publish");
          }}
        >
          {event?.wp_status === "draft"
            ? __("Publish", "eventkoi")
            : __("Save", "eventkoi")}
        </Button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              size="icon"
              className="rounded-l-none"
              disabled={disabled}
              aria-label={__("More actions", "eventkoi")}
            >
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 z-[510]" align="end">
            {/* <DropdownMenuItem>Schedule publish</DropdownMenuItem> */}
            <DropdownMenuItem
              disabled={!event?.id}
              onClick={() => {
                duplicateEvent();
              }}
            >
              {__("Create duplicate event", "eventkoi")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {event?.wp_status === "publish" && (
              <DropdownMenuItem
                onClick={() => {
                  saveEvent("draft");
                }}
              >
                {__("Unpublish", "eventkoi")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                trashEvent();
              }}
            >
              {__("Move to trash", "eventkoi")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
