import { cn } from "@/lib/utils";

export function Panel({ variant, className, children }) {
  let defaultClass = "flex flex-col gap-2 px-6 py-8 w-full";

  if (variant === "header") {
    defaultClass = "flex flex-col gap-2 px-6 py-4 w-full";
  }

  return <div className={cn(defaultClass, className)}>{children}</div>;
}
