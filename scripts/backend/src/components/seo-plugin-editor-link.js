import { Button } from "@/components/ui/button";
import { __ } from "@wordpress/i18n";
import { ExternalLink, Pencil } from "lucide-react";

export function SeoPluginEditorLink({ url }) {
  // Some SEO plugins (Rank Math, and Yoast's block panel) render their editor
  // only inside the WordPress block editor, so they cannot appear in the
  // embedded "Other plugin fields" panel. Offer a direct link to edit SEO
  // there. Shown only when a SEO plugin is active (gated by the caller).
  if (!url) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-1">
        <div className="text-sm font-medium text-foreground">
          {__("SEO settings", "eventkoi-lite")}
        </div>
        <div className="text-sm text-muted-foreground">
          {__(
            "Your SEO plugin (such as Rank Math or Yoast) adds its panel to the WordPress editor. Open it there to edit this event's SEO.",
            "eventkoi-lite"
          )}
        </div>
      </div>
      <Button asChild variant="outline" className="w-fit">
        <a href={url} target="_blank" rel="noreferrer">
          <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
          {__("Edit SEO in the WordPress editor", "eventkoi-lite")}
          <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
        </a>
      </Button>
    </div>
  );
}
