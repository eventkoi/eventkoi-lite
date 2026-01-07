import { Panel } from "@/components/panel";
import { ProBadge } from "@/components/pro-badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEventEditContext } from "@/hooks/EventEditContext";

const themeSlug = eventkoi_params?.theme || "twentytwentyfive";
const customTemplates = eventkoi_params?.custom_templates || [];

export function EventTemplate({
  isInstance = false,
  value = {},
  onChange,
  disabled = false,
}) {
  const { event, setEvent } = useEventEditContext();
  const isDisabled = Boolean(disabled);

  const template = isInstance
    ? value?.template || "default"
    : event?.template || "default";
  const slug = isInstance
    ? value?.slug || value?.post_name || value?.id
    : event?.slug || event?.post_name || event?.id;

  const expectedAutoTemplate = `single-event-${slug}`;
  const isManuallyAssigned =
    template !== "default" && template !== expectedAutoTemplate;

  const encodedTemplatePath = encodeURIComponent(
    `/wp_template/${themeSlug}//${template}`
  );

  const templateEditorUrl = isManuallyAssigned
    ? `${eventkoi_params.site_url}/wp-admin/site-editor.php?p=${encodedTemplatePath}&canvas=edit`
    : `${eventkoi_params.site_url}/wp-admin/site-editor.php?p=/template&activeView=eventkoi`;

  const handleChange = (value) => {
    if (isDisabled) return;
    if (isInstance && onChange) {
      onChange({ template: value });
    } else {
      setEvent((prev) => ({ ...prev, template: value }));
    }
  };

  return (
    <Panel className="p-0">
      <Label htmlFor="template" className="inline-flex items-center">
        Event template
        <ProBadge />
      </Label>
      <div className="text-muted-foreground">
        Select or edit the design template of your event page.
      </div>

      <div className="flex items-center gap-4 mt-2">
        <Select
          value={template}
          onValueChange={handleChange}
          disabled={isDisabled}
        >
          <SelectTrigger
            id="template"
            className="w-[250px]"
            disabled={isDisabled}
          >
            <SelectValue placeholder="Select a template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default template</SelectItem>
            {customTemplates.map((tpl) => (
              <SelectItem key={tpl.slug} value={tpl.slug}>
                {tpl.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <a
          href={templateEditorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary underline hover:text-primary/80 transition"
        >
          {isManuallyAssigned ? "Edit in Site Editor" : "View/edit template"}
        </a>
      </div>
    </Panel>
  );
}
