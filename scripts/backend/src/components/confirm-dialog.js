import { __ } from "@wordpress/i18n";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const icons = {
  archive: (
    <svg className="h-5 w-5 text-destructive" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  ),
  delete: (
    <svg className="h-5 w-5 text-destructive" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  ),
  refund: (
    <svg className="h-5 w-5 text-destructive" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
    </svg>
  ),
  reset: (
    <svg className="h-5 w-5 text-destructive" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
    </svg>
  ),
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  icon = "delete",
  disabled = false,
}) {
  const iconEl = typeof icon === "string" ? icons[icon] : icon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[320px] rounded-xl p-6 gap-0">
        <AlertDialogHeader className="text-center gap-2">
          {iconEl && (
            <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              {iconEl}
            </div>
          )}
          <AlertDialogTitle className="text-[15px] font-semibold tracking-tight">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-5 flex-col gap-3 sm:flex-col sm:space-x-0">
          <AlertDialogAction
            className="w-full h-10 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 text-[13px] font-medium shadow-none"
            onClick={onConfirm}
            disabled={disabled}
          >
            {confirmLabel}
          </AlertDialogAction>
          <AlertDialogCancel
            className="w-full h-10 rounded-lg m-0 border-0 border-none text-[13px] font-normal text-muted-foreground hover:text-foreground hover:bg-muted/50 shadow-none bg-transparent"
          >
            {cancelLabel || __("Cancel", "eventkoi-lite")}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
