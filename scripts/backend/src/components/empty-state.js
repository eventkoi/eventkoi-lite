import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Ghost } from "lucide-react";
import { Link } from "react-router-dom";

export function EmptyState({
  icon: Icon = Ghost,
  title = "Nothing here",
  message = "This area seems a bit empty.",
  actionLabel,
  actionTo,
  className,
}) {
  return (
    <div
      className={cn("flex-1 flex items-center justify-center px-4", className)}
    >
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-4 text-muted-foreground">
          <Icon className="w-10 h-10" />
        </div>

        <h2 className="text-lg font-semibold text-foreground mb-1">{title}</h2>

        <p className="text-sm text-muted-foreground mb-6">{message}</p>

        {actionLabel && actionTo && (
          <Button variant="outline" asChild>
            <Link to={actionTo}>{actionLabel}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
