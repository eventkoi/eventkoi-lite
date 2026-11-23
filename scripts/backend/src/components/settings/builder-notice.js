import apiRequest from "@wordpress/api-fetch";
import { __, sprintf } from "@wordpress/i18n";
import { LayoutTemplate, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/SettingsContext";
import { showToast, showToastError } from "@/lib/toast";

const DISMISSED_KEY = "builder_notice_dismissed";

function BuilderLogo({ status }) {
  if (status.builder === "elementor") {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
        <circle cx="12" cy="12" r="12" fill="#92003B" />
        <path
          fill="#ffffff"
          d="M7.5 7.5h2v9h-2zM11.5 7.5h5v1.8h-5zM11.5 11.1h5v1.8h-5zM11.5 14.7h5v1.8h-5z"
        />
      </svg>
    );
  }

  if (status.logo) {
    return (
      <img src={status.logo} alt="" width="40" height="40" className="h-10 w-10 shrink-0 object-contain" />
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#161616] text-white">
      <LayoutTemplate className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

/**
 * Tells a site running a page builder that its event pages still use the
 * block templates, and offers the builder's ready-made templates instead.
 * Shown until the owner switches or dismisses it, then never again.
 */
export function BuilderNotice({ usingDefaultTemplates }) {
  const { settings, setSettings } = useSettings();
  const [statuses] = useState(() => {
    const list = window?.eventkoi_params?.builder_templates;
    return Array.isArray(list) ? list : [];
  });
  const [pending, setPending] = useState("");
  const [hidden, setHidden] = useState(false);

  const dismissed = !!settings?.[DISMISSED_KEY] && settings[DISMISSED_KEY] !== "0";
  const inUse = statuses.some((status) => status?.active);

  if (hidden || dismissed || inUse || !usingDefaultTemplates || statuses.length === 0) {
    return null;
  }

  const remember = () =>
    apiRequest({
      path: `${eventkoi_params.api}/settings`,
      method: "post",
      data: { [DISMISSED_KEY]: "1" },
      headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
    });

  const dismiss = async () => {
    setHidden(true);
    try {
      const response = await remember();
      if (response?.settings) {
        setSettings(response.settings);
      }
    } catch (error) {
      setHidden(false);
      showToastError(error?.message ?? __("The notice could not be dismissed.", "eventkoi-lite"));
    }
  };

  const switchTo = async (status) => {
    if (pending) return;
    setPending(status.builder);

    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/${status.builder}-templates`,
        method: "POST",
        data: { action: "apply" },
      });

      if (Array.isArray(response?.builder_templates)) {
        window.eventkoi_params.builder_templates = response.builder_templates;
      }
      if (status.builder === "elementor" && response?.status) {
        window.eventkoi_params.elementor_templates = response.status;
      }
      if (Array.isArray(response?.custom_templates)) {
        window.eventkoi_params.custom_templates = response.custom_templates;
      }

      const saved = await remember();
      setHidden(true);
      setSettings(saved?.settings ?? response?.settings ?? settings);

      showToast({
        ...response,
        message: sprintf(
          /* translators: %s: page builder name. */
          __("%s templates are now in use.", "eventkoi-lite"),
          status.label
        ),
      });
    } catch (error) {
      showToastError(error?.message ?? __("The templates could not be updated.", "eventkoi-lite"));
    } finally {
      setPending("");
    }
  };

  const single = statuses.length === 1 ? statuses[0] : null;

  // "Elementor", "Elementor and Divi", "Elementor, Beaver Builder and Divi".
  const labels = statuses.map((status) => status.label);
  const names =
    labels.length > 1
      ? labels.slice(0, -1).join(", ") + __(" and ", "eventkoi-lite") + labels[labels.length - 1]
      : labels[0];

  return (
    <div
      role="status"
      data-ek-builder-notice
      className="flex items-start gap-4 rounded-lg border border-solid border-border bg-[#f7f7f7] p-5 max-w-[680px]"
    >
      <div className="flex shrink-0 items-center gap-2">
        {statuses.map((status) => (
          <BuilderLogo key={status.builder} status={status} />
        ))}
      </div>
      <div className="grid gap-3">
        <div className="grid gap-1">
          <div className="text-[15px] font-semibold leading-6 text-[#161616]">
            {sprintf(
              /* translators: %s: page builder name, or several names. */
              __("%s detected.", "eventkoi-lite"),
              names
            )}
          </div>
          <div className="text-sm leading-snug text-muted-foreground">
            {single
              ? sprintf(
                  /* translators: %s: page builder name. */
                  __(
                    "EventKoi is currently using block editor templates for your events. Would you like to switch to %s templates instead?",
                    "eventkoi-lite"
                  ),
                  single.label
                )
              : __(
                  "EventKoi is currently using block editor templates for your events. Would you like to switch to page builder templates instead?",
                  "eventkoi-lite"
                )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {statuses.map((status) => (
            <Button
              key={status.builder}
              className="h-9 cursor-pointer"
              disabled={!!pending}
              onClick={() => switchTo(status)}
            >
              {pending === status.builder && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {sprintf(
                /* translators: %s: page builder name. */
                __("Switch to %s templates", "eventkoi-lite"),
                status.label
              )}
            </Button>
          ))}
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0 text-sm text-[#161616] underline hover:no-underline"
            disabled={!!pending}
            onClick={dismiss}
          >
            {__("Dismiss", "eventkoi-lite")}
          </button>
        </div>
      </div>
    </div>
  );
}
