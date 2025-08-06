import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Panel } from "@/components/panel";

export function CalendarSlug({ calendar, setCalendar }) {
  let sanitizedSlug = calendar.name
    ? calendar.name.replace(/\s+/g, "-").toLowerCase()
    : "";

  return (
    <Panel>
      <Label htmlFor="slug">Slug</Label>
      <Input
        type="text"
        id={"slug"}
        value={calendar.slug ? calendar.slug : sanitizedSlug}
        placeholder={"Address"}
        className="max-w-[422px]"
        onChange={(e) => {
          setCalendar((prevState) => ({
            ...prevState,
            slug: e.target.value,
          }));
        }}
      />
      <div className="pt-1 text-muted-foreground">
        This determines the URL of your calendar:
        <br />
        <>
          {eventkoi_params.default_cal_url}
          {calendar.slug ? calendar.slug : sanitizedSlug}
        </>
      </div>
    </Panel>
  );
}
