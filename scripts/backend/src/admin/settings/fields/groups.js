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
import { Copy, Plus, Trash2 } from "lucide-react";

const sampleGroups = [
  { name: "Event Details", id: "event_fieldgroup_event_details", global: true, count: 4 },
  { name: "Venue", id: "event_fieldgroup_venue", count: 2 },
  { name: "Sponsors", id: "event_fieldgroup_sponsors", count: 3 },
];

export function SettingsFieldGroups() {
  return (
    <div className="grid gap-8">
      <ProLaunch
        headline={__("Upgrade to access Custom Fields", "eventkoi-lite")}
        minimal
        source="settings-field-groups"
      />
      <Box className="gap-0">
        <Panel variant="header">
          <Heading level={3}>{__("Groups", "eventkoi-lite")}</Heading>
          <p className="text-sm text-muted-foreground">
            {__("Preview of Pro field groups. Upgrade to enable.", "eventkoi-lite")}
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
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                {__("Move to trash", "eventkoi-lite")}
              </Button>
              <Button
                className="bg-foreground border border-foreground font-normal"
                disabled
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {__("Add Group", "eventkoi-lite")}
              </Button>
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
                    <TableHead>{__("Field group", "eventkoi-lite")}</TableHead>
                    <TableHead>{__("ID", "eventkoi-lite")}</TableHead>
                    <TableHead className="text-right">{__("Field count", "eventkoi-lite")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell>
                        <Checkbox disabled />
                      </TableCell>
                      <TableCell className="font-medium">
                        {group.name}
                        {group.global && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground border rounded px-1.5 py-0.5">
                            {__("Global", "eventkoi-lite")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2 text-muted-foreground font-mono text-xs">
                          {group.id}
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{group.count}</TableCell>
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
