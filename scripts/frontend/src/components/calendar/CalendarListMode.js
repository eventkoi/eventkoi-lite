"use client";

import { ListView } from "@/components/calendar/list-view";
import { TimezonePicker } from "@/components/timezone-picker";

export function CalendarListMode({
  events,
  timezone,
  setTimezone,
  timeFormat,
  setTimeFormat,
  showImage,
  showDescription,
  showLocation,
  borderStyle,
  borderSize,
  loading,
}) {
  return (
    <>
      <div className="flex justify-end pt-4 text-sm text-foreground">
        <TimezonePicker
          timezone={timezone}
          setTimezone={setTimezone}
          timeFormat={timeFormat}
          setTimeFormat={setTimeFormat}
        />
      </div>
      <ListView
        events={events}
        showImage={showImage}
        showDescription={showDescription}
        showLocation={showLocation}
        borderStyle={borderStyle}
        borderSize={borderSize}
        timeFormat={timeFormat}
        loading={loading}
      />
    </>
  );
}
