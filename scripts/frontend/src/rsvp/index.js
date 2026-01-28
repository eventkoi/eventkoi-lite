"use client";

import { __, sprintf } from "@wordpress/i18n";
import { useEffect, useMemo, useState } from "react";
import { decodeEntities } from "@wordpress/html-entities";
import { createRoot } from "react-dom/client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { resolvePublicRestUrl } from "@/lib/public-api";

function getInstanceTsFromDom(el) {
  const attr = el.getAttribute("data-instance-ts");
  if (attr && !Number.isNaN(Number(attr))) {
    return Number(attr);
  }

  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const instanceParam = params.get("instance");
    if (instanceParam && !Number.isNaN(Number(instanceParam))) {
      return Number(instanceParam);
    }
  }

  return 0;
}

function RsvpWidget({ eventId, instanceTs, mountEl }) {
  const prefillName = eventkoi_params?.rsvp_user?.name || "";
  const prefillEmail = eventkoi_params?.rsvp_user?.email || "";
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState("going");
  const [name, setName] = useState(prefillName);
  const [email, setEmail] = useState(prefillEmail);
  const [guests, setGuests] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [isRemoved, setIsRemoved] = useState(false);
  const [hasRsvp, setHasRsvp] = useState(false);
  const [checkinToken, setCheckinToken] = useState(null);
  const [rsvpStatus, setRsvpStatus] = useState(null);
  const [prefilledFromToken, setPrefilledFromToken] = useState(false);

  const fetchSummary = async () => {
    if (!eventId) return;

    const params = new URLSearchParams({ event_id: String(eventId) });
    if (instanceTs) {
      params.set("instance_ts", String(instanceTs));
    }
    try {
      const res = await fetch(
        resolvePublicRestUrl(`/rsvp/summary?${params.toString()}`),
        {
        headers: {
          "X-WP-Nonce": eventkoi_params?.nonce || "",
        },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Unable to load RSVP data.");
      }
      setSummary(data);
    } catch (err) {
      setError(err?.message || "Unable to load RSVP data.");
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [eventId, instanceTs]);

  const statusOptions = [
    { value: "going", label: __("Going", "eventkoi-lite") },
    { value: "maybe", label: __("Maybe", "eventkoi-lite") },
    { value: "not_going", label: __("Not going", "eventkoi-lite") },
  ];

  const statusLabels = statusOptions.reduce((acc, option) => {
    acc[option.value] = option.label;
    return acc;
  }, {});

  const rsvpData = summary?.rsvp || null;

  useEffect(() => {
    if (!summary || !rsvpData || prefilledFromToken) return;

    setHasRsvp(true);
    setCheckinToken(rsvpData.checkin_token || null);
    setRsvpStatus(rsvpData.status || null);

    if (rsvpData.name && rsvpData.name !== name) {
      setName(rsvpData.name);
    }
    if (rsvpData.email && rsvpData.email !== email) {
      setEmail(rsvpData.email);
    }
    if (typeof rsvpData.guests === "number") {
      setGuests(String(rsvpData.guests));
    }
    if (rsvpData.status) {
      setStatus(rsvpData.status);
    }

    if (rsvpData.status) {
      setMessage(
        sprintf(
          /* translators: %s: RSVP status */
          __("Your RSVP: %s", "eventkoi-lite"),
          statusLabels[rsvpData.status] || rsvpData.status
        )
      );
    }
    setPrefilledFromToken(true);
  }, [summary, rsvpData, prefilledFromToken, name, email, statusLabels]);

  const allowGuests = summary?.allow_guests;
  const maxGuests = summary?.max_guests || 0;
  const capacity = summary?.capacity || 0;
  const showRemaining = summary?.show_remaining !== false;
  const isEnabled = summary?.rsvp_enabled !== false;
  const eventTitle = decodeEntities(summary?.event_title || "");
  const allowEdit = summary?.allow_edit !== false;

  const used = Number(summary?.summary?.used || 0);
  const goingCount = Number.isFinite(Number(summary?.summary?.used))
    ? Number(summary.summary.used)
    : Number(summary?.summary?.going || 0);
  const currentSeatUsage =
    rsvpData && rsvpData.status === "going"
      ? 1 + (Number(rsvpData.guests) || 0)
      : 0;
  const remaining = capacity > 0 ? Math.max(capacity - used, 0) : null;
  const remainingForGuests =
    capacity > 0
      ? Math.max(capacity - used + currentSeatUsage - 1, 0)
      : null;
  const effectiveMaxGuests = maxGuests > 0 ? maxGuests : null;
  const maxGuestsAllowed =
    capacity > 0
      ? effectiveMaxGuests !== null
        ? Math.min(effectiveMaxGuests, remainingForGuests ?? 0)
        : remainingForGuests
      : effectiveMaxGuests;
  const isFull =
    capacity > 0 &&
    remaining === 0 &&
    (!hasRsvp || rsvpStatus !== "going");

  const guestsValue = useMemo(() => {
    if (!allowGuests || status !== "going") return 0;
    if (maxGuestsAllowed === null || typeof maxGuestsAllowed === "undefined") {
      return guests;
    }
    return Math.min(Number(guests) || 0, maxGuestsAllowed);
  }, [allowGuests, status, guests, maxGuestsAllowed]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFormError(null);
    setMessage(null);

    try {
      const payload = {
        event_id: eventId,
        instance_ts: instanceTs || 0,
        name,
        email,
        status,
        guests: guestsValue,
      };

      const res = await fetch(resolvePublicRestUrl("/rsvp"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": eventkoi_params?.nonce || "",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.message || data?.error || "Unable to submit RSVP."
        );
      }

      const responseToken = data?.checkin_token || null;
      setMessage(
        sprintf(
          /* translators: %s: RSVP status */
          __("Your RSVP: %s", "eventkoi-lite"),
          statusLabels[status] || status
        )
      );
      setCheckinToken(responseToken);
      setHasRsvp(true);
      setRsvpStatus(status);
      setOpen(false);
      fetchSummary();
    } catch (err) {
      setFormError(err?.message || "Unable to submit RSVP.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!eventId) {
    return null;
  }

  useEffect(() => {
    if (isRemoved || !mountEl) return;

    const removeMount = () => {
      const wrapper = mountEl.closest(".eventkoi-front");
      if (wrapper) {
        wrapper.remove();
      } else {
        mountEl.remove();
      }
      setIsRemoved(true);
    };

    if (summary && !isEnabled) {
      removeMount();
      return;
    }

    if (error) {
      const normalized = String(error).toLowerCase();
      if (
        normalized.includes("invalid event") ||
        normalized.includes("missing event instance")
      ) {
        removeMount();
      }
    }
  }, [summary, isEnabled, error, mountEl, isRemoved]);

  if (!summary && !error) {
    return (
      <div className="eventkoi-rsvp__loading flex flex-col gap-2">
        <Skeleton className="h-3 w-48 rounded-md" />
        <Skeleton className="h-3 w-32 rounded-md" />
      </div>
    );
  }

  if (!summary && error) {
    const normalized = String(error).toLowerCase();
    if (
      normalized.includes("invalid event") ||
      normalized.includes("missing event instance")
    ) {
      return null;
    }
    return (
      <div className="eventkoi-rsvp__error text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (summary && !isEnabled) {
    return null;
  }

  const isEventPage =
    typeof document !== "undefined" &&
    document.body?.classList?.contains("single-eventkoi_event");

  return (
    <div className="eventkoi-rsvp__widget flex max-w-[450px] flex-col gap-6">
      {!isEventPage && eventTitle ? (
        <div className="text-2xl font-semibold text-foreground -mb-2">
          {eventTitle}
        </div>
      ) : null}
      <div className="rounded-2xl border border-input bg-card px-4 py-3 shadow-sm">
        <div
          className={cn(
            "grid gap-4 text-center",
            showRemaining ? "grid-cols-2" : "grid-cols-1"
          )}
        >
          <div className="flex flex-col gap-1">
            <div className="text-4xl font-semibold text-foreground tabular-nums">
              {goingCount}
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              {__("Going", "eventkoi-lite")}
            </div>
          </div>
          {showRemaining && (
            <div className="flex flex-col gap-1 border-l border-input pl-4">
              <div className="text-4xl font-semibold text-foreground tabular-nums">
                {capacity > 0 ? remaining : "—"}
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                {__("Remaining", "eventkoi-lite")}
              </div>
            </div>
          )}
        </div>
        {capacity > 0 && showRemaining && (
          <div className="mt-4">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-ring/10">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${capacity ? Math.min((used / capacity) * 100, 100) : 0}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            className="h-11 text-base font-semibold"
            onClick={() => setOpen(true)}
            disabled={submitting || isFull || (!allowEdit && hasRsvp)}
            variant={
              submitting || isFull || (!allowEdit && hasRsvp)
                ? "secondary"
                : "default"
            }
          >
            {hasRsvp && allowEdit
              ? __("Edit RSVP", "eventkoi-lite")
              : __("Going", "eventkoi-lite")}
          </Button>
        </DialogTrigger>
        <DialogContent className="eventkoi-front">
          <DialogHeader className="space-y-1">
            <DialogTitle>
              {eventTitle
                ? sprintf(
                    /* translators: %s: event title */
                    __("RSVP for %s", "eventkoi-lite"),
                    eventTitle
                  )
                : __("RSVP", "eventkoi-lite")}
            </DialogTitle>
            <DialogDescription>
              {__("Let us know you're coming.", "eventkoi-lite")}
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            {formError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="eventkoi-rsvp-name">
                {__("Name", "eventkoi-lite")}
              </Label>
              <Input
                id="eventkoi-rsvp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="eventkoi-rsvp-email">
                {__("Email", "eventkoi-lite")}
              </Label>
              <Input
                id="eventkoi-rsvp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>{__("Status", "eventkoi-lite")}</Label>
              <RadioGroup
                value={status}
                onValueChange={setStatus}
                className="flex flex-wrap gap-4"
              >
                {statusOptions.map((option) => (
                  <Label
                    key={option.value}
                    className={cn(
                      "flex items-center gap-2 text-sm font-normal cursor-pointer"
                    )}
                  >
                    <RadioGroupItem value={option.value} />
                    {option.label}
                  </Label>
                ))}
              </RadioGroup>
            </div>
            {allowGuests && status === "going" && (
              <div className="grid gap-2">
                <Label htmlFor="eventkoi-rsvp-guests">
                  {__("Guests", "eventkoi-lite")}
                </Label>
                <Input
                  id="eventkoi-rsvp-guests"
                  type="number"
                  min="0"
                  max={
                    typeof maxGuestsAllowed === "number"
                      ? maxGuestsAllowed
                      : undefined
                  }
                  value={guests}
                  placeholder={
                    typeof maxGuestsAllowed === "number"
                      ? sprintf(
                          /* translators: %d: maximum guests */
                          __("Max %d", "eventkoi-lite"),
                          maxGuestsAllowed
                        )
                      : undefined
                  }
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    if (rawValue === "") {
                      setGuests("");
                      return;
                    }
                    const nextValue = Math.max(0, Number(rawValue) || 0);
                    const clamped =
                      typeof maxGuestsAllowed === "number"
                        ? Math.min(nextValue, maxGuestsAllowed)
                        : nextValue;
                    setGuests(clamped);
                  }}
                />
                {typeof maxGuestsAllowed === "number" && (
                  <div className="text-xs text-muted-foreground">
                    {sprintf(
                      /* translators: %d: maximum guests */
                      maxGuestsAllowed === 1
                        ? __("Max %d guest", "eventkoi-lite")
                        : __("Max %d guests", "eventkoi-lite"),
                      maxGuestsAllowed
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? __("Submitting...", "eventkoi-lite")
                  : __("Submit RSVP", "eventkoi-lite")}
              </Button>
              <Button
                type="button"
                variant="link"
                onClick={() => setOpen(false)}
              >
                {__("Cancel", "eventkoi-lite")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {error && <div className="text-sm text-destructive">{error}</div>}
      <div className="flex flex-col gap-2">
        {isFull && !hasRsvp && (
          <div className="text-sm font-normal text-foreground">
            {__("This event is fully booked.", "eventkoi-lite")}
          </div>
        )}
        {message && <div className="text-sm text-foreground">{message}</div>}
        {rsvpStatus === "going" && checkinToken && (
          <div className="text-sm text-foreground">
            {__("Check-in code:", "eventkoi-lite")}{" "}
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-sm font-semibold text-foreground">
              {checkinToken}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

document.querySelectorAll(".eventkoi-rsvp").forEach((el) => {
  const eventId = Number(el.getAttribute("data-event-id")) || 0;
  const instanceTs = getInstanceTsFromDom(el);
  const root = createRoot(el);
  root.render(
    <RsvpWidget eventId={eventId} instanceTs={instanceTs} mountEl={el} />
  );
});
