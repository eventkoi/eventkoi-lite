import { cn } from "@/lib/utils";

export function RefundStatusIcon({ className }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("w-4 h-4", className)}
    >
      <rect
        x="2"
        y="2"
        width="12"
        height="12"
        rx="1.33333"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 6V8.4M5 8.4H7M5 8.4L6 7.32C6.54962 6.72846 7.26171 6.4009 8 6.4C8.79565 6.4 9.55871 6.77928 10.1213 7.45442C10.6839 8.12955 11 9.04522 11 10"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
