import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";

const spinnerVariants = cva("flex-col items-center justify-center", {
  variants: {
    show: {
      true: "flex",
      false: "hidden",
    },
  },
  defaultVariants: {
    show: true,
  },
});

const loaderVariants = cva("animate-spin text-primary/20", {
  variants: {
    size: {
      small: "size-6",
      medium: "size-8",
      large: "size-12",
    },
  },
  defaultVariants: {
    size: "medium",
  },
});

export function Spinner({ size, show, children, className, label }) {
  return (
    <span className={spinnerVariants({ show })} role="status">
      <LoaderCircle className={cn(loaderVariants({ size }), className)} aria-hidden="true" />
      {children || <span className="sr-only">{label || "Loading…"}</span>}
    </span>
  );
}
