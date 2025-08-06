import { Button } from "@/components/ui/button";
import { Wrapper } from "@/components/wrapper";
import { __ } from "@wordpress/i18n";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * A generic "Not Found" UI for orders, events, calendars, etc.
 *
 * @param {string} type - Entity type (e.g., "order", "event", "calendar").
 * @param {string} title - Optional custom title.
 * @param {string} message - Optional custom message.
 * @param {string} actionTo - Optional custom fallback path.
 * @param {string} actionLabel - Optional button label.
 */
export function NotFound({
  type = "order",
  title,
  message,
  actionTo,
  actionLabel,
}) {
  const navigate = useNavigate();

  const entityLabel =
    {
      order: __("Order", "eventkoi"),
      event: __("Event", "eventkoi"),
      calendar: __("Calendar", "eventkoi"),
      ticket: __("Ticket", "eventkoi"),
      item: __("Item", "eventkoi"),
    }[type] || __("Item", "eventkoi");

  const fallbackPath =
    {
      order: "/tickets/orders",
      event: "/events",
      calendar: "/calendars",
      ticket: "/tickets",
      item: "/",
    }[type] || "/";

  return (
    <Wrapper>
      <div className="flex flex-col items-center justify-center text-center py-24 max-w-md mx-auto">
        <div className="mb-4 rounded-full bg-red-100 text-red-600 p-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold mb-2 text-foreground">
          {title || sprintf(__("%s not found", "eventkoi"), entityLabel)}
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          {message ||
            sprintf(
              __(
                "This %s may have been deleted, or the link you followed is invalid.",
                "eventkoi"
              ),
              entityLabel.toLowerCase()
            )}
        </p>
        <Button
          onClick={() => navigate(actionTo || fallbackPath)}
          variant="default"
        >
          {actionLabel || sprintf(__("Back to all %s", "eventkoi"), `${type}s`)}
        </Button>
      </div>
    </Wrapper>
  );
}
