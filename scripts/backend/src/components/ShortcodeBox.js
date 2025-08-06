import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CheckCheck, Copy } from "lucide-react";
import { useState } from "react";

const LABEL_WIDTH_CLASS = "w-[90px]";

export function ShortcodeBox({ attribute, data, eventId }) {
  const [copiedKey, setCopiedKey] = useState("");
  const [tooltipKey, setTooltipKey] = useState(Date.now());

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTooltipKey(Date.now());
    setTimeout(() => setCopiedKey(""), 1200);
  };

  const shortcode = `[eventkoi id=${eventId} data=${data}]`;

  return (
    <div className="inline-flex w-fit flex-col rounded-sm border bg-muted p-2 text-sm space-y-2">
      <TooltipProvider delayDuration={0}>
        {/* Attribute */}
        <div className="flex flex-wrap items-center gap-1">
          <span
            className={cn(
              "font-normal text-[12px] text-muted-foreground",
              LABEL_WIDTH_CLASS
            )}
          >
            Block attribute:
          </span>
          <div className="relative bg-[#eeeeee] flex items-center p-1 pt-2 py-1.5 pl-2 rounded-sm">
            <div className="text-xs font-mono pr-8">{attribute}</div>
            <Tooltip key={`attr-${tooltipKey}`}>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-white absolute top-[3px] right-[4px] p-0 w-6 h-6 border-none rounded-sm cursor-pointer hover:bg-white"
                  onClick={() => handleCopy(attribute, "attribute")}
                  aria-label="Copy attribute"
                >
                  {copiedKey === "attribute" ? (
                    <CheckCheck className="h-4 w-4 transition-all duration-200" />
                  ) : (
                    <Copy className="h-4 w-4 transition-all duration-200" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent
                className="bg-zinc-900 text-white px-3 py-1.5 text-sm rounded-md shadow-none border-none"
                side="top"
                sideOffset={8}
              >
                {copiedKey === "attribute" ? "Copied!" : "Copy attribute"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Shortcode */}
        <div className="flex flex-wrap items-center gap-1">
          <span
            className={cn(
              "font-normal text-[12px] text-muted-foreground",
              LABEL_WIDTH_CLASS
            )}
          >
            Shortcode:
          </span>
          <div className="relative bg-[#eeeeee] flex items-center p-1 pt-2 py-1.5 pl-2 rounded-sm">
            <div className="text-xs font-mono pr-8">{shortcode}</div>
            <Tooltip key={`code-${tooltipKey}`}>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-white absolute top-[3px] right-[4px] p-0 w-6 h-6 border-none rounded-sm cursor-pointer hover:bg-white"
                  onClick={() => handleCopy(shortcode, "shortcode")}
                  aria-label="Copy shortcode"
                >
                  {copiedKey === "shortcode" ? (
                    <CheckCheck className="h-4 w-4 transition-all duration-200" />
                  ) : (
                    <Copy className="h-4 w-4 transition-all duration-200" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent
                className="bg-zinc-900 text-white px-3 py-1.5 text-sm rounded-md shadow-none border-none"
                side="top"
                sideOffset={8}
              >
                {copiedKey === "shortcode" ? "Copied!" : "Copy shortcode"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
