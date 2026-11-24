import { __ } from "@wordpress/i18n";
import { Box } from "@/components/box";
import { ProLaunch } from "@/components/dashboard/pro-launch";
import { Heading } from "@/components/heading";
import { Panel } from "@/components/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";

const sampleTaxonomies = [
  { name: "Event types", slug: "event_types", hierarchical: true, menu: true, terms: __("View terms (6)", "eventkoi-lite") },
  { name: "Speakers", slug: "speakers", hierarchical: false, menu: true, terms: __("View terms (12)", "eventkoi-lite") },
  { name: "Venues", slug: "venues", hierarchical: false, menu: false, terms: __("View terms (4)", "eventkoi-lite") },
];

function YesNoBadge({ value }) {
  return (
    <Badge
      variant="outline"
      className="bg-white hover:bg-white border-ring/25 font-normal"
    >
      {value ? __("Yes", "eventkoi-lite") : __("No", "eventkoi-lite")}
    </Badge>
  );
}

export function SettingsTaxonomies() {
  return (
    <div className="grid gap-8">
      <ProLaunch
        headline={__("Upgrade to access Custom Taxonomies", "eventkoi-lite")}
        minimal
        source="settings-taxonomies"
      />
      <Box className="gap-0">
        <Panel variant="header">
          <Heading level={3}>{__("Taxonomies", "eventkoi-lite")}</Heading>
          <p className="text-sm text-muted-foreground">
            {__("Preview of Pro custom taxonomies. Upgrade to enable.", "eventkoi-lite")}
          </p>
        </Panel>
        <Panel className="pt-0 pb-6">
          <div className="grid gap-6 opacity-60 select-none pointer-events-none" aria-hidden="true">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="m-0 text-sm text-muted-foreground">
                {__("3 taxonomies", "eventkoi-lite")}
              </p>
              <Button
                className="bg-foreground border border-foreground font-normal"
                disabled
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {__("Add taxonomy", "eventkoi-lite")}
              </Button>
            </div>

            <div className="rounded-lg bg-card text-sm text-card-foreground shadow-sm w-full overflow-x-auto border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">{__("Taxonomy", "eventkoi-lite")}</TableHead>
                    <TableHead>{__("Slug", "eventkoi-lite")}</TableHead>
                    <TableHead>{__("Hierarchical", "eventkoi-lite")}</TableHead>
                    <TableHead>{__("In admin menu", "eventkoi-lite")}</TableHead>
                    <TableHead className="text-right">{__("Terms", "eventkoi-lite")}</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleTaxonomies.map((taxonomy) => (
                    <TableRow key={taxonomy.slug}>
                      <TableCell className="font-medium">{taxonomy.name}</TableCell>
                      <TableCell className="font-mono text-xs">{taxonomy.slug}</TableCell>
                      <TableCell>
                        <YesNoBadge value={taxonomy.hierarchical} />
                      </TableCell>
                      <TableCell>
                        <YesNoBadge value={taxonomy.menu} />
                      </TableCell>
                      <TableCell className="text-right">{taxonomy.terms}</TableCell>
                      <TableCell>
                        <div className="flex justify-end text-muted-foreground">
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-6">
              <div className="space-y-1">
                <Label className="font-semibold">
                  {__("Replace default location fields with a custom taxonomy", "eventkoi-lite")}
                </Label>
                <p className="m-0 text-sm text-muted-foreground max-w-2xl">
                  {__(
                    "Choose a taxonomy to replace EventKoi's default location fields. Your custom taxonomy will show up in event settings under Location details and be used for event schema.",
                    "eventkoi-lite"
                  )}
                </p>
              </div>
              <Switch checked={false} disabled className="mt-1" />
            </div>
          </div>
        </Panel>
      </Box>
    </div>
  );
}
