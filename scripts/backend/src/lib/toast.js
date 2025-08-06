import { toast } from "sonner";

export function BaseToast({ message, url, variant = "default" }) {
  const variantClasses = {
    default: "bg-neutral-900 text-white border border-neutral-800",
    success: "bg-green-600 text-white border border-green-500",
    error: "bg-red-600 text-white border border-red-500",
  };

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-md p-3 text-sm font-medium w-[280px] shadow-lg ${variantClasses[variant]}`}
    >
      <div className="flex-1">{message}</div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 text-xs hover:no-underline"
        >
          View
        </a>
      )}
    </div>
  );
}

export function showToast(response) {
  if (!response?.message) return;

  const variant = response?.variant || "default";

  toast.custom(
    (t) => (
      <BaseToast
        message={response.message}
        url={response.url}
        variant={variant}
      />
    ),
    { duration: 4000 }
  );
}

export function showStaticToast(message) {
  if (!message) return;

  toast.custom((t) => <BaseToast message={message} variant="default" />, {
    duration: 4000,
  });
}

export function showToastError(error) {
  if (!error) return;

  toast.custom((t) => <BaseToast message={error} variant="error" />, {
    duration: 4000,
  });
}
