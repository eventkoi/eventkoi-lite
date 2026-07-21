import { Panel } from "@/components/panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { foldAccents } from "@/lib/slug";
import { __, sprintf } from "@wordpress/i18n";

const cleanSlug = (value) =>
  foldAccents(value)
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const trimSlash = (value) => String(value || "").replace(/^\/+|\/+$/g, "");

export function EventSlug() {
  const { event, setEvent, settings } = useEventEditContext();
  const titleSlug = cleanSlug(event?.title);
  const slugPath = event?.slug ? event.slug : titleSlug;
  const permalinkBase = trimSlash(
    settings?.permalinks?.event_rewrite_slug ||
      settings?.permalinks?.event_base ||
      "event"
  );
  const siteUrl = trimSlash(eventkoi_params?.site_url || "");
  const exampleUrl = `${siteUrl}/${permalinkBase}/${slugPath || "event-name"}/`;

  return (
    <Panel className="p-0">
      <Label htmlFor="event-slug">{__("Slug", "eventkoi-lite")}</Label>
      <Input
        type="text"
        id="event-slug"
        value={slugPath}
        placeholder={__("Address", "eventkoi-lite")}
        className="w-full"
        onChange={(e) => {
          setEvent((prevState) => ({
            ...prevState,
            slug: cleanSlug(e.target.value),
          }));
        }}
      />
      <div className="text-muted-foreground truncate" title={exampleUrl}>
        {sprintf(
          /* translators: %s: example event URL. */
          __("Define the URL of your event (e.g. %s)", "eventkoi-lite"),
          exampleUrl
        )}
      </div>
    </Panel>
  );
}
