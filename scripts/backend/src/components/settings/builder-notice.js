import apiRequest from "@wordpress/api-fetch";
import { __, sprintf } from "@wordpress/i18n";
import { LayoutTemplate, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/SettingsContext";
import { showToast, showToastError } from "@/lib/toast";

const DISMISSED_KEY = "builder_notice_dismissed";

function BuilderLogo({ status, size = 40 }) {
  const box = { width: size, height: size };
  if (status.builder === "elementor") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
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
      <img src={status.logo} alt="" width={size} height={size} style={box} className="shrink-0 rounded-md object-contain" />
    );
  }

  return (
    <span style={box} className="flex shrink-0 items-center justify-center rounded-full bg-[#161616] text-white">
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

  const question = __(
    "EventKoi is currently using block editor templates for your events. Would you like to switch to page builder templates instead?",
    "eventkoi-lite"
  );

  const dismissLink = (
    <button
      type="button"
      className="cursor-pointer border-0 bg-transparent p-0 text-sm text-[#161616] underline hover:no-underline"
      disabled={!!pending}
      onClick={dismiss}
    >
      {__("Dismiss", "eventkoi-lite")}
    </button>
  );

  const switchButton = (status, variant) => (
    <Button
      variant={variant}
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
  );

  const boxClass =
    "rounded-lg border border-solid border-border bg-[#f7f7f7] p-5 max-w-[680px]";

  // Several builders on one site: one row each, so every choice lines up.
  if (!single) {
    return (
      <div role="status" data-ek-builder-notice className={`grid gap-4 ${boxClass}`}>
        <div className="grid gap-1">
          <div className="text-[15px] font-semibold leading-6 text-[#161616]">
            {__("Page builders detected.", "eventkoi-lite")}
          </div>
          <div className="text-sm leading-snug text-muted-foreground">{question}</div>
        </div>
        <ul className="m-0 grid list-none gap-2 p-0">
          {statuses.map((status) => (
            <li
              key={status.builder}
              className="m-0 grid justify-items-start gap-2.5 rounded-md bg-white px-3 py-2.5 sm:flex sm:items-center sm:justify-between sm:gap-3"
            >
              <span className="flex items-center gap-3 text-[14px] font-medium text-[#161616]">
                <BuilderLogo status={status} size={28} />
                {status.label}
              </span>
              {switchButton(status, "outline")}
            </li>
          ))}
        </ul>
        <div>{dismissLink}</div>
      </div>
    );
  }

  return (
    <div role="status" data-ek-builder-notice className={`flex items-start gap-4 ${boxClass}`}>
      <BuilderLogo status={single} />
      <div className="grid gap-3">
        <div className="grid gap-1">
          <div className="text-[15px] font-semibold leading-6 text-[#161616]">
            {sprintf(
              /* translators: %s: page builder name. */
              __("%s detected.", "eventkoi-lite"),
              single.label
            )}
          </div>
          <div className="text-sm leading-snug text-muted-foreground">
            {sprintf(
              /* translators: %s: page builder name. */
              __(
                "EventKoi is currently using block editor templates for your events. Would you like to switch to %s templates instead?",
                "eventkoi-lite"
              ),
              single.label
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {switchButton(single)}
          {dismissLink}
        </div>
      </div>
    </div>
  );
}
