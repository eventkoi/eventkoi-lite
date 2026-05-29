import { Button } from "@/components/ui/button";
import { __ } from "@wordpress/i18n";
import { ExternalLink, Search } from "lucide-react";

export function SeoPluginEditorLink({ url }) {
  if (!url) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-1">
        <div className="text-sm font-medium text-foreground">
          {__("SEO plugins", "eventkoi-lite")}
        </div>
        <div className="text-sm text-muted-foreground">
          {__(
            "Open the WordPress editor to manage SEO plugin panels.",
            "eventkoi-lite"
          )}
        </div>
      </div>
      <Button asChild variant="outline" className="w-fit">
        <a href={url} target="_blank" rel="noreferrer">
          <Search className="mr-2 h-4 w-4" aria-hidden="true" />
          {__("Open WordPress SEO editor", "eventkoi-lite")}
          <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
        </a>
      </Button>
    </div>
  );
}
