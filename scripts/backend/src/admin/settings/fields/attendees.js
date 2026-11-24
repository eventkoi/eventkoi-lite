import { __ } from "@wordpress/i18n";
import { Box } from "@/components/box";
import { ProLaunch } from "@/components/dashboard/pro-launch";
import { Heading } from "@/components/heading";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDownUp, EllipsisVertical, Plus } from "lucide-react";

const sampleFields = [
  { name: "Dietary requirements", type: "Dropdown", id: "attendee_dietary_requirements", date: "Mar 28, 2026" },
  { name: "T-shirt size", type: "Dropdown", id: "attendee_tshirt_size", date: "Mar 25, 2026" },
  { name: "Company", type: "Text", id: "attendee_company", date: "Mar 22, 2026" },
];

export function SettingsAttendeeFields() {
  return (
    <div className="grid gap-8">
      <ProLaunch
        headline={__("Upgrade to access Tickets & RSVP Fields", "eventkoi-lite")}
        minimal
        source="settings-attendee-fields"
      />
      <Box className="gap-0">
        <Panel variant="header">
          <Heading level={3}>{__("Tickets & RSVP fields", "eventkoi-lite")}</Heading>
          <p className="text-sm text-muted-foreground">
            {__(
              "Questions for the people who buy tickets or RSVP. Add them to an event under Tickets or RSVP, where you choose whether each one is asked once or for every attendee.",
              "eventkoi-lite"
            )}
          </p>
        </Panel>
        <Panel className="pt-0 pb-6">
          <div className="grid gap-6 opacity-60 select-none pointer-events-none" aria-hidden="true">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <Button
                variant="outline"
                className="flex font-normal w-full sm:w-auto justify-start sm:justify-center"
                disabled
              >
                <EllipsisVertical className="mr-2 h-4 w-4" aria-hidden="true" />
                {__("Bulk actions", "eventkoi-lite")}
              </Button>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <Button
                  variant="outline"
                  className="flex font-normal w-full sm:w-auto justify-start sm:justify-center"
                  disabled
                >
                  <ArrowDownUp className="mr-2 h-4 w-4" aria-hidden="true" />
                  {__("Reorder", "eventkoi-lite")}
                </Button>
                <Button
                  className="bg-foreground border border-foreground font-normal"
                  disabled
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  {__("Add field", "eventkoi-lite")}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center text-sm gap-x-4 gap-y-2">
              <span className="font-medium text-foreground">{__("All (3)", "eventkoi-lite")}</span>
              <span className="text-muted-foreground">{__("Trash (0)", "eventkoi-lite")}</span>
            </div>

            <div className="rounded-lg bg-card text-sm text-card-foreground shadow-sm w-full overflow-x-auto border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox disabled />
                    </TableHead>
                    <TableHead>{__("Field name", "eventkoi-lite")}</TableHead>
                    <TableHead>{__("Type", "eventkoi-lite")}</TableHead>
                    <TableHead>{__("ID", "eventkoi-lite")}</TableHead>
                    <TableHead className="text-right">{__("Last modified", "eventkoi-lite")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleFields.map((field) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Checkbox disabled />
                      </TableCell>
                      <TableCell className="font-medium">{field.name}</TableCell>
                      <TableCell>{field.type}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {field.id}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {field.date}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Panel>
      </Box>
    </div>
  );
}
