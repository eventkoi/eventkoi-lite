import { cn } from "@/lib/utils";

export function Panel({ className, children }) {
  return (
    <div className={cn("flex flex-col gap-2 px-6 py-8", className)}>
      {children}
    </div>
  );
}
