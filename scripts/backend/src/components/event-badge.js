import { Badge } from "@/components/ui/badge";

import {
  Ban,
  CircleAlert,
  CircleCheck,
  CircleDotDashed,
  Clock3,
  Repeat,
} from "lucide-react";

const statuses = {
  live: "Live",
  ongoing: "Ongoing",
  completed: "Completed",
  recurring: "Recurring",
  tbc: "Date not set",
  upcoming: "Upcoming",
  publish: "Upcoming",
  draft: "Draft",
  trash: "Trash",
};

export function EventBadge({ status }) {
  // Fall back to "upcoming" for any unknown / missing status so the badge never renders blank.
  const safe = statuses[status] ? status : "upcoming";
  return (
    <Badge className="absolute top-2 right-2 opacity-90 flex gap-1 font-normal text-[12px] py-1 px-3 pointer-events-none">
      {safe == "completed" && (
        <CircleCheck className="w-4 h-4 text-[#71ffca]" aria-hidden="true" />
      )}
      {safe == "draft" && <CircleDotDashed className="w-4 h-4 text-white" aria-hidden="true" />}
      {safe == "tbc" && <CircleDotDashed className="w-4 h-4 text-white" aria-hidden="true" />}
      {safe == "upcoming" && <Clock3 className="w-4 h-4 text-[#9addff]" aria-hidden="true" />}
      {safe == "live" && <CircleAlert className="w-4 h-4 text-[#ff8a88]" aria-hidden="true" />}
      {safe == "ongoing" && <CircleDotDashed className="w-4 h-4 text-[#ff8a88]" aria-hidden="true" />}
      {safe == "publish" && <Clock3 className="w-4 h-4 text-[#48BEFA]" aria-hidden="true" />}
      {safe == "recurring" && <Repeat className="w-4 h-4 text-white" aria-hidden="true" />}
      {safe == "trash" && <Ban className="w-4 h-4 text-primary/40" aria-hidden="true" />}
      {statuses[safe]}
    </Badge>
  );
}
