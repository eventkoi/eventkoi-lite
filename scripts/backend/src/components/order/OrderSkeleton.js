// components/order/OrderSkeleton.jsx
import { Skeleton } from "@/components/ui/skeleton";
import { Wrapper } from "@/components/wrapper";

export function OrderSkeleton() {
  return (
    <Wrapper>
      <div className="mb-6">
        <div className="flex items-center gap-4 text-2xl font-medium">
          <Skeleton className="h-6 w-32 rounded-md bg-muted-foreground/10" />
          <Skeleton className="h-5 w-20 rounded-md bg-muted-foreground/10" />
        </div>
        <Skeleton className="h-3 w-56 mt-2 rounded bg-muted-foreground/10" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        <div className="md:col-span-2 flex flex-col space-y-6 flex-1">
          <div className="rounded-xl border bg-white p-6 flex-1 flex flex-col justify-between space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-32" />
            <div className="flex justify-end pt-4 space-x-2 mt-auto">
              <Skeleton className="h-4 w-10 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
            <div className="rounded-xl border bg-white p-6 flex flex-col flex-1 space-y-4">
              <Skeleton className="h-5 w-28 rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-4 w-40 rounded" />
            </div>
            <div className="rounded-xl border bg-white p-6 flex flex-col flex-1 space-y-4">
              <Skeleton className="h-5 w-28 rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-4 w-40 rounded" />
            </div>
          </div>
        </div>
        <div className="flex flex-col h-full">
          <div className="rounded-xl border bg-white p-6 flex flex-col h-full">
            <Skeleton className="h-5 w-24 mb-4" />
            <div className="grow space-y-4 min-h-[220px] overflow-y-auto pr-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))}
            </div>
            <div className="mt-auto space-y-2">
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
