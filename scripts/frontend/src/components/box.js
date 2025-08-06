import { cn } from "@/lib/utils";

export function Box({ className, children }) {
  return (
    <div
      className={cn(
        "w-full flex flex-col rounded-lg border text-sm bg-card text-card-foreground shadow-sm gap-6",
        className
      )}
    >
      {children}
    </div>
  );
}
