import { Box } from "@/components/box";
import { StripeConnectNotice } from "@/components/stripe-connect-notice";
import { Heading } from "@/components/heading";
import { TimeInput } from "@/components/time-input";
import { Button } from "@/components/ui/button";
import { FloatingDatePicker } from "@/components/ui/FloatingDatePicker";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { useSettings } from "@/hooks/SettingsContext";
import { ensureUtcZ, getDateInTimezone } from "@/lib/date-utils";
import { callLocalApi } from "@/lib/remote";
import { showToast, showToastError } from "@/lib/toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { __ } from "@wordpress/i18n";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  MoveRight,
  Plus,
  Trash2,
} from "lucide-react";
import { DateTime } from "luxon";
import { isValid } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

const DEFAULT_CURRENCY = "USD";

function SettingToggle({ id, label, description, checked, onCheckedChange }) {
  return (
    <div className="flex items-start gap-4 max-w-[500px]">
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-[1px]"
      />
      <div className="space-y-1">
        <Label className="font-medium" htmlFor={id}>
          {label}
        </Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

export function EventEditManageTickets() {
  const { event, setEvent, registerBeforeSave } = useEventEditContext();
  const { settings: globalSettings } = useSettings();
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [savingTickets, setSavingTickets] = useState(false);
  const [expandedTickets, setExpandedTickets] = useState({});
  const [hasLoadedTickets, setHasLoadedTickets] = useState(false);
  const dragIndexRef = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const ticketsRef = useRef([]);
  const expandedStorageKey = event?.id
    ? `eventkoi_tickets_expanded_${event.id}`
    : null;
  const [ticketSettings, setTicketSettings] = useState({
    auto_create_account: false,
    show_remaining: true,
    show_unavailable: false,
    terms_conditions: "",
  });

  const wpTz = useMemo(
    () =>
      event?.timezone || window.eventkoi_params?.timezone_string || "UTC",
    [event?.timezone]
  );
  const globalCurrency = String(
    globalSettings?.currency || DEFAULT_CURRENCY
  ).toUpperCase();
  const currencySymbol = getCurrencySymbol(globalCurrency);

  useEffect(() => {
    if (event) {
      const showRemainingRaw = event.tickets_show_remaining;
      const showRemaining =
        showRemainingRaw === undefined ||
        showRemainingRaw === null ||
        showRemainingRaw === ""
          ? true
          : !!showRemainingRaw;

      setTicketSettings({
        auto_create_account: event.tickets_auto_create_account || false,
        show_remaining: showRemaining,
        show_unavailable:
          event.tickets_show_unavailable === undefined ||
          event.tickets_show_unavailable === null ||
          event.tickets_show_unavailable === ""
            ? false
            : !!event.tickets_show_unavailable,
        terms_conditions: event.tickets_terms_conditions || "",
      });
    }
  }, [event]);

  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  useEffect(() => {
    const fetchTickets = async () => {
      if (!event?.id) {
        setTickets([]);
        return;
      }

      setLoadingTickets(true);
      try {
        const response = await callLocalApi(`events/${event.id}/tickets`, {
          method: "GET",
        });

        const ticketsList = Array.isArray(response?.tickets)
          ? response.tickets.map(normalizeTicket)
          : [];

        setTickets(ticketsList);

        const storedExpanded =
          expandedStorageKey &&
          typeof window !== "undefined" &&
          window.localStorage
            ? window.localStorage.getItem(expandedStorageKey)
            : null;
        let parsedExpanded = null;
        if (storedExpanded) {
          try {
            parsedExpanded = JSON.parse(storedExpanded);
          } catch (e) {
            parsedExpanded = null;
          }
        }

        setExpandedTickets(
          ticketsList.reduce((acc, ticket) => {
            const storedValue =
              parsedExpanded &&
              Object.prototype.hasOwnProperty.call(
                parsedExpanded,
                String(ticket.id)
              )
                ? parsedExpanded[String(ticket.id)]
                : null;
            acc[ticket.id] = typeof storedValue === "boolean" ? storedValue : true;
            return acc;
          }, {})
        );
      } catch (error) {
        showToastError("Failed to load tickets.");
      } finally {
        setLoadingTickets(false);
        setHasLoadedTickets(true);
      }
    };

    fetchTickets();
  }, [event?.id]);

  useEffect(() => {
    if (loadingTickets || !event?.id) return;
    if (tickets.length > 0) return;
    const initialTicket = buildNewTicket();
    setTickets([initialTicket]);
    setExpandedTickets({ [initialTicket.tempId]: true });
  }, [loadingTickets, tickets.length, event?.id]);

  useEffect(() => {
    if (!expandedStorageKey || !event?.id || !hasLoadedTickets) return;
    if (typeof window === "undefined" || !window.localStorage) return;
    const stored = Object.entries(expandedTickets).reduce((acc, [key, value]) => {
      if (String(key).startsWith("temp-")) return acc;
      acc[String(key)] = value;
      return acc;
    }, {});
    window.localStorage.setItem(expandedStorageKey, JSON.stringify(stored));
  }, [expandedTickets, expandedStorageKey, event?.id, hasLoadedTickets]);

  const handleToggle = (key) => {
    const newSettings = {
      ...ticketSettings,
      [key]: !ticketSettings[key],
    };
    setTicketSettings(newSettings);
    updateEvent(newSettings);
  };

  const handleTextChange = (e) => {
    const newSettings = {
      ...ticketSettings,
      terms_conditions: e.target.value,
    };
    setTicketSettings(newSettings);
    updateEvent(newSettings);
  };

  const updateEvent = (newSettings) => {
    if (!event?.id) return;

    const updatedEvent = {
      ...event,
      tickets_require_account: false,
      tickets_auto_create_account: newSettings.auto_create_account,
      tickets_show_remaining: newSettings.show_remaining,
      tickets_show_unavailable:
        newSettings.show_unavailable === undefined
          ? false
          : !!newSettings.show_unavailable,
      tickets_terms_conditions: newSettings.terms_conditions,
      tickets_display_mode: "cards",
    };

    setEvent?.(updatedEvent);
  };

  const formatPriceDisplay = (value) => {
    if (value === null || value === undefined || value === "") return "";
    const asString = String(value);
    if (!asString.includes(".")) return asString;
    return asString.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  };

  const normalizeTicket = (ticket) => ({
    ...ticket,
    currency: globalCurrency,
    price: formatPriceDisplay(ticket?.price),
    max_per_order:
      ticket?.max_per_order === null || ticket?.max_per_order === undefined
        ? ""
        : String(ticket.max_per_order),
  });

  const buildNewTicket = () => ({
    tempId: `temp-${crypto?.randomUUID?.() || Date.now()}`,
    name: "",
    description: "",
    price: "",
    currency: globalCurrency,
    quantity_available: "",
    max_per_order: "",
    sale_start: null,
    sale_end: null,
    terms_conditions: "",
    status: "active",
  });

  const handleAddTicket = () => {
    const newTicket = buildNewTicket();
    setTickets((prev) => [...prev, newTicket]);
    setExpandedTickets((prev) => ({
      ...prev,
      [newTicket.tempId]: true,
    }));
  };

  const handleTicketChange = (index, updates) => {
    setTickets((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const toggleTicket = (key) => {
    setExpandedTickets((prev) => {
      const next = {
        ...prev,
        [key]: !prev[key],
      };

      if (
        expandedStorageKey &&
        event?.id &&
        typeof window !== "undefined" &&
        window.localStorage &&
        !String(key).startsWith("temp-")
      ) {
        const stored = Object.entries(next).reduce((acc, [k, value]) => {
          if (String(k).startsWith("temp-")) return acc;
          acc[String(k)] = value;
          return acc;
        }, {});
        window.localStorage.setItem(expandedStorageKey, JSON.stringify(stored));
      }

      return next;
    });
  };

  const handleDragStart = (index) => (e) => {
    dragIndexRef.current = index;
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (index) => (e) => {
    e.preventDefault();
    if (draggingIndex === null) return;
    if (dragOverIndex !== index) setDragOverIndex(index);
  };

  const handleDrop = (index) => (e) => {
    e.preventDefault();
    if (draggingIndex === null || draggingIndex === index) return;
    setTickets((prev) => {
      const next = [...prev];
      const [moved] = next.splice(draggingIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndexRef.current = index;
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const handleDeleteTicket = async (ticket, index) => {
    if (ticket?.id) {
      try {
        await callLocalApi(`tickets/${ticket.id}`, { method: "DELETE" });
      } catch (error) {
        showToastError("Failed to delete ticket.");
        return;
      }
    }

    setTickets((prev) => prev.filter((_, idx) => idx !== index));
  };

  const ticketHasData = (ticket) => {
    if (!ticket) return false;
    const hasName = !!ticket.name && ticket.name.trim().length > 0;
    const hasDescription =
      !!ticket.description && ticket.description.trim().length > 0;
    const hasPrice =
      ticket.price !== "" &&
      ticket.price !== null &&
      typeof ticket.price !== "undefined";
    const hasQuantity =
      ticket.quantity_available !== "" &&
      ticket.quantity_available !== null &&
      typeof ticket.quantity_available !== "undefined";
    const hasMaxPerOrder =
      ticket.max_per_order !== "" &&
      ticket.max_per_order !== null &&
      typeof ticket.max_per_order !== "undefined";
    const hasSaleStart = !!ticket.sale_start;
    const hasSaleEnd = !!ticket.sale_end;
    const hasTerms =
      !!ticket.terms_conditions && ticket.terms_conditions.trim().length > 0;

    return (
      hasName ||
      hasDescription ||
      hasPrice ||
      hasQuantity ||
      hasMaxPerOrder ||
      hasSaleStart ||
      hasSaleEnd ||
      hasTerms
    );
  };

  const isEmptyNewTicket = (ticket) => !ticket?.id && !ticketHasData(ticket);

  const validateTickets = (ticketsToValidate) => {
    const missingName = ticketsToValidate.find((ticket) => {
      if (isEmptyNewTicket(ticket)) {
        return false;
      }
      return !ticket?.name || !ticket.name.trim();
    });

    if (missingName) {
      showToastError("Ticket name is required.");
      return false;
    }

    const invalidDates = ticketsToValidate.find((ticket) => {
      if (isEmptyNewTicket(ticket)) return false;
      if (!ticket.sale_start || !ticket.sale_end) return false;
      const start = Date.parse(ensureUtcZ(ticket.sale_start));
      const end = Date.parse(ensureUtcZ(ticket.sale_end));
      return Number.isFinite(start) && Number.isFinite(end) && end < start;
    });

    if (invalidDates) {
      showToastError("Ticket sales end date cannot be before the start date.");
      return false;
    }

    return true;
  };

  const saveTickets = async (ticketsToSave) => {
    if (!event?.id || savingTickets) return;
    const filteredTickets = ticketsToSave.filter(
      (ticket) => !isEmptyNewTicket(ticket)
    );
    if (!validateTickets(filteredTickets)) {
      return;
    }

    setSavingTickets(true);
    try {
      const savedTickets = [];

      for (let index = 0; index < filteredTickets.length; index += 1) {
        const ticket = filteredTickets[index];
        const payload = {
          name: ticket.name,
          description: ticket.description || "",
          price: ticket.price !== "" ? parseFloat(ticket.price) : 0,
          currency: ticket.currency || DEFAULT_CURRENCY,
          quantity_available:
            ticket.quantity_available === "" ||
            ticket.quantity_available === null
              ? null
              : parseInt(ticket.quantity_available, 10),
          max_per_order:
            ticket.max_per_order === "" || ticket.max_per_order === null
              ? null
              : parseInt(ticket.max_per_order, 10),
          sale_start:
            ticket.sale_start === undefined || ticket.sale_start === null
              ? ""
              : ticket.sale_start,
          sale_end:
            ticket.sale_end === undefined || ticket.sale_end === null
              ? ""
              : ticket.sale_end,
          terms_conditions: ticket.terms_conditions || "",
          sort_order: index,
          status: ticket.status || "active",
        };

        if (ticket.id) {
          const response = await callLocalApi(`tickets/${ticket.id}`, {
            method: "PUT",
            data: payload,
          });
          savedTickets.push(normalizeTicket(response?.ticket || ticket));
        } else {
          const response = await callLocalApi(
            `events/${event.id}/tickets`,
            {
              method: "POST",
              data: payload,
            }
          );
          if (response?.ticket) {
            savedTickets.push(normalizeTicket(response.ticket));
          }
        }
      }

      setTickets(savedTickets);
      const storedExpanded =
        expandedStorageKey &&
        typeof window !== "undefined" &&
        window.localStorage
          ? window.localStorage.getItem(expandedStorageKey)
          : null;
      let parsedExpanded = null;
      if (storedExpanded) {
        try {
          parsedExpanded = JSON.parse(storedExpanded);
        } catch (e) {
          parsedExpanded = null;
        }
      }
      setExpandedTickets(
        savedTickets.reduce((acc, ticket) => {
          const storedValue =
            parsedExpanded &&
            Object.prototype.hasOwnProperty.call(
              parsedExpanded,
              String(ticket.id)
            )
              ? parsedExpanded[String(ticket.id)]
              : null;
          acc[ticket.id] = typeof storedValue === "boolean" ? storedValue : true;
          return acc;
        }, {})
      );
      return savedTickets;
    } catch (error) {
      if (error?.message === "Ticket name is required.") {
        return;
      }
      showToastError("Failed to save tickets.");
      throw error;
    } finally {
      setSavingTickets(false);
    }
  };

  useEffect(() => {
    if (!registerBeforeSave) return;
    return registerBeforeSave(async () => {
      if (!event?.id) return;
      const currentTickets = ticketsRef.current;
      if (!currentTickets || currentTickets.length === 0) return;
      await saveTickets(currentTickets);
    });
  }, [registerBeforeSave, event?.id]);

  return (
    <div className="flex flex-col w-full gap-8">
      <StripeConnectNotice />
      <Box container>
        <Heading level={3}>{__("Tickets", "eventkoi")}</Heading>

        {!event?.id && (
          <p className="text-sm text-muted-foreground">
            {__(
              "Save the event first before adding tickets.",
              "eventkoi"
            )}
          </p>
        )}

        <div className="flex flex-col gap-6">
          <SettingToggle
            id="tickets_auto_create_account"
            label={__("Auto-create attendee account", "eventkoi")}
            description={__(
              "Create a WordPress user when someone purchases a ticket.",
              "eventkoi",
            )}
            checked={ticketSettings.auto_create_account}
            onCheckedChange={() => handleToggle("auto_create_account")}
          />

          <SettingToggle
            id="tickets_show_remaining"
            label={__("Show remaining tickets", "eventkoi")}
            description={__(
              "Display the number of available tickets on the event page.",
              "eventkoi",
            )}
            checked={ticketSettings.show_remaining}
            onCheckedChange={() => handleToggle("show_remaining")}
          />

          <div className="flex flex-col gap-2 max-w-[500px] pt-4">
            <Label className="font-medium" htmlFor="tickets-terms-conditions">
              {__("Terms & conditions", "eventkoi")}
            </Label>
            <Textarea
              id="tickets-terms-conditions"
              placeholder={__(
                "Add ticket terms and conditions here.",
                "eventkoi",
              )}
              value={ticketSettings.terms_conditions}
              onChange={handleTextChange}
              className="min-h-[110px]"
            />
          </div>

          <div className="flex flex-col gap-4 mt-2">
            {loadingTickets && (
              <div className="text-sm text-muted-foreground">
                {__("Loading tickets…", "eventkoi")}
              </div>
            )}

            {tickets.map((ticket, index) => {
              const key = ticket.id || ticket.tempId || index;
              const isExpanded = expandedTickets[key] ?? true;
              const isDragging = draggingIndex === index;
              const startDateRaw = ticket.sale_start
                ? getDateInTimezone(ensureUtcZ(ticket.sale_start), wpTz)
                : null;
              const endDateRaw = ticket.sale_end
                ? getDateInTimezone(ensureUtcZ(ticket.sale_end), wpTz)
                : null;
              const startDate =
                startDateRaw && isValid(startDateRaw) ? startDateRaw : null;
              const endDate = endDateRaw && isValid(endDateRaw) ? endDateRaw : null;

              return (
                <div
                  key={key}
                  className={cn(
                    "rounded-xl border border-input bg-white p-4",
                    isDragging && "opacity-60",
                    dragOverIndex === index &&
                      "border-primary/70 shadow-[0_0_0_1px_rgba(0,0,0,0.05)]"
                  )}
                  data-drag-item
                  onDragOver={handleDragOver(index)}
                  onDrop={handleDrop(index)}
                >
                  <div className="relative flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
                        onClick={(e) => e.preventDefault()}
                        aria-label={__("Reorder ticket", "eventkoi")}
                        title={__("Drag to reorder", "eventkoi")}
                        draggable
                        onDragStart={handleDragStart(index)}
                        onDragEnd={handleDragEnd}
                      >
                        <GripVertical className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Input
                        aria-label={__("Ticket name", "eventkoi")}
                        placeholder={__("Enter ticket name", "eventkoi")}
                        value={ticket.name || ""}
                        onChange={(e) =>
                          handleTicketChange(index, { name: e.target.value })
                        }
                        className="max-w-[260px] h-9 text-base border-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-foreground"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          aria-label={__("Toggle ticket active", "eventkoi")}
                          checked={ticket.status !== "inactive"}
                          onCheckedChange={(checked) =>
                            handleTicketChange(index, {
                              status: checked ? "active" : "inactive",
                            })
                          }
                          className="data-[state=checked]:bg-foreground"
                        />
                        <span className="text-xs text-muted-foreground">
                          {__("Active", "eventkoi")}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-foreground/90 hover:text-foreground"
                        onClick={() => toggleTicket(key)}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? __("Collapse ticket", "eventkoi") : __("Expand ticket", "eventkoi")}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-foreground/90 hover:text-destructive"
                        onClick={() => handleDeleteTicket(ticket, index)}
                        aria-label={__("Delete ticket", "eventkoi")}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-6 grid gap-6 p-6">
                      <div className="flex flex-wrap items-start gap-16">
                        <div className="grid gap-2">
                          <Label htmlFor={`ticket-${key}-price`}>
                            {__("Price", "eventkoi")}
                          </Label>
                        <InputGroup className="w-auto">
                          <InputGroupText>
                            {currencySymbol || globalCurrency}
                          </InputGroupText>
                          <InputGroupInput
                            id={`ticket-${key}-price`}
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-[120px]"
                            value={ticket.price ?? ""}
                              onChange={(e) =>
                                handleTicketChange(index, {
                                  price: e.target.value,
                                })
                              }
                            />
                          </InputGroup>
                          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{globalCurrency}</span>
                            <span aria-hidden="true">•</span>
                            <Link
                              to="/settings/payments"
                              className="underline underline-offset-2 hover:text-foreground"
                            >
                              {__("Change currency", "eventkoi")}
                            </Link>
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`ticket-${key}-quantity`}>
                            {__("Quantity available", "eventkoi")}
                          </Label>
                          <Input
                            id={`ticket-${key}-quantity`}
                            type="number"
                            min="0"
                            className="max-w-[120px]"
                            value={ticket.quantity_available ?? ""}
                            onChange={(e) =>
                              handleTicketChange(index, {
                                quantity_available: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`ticket-${key}-max-per-order`}>
                            {__("Max per order", "eventkoi")}
                          </Label>
                          <Input
                            id={`ticket-${key}-max-per-order`}
                            type="number"
                            min="0"
                            className="max-w-[120px]"
                            value={ticket.max_per_order ?? ""}
                            onChange={(e) =>
                              handleTicketChange(index, {
                                max_per_order: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="grid gap-2">
                            <div className="flex items-center justify-between gap-2 min-h-[18px]">
                              <Label>
                                {__("Ticket sales start", "eventkoi")}
                              </Label>
                              {startDate ? (
                                <button
                                  type="button"
                                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                                  onClick={() =>
                                    handleTicketChange(index, {
                                      sale_start: null,
                                    })
                                  }
                                >
                                  {__("Clear", "eventkoi")}
                                </button>
                              ) : (
                                <span className="text-xs opacity-0">{"Clear"}</span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <FloatingDatePicker
                                value={startDate || undefined}
                                wpTz={wpTz}
                                onChange={(pickedDate) => {
                                  if (!pickedDate) return;
                                  const startTime = startDate
                                    ? {
                                        h: startDate.getHours(),
                                        m: startDate.getMinutes(),
                                      }
                                    : { h: 9, m: 0 };
                                  const newStart = pickedDate.set({
                                    hour: startTime.h,
                                    minute: startTime.m,
                                    second: 0,
                                    millisecond: 0,
                                  });
                                  handleTicketChange(index, {
                                    sale_start: newStart
                                      .toUTC()
                                      .toISO({ suppressMilliseconds: true }),
                                  });
                                }}
                                className="disabled:bg-muted disabled:text-muted-foreground/40 disabled:cursor-not-allowed disabled:opacity-100"
                              />
                              <TimeInput
                                date={startDate || undefined}
                                wpTz={wpTz}
                                setDate={(utcDate) => {
                                  if (!utcDate || !startDate) return;
                                  const parsedUtc = DateTime.fromJSDate(utcDate, {
                                    zone: "utc",
                                  }).setZone(wpTz);
                                  const dtWall = DateTime.fromJSDate(startDate, {
                                    zone: wpTz,
                                  }).set({
                                    hour: parsedUtc.hour,
                                    minute: parsedUtc.minute,
                                    second: 0,
                                    millisecond: 0,
                                  });
                                  handleTicketChange(index, {
                                    sale_start: dtWall
                                      .toUTC()
                                      .toISO({ suppressMilliseconds: true }),
                                  });
                                }}
                                disabled={!startDate}
                              />
                            </div>
                          </div>

                          <MoveRight
                            className="w-6 h-6 text-muted-foreground mt-[22px]"
                            strokeWidth={1.5}
                          />

                          <div className="grid gap-2">
                            <div className="flex items-center justify-between gap-2 min-h-[18px]">
                              <Label>{__("Ticket sales end", "eventkoi")}</Label>
                              {endDate ? (
                                <button
                                  type="button"
                                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                                  onClick={() =>
                                    handleTicketChange(index, {
                                      sale_end: null,
                                    })
                                  }
                                >
                                  {__("Clear", "eventkoi")}
                                </button>
                              ) : (
                                <span className="text-xs opacity-0">{"Clear"}</span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <FloatingDatePicker
                                value={endDate || undefined}
                                wpTz={wpTz}
                                onChange={(pickedDate) => {
                                  if (!pickedDate) return;
                                  const endTime = endDate
                                    ? {
                                        h: endDate.getHours(),
                                        m: endDate.getMinutes(),
                                      }
                                    : { h: 17, m: 0 };
                                  const newEnd = pickedDate.set({
                                    hour: endTime.h,
                                    minute: endTime.m,
                                    second: 0,
                                    millisecond: 0,
                                  });
                                  handleTicketChange(index, {
                                    sale_end: newEnd
                                      .toUTC()
                                      .toISO({ suppressMilliseconds: true }),
                                  });
                                }}
                                className="disabled:bg-muted disabled:text-muted-foreground/40 disabled:cursor-not-allowed disabled:opacity-100"
                              />
                              <TimeInput
                                date={endDate || undefined}
                                wpTz={wpTz}
                                setDate={(utcDate) => {
                                  if (!utcDate || !endDate) return;
                                  const parsedUtc = DateTime.fromJSDate(utcDate, {
                                    zone: "utc",
                                  }).setZone(wpTz);
                                  const dtWall = DateTime.fromJSDate(endDate, {
                                    zone: wpTz,
                                  }).set({
                                    hour: parsedUtc.hour,
                                    minute: parsedUtc.minute,
                                    second: 0,
                                    millisecond: 0,
                                  });
                                  handleTicketChange(index, {
                                    sale_end: dtWall
                                      .toUTC()
                                      .toISO({ suppressMilliseconds: true }),
                                  });
                                }}
                                disabled={!endDate}
                              />
                            </div>
                          </div>
                        </div>
                        {startDate && endDate && endDate < startDate ? (
                          <p className="text-sm font-medium text-destructive mt-1">
                            {__(
                              "Ticket sales end date cannot be before the start date.",
                              "eventkoi",
                            )}
                          </p>
                        ) : null}
                      </div>

                      <div className="grid gap-2">
                      <Label htmlFor={`ticket-${key}-description`}>
                        {__("Description", "eventkoi")}
                      </Label>
                      <Input
                        id={`ticket-${key}-description`}
                        value={ticket.description || ""}
                        onChange={(e) =>
                          handleTicketChange(index, {
                            description: e.target.value,
                          })
                        }
                        className="max-w-[468px]"
                      />
                        <p className="text-sm text-muted-foreground">
                          {__(
                            "Give a short description of the ticket to attendees.",
                            "eventkoi"
                          )}
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor={`ticket-${key}-terms`}>
                          {__("Additional terms & conditions", "eventkoi")}
                        </Label>
                        <Textarea
                          id={`ticket-${key}-terms`}
                          value={ticket.terms_conditions || ""}
                          onChange={(e) =>
                            handleTicketChange(index, {
                              terms_conditions: e.target.value,
                          })
                        }
                        className="min-h-[110px] max-w-[468px]"
                      />
                        <p className="text-sm text-muted-foreground">
                          {__(
                            "Add additional terms & conditions that only apply to this ticket.",
                            "eventkoi"
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={handleAddTicket}
                disabled={!event?.id}
              >
                <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                {__("Add ticket", "eventkoi")}
              </Button>
            </div>
        </div>
      </div>
    </Box>
  </div>
  );
}
