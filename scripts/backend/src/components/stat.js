import { cn } from "@/lib/utils";

export function Stat({
  line1 = null,
  line2 = null,
  className = "",
  labelClassName = "",
}) {
  return (
    <div
      className={cn("flex flex-col border-l pl-3 py-1 gap-1", className)}
    >
      <div
        className={cn(
          "font-medium leading-5 text-muted-foreground uppercase text-xs",
          labelClassName,
        )}
      >
        {line1}
      </div>
      <div className="font-medium leading-5 text-foreground text-xl">
        {line2 ?? " "}
      </div>
    </div>
  );
}
