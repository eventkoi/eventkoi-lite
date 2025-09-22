import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
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

export function ShareButton({ base, html }) {
  const { event } = eventkoi_params;

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
          className="w-full max-w-[685px] p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="flex items-center justify-center p-4 border-0 border-solid border-b-2 border-input">
            <DialogTitle className="font-sans text-xl m-0 text-foreground">
              Share this event
            </DialogTitle>
            <DialogDescription className="hidden"></DialogDescription>
          </DialogHeader>
          <div className="flex flex-col pt-[30px] pb-[60px] px-[60px]">
            <div className="flex gap-4 items-center flex-wrap justify-center pb-[60px]">
              <ShareLink
                event={event}
                name="whatsapp"
                title="Whatsapp"
                icon={<WhatsappIcon />}
              />
              <ShareLink
                event={event}
                name="instagram"
                title="Instagram"
                icon={<InstagramIcon />}
              />
              <ShareLink
                event={event}
                name="email"
                title="Email"
                icon={<EmailIcon />}
              />
              <ShareLink
                event={event}
                name="facebook"
                title="Facebook"
                icon={<FacebookIcon />}
              />
              <ShareLink event={event} name="x" title="X" icon={<XIcon />} />
              <ShareLink
                event={event}
                name="linkedin"
                title="Linkedin"
                icon={<LinkedinIcon />}
              />
            </div>
            <div className="flex flex-col gap-3 pb-[10px]">
              <Label className="text-base">Event link</Label>
              <div className="relative">
                <Input
                  id="link"
                  defaultValue={event?.url}
                  readOnly
                  className="min-h-[66px] border border-input border-solid border-primary/30 box-border text-lg text-foreground"
                />
                <Button
                  variant="secondary"
                  type="submit"
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
                  {copying ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const elements = document.querySelectorAll("a[href='#event-share']");

Array.from(elements).forEach((el) => {
  const root = createRoot(el);
  root.render(<ShareButton base={el} html={el.outerHTML} />);
});
