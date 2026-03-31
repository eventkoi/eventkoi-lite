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
  completed: "Completed",
  recurring: "Recurring",
  tbc: "Date not set",
  upcoming: "Upcoming",
  publish: "Upcoming",
  draft: "Draft",
  trash: "Trash",
};

export function EventBadge({ status }) {
  return (
    <Badge className="absolute top-2 right-2 opacity-90 flex gap-1 font-normal text-[12px] py-1 px-3 pointer-events-none">
      {status == "completed" && (
        <CircleCheck className="w-4 h-4 text-[#71ffca]" aria-hidden="true" />
      )}
      {status == "draft" && <CircleDotDashed className="w-4 h-4 text-white" aria-hidden="true" />}
      {status == "tbc" && <CircleDotDashed className="w-4 h-4 text-white" aria-hidden="true" />}
      {status == "upcoming" && <Clock3 className="w-4 h-4 text-[#9addff]" aria-hidden="true" />}
      {status == "live" && <CircleAlert className="w-4 h-4 text-[#ff8a88]" aria-hidden="true" />}
      {status == "publish" && <Clock3 className="w-4 h-4 text-[#48BEFA]" aria-hidden="true" />}
      {status == "recurring" && <Repeat className="w-4 h-4 text-white" aria-hidden="true" />}
      {status == "trash" && <Ban className="w-4 h-4 text-primary/40" aria-hidden="true" />}
      {statuses[status]}
    </Badge>
  );
}
