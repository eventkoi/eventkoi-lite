import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Panel } from "@/components/panel";

export function CalendarSlug({ calendar, setCalendar }) {
  let sanitizedSlug = calendar.name
    ? calendar.name.replace(/\s+/g, "-").toLowerCase()
    : "";

  return (
    <Panel className="p-0">
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
      <div className="text-muted-foreground">
        Define the URL of your calendar
        <br />
        <>
          (e.g. {eventkoi_params.default_cal_url}
          {calendar.slug ? calendar.slug : sanitizedSlug})
        </>
      </div>
    </Panel>
  );
}
