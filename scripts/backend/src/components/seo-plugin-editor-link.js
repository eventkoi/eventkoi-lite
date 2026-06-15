import { Button } from "@/components/ui/button";
import { __ } from "@wordpress/i18n";
import { ExternalLink, Pencil } from "lucide-react";

export function SeoPluginEditorLink({ url }) {
  // The native WordPress editor is where third-party meta panels live: SEO
  // plugins (Yoast, Rank Math, etc.), ACF custom fields, and any other metabox
  // that can't render inside EventKoi's editor. Always offer it when the user
  // can edit the event (url is only set for users with edit access), so it is
  // never hidden just because a particular plugin isn't detected.
  if (!url) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-1">
        <div className="text-sm font-medium text-foreground">
          {__("WordPress editor", "eventkoi-lite")}
        </div>
        <div className="text-sm text-muted-foreground">
          {__(
            "Open this event in the WordPress editor to manage panels added by other plugins, such as SEO (Yoast, Rank Math) and custom fields (ACF).",
            "eventkoi-lite"
          )}
        </div>
      </div>
      <Button asChild variant="outline" className="w-fit">
        <a href={url} target="_blank" rel="noreferrer">
          <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
          {__("Open WordPress editor", "eventkoi-lite")}
          <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
        </a>
      </Button>
    </div>
  );
}
