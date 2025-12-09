import { Separator } from "@/components/ui/separator";
import { dateI18n } from "@wordpress/date";
import { __ } from "@wordpress/i18n";

import { Button } from "@/components/ui/button";

export function ConfirmTimezoneFormatStep() {
  const timezone =
    window?.eventkoi_params?.timezone_string ||
    window?.eventkoi_params?.timezone ||
    "UTC";
  const offsetSeconds = window?.eventkoi_params?.timezone_offset ?? 0;
  const dateFormat = window?.eventkoi_params?.date_format || "F j, Y";
  const timeFormatString =
    window?.eventkoi_params?.time_format_string || "g:i a";

  const formatOffset = (seconds) => {
    const totalMinutes = Math.round(seconds / 60);
    const sign = totalMinutes >= 0 ? "+" : "-";
    const absMinutes = Math.abs(totalMinutes);
    const hoursNum = Math.floor(absMinutes / 60);
    const minutesNum = absMinutes % 60;
    const hours = hoursNum.toString();
    const minutes =
      minutesNum === 0 ? "" : `:${String(minutesNum).padStart(2, "0")}`;
    return `UTC ${sign}${hours}${minutes}`;
  };

  const displayTimezone = timezone.includes("/")
    ? timezone.split("/").pop().replace(/_/g, " ")
    : timezone;
  const formattedOffset = formatOffset(offsetSeconds);
  const formattedDate = dateI18n(dateFormat, Date.now(), timezone);
  const formattedTime = dateI18n(timeFormatString, Date.now(), timezone);

  return (
    <div className="grid gap-8">
      <div className="grid gap-1.5">
        <h3 className="font-medium text-[24px] leading-7 text-black m-0">
          Confirm timezone and date format
        </h3>
        <div className="text-[#808080] leading-5 text-[14px]">
          {__(
            "EventKoi uses this site’s default timezone and date format.\nGo to General Settings if you want to change them.",
            "eventkoi-lite"
          )
            .split("\n")
            .map((line, i) => (
              <span key={i} className={i > 0 ? "block" : undefined}>
                {line}
              </span>
            ))}
        </div>
      </div>

      <div className="border border-border border-solid rounded-sm grid gap-4 p-[20px]">
        <div className="text-[16px] font-medium text-[#161616]">
          {__("Site defaults", "eventkoi-lite")}
        </div>

        <div className="grid gap-4 text-sm">
          <div className="flex justify-between items-center gap-1">
            <div className="text-[#161616] font-medium">
              {__("Timezone", "eventkoi-lite")}
            </div>
            <div className="font-medium text-[#161616] text-right">
              <span className="block">{displayTimezone}</span>
              <span className="block text-[#555] font-normal">
                {formattedOffset}
              </span>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center gap-1">
            <div className="text-[#161616] font-medium">
              {__("Date format", "eventkoi-lite")}
            </div>
            <div className="font-medium text-[#161616] text-right">
              <span className="block">{formattedDate}</span>
              <span className="block text-[#555] font-normal">
                {dateFormat}
              </span>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center gap-1">
            <div className="text-[#161616] font-medium">
              {__("Time format", "eventkoi-lite")}
            </div>
            <div className="font-medium text-[#161616] text-right">
              <span className="block">{formattedTime}</span>
              <span className="block text-[#555] font-normal">
                {timeFormatString}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button
            asChild
            className="border-[#161616] text-[#fff] bg-[#161616] hover:bg-[#000] h-5"
          >
            <a
              href={window?.eventkoi_params?.general_options_url}
              target="_blank"
              rel="noreferrer"
              className="no-underline"
            >
              {__("Go to General Settings and change", "eventkoi-lite")}
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
