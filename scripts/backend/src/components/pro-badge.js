import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

export function ProBadge({ className }) {
  return (
    <span
      className={cn(
        "ml-2 inline-flex items-center uppercase px-[6px] py-[3px] rounded-full bg-primary text-xs font-semibold text-white gap-[2px]",
        className
      )}
      style={{ lineHeight: 1.2 }}
    >
      <Zap className="h-3 w-3 fill-white text-white" strokeWidth={0} />
      Pro
    </span>
  );
}
