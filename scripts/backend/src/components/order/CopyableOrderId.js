import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { __ } from "@wordpress/i18n";
import { Check, Copy } from "lucide-react";
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
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
            aria-label={__("Copy order ID", "eventkoi-lite")}
          >
            <span className="max-w-full break-all text-left font-mono">
              {id}
            </span>
            {copied ? (
              <Check className="h-3.5 w-3.5 flex-shrink-0" />
            ) : (
              <Copy className="h-3.5 w-3.5 flex-shrink-0" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="bg-foreground text-white px-2 py-1 text-xs rounded-md shadow-sm"
        >
          {copied ? __("Copied!", "eventkoi-lite") : __("Click to copy", "eventkoi-lite")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
