import { cn } from "@/lib/utils";

export function Box({ container = false, className, children }) {
  return (
    <div
      className={cn(
        "w-full flex flex-col rounded-lg border text-sm bg-card text-card-foreground shadow-sm gap-6",
        container && "p-6",
        className
      )}
    >
      {children}
    </div>
  );
}
