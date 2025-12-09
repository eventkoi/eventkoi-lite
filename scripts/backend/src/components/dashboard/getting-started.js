import { BigLink } from "@/components/big-link";
import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { __ } from "@wordpress/i18n";
import { Rocket } from "lucide-react";

function BinocularsIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10 10h4" />
      <path d="M19 7V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v3" />
      <path d="M20 21a2 2 0 0 0 2-2v-3.851c0-1.39-2-2.962-2-4.829V8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v11a2 2 0 0 0 2 2z" />
      <path d="M 22 16 L 2 16" />
      <path d="M4 21a2 2 0 0 1-2-2v-3.851c0-1.39 2-2.962 2-4.829V8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2z" />
      <path d="M9 7V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v3" />
    </svg>
  );
}

export function GettingStarted() {
  return (
    <Box container>
      <Heading level={3}>{__("Getting started", "eventkoi-lite")}</Heading>
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 w-full">
        <BigLink
          href="#/dashboard/onboarding?step=calendar"
          className="flex-1 flex-col items-center text-center w-full h-auto justify-center py-8"
          target="_self"
        >
          <Rocket className="min-w-5 min-h-5 w-5 h-5 mb-2" />
          <span className="block">
            {__("Launch onboarding wizard", "eventkoi-lite")}
          </span>
        </BigLink>
        <BigLink
          href="#/events?onboarding=demo-event&hint=1"
          className="flex-1 flex-col items-center text-center w-full h-auto justify-center py-8"
          target="_self"
        >
          <BinocularsIcon className="min-w-5 min-h-5 w-5 h-5 mb-2" />
          <span className="block">
            {__("Begin plugin tour", "eventkoi-lite")}
          </span>
        </BigLink>
      </div>
    </Box>
  );
}
