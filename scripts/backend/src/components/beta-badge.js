import { cn } from "@/lib/utils";

export function BetaBadge({ className, style }) {
  return (
    <span
      className={cn(
        "inline-flex items-center uppercase px-[6px] py-[3px] rounded-full bg-amber-100 text-[10px] font-semibold text-amber-800 border border-amber-300",
        className
      )}
      style={{ lineHeight: 1.2, ...style }}
    >
      Beta
    </span>
  );
}
