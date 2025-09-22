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
  { value: "current", label: "Current month" },
  { value: "january", label: "January" },
  { value: "february", label: "February" },
  { value: "march", label: "March" },
  { value: "april", label: "April" },
  { value: "may", label: "May" },
  { value: "june", label: "June" },
  { value: "july", label: "July" },
  { value: "august", label: "August" },
  { value: "september", label: "September" },
  { value: "october", label: "October" },
  { value: "november", label: "November" },
  { value: "december", label: "December" },
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
    { value: "current", label: `Current year (${currentYear})` },
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
          <Label htmlFor="default_month">Default month to display</Label>
          <Select
            value={calendar?.default_month || "current"}
            onValueChange={(value) => handleChange("default_month", value)}
          >
            <SelectTrigger id="default_month" className="w-full max-w-[250px]">
              <SelectValue placeholder="Select a month" />
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
            Select the month visitors see when they first view the calendar.
          </p>
        </div>

        {/* Default year */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="default_year">Default year to display</Label>
          <Select
            value={calendar?.default_year || "current"}
            onValueChange={(value) => handleChange("default_year", value)}
          >
            <SelectTrigger id="default_year" className="w-full max-w-[250px]">
              <SelectValue placeholder="Select a year" />
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
            Select the year visitors see when they first view the calendar.
          </p>
        </div>
      </div>
    </Panel>
  );
}
