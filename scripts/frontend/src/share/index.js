import { __ } from "@wordpress/i18n";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  dialogSheetClass,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  EmailIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  WhatsappIcon,
  XIcon,
} from "@/icons";

import { ShareLink } from "@/components/share-link";
import { CheckCheck, Copy } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";

export function ShareButton({ base, html }) {
  const { event } = window.eventkoi_params;

  const [copying, setCopying] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  base.style.padding = 0;
  base.style.border = 0;

  useEffect(() => {
    // Open dialog automatically if #event-share is in the URL
    if (window.location.hash === "#event-share") {
      setIsDialogOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isDialogOpen && window.location.hash === "#event-share") {
      // Remove #event-share when modal is closed
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
    }
  }, [isDialogOpen]);

  return (
    <>
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={() => setIsDialogOpen(true)}
      />
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className={`${dialogSheetClass} sm:max-w-[685px]`}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="flex-none flex items-center justify-center p-4 border-0 border-solid border-b-2 border-input">
            <DialogTitle className="font-sans text-xl m-0 text-foreground">
              {__("Share this event", "eventkoi-lite")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {__(
                "Share this event using the options below or copy its link.",
                "eventkoi-lite"
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col pt-6 pb-8 px-5 sm:pt-[30px] sm:pb-[60px] sm:px-[60px]">
            <div className="flex gap-4 items-center flex-wrap justify-center pb-[60px]">
              <ShareLink
                event={event}
                name="whatsapp"
                title={__("WhatsApp", "eventkoi-lite")}
                icon={<WhatsappIcon />}
              />
              <ShareLink
                event={event}
                name="instagram"
                title={__("Instagram", "eventkoi-lite")}
                icon={<InstagramIcon />}
              />
              <ShareLink
                event={event}
                name="email"
                title={__("Email", "eventkoi-lite")}
                icon={<EmailIcon />}
              />
              <ShareLink
                event={event}
                name="facebook"
                title={__("Facebook", "eventkoi-lite")}
                icon={<FacebookIcon />}
              />
              <ShareLink
                event={event}
                name="x"
                title={__("X", "eventkoi-lite")}
                icon={<XIcon />}
              />
              <ShareLink
                event={event}
                name="linkedin"
                title={__("LinkedIn", "eventkoi-lite")}
                icon={<LinkedinIcon />}
              />
            </div>
            <div className="flex flex-col gap-3 pb-[10px]">
              <Label htmlFor="link" className="text-base">
                {__("Event link", "eventkoi-lite")}
              </Label>
              <div className="relative">
                <Input
                  id="link"
                  defaultValue={event?.url}
                  readOnly
                  aria-describedby="copy-feedback"
                  className="min-h-[66px] border border-input border-solid border-primary/30 box-border text-lg text-foreground"
                />
                <Button
                  variant="secondary"
                  type="button"
                  aria-label={__("Copy event link to clipboard", "eventkoi-lite")}
                  className="absolute h-12 right-[9px] top-[9px] border-none cursor-pointer hover:bg-input"
                  onClick={() => {
                    setCopying(true);
                    navigator.clipboard.writeText(event?.url);
                    setTimeout(() => {
                      setCopying(false);
                    }, 1200);
                  }}
                >
                  {copying ? (
                    <CheckCheck className="mr-2 h-5 w-5" />
                  ) : (
                    <Copy className="mr-2 h-5 w-5" />
                  )}
                  {copying
                    ? __("Copied!", "eventkoi-lite")
                    : __("Copy", "eventkoi-lite")}
                </Button>
                <div id="copy-feedback" aria-live="polite" className="sr-only">
                  {copying &&
                    __("Event link copied to clipboard", "eventkoi-lite")}
                </div>
              </div>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}

const elements = document.querySelectorAll("a[href='#event-share']");

Array.from(elements).forEach((el) => {
  const root = createRoot(el);
  root.render(
    <ErrorBoundary>
      <ShareButton base={el} html={el.outerHTML} />
    </ErrorBoundary>
  );
});
