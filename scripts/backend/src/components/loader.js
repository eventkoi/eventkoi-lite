import { Spinner } from "@/components/ui/spinner";

export function Loader({ size }) {
  return (
    <div className="flex w-full h-full flex-1 items-center justify-center">
      <Spinner size={size} />
    </div>
  );
}
