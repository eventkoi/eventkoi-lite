import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { __ } from "@wordpress/i18n";
import { useState } from "react";

export function CopyableOrderId({ id }) {
  const [copied, setCopied] = useState(false);
  const [tooltipKey, setTooltipKey] = useState(0);

  const handleCopy = () => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTooltipKey((k) => k + 1);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <TooltipProvider>
      <Tooltip key={tooltipKey} delayDuration={0}>
        <TooltipTrigger asChild>
          <span
            onClick={handleCopy}
            className="cursor-pointer text-sm text-muted-foreground truncate max-w-[180px] hover:underline"
          >
            {id.slice(0, 6)}...{id.slice(-4)}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="bg-foreground text-white px-2 py-1 text-xs rounded-md shadow-sm"
        >
          {copied ? __("Copied!", "eventkoi") : __("Click to copy", "eventkoi")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
