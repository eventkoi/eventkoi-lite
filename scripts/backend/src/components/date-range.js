import { Button } from "@/components/ui/button";
import { MemoCalendar as Calendar } from "@/components/ui/memo-calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSettings } from "@/hooks/SettingsContext";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createSearchParams,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

export function DateWithRange() {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const queryStatus = searchParams.get("status");
  const eventStatus = searchParams.get("event_status");
  const calStatus = searchParams.get("calendar");

  const [date, setDate] = useState({
    from: from ? from : null,
    to: to ? to : null,
  });

  const placeholder = "Date range";

  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    // If neither from nor to: clear filter
    if (
      (!date?.from && !date?.to) ||
      (date && Object.keys(date).length === 0)
    ) {
      if (from || to) resetDateRange();
      return;
    }

    // Otherwise, always filter with the selected values
    let params = {};

    if (queryStatus) params.status = queryStatus;
    if (eventStatus) params.event_status = eventStatus;
    if (calStatus) params.calendar = calStatus;
    if (date.from) params.from = format(date.from, "yyyy-MM-dd");
    if (date.to) params.to = format(date.to, "yyyy-MM-dd");

    navigate({
      pathname: "",
      search: `?${createSearchParams(params)}`,
    });
  }, [date]);

  const resetDateRange = () => {
    let params = {};

    if (queryStatus) {
      params.status = queryStatus;
    }

    if (eventStatus) {
      params.event_status = eventStatus;
    }

    if (calStatus) {
      params.calendar = calStatus;
    }

    setDate({});
    navigate({
      pathname: "",
      search: `?${createSearchParams(params)}`,
    });
  };

  function handleDateSelect(range) {
    // If user selects the same date twice (start==end, and selects that date again): clear!
    if (
      range?.from &&
      range?.to &&
      range.from.getTime() === range.to.getTime()
    ) {
      setDate({});
      return;
    }

    // If user clicks the existing start date again, clear
    if (
      range?.from &&
      !range?.to &&
      date?.from &&
      !date?.to &&
      range.from.getTime() === new Date(date.from).getTime()
    ) {
      setDate({});
      return;
    }

    // If user clicks the existing end date again, clear
    if (
      !range?.from &&
      range?.to &&
      !date?.from &&
      date?.to &&
      range.to.getTime() === new Date(date.to).getTime()
    ) {
      setDate({});
      return;
    }

    // Otherwise, normal behavior
    setDate(range || {});
  }

  const { settings } = useSettings();

  const mapWeekStart = (stored) => {
    if (stored === undefined || stored === null || stored === "") {
      stored = 0; // fallback = Monday
    }
    const n = Number(stored);

    if (n === 6) return 0; // your Sunday → RD Picker Sunday
    if (n >= 0 && n <= 5) return n + 1; // shift forward
    return 1; // fallback Monday
  };

  const weekStartsOn = mapWeekStart(settings?.week_starts_on);

  return (
    <div className={cn("grid")}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              date && date.from
                ? date.to
                  ? "w-[250px]"
                  : "w-[150px]"
                : "w-auto",
              "justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align={isMobile ? "start" : "end"}
        >
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            numberOfMonths={2}
            weekStartsOn={weekStartsOn}
            onSelect={handleDateSelect}
          />
          {date && Object.keys(date).length > 0 && (
            <div className="p-3 pt-0 flex justify-center">
              <Button
                variant={"link"}
                className="p-0"
                onClick={() => resetDateRange()}
              >
                Clear date filter
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
