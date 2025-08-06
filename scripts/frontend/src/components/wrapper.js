import { cn } from "@/lib/utils";

export function Wrapper({ className, children }) {
  return (
    <main
      className={cn(
        "flex flex-1 flex-col w-full max-w-[1280px] mx-auto py-8 px-8",
        className
      )}
    >
      {children}
    </main>
  );
}
