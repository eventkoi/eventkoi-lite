import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import apiRequest from "@wordpress/api-fetch";
import { __ } from "@wordpress/i18n";

import { Box } from "@/components/box";
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
import { showToast, showToastError } from "@/lib/toast";

function emptyForCatalog(catalog) {
  const out = {};
  Object.values(catalog || {}).forEach((group) => {
    Object.keys(group.caps || {}).forEach((capKey) => {
      out[capKey] = false;
    });
  });
  return out;
}

export function SettingsPermissions() {
  const [settings, setSettings] = useOutletContext();
  const catalog = window?.eventkoi_params?.caps_catalog || {};
  const roles = window?.eventkoi_params?.roles_catalog || [];
  const defaultRole = roles[0]?.slug || "";

  const [role, setRole] = useState(defaultRole);
  const [draft, setDraft] = useState(() => {
    const stored =
      (settings?.user_permissions && settings.user_permissions[defaultRole]) ||
      {};
    return { ...emptyForCatalog(catalog), ...stored };
  });
  const [isSaving, setIsSaving] = useState(false);

  const groups = useMemo(() => Object.entries(catalog), [catalog]);

  const switchRole = (nextRole) => {
    setRole(nextRole);
    const stored =
      (settings?.user_permissions && settings.user_permissions[nextRole]) ||
      {};
    setDraft({ ...emptyForCatalog(catalog), ...stored });
  };

  const toggle = (capKey, value) => {
    setDraft((prev) => ({ ...prev, [capKey]: !!value }));
  };

  const persist = async (nextMap) => {
    try {
      setIsSaving(true);
      const response = await apiRequest({
        path: `${eventkoi_params.api}/settings`,
        method: "POST",
        data: { user_permissions: nextMap },
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });
      if (response?.settings) {
        setSettings(response.settings);
      }
      showToast({ message: __("Permissions saved.", "eventkoi") });
    } catch (error) {
      showToastError(error?.message ?? __("Something went wrong.", "eventkoi"));
    } finally {
      setIsSaving(false);
    }
  };

  const save = async () => {
    if (!role) return;
    const grantedOnly = Object.fromEntries(
      Object.entries(draft).filter(([, v]) => !!v)
    );
    const currentMap = settings?.user_permissions || {};
    const nextMap = { ...currentMap, [role]: grantedOnly };
    if (Object.keys(grantedOnly).length === 0) {
      delete nextMap[role];
    }
    await persist(nextMap);
  };

  const resetThisRole = async () => {
    if (!role) return;
    const currentMap = { ...(settings?.user_permissions || {}) };
    delete currentMap[role];
    setDraft(emptyForCatalog(catalog));
    await persist(currentMap);
  };

  const resetAll = async () => {
    setDraft(emptyForCatalog(catalog));
    await persist({});
  };

  if (!roles.length) {
    return (
      <Box>
        <Panel>
          <p className="text-sm text-muted-foreground">
            {__("No additional user roles are available to configure.", "eventkoi")}
          </p>
        </Panel>
      </Box>
    );
  }

  return (
    <Box>
      <div className="grid w-full">
        <Panel variant="header">
          <Heading level={3}>{__("User permissions", "eventkoi")}</Heading>
        </Panel>
        <Separator />
        <Panel className="gap-6">
          <p className="text-sm text-muted-foreground">
            {__(
              "Pick a user role, then tick what EventKoi features that role can access. Administrators always have full access.",
              "eventkoi"
            )}
          </p>

          <div className="grid gap-6 md:grid-cols-[260px_1fr]">
            <div className="space-y-2">
              <Label>{__("User role", "eventkoi")}</Label>
              <Select value={role} onValueChange={switchRole}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={__("Select a role", "eventkoi")} />
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
              <Label>{__("Grant this user access to:", "eventkoi")}</Label>
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
                            className="flex items-start gap-2 cursor-pointer"
                          >
                            <Checkbox
                              checked={!!draft[capKey]}
                              onCheckedChange={(value) => toggle(capKey, value)}
                            />
                            <span className="text-sm">{capLabel}</span>
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
                onClick={resetAll}
                disabled={isSaving}
                className="text-xs text-muted-foreground"
              >
                {__("Reset all user permissions", "eventkoi")}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={resetThisRole}
                disabled={isSaving || !role}
                className="text-xs text-muted-foreground"
              >
                {__("Reset this role's permissions", "eventkoi")}
              </Button>
              <Button onClick={save} disabled={isSaving || !role}>
                {isSaving ? __("Saving...", "eventkoi") : __("Save", "eventkoi")}
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    </Box>
  );
}
