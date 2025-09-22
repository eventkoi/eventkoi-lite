import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function NavControls({ calendarApi, currentDate, setCurrentDate }) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="text-[1px] box-border p-0 w-10 h-10 border-solid shadow-none cursor-pointer rounded"
        onClick={() => calendarApi?.prev()}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="text-[1px] box-border p-0 w-10 h-10 border-solid shadow-none cursor-pointer rounded"
        onClick={() => calendarApi?.next()}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
