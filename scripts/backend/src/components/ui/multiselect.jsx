"use client";

import { X } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function MultiSelect({
  options,
  placeholder,
  noItems,
  value,
  onSelectionChange,
  searchPlaceholder = "Search items...",
  disabled = false,
  inputClassName = "",
}) {
  const inputRef = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(value ?? []);
  const [inputValue, setInputValue] = React.useState("");

  const handleUnselect = React.useCallback(
    (option) => {
      if (disabled) return;
      setSelected((prev) => prev.filter((s) => s.id !== option.id));
    },
    [disabled]
  );

  const handleKeyDown = React.useCallback(
    (e) => {
      if (disabled) return;
      const input = inputRef.current;
      if (input) {
        if (
          (e.key === "Delete" || e.key === "Backspace") &&
          input.value === ""
        ) {
          setSelected((prev) => {
            const newSelected = [...prev];
            newSelected.pop();
            return newSelected;
          });
        }
        if (e.key === "Escape") {
          input.blur();
        }
      }
    },
    [disabled]
  );

  const selectables = options.filter(
    (option) => !selected.some((item) => option.id === item.id)
  );

  React.useEffect(() => {
    onSelectionChange(selected);
  }, [selected]);

  React.useEffect(() => {
    if (!Array.isArray(value)) return;

    const merged = value.map((v) => {
      if (!v.name) {
        const match = options.find((o) => o.id === v.id);
        return match ?? v;
      }
      return v;
    });

    setSelected(merged);
  }, [value, options]);

  const handleOpenChange = (nextOpen) => {
    if (disabled) return;
    setOpen(nextOpen);
  };

  return (
    <div
      className={cn(
        "group relative rounded-md border border-input ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        disabled && "opacity-50"
      )}
      aria-disabled={disabled}
    >
      <Popover open={disabled ? false : open} onOpenChange={handleOpenChange}>
        {selected.length > 0 && (
          <div className="absolute top-[0px] left-[0px] px-3 py-2 border-t-0 border-l-0 border-r-0 flex space-x-2">
            {selected.map((option) => (
              <Badge
                key={`option-${option.id}`}
                variant="secondary"
                className="text-sm text-foreground font-normal rounded"
              >
                {option.name}
                {!disabled && (
                  <button
                    className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleUnselect(option)
                    }
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={() => handleUnselect(option)}
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}

        <PopoverTrigger asChild>
          <Input
            ref={inputRef}
            value={
              inputValue ? inputValue : selected.length > 0 ? "" : placeholder
            }
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            className={cn(
              "flex-1 text-left leading-none bg-transparent outline-none border-none focus:shadow-none text-muted-foreground px-3 py-3",
              inputClassName
            )}
            aria-expanded={open}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
          <Command>
            <CommandInput
              placeholder={searchPlaceholder}
              className="outline-none border-none focus:shadow-none px-0"
            />
            <CommandList>
              <CommandEmpty>
                <span className="text-muted-foreground">{noItems}</span>
              </CommandEmpty>
              <CommandGroup>
                {selectables.map((option) => (
                  <CommandItem
                    key={option.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onSelect={() => {
                      if (disabled) return;
                      setInputValue("");
                      setSelected((prev) => [...prev, option]);
                    }}
                    className="cursor-pointer"
                  >
                    <span>{option.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
