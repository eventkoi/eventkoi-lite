import apiRequest from "@wordpress/api-fetch";
import { __, sprintf } from "@wordpress/i18n";
import { CircleCheck, Loader2 } from "lucide-react";
import { useState } from "react";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSettings } from "@/hooks/SettingsContext";
import { showToast, showToastError } from "@/lib/toast";
import { cn } from "@/lib/utils";

const initialStatuses = () => {
  const statuses = window?.eventkoi_params?.builder_templates;
  return Array.isArray(statuses) ? statuses : [];
};

/**
 * Ask sites running a page builder (Elementor, Beaver Builder, Divi) whether
 * their event pages should open on the ready-made templates for that builder
 * instead of the block templates.
 */
export function ChooseTemplatesStep() {
  const { setSettings } = useSettings();
  const [statuses, setStatuses] = useState(initialStatuses);
  const activeBuilder = (list) =>
    list.find((status) => status?.active)?.builder ?? "default";
  const [choice, setChoice] = useState(() => activeBuilder(statuses));
  const [pending, setPending] = useState("");

  const single = statuses.length === 1 ? statuses[0] : null;

  const applyChoice = async (value) => {
    if (pending) return;

    // Going back to the default templates undoes whichever builder is in use.
    const builder =
      value === "default"
        ? statuses.find((status) => status?.active)?.builder ??
          statuses[0]?.builder
        : value;

    if (!builder) return;

    const label =
      statuses.find((status) => status?.builder === value)?.label ?? "";

    setChoice(value);
    setPending(value);

    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/${builder}-templates`,
        method: "POST",
        data: { action: value === "default" ? "reset" : "apply" },
      });

      if (Array.isArray(response?.builder_templates)) {
        setStatuses(response.builder_templates);
        setChoice(activeBuilder(response.builder_templates));
        window.eventkoi_params.builder_templates = response.builder_templates;
      }
      if (builder === "elementor" && response?.status) {
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
          value === "default"
            ? __("Default templates are back in use.", "eventkoi-lite")
            : sprintf(
                /* translators: %s: page builder name. */
                __("%s templates are now in use.", "eventkoi-lite"),
                label,
              ),
      });
    } catch (error) {
      setChoice(activeBuilder(statuses));
      showToastError(
        error?.message ?? __("The templates could not be updated.", "eventkoi-lite"),
      );
    } finally {
      setPending("");
    }
  };

  const chosen = statuses.find((status) => status?.builder === choice);
  const templates = Object.values(chosen?.templates ?? {});
  const showLinks = !!chosen?.active && !pending;

  const options = [
    ...statuses.map((status) => ({
      value: status.builder,
      title: sprintf(
        /* translators: %s: page builder name. */
        __("Yes, use %s templates", "eventkoi-lite"),
        status.label,
      ),
      description: sprintf(
        /* translators: %s: page builder name. */
        __(
          "Event, event series and calendar pages open on templates built for %1$s. Edit them in %1$s like any other template.",
          "eventkoi-lite",
        ),
        status.label,
      ),
    })),
    {
      value: "default",
      title: __("No, keep the default templates", "eventkoi-lite"),
      description: single
        ? sprintf(
            /* translators: %s: page builder name. */
            __(
              "Pages keep EventKoi's built-in templates. You can switch to the %s templates later from Settings.",
              "eventkoi-lite",
            ),
            single.label,
          )
        : __(
            "Pages keep EventKoi's built-in templates. You can switch to page builder templates later from Settings.",
            "eventkoi-lite",
          ),
    },
  ];

  const heading = single
    ? sprintf(
        /* translators: %s: page builder name. */
        __("Would you like to use %s templates for your events?", "eventkoi-lite"),
        single.label,
      )
    : __(
        "Would you like to use page builder templates for your events?",
        "eventkoi-lite",
      );

  const intro = single
    ? sprintf(
        /* translators: %s: page builder name. */
        __(
          "%1$s is active on this site, so your event pages can be designed in %1$s from the start.",
          "eventkoi-lite",
        ),
        single.label,
      )
    : __(
        "More than one page builder is active on this site. Pick the one your event pages should be designed in.",
        "eventkoi-lite",
      );

  return (
    <div className="grid gap-8">
      <div className="grid gap-1.5">
        <h3 className="font-medium text-[24px] leading-7 text-black m-0">
          {heading}
        </h3>
        <div className="text-muted-foreground leading-5 text-[14px]">
          {intro}
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
