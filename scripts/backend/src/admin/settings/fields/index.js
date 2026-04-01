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
import { ListFilter } from "lucide-react";

const sampleFields = [
  { name: "Dress Code", type: "Dropdown", id: "event_field_dress_code", group: "Event Details", date: "Mar 28, 2026" },
  { name: "Parking Info", type: "Textarea", id: "event_field_parking_info", group: "Venue", date: "Mar 25, 2026" },
  { name: "Sponsor Name", type: "Text", id: "event_field_sponsor_name", group: "Sponsors", global: true, date: "Mar 22, 2026" },
];

export function SettingsFields() {
  return (
    <div className="grid gap-8">
      <ProLaunch headline="Upgrade to access Custom Fields" minimal />
      <Box className="gap-0">
        <Panel variant="header">
          <Heading level={3}>Custom fields</Heading>
          <p className="text-sm text-muted-foreground">
            Preview of Pro Custom Fields. Upgrade to enable.
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
                <ListFilter className="mr-2 h-4 w-4" aria-hidden="true" />
                Bulk actions
              </Button>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:space-x-4">
                <Button
                  variant="outline"
                  className="flex font-normal w-full sm:w-auto justify-start sm:justify-center"
                  disabled
                >
                  <ListFilter className="mr-2 h-4 w-4" aria-hidden="true" />
                  Group
                </Button>
                <Button
                  className="bg-foreground border border-foreground font-normal"
                  disabled
                >
                  Add field
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center text-sm gap-x-4 gap-y-2">
              <span className="font-medium text-foreground">All (3)</span>
              <span className="text-muted-foreground">Trash (0)</span>
            </div>

            <div className="rounded-lg bg-card text-sm text-card-foreground shadow-sm w-full overflow-x-auto border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox disabled />
                    </TableHead>
                    <TableHead>Field name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Groups</TableHead>
                    <TableHead className="text-right">Last modified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleFields.map((field) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Checkbox disabled />
                      </TableCell>
                      <TableCell className="font-medium">
                        {field.name}
                        {field.global && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground border rounded px-1.5 py-0.5">
                            Global
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{field.type}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {field.id}
                      </TableCell>
                      <TableCell>{field.group}</TableCell>
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
