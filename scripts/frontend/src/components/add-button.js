import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

import { SquarePen } from "lucide-react";

export function AddButton({ title, type = "link", url, Icon = SquarePen }) {
  return (
    <Button
      className={cn(
        "bg-foreground border border-foreground font-normal hover:bg-accent hover:border-card-foreground hover:text-accent-foreground"
      )}
      asChild
    >
      {type === "link" ? (
        <Link to={url}>
          <Icon className="mr-2 h-4 w-4" />
          {title}
        </Link>
      ) : (
        <a href={url}>
          <Icon className="mr-2 h-4 w-4" />
          {title}
        </a>
      )}
    </Button>
  );
}
