import { cn } from "@/lib/utils";
import { format, isValid, setHours, setMinutes } from "date-fns";
import { useEffect, useRef, useState } from "react";

const formatTime = (date) =>
  format(date, "h:mm a").replace(" ", "").toLowerCase();

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  return formatTime(setMinutes(setHours(new Date(), hours), minutes));
});

export function TimeInput({ date, setDate, disabled }) {
  const [inputValue, setInputValue] = useState(() =>
    date && isValid(date) ? formatTime(date) : ""
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const optionRefs = useRef([]);

  const parseTime = (input) => {
    const cleaned = input.toLowerCase().replace(/\s/g, "");

    // Match 2:30, 2:30pm
    const colonMatch = cleaned.match(/^(\d{1,2}):(\d{2})(am|pm)?$/);
    if (colonMatch) {
      let [, h, m, ampm] = colonMatch;
      let hour = parseInt(h, 10);
      let minute = parseInt(m, 10);
      if (!ampm) {
        ampm = hour >= 7 && hour <= 11 ? "am" : "pm";
      }
      if (ampm === "pm" && hour < 12) hour += 12;
      if (ampm === "am" && hour === 12) hour = 0;

      const updated = new Date(date || new Date());
      updated.setHours(hour, minute, 0, 0);
      return updated;
    }

    // Match compact 230, 220, 4pm, 1130am
    const compactMatch = cleaned.match(/^(\d{1,2})(\d{2})?(am|pm)?$/);
    if (compactMatch) {
      let [, h, m, ampm] = compactMatch;
      let hour = parseInt(h, 10);
      let minute = m ? parseInt(m, 10) : 0;
      if (minute >= 60 || hour > 12) {
        // Invalid time like 2460 or 2510
        return null;
      }

      if (!ampm) {
        ampm = hour >= 7 && hour <= 11 ? "am" : "pm";
      }

      if (ampm === "pm" && hour < 12) hour += 12;
      if (ampm === "am" && hour === 12) hour = 0;

      const updated = new Date(date || new Date());
      updated.setHours(hour, minute, 0, 0);
      return updated;
    }

    return null;
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    setShowDropdown(true);

    const parsed = parseTime(value);
    if (parsed && isValid(parsed)) {
      const formatted = formatTime(parsed);
      const index = TIME_OPTIONS.findIndex((opt) => opt === formatted);
      setHighlightedIndex(index);
    } else {
      setHighlightedIndex(-1);
    }
  };

  const handleSelect = (option) => {
    setInputValue(option);
    const parsed = parseTime(option);
    if (parsed && isValid(parsed)) {
      setDate(parsed);
    }

    setShowDropdown(false); // ✅ keep it closed
    // no setTimeout or reopen here
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
      const formatted = formatTime(parsed);
      const index = TIME_OPTIONS.findIndex((opt) => opt === formatted);
      setHighlightedIndex(index);
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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!containerRef.current?.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
            e.preventDefault(); // prevent blur/re-focus cycle
            setShowDropdown(true);

            const parsed = parseTime(inputValue);
            if (parsed && isValid(parsed)) {
              const formatted = formatTime(parsed);
              const index = TIME_OPTIONS.findIndex((opt) => opt === formatted);
              setHighlightedIndex(index);
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
              key={option}
              type="button"
              onClick={() => handleSelect(option)}
              ref={(el) => (optionRefs.current[index] = el)}
              className={cn(
                "w-full px-3 py-2 text-left whitespace-nowrap",
                index === highlightedIndex && "bg-muted text-foreground"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
