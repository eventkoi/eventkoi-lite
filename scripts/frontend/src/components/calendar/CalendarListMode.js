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
  showTimezone = true,
  borderStyle,
  borderSize,
  loading,
}) {
  return (
    <>
      {showTimezone && (
        <div className="flex justify-end pt-4 text-sm text-foreground">
          <TimezonePicker
            timezone={timezone}
            setTimezone={setTimezone}
            timeFormat={timeFormat}
            setTimeFormat={setTimeFormat}
          />
        </div>
      )}
      <ListView
        events={events}
        timezone={timezone}
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
