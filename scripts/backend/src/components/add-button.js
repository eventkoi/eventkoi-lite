import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

export function AddButton({ title, type = "link", url, Icon = Plus }) {
  return (
    <Button
      className={cn(
        "bg-foreground border border-foreground font-normal hover:bg-accent hover:border-card-foreground hover:text-accent-foreground"
      )}
      asChild
    >
      {type === "link" ? (
        <Link to={url}>
          <Icon className="mr-2 h-5 w-5" />
          {title}
        </Link>
      ) : (
        <a href={url}>
          <Icon className="mr-2 h-5 w-5" />
          {title}
        </a>
      )}
    </Button>
  );
}
