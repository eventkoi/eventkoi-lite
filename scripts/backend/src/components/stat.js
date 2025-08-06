import { cn } from "@/lib/utils";

export function Stat({ line1 = null, line2 = null }) {
  return (
    <div className={cn("flex flex-col border-l pl-3 py-1 gap-1")}>
      <div className="font-medium leading-5 text-muted-foreground uppercase text-xs">
        {line1}
      </div>
      <div className="font-medium leading-5 text-foreground text-xl">
        {line2 ? line2 : " "}
      </div>
    </div>
  );
}
