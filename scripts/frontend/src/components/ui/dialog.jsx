"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";

import { getEventkoiPortalContainer } from "@/lib/portal";
import { cn } from "@/lib/utils";
import { __ } from "@wordpress/i18n";

const Dialog = DialogPrimitive.Root;

// Full-screen sheet on mobile, centered capped dialog on desktop. The content is
// a non-scrolling flex column (so the close button and a sticky footer stay put)
// with a DialogBody handling the scroll. Each modal appends its own sm:max-w-*.
const dialogSheetClass =
  "flex h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[90dvh] sm:w-[95vw] sm:rounded-lg";

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = (props) => (
  <DialogPrimitive.Portal container={getEventkoiPortalContainer()} {...props} />
);

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className={cn(
            "absolute right-4 top-3 inline-flex items-center justify-center",
            "rounded-full p-2 cursor-pointer bg-transparent shadow-none border-0",
            "text-muted-foreground opacity-70 transition-opacity",
            "hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
            "disabled:pointer-events-none"
          )}
        >
          <X className="h-5 w-5" />
          <span className="sr-only">{__("Close", "eventkoi-lite")}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

// Scrollable middle region for sheet-style dialogs: grows to fill the space
// between a fixed header and footer, scrolls its own overflow with a thin
// scrollbar, and contains rubber-banding to the dialog.
const DialogBody = ({ className, ...props }) => (
  <div
    className={cn(
      "ek-modal-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain",
      className
    )}
    {...props}
  />
);
DialogBody.displayName = "DialogBody";

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  dialogSheetClass,
  DialogTitle,
  DialogTrigger,
};
