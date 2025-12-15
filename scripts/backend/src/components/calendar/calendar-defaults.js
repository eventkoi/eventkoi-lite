import { __, sprintf } from "@wordpress/i18n";
import { Panel } from "@/components/panel";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from "@/hooks/SettingsContext";

// Month options
const months = [
  { value: "current", label: __("Current month", "eventkoi-lite") },
  { value: "january", label: __("January", "eventkoi-lite") },
  { value: "february", label: __("February", "eventkoi-lite") },
  { value: "march", label: __("March", "eventkoi-lite") },
  { value: "april", label: __("April", "eventkoi-lite") },
  { value: "may", label: __("May", "eventkoi-lite") },
  { value: "june", label: __("June", "eventkoi-lite") },
  { value: "july", label: __("July", "eventkoi-lite") },
  { value: "august", label: __("August", "eventkoi-lite") },
  { value: "september", label: __("September", "eventkoi-lite") },
  { value: "october", label: __("October", "eventkoi-lite") },
  { value: "november", label: __("November", "eventkoi-lite") },
  { value: "december", label: __("December", "eventkoi-lite") },
];

export function CalendarDefaults({ calendar, setCalendar }) {
  const { settings } = useSettings();

  const handleChange = (field, value) => {
    setCalendar((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Build year options dynamically: current + next 10
  const currentYear = new Date().getFullYear();
  const years = [
    {
      value: "current",
      /* translators: %s: current year */
      label: sprintf(__("Current year (%s)", "eventkoi-lite"), currentYear),
    },
    ...Array.from({ length: 10 }, (_, i) => {
      const year = currentYear + i + 1;
      return { value: String(year), label: String(year) };
    }),
  ];

  const isDisabled = calendar?.display === "list";

  if (isDisabled) {
    return null;
  }

  return (
    <Panel className="p-0">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Default month */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="default_month">
            {__("Default month to display", "eventkoi-lite")}
          </Label>
          <Select
            value={calendar?.default_month || "current"}
            onValueChange={(value) => handleChange("default_month", value)}
          >
            <SelectTrigger id="default_month" className="w-full max-w-[250px]">
              <SelectValue placeholder={__("Select a month", "eventkoi-lite")} />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {__(
              "Select the month visitors see when they first view the calendar.",
              "eventkoi-lite",
            )}
          </p>
        </div>

        {/* Default year */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="default_year">
            {__("Default year to display", "eventkoi-lite")}
          </Label>
          <Select
            value={calendar?.default_year || "current"}
            onValueChange={(value) => handleChange("default_year", value)}
          >
            <SelectTrigger id="default_year" className="w-full max-w-[250px]">
              <SelectValue placeholder={__("Select a year", "eventkoi-lite")} />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y.value} value={y.value}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {__(
              "Select the year visitors see when they first view the calendar.",
              "eventkoi-lite",
            )}
          </p>
        </div>
      </div>
    </Panel>
  );
}
