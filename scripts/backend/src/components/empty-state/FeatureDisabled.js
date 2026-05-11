import { Button } from "@/components/ui/button";
import { Wrapper } from "@/components/wrapper";
import { __ } from "@wordpress/i18n";
import { CircleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * A simple disabled feature state for guarded routes.
 *
 * @param {string} title Optional heading text.
 * @param {string} message Optional body text.
 * @param {string} actionTo Optional action path.
 * @param {string} actionLabel Optional action label.
 */
export function FeatureDisabled({
  title,
  message,
  actionTo = "/settings/experimental",
  actionLabel,
}) {
  const navigate = useNavigate();

  return (
    <Wrapper>
      <div className="mx-auto flex max-w-md flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 rounded-full bg-amber-100 p-4 text-amber-700">
          <CircleAlert className="h-8 w-8" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          {title || __("Tickets feature is disabled", "eventkoi-lite")}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          {message ||
            __(
              "Enable Tickets in Settings > Experimental to access this page.",
              "eventkoi-lite"
            )}
        </p>
        <Button onClick={() => navigate(actionTo)} variant="default">
          {actionLabel || __("Go to Experimental settings", "eventkoi-lite")}
        </Button>
      </div>
    </Wrapper>
  );
}
