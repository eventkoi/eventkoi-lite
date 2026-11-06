// components/order/CustomerEditDialog.js
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { callLocalApi } from "@/lib/remote";
import { showToast, showToastError } from "@/lib/toast";
import { __ } from "@wordpress/i18n";
import { useEffect, useState } from "react";

const ADDRESS_FIELDS = [
  { key: "line1", label: () => __("Address line 1", "eventkoi-lite") },
  { key: "line2", label: () => __("Address line 2", "eventkoi-lite") },
  { key: "city", label: () => __("City", "eventkoi-lite") },
  { key: "state", label: () => __("State", "eventkoi-lite") },
  { key: "postal_code", label: () => __("Postal code", "eventkoi-lite") },
  { key: "country", label: () => __("Country", "eventkoi-lite") },
];

export function CustomerEditDialog({ order, open, onOpenChange, onSaved }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(String(order?.customer_name || order?.ticket_holder_name || ""));
    setEmail(String(order?.customer_email || ""));
    setAddress(order?.customer_address || {});
  }, [open, order]);

  const emailChanged =
    email.trim().toLowerCase() !==
    String(order?.customer_email || "").trim().toLowerCase();

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await callLocalApi("tickets/orders/update-customer", {
        method: "POST",
        data: {
          order_id: order.id,
          customer_name: name,
          customer_email: email,
          customer_address: address,
        },
      });
      await onSaved?.();
      onOpenChange(false);
      showToast({
        message: emailChanged
          ? __(
              "Customer updated. Use Resend receipt to send the ticket to the new email.",
              "eventkoi-lite"
            )
          : __("Customer updated.", "eventkoi-lite"),
      });
    } catch (error) {
      showToastError(
        error?.message || __("Failed to update the customer.", "eventkoi-lite")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{__("Edit customer", "eventkoi-lite")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ek-order-customer-name">
              {__("Name", "eventkoi-lite")}
            </Label>
            <Input
              id="ek-order-customer-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ek-order-customer-email">
              {__("Email", "eventkoi-lite")}
            </Label>
            <Input
              id="ek-order-customer-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ADDRESS_FIELDS.map(({ key, label }) => (
              <div key={key} className="grid gap-2">
                <Label htmlFor={`ek-order-customer-${key}`}>{label()}</Label>
                <Input
                  id={`ek-order-customer-${key}`}
                  value={address?.[key] || ""}
                  onChange={(event) =>
                    setAddress((prev) => ({
                      ...(prev || {}),
                      [key]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {__("Cancel", "eventkoi-lite")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? __("Saving...", "eventkoi-lite") : __("Save", "eventkoi-lite")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
