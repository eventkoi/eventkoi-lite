import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { __ } from "@wordpress/i18n";

import { Box } from "@/components/box";
import { ProLaunch } from "@/components/dashboard/pro-launch";
import { Heading } from "@/components/heading";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function emptyForCatalog(catalog) {
  const out = {};
  Object.values(catalog || {}).forEach((group) => {
    Object.keys(group.caps || {}).forEach((capKey) => {
      out[capKey] = false;
    });
  });
  return out;
}

/**
 * Lite Settings > User permissions
 *
 * User permissions are a Pro feature. Lite shows every permission and what
 * each role already has, so permissions set earlier keep working, but nothing
 * here can be changed.
 */
export function SettingsPermissions() {
  const [settings] = useOutletContext();
  const catalog = window?.eventkoi_params?.caps_catalog || {};
  const roles = window?.eventkoi_params?.roles_catalog || [];
  const defaultRole = roles[0]?.slug || "";

  const [role, setRole] = useState(defaultRole);
  const groups = useMemo(() => Object.entries(catalog), [catalog]);

  const granted = {
    ...emptyForCatalog(catalog),
    ...((settings?.user_permissions && settings.user_permissions[role]) || {}),
  };

  const proLaunch = (
    <ProLaunch
      headline={__("Upgrade to access User Permissions", "eventkoi-lite")}
      minimal
      source="settings-permissions"
    />
  );

  if (!roles.length) {
    return (
      <div className="grid gap-8">
        {proLaunch}
        <Box>
          <Panel>
            <p className="text-sm text-muted-foreground">
              {__("No additional user roles are available to configure.", "eventkoi-lite")}
            </p>
          </Panel>
        </Box>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      {proLaunch}
      <Box>
        <div className="grid w-full">
          <Panel variant="header">
            <Heading level={3}>{__("User permissions", "eventkoi-lite")}</Heading>
          </Panel>
          <Separator />
          <Panel className="gap-6">
            <p className="text-sm text-muted-foreground">
              {__(
                "Pick a user role, then tick what EventKoi features that role can access. Administrators always have full access.",
                "eventkoi-lite"
              )}
            </p>

            <div className="grid gap-6 md:grid-cols-[260px_1fr]">
              <div className="space-y-2">
                <Label>{__("User role", "eventkoi-lite")}</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={__("Select a role", "eventkoi-lite")} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.slug} value={r.slug}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label>{__("Grant this user access to:", "eventkoi-lite")}</Label>
                <div className="grid gap-5">
                  {groups.map(([groupKey, group]) => (
                    <div key={groupKey} className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {group.label}
                      </div>
                      <div className="grid gap-2">
                        {Object.entries(group.caps || {}).map(
                          ([capKey, capLabel]) => (
                            <label
                              key={capKey}
                              className="flex items-start gap-2 cursor-not-allowed"
                            >
                              <Checkbox checked={!!granted[capKey]} disabled />
                              <span className="text-sm text-muted-foreground">{capLabel}</span>
                            </label>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  disabled
                  className="text-xs text-muted-foreground"
                >
                  {__("Reset all user permissions", "eventkoi-lite")}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  disabled
                  className="text-xs text-muted-foreground"
                >
                  {__("Reset this role's permissions", "eventkoi-lite")}
                </Button>
                <Button disabled>{__("Save", "eventkoi-lite")}</Button>
              </div>
            </div>
          </Panel>
        </div>
      </Box>
    </div>
  );
}
