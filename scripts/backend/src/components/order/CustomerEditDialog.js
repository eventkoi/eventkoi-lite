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
import { AnswerInput, formatAnswer } from "@/components/order/AnswerInput";
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
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const checkoutFields = Array.isArray(order?.checkout_fields)
    ? order.checkout_fields
    : [];

  useEffect(() => {
    if (!open) return;
    setName(String(order?.customer_name || order?.ticket_holder_name || ""));
    setEmail(String(order?.customer_email || ""));
    setAddress(order?.customer_address || {});
    const initial = {};
    (order?.checkout_fields || []).forEach((field) => {
      initial[field.key] = field.value ?? "";
    });
    setAnswers(initial);
  }, [open, order]);

  // Only the answers the admin changed are sent, so the rest stay as the buyer gave them.
  const changedAnswers = checkoutFields.reduce((changed, field) => {
    if (
      formatAnswer(answers[field.key]) !== formatAnswer(field.value ?? "")
    ) {
      changed[field.key] = answers[field.key] ?? "";
    }
    return changed;
  }, {});

  const emailChanged =
    email.trim().toLowerCase() !==
    String(order?.customer_email || "").trim().toLowerCase();

  // Only the parts the admin changed are sent, so nothing else can be overwritten.
  const changedAddress = ADDRESS_FIELDS.reduce((changed, { key }) => {
    if (
      String(address?.[key] || "") !==
      String(order?.customer_address?.[key] || "")
    ) {
      changed[key] = String(address?.[key] || "");
    }
    return changed;
  }, {});

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
          customer_address:
            Object.keys(changedAddress).length > 0 ? changedAddress : undefined,
          checkout_fields:
            Object.keys(changedAnswers).length > 0 ? changedAnswers : undefined,
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
      {/* A long list of custom fields scrolls inside the screen, so Save stays reachable. */}
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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
          {checkoutFields.length > 0 ? (
            <div className="grid gap-3">
              <p className="text-sm font-medium">
                {__("Custom fields", "eventkoi-lite")}
              </p>
              {checkoutFields.map((field) => {
                const inputId = `ek-order-field-${field.key}`;
                return (
                  <div key={field.key} className="grid gap-2">
                    <Label htmlFor={inputId}>
                      {field.label}
                      {field.required ? (
                        <span className="ml-1 text-destructive" aria-hidden="true">
                          *
                        </span>
                      ) : null}
                    </Label>
                    <AnswerInput
                      field={field}
                      id={inputId}
                      value={answers[field.key]}
                      onChange={(next) =>
                        setAnswers((prev) => ({ ...prev, [field.key]: next }))
                      }
                    />
                  </div>
                );
              })}
            </div>
          ) : null}
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
