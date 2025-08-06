"use client";

import { Box } from "@/components/box";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Correct filled Zap icon (from Lucide, your version)
function ZapFilled({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      width={20}
      height={20}
      className={cn("inline-block align-middle text-foreground", className)}
      aria-hidden="true"
    >
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
    </svg>
  );
}

const features = [
  "Recurring events",
  "Unlimited calendars",
  "Priority support",
  "30 day money-back guarantee",
];

export function ProLaunch({ className }) {
  return (
    <Box container className={cn("border-[#B8D7D4] gap-8", className)}>
      <div className="flex gap-2">
        {/* Left: Text + Button + Features */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-[6px] mb-2">
            <ZapFilled />
            <div className="!m-0 !p-0 text-foreground text-[20px] font-medium">
              Access Pro features
            </div>
          </div>
          <div className="text-sm text-muted-foreground mb-4">
            Get 10% off any Pro plan when you upgrade today.
          </div>

          <Button
            asChild
            className="bg-[#3A6667] hover:bg-[#325c5c] min-w-[140px] text-white font-medium text-sm px-5 py-2 rounded-sm"
            size="sm"
          >
            <a
              href="https://eventkoi.com/upgradeqf35m3ref/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Claim discount
            </a>
          </Button>
        </div>
        {/* Right: 10% Discount */}
        <div className="flex flex-col items-center min-w-[82px] select-none">
          <span
            className="text-[60px] leading-[1] tracking-[-3px] block font-bold"
            style={{
              background:
                "linear-gradient(103deg, #2B4244 29.71%, #8CBCB9 57.08%, #4E8888 80.54%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            10%
          </span>
          <span className="font-bold uppercase tracking-wide text-[16px] text-[#3A6667] mt-[4px]">
            Discount
          </span>
        </div>
      </div>

      <hr className="border-t border-[#E1E7E8]" />
      <ul className="space-y-4 pl-0 mb-0">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-center gap-[6px] text-[15px] text-[#263130] font-normal"
          >
            <ZapFilled className="w-4 h-4" />
            {feature}
          </li>
        ))}
      </ul>
    </Box>
  );
}
