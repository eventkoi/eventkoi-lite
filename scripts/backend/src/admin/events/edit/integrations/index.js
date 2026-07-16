import { Box } from "@/components/box";
import { EventMetaboxEmbed } from "@/components/event/event-metabox-embed";
import { Heading } from "@/components/heading";
import { SeoPluginEditorLink } from "@/components/seo-plugin-editor-link";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { __ } from "@wordpress/i18n";

// Groups the third-party plugin panels into their own tab: custom-field
// metaboxes (ACF, Pods, Meta Box) embedded from the real editor, plus a link
// to SEO plugins that only render in the block editor.
export function EventEditIntegrations() {
  const { event } = useEventEditContext();

  return (
    <div className="flex w-full flex-col gap-8">
      <EventMetaboxEmbed />

      {event?.id && event?.has_seo_plugin && (
        <Box container className="gap-4">
          <Heading level={3}>{__("SEO", "eventkoi-lite")}</Heading>
          <SeoPluginEditorLink url={event?.native_edit_url} />
        </Box>
      )}
    </div>
  );
}
