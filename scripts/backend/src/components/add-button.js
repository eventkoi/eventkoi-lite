import { ProBadge } from "@/components/pro-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

export function AddButton({
  title,
  type = "link",
  url,
  locked = false,
  Icon = Plus,
}) {
  const content = (
    <>
      <Icon className="mr-2 h-5 w-5" />
      {title}
      {locked && <ProBadge />}
    </>
  );

  return (
    <Button
      className={cn(
        "bg-foreground border border-foreground font-normal hover:bg-accent hover:border-card-foreground hover:text-accent-foreground",
        locked &&
          "cursor-default border-[#e9e9e9] bg-[#e9e9e9] text-muted-foreground hover:border-[#e9e9e9] hover:bg-[#e9e9e9] hover:text-muted-foreground"
      )}
      asChild
    >
      {type === "link" ? (
        <Link to={locked ? "#" : url}>{content}</Link>
      ) : (
        <a href={locked ? "#" : url}>{content}</a>
      )}
    </Button>
  );
}
