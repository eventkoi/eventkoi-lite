import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";

export function Placeholder() {
  return (
    <div className="flex flex-col space-y-3">
      <AspectRatio ratio={1.5}>
        <Skeleton className="h-full w-full rounded-xl" />
      </AspectRatio>
      <div className="space-y-2">
        <Skeleton className="h-3 w-[80%]" />
        <Skeleton className="h-3 w-[60%]" />
        <Skeleton className="h-3 w-[40%]" />
      </div>
    </div>
  );
}
