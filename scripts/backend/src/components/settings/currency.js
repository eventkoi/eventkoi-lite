import apiRequest from "@wordpress/api-fetch";
import { useEffect, useMemo, useState } from "react";

import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { Panel } from "@/components/panel";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useSettings } from "@/hooks/SettingsContext";
import { useStripeAccount } from "@/hooks/useStripeAccount";
import { getCurrencyOptions } from "@/lib/currencies";
import { showToast, showToastError } from "@/lib/toast";

export function SettingsCurrency() {
  const { settings, setSettings, refreshSettings } = useSettings();
  const { data: account } = useStripeAccount();
  const [isSaving, setIsSaving] = useState(false);
  const [currency, setCurrency] = useState(
    String(settings?.currency || "USD").toUpperCase()
  );
  const currencyOptions = useMemo(() => getCurrencyOptions(), []);

  const stripeConnected = !!account?.connected;
  const stripeCurrency = account?.default_currency
    ? String(account.default_currency).toUpperCase()
    : null;

  useEffect(() => {
    const nextCurrency = String(settings?.currency || "USD").toUpperCase();
    if (nextCurrency !== currency) {
      setCurrency(nextCurrency);
    }
  }, [settings?.currency]);

  const saveCurrency = async (nextCurrency) => {
    try {
      setIsSaving(true);
      const response = await apiRequest({
        path: `${eventkoi_params.api}/settings`,
        method: "post",
        data: { currency: nextCurrency },
        headers: {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
        },
      });
      if (response?.settings) {
        const savedCurrency = response.settings.currency ?? nextCurrency;
        setSettings((prev) => ({ ...prev, currency: savedCurrency }));
      } else {
        await refreshSettings();
      }
      showToast({ ...response, message: "Currency updated." });
    } catch (error) {
      showToastError(error?.message ?? "Failed to update currency.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCurrencyChange = (value) => {
    const normalized = String(value || "USD").toUpperCase();
    setCurrency(normalized);
    if (normalized !== String(settings?.currency || "USD").toUpperCase()) {
      saveCurrency(normalized);
    }
  };

  const lockedByStripe = stripeConnected && !!stripeCurrency;
  const mismatch =
    lockedByStripe && stripeCurrency && currency !== stripeCurrency;

  return (
    <Box>
      <div className="grid w-full">
        <Panel variant="header">
          <Heading level={3}>Currency</Heading>
        </Panel>
        <Separator />
        <Panel className="gap-4">
          <div className="grid gap-2">
            <Label htmlFor="global-currency">Select currency</Label>
            <Select
              value={currency}
              onValueChange={handleCurrencyChange}
              disabled={isSaving || lockedByStripe}
            >
              <SelectTrigger id="global-currency" className="w-[320px]">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Currency</SelectLabel>
                  {currencyOptions.map((option) => (
                    <SelectItem
                      key={`currency-${option.code}`}
                      value={option.code}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {lockedByStripe ? (
              <div className="text-muted-foreground text-sm">
                Currency is set by your connected Stripe account
                {stripeCurrency ? ` (${stripeCurrency})` : ""} and cannot be
                changed here. Disconnect Stripe to choose a different currency.
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">
                Used as the single currency for tickets, checkout, and sales
                reporting.
              </div>
            )}
            {mismatch && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Saved currency ({currency}) does not match your Stripe account
                ({stripeCurrency}). Stripe will charge in {stripeCurrency}.
              </div>
            )}
          </div>
        </Panel>
      </div>
    </Box>
  );
}

