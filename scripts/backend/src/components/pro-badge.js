import { Zap } from "lucide-react";

export function ProBadge() {
  return (
    <span
      className="ml-2 inline-flex items-center uppercase px-[6px] py-[3px] rounded-full bg-primary text-xs font-semibold text-white gap-[2px]"
      style={{ lineHeight: 1.2 }}
    >
      <Zap className="h-3 w-3 fill-white text-white" strokeWidth={0} />
      Pro
    </span>
  );
}
