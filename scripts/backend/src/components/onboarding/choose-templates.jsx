import apiRequest from "@wordpress/api-fetch";
import { __ } from "@wordpress/i18n";
import { CircleCheck, Loader2 } from "lucide-react";
import { useState } from "react";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSettings } from "@/hooks/SettingsContext";
import { showToast, showToastError } from "@/lib/toast";
import { cn } from "@/lib/utils";

const initialStatus = () => window?.eventkoi_params?.elementor_templates ?? null;

/**
 * Ask Elementor users whether their event pages should open on the
 * ready-made Elementor templates instead of the block templates.
 */
export function ChooseTemplatesStep() {
  const { setSettings } = useSettings();
  const [status, setStatus] = useState(initialStatus);
  const [choice, setChoice] = useState(() =>
    status?.active ? "elementor" : "default",
  );
  const [pending, setPending] = useState("");

  const applyChoice = async (value) => {
    if (pending) return;

    setChoice(value);
    setPending(value);

    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/elementor-templates`,
        method: "POST",
        data: { action: value === "elementor" ? "apply" : "reset" },
      });

      if (response?.status) {
        setStatus(response.status);
        window.eventkoi_params.elementor_templates = response.status;
      }
      if (Array.isArray(response?.custom_templates)) {
        // The settings pickers read this snapshot; keep it current so the
        // imported templates are listed there without a reload.
        window.eventkoi_params.custom_templates = response.custom_templates;
      }
      if (response?.settings) {
        setSettings(response.settings);
      }

      showToast({
        ...response,
        message:
          value === "elementor"
            ? __("Elementor templates are now in use.", "eventkoi-lite")
            : __("Default templates are back in use.", "eventkoi-lite"),
      });
    } catch (error) {
      setChoice(status?.active ? "elementor" : "default");
      showToastError(
        error?.message ?? __("The templates could not be updated.", "eventkoi-lite"),
      );
    } finally {
      setPending("");
    }
  };

  const templates = Object.values(status?.templates ?? {});
  const showLinks = choice === "elementor" && status?.active && !pending;

  const options = [
    {
      value: "elementor",
      title: __("Yes, use Elementor templates", "eventkoi-lite"),
      description: __(
        "Event, event series and calendar pages open on templates built for Elementor. Edit them in Elementor like any other template.",
        "eventkoi-lite",
      ),
    },
    {
      value: "default",
      title: __("No, keep the default templates", "eventkoi-lite"),
      description: __(
        "Pages keep EventKoi's built-in templates. You can switch to the Elementor templates later from Settings.",
        "eventkoi-lite",
      ),
    },
  ];

  return (
    <div className="grid gap-8">
      <div className="grid gap-1.5">
        <h3 className="font-medium text-[24px] leading-7 text-black m-0">
          {__("Would you like to use Elementor templates for your events?", "eventkoi-lite")}
        </h3>
        <div className="text-muted-foreground leading-5 text-[14px]">
          {__(
            "Elementor is active on this site, so your event pages can be designed in Elementor from the start.",
            "eventkoi-lite",
          )}
        </div>
      </div>

      <RadioGroup
        value={choice}
        onValueChange={applyChoice}
        className="grid gap-3"
        disabled={!!pending}
        aria-label={__("Event templates", "eventkoi-lite")}
      >
        {options.map((option) => {
          const isSelected = choice === option.value;
          const isPending = pending === option.value;

          return (
            <label
              key={option.value}
              className={cn(
                "flex items-start gap-3 rounded-lg border border-solid p-4 cursor-pointer transition",
                isSelected ? "border-[#161616] bg-[#fafafa]" : "border-border bg-white",
                pending && !isPending && "opacity-60",
              )}
            >
              <RadioGroupItem
                value={option.value}
                id={`ek-templates-${option.value}`}
                className="mt-0.5 shrink-0"
              />
              <span className="grid gap-1">
                <span className="flex items-center gap-2 text-[14px] font-medium text-[#161616]">
                  {option.title}
                  {isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                </span>
                <span className="text-sm text-muted-foreground leading-snug">
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </RadioGroup>

      {showLinks && templates.length > 0 && (
        <div className="grid gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-[#1a8f6e]">
            <CircleCheck className="h-4 w-4" aria-hidden="true" />
            {__("Templates ready. Edit them any time:", "eventkoi-lite")}
          </div>
          <ul className="m-0 p-0 list-none grid gap-4">
            {templates.map((template) => (
              <li key={template.slug} className="grid gap-1 text-sm">
                <a
                  href={template.edit_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#161616] font-medium underline hover:no-underline"
                >
                  {template.title}
                  <span className="sr-only"> {__("(opens in new tab)", "eventkoi-lite")}</span>
                </a>
                <span className="text-muted-foreground leading-snug">{template.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
