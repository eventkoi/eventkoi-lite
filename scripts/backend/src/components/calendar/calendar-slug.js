import { __, sprintf } from "@wordpress/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Panel } from "@/components/panel";

export function CalendarSlug({ calendar, setCalendar }) {
  let sanitizedSlug = calendar.name
    ? calendar.name.replace(/\s+/g, "-").toLowerCase()
    : "";
  const slugPath = calendar.slug ? calendar.slug : sanitizedSlug;

  return (
    <Panel className="p-0">
      <Label htmlFor="slug">{__("Slug", "eventkoi-lite")}</Label>
      <Input
        type="text"
        id={"slug"}
        value={slugPath}
        placeholder={__("Address", "eventkoi-lite")}
        className="max-w-[422px]"
        onChange={(e) => {
          setCalendar((prevState) => ({
            ...prevState,
            slug: e.target.value,
          }));
        }}
      />
      <div className="text-muted-foreground">
        {__("Define the URL of your calendar", "eventkoi-lite")}
        <br />
        <>
          {sprintf(
            /* translators: 1: calendar base URL, 2: calendar slug */
            __("(e.g. %1$s%2$s)", "eventkoi-lite"),
            eventkoi_params.default_cal_url,
            slugPath,
          )}
        </>
      </div>
    </Panel>
  );
}
