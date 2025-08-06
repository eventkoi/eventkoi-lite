"use client";

import * as React from "react";
import { cn } from "@/lib/utils"
import { X, Check, ChevronsUpDown } from "lucide-react"

import { Badge } from "@/components/ui/badge";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { Input } from "@/components/ui/input"

export function MultiSelect( props ) {

  const { options, placeholder, noItems, value, onSelectionChange } = props;

  const selectedValue = value ? value : [];

  const inputRef = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState( selectedValue );
  const [inputValue, setInputValue] = React.useState("");

  const handleUnselect = React.useCallback((option) => {
    setSelected((prev) => prev.filter((s) => s.value !== option.value));
  }, []);

  const handleKeyDown = React.useCallback(
    (e) => {
      const input = inputRef.current;
      if (input) {
        if (e.key === "Delete" || e.key === "Backspace") {
          if (input.value === "") {
            setSelected((prev) => {
              const newSelected = [...prev];
              newSelected.pop();
              return newSelected;
            });
          }
        }
        // This is not a default behaviour of the <input /> field
        if (e.key === "Escape") {
          input.blur();
        }
      }
    },
    []
  );

  const selectables = options.filter(
    (option) => !selected.some(item => option.value === item.value )
  );

  React.useEffect(() => {
    onSelectionChange(selected)
  },[selected]);

  return (
    <div className="group relative rounded-md border border-input ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <Popover open={open} onOpenChange={setOpen}>

        { selected.length > 0 && (
        <div className="absolute top-[0px] left-[0px] px-3 py-2 border-t-0 border-l-0 border-r-0 flex space-x-2">
          {selected.map((option) => {
            return (
              <Badge key={ `option-${option.value}` } variant="secondary" className="text-foreground font-medium rounded">
                {option.label}
                <button
                  className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUnselect(option);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => handleUnselect(option)}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            );
          })}
        </div>
        )}

        <PopoverTrigger asChild>
          <Input
            ref={inputRef}
            value={ inputValue ? inputValue : ( selected.length > 0 ? "" : placeholder ) }
            onChange={setInputValue}
            placeholder={ placeholder }
            className="flex-1 text-left leading-none bg-transparent outline-none border-none focus:shadow-none text-muted-foreground px-3 py-3"
            aria-expanded={open}
          />
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
          <Command>
            <CommandInput placeholder="Search lists..." className="outline-none border-none focus:shadow-none px-0" />
            <CommandList>
              <CommandEmpty><span className="text-muted-foreground">{ noItems }</span></CommandEmpty>
              <CommandGroup>
                {selectables.map((option) => {
                  return (
                    <CommandItem
                      key={option.value}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onSelect={(value) => {
                        setInputValue("");
                        setSelected((prev) => [...prev, option]);
                      }}
                      className={"cursor-pointer"}
                    >
                      <span>{option.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );

}