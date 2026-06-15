import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/SettingsContext";
import { wpToLuxonFormat } from "@/lib/date-utils";
import { isValid } from "date-fns";
import { DateTime } from "luxon";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * TimeInput: renders and parses wall times in a given timezone (wpTz),
 * but calls setDate() with a UTC Date so parent can store in UTC.
 */
const hasUnescapedToken = (format, token) => {
  let escaped = false;

  for (const char of format || "") {
    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === token) {
      return true;
    }
  }

  return false;
};

export function TimeInput({
  date,
  setDate,
  disabled,
  wpTz = "UTC",
  commitOnValidChange = false,
}) {
  const { settings } = useSettings();
  const params = typeof eventkoi_params !== "undefined" ? eventkoi_params : {};
  const formatParams = { ...params, ...(settings || {}) };
  const is24h = formatParams?.time_format === "24";
  const wpTimeFormatRaw =
    formatParams?.time_format_string || (is24h ? "H:i" : "g:i a");
  const luxonTimeFormat = wpToLuxonFormat(wpTimeFormatRaw);
  const wpLocale = (formatParams?.locale || params?.locale || "en").replace("_", "-");
  const prefers24h =
    is24h ||
    (!hasUnescapedToken(wpTimeFormatRaw, "a") &&
      !hasUnescapedToken(wpTimeFormatRaw, "A") &&
      (hasUnescapedToken(wpTimeFormatRaw, "G") ||
        hasUnescapedToken(wpTimeFormatRaw, "H")));

  const applyMeridiemCase = (value) => {
    if (hasUnescapedToken(wpTimeFormatRaw, "A")) {
      return value.replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase());
    }

    if (hasUnescapedToken(wpTimeFormatRaw, "a")) {
      return value.replace(/\b(am|pm)\b/gi, (match) => match.toLowerCase());
    }

    return value;
  };

  const formatDateTime = (dt) => {
    if (!dt?.isValid) {
      return "";
    }

    return applyMeridiemCase(dt.setLocale(wpLocale).toFormat(luxonTimeFormat));
  };

  // Format a Date into wall time in WP timezone
  const formatTime = (d) =>
    formatDateTime(DateTime.fromJSDate(d, { zone: wpTz }));

  const buildDateWithTime = (hour, minute) =>
    DateTime.fromJSDate(date || new Date(), { zone: wpTz })
      .set({ hour, minute, second: 0, millisecond: 0 })
      .setZone("utc")
      .toJSDate();

  const findOptionIndex = (d) => {
    const dt = DateTime.fromJSDate(d, { zone: "utc" }).setZone(wpTz);

    if (!dt.isValid) {
      return -1;
    }

    return TIME_OPTIONS.findIndex(
      (option) => option.hour === dt.hour && option.minute === dt.minute
    );
  };

  // Build dropdown options once
  const TIME_OPTIONS = useMemo(() => {
    return Array.from({ length: 96 }, (_, i) => {
      const hour = Math.floor(i / 4);
      const minute = (i % 4) * 15;
      const dt = DateTime.fromObject(
        { hour, minute },
        { zone: wpTz }
      );
      return {
        hour,
        minute,
        key: `${hour}:${minute}`,
        label: formatDateTime(dt),
      };
    });
  }, [wpTz, wpLocale, luxonTimeFormat, wpTimeFormatRaw]);

  const [inputValue, setInputValue] = useState(() =>
    date && isValid(date) ? formatTime(date) : ""
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const optionRefs = useRef([]);

  useEffect(() => {
    if (document.activeElement === inputRef.current) {
      return;
    }

    setInputValue(date && isValid(date) ? formatTime(date) : "");
  }, [date, wpTz, wpLocale, luxonTimeFormat, wpTimeFormatRaw]);

  // Parse a typed time string in WP tz → return UTC Date
  const parseTime = (input) => {
    if (!input) return null;
    const cleaned = input.toLowerCase().replace(/\s/g, "");

    // Match 2:30, 2:30pm, 14:30
    const colonMatch = cleaned.match(/^(\d{1,2}):(\d{2})(am|pm)?$/);
    if (colonMatch) {
      let [, h, m, ampm] = colonMatch;
      let hour = parseInt(h, 10);
      let minute = parseInt(m, 10);
      if (minute > 59) return null;

      if (ampm) {
        if (hour < 1 || hour > 12) return null;
        if (ampm === "pm" && hour < 12) hour += 12;
        if (ampm === "am" && hour === 12) hour = 0;
      } else if (!prefers24h && hour <= 12) {
        if (!ampm) ampm = hour >= 7 && hour <= 11 ? "am" : "pm";
        if (ampm === "pm" && hour < 12) hour += 12;
        if (ampm === "am" && hour === 12) hour = 0;
      } else if (hour > 23) {
        return null;
      }

      return buildDateWithTime(hour, minute);
    }

    // Match compact 230, 4pm, 1130am, or 14 (meaning 14:00 in 24h)
    const compactMatch = cleaned.match(/^(\d{1,2})(\d{2})?(am|pm)?$/);
    if (compactMatch) {
      let [, h, m, ampm] = compactMatch;
      let hour = parseInt(h, 10);
      let minute = m ? parseInt(m, 10) : 0;
      if (minute >= 60) return null;

      if (ampm) {
        if (hour < 1 || hour > 12) return null;
        if (ampm === "pm" && hour < 12) hour += 12;
        if (ampm === "am" && hour === 12) hour = 0;
      } else if (!prefers24h) {
        if (hour > 12) return null;
        if (!ampm) ampm = hour >= 7 && hour <= 11 ? "am" : "pm";
        if (ampm === "pm" && hour < 12) hour += 12;
        if (ampm === "am" && hour === 12) hour = 0;
      } else if (hour > 23) {
        return null;
      }

      return buildDateWithTime(hour, minute);
    }

    return null;
  };

  const isCompleteTypedTime = (input) => {
    const cleaned = String(input || "").toLowerCase().replace(/\s/g, "");

    if (/^\d{1,2}:\d{2}(am|pm)?$/.test(cleaned)) {
      return true;
    }

    if (/^\d{1,2}(am|pm)$/.test(cleaned)) {
      return true;
    }

    if (/^\d{1,2}\d{2}(am|pm)?$/.test(cleaned)) {
      return true;
    }

    return prefers24h && /^\d{1,2}$/.test(cleaned);
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    setShowDropdown(true);

    const parsed = parseTime(value);
    if (parsed && isValid(parsed)) {
      setHighlightedIndex(findOptionIndex(parsed));
      if (commitOnValidChange && isCompleteTypedTime(value)) {
        setDate(parsed);
      }
    } else {
      setHighlightedIndex(-1);
    }
  };

  const handleSelect = (option) => {
    setInputValue(option.label);
    const parsed = buildDateWithTime(option.hour, option.minute);
    if (parsed && isValid(parsed)) {
      setDate(parsed); // UTC date to parent
    }
    setShowDropdown(false);
  };

  const handleBlur = () => {
    const parsed = parseTime(inputValue);
    if (parsed && isValid(parsed)) {
      setDate(parsed);
      setInputValue(formatTime(parsed));
    }
  };

  const handleFocus = () => {
    if (disabled) return;
    setShowDropdown(true);

    const parsed = parseTime(inputValue);
    if (parsed && isValid(parsed)) {
      setHighlightedIndex(findOptionIndex(parsed));
    } else {
      setHighlightedIndex(-1);
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!showDropdown) setShowDropdown(true);
      setHighlightedIndex((prev) =>
        prev < TIME_OPTIONS.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!showDropdown) setShowDropdown(true);
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : TIME_OPTIONS.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex !== -1) {
        handleSelect(TIME_OPTIONS[highlightedIndex]);
      } else {
        const parsed = parseTime(inputValue);
        if (parsed && isValid(parsed)) {
          setDate(parsed);
          setInputValue(formatTime(parsed));
          setShowDropdown(false);
        }
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // Click outside closes dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!containerRef.current?.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keep highlighted option in view
  useEffect(() => {
    if (
      highlightedIndex !== -1 &&
      optionRefs.current[highlightedIndex] &&
      showDropdown
    ) {
      optionRefs.current[highlightedIndex].scrollIntoView({
        block: "nearest",
      });
    }
  }, [highlightedIndex, showDropdown]);

  return (
    <div ref={containerRef} className="relative w-[100px]">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        placeholder="Set time"
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onMouseDown={(e) => {
          if (document.activeElement === inputRef.current && !showDropdown) {
            e.preventDefault();
            setShowDropdown(true);
            const parsed = parseTime(inputValue);
            if (parsed && isValid(parsed)) {
              setHighlightedIndex(findOptionIndex(parsed));
            }
          }
        }}
        disabled={disabled}
        inputMode="text"
        className={cn(
          "h-10 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
          "placeholder:text-muted-foreground",
          disabled
            ? "bg-muted text-muted-foreground/40 cursor-not-allowed opacity-100"
            : "bg-background"
        )}
      />

      {showDropdown && !disabled && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover text-sm shadow-md">
          {TIME_OPTIONS.map((option, index) => (
            <button
              key={option.key}
              type="button"
              onClick={() => handleSelect(option)}
              ref={(el) => (optionRefs.current[index] = el)}
              className={cn(
                "w-full px-3 py-2 text-left whitespace-nowrap",
                index === highlightedIndex && "bg-muted text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
