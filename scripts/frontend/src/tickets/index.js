"use client";

import { __, sprintf } from "@wordpress/i18n";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Calendar,
  CheckCircle2,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Ticket,
  X,
} from "lucide-react";
import { decodeEntities } from "@wordpress/html-entities";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import publicApi, { resolvePublicRestUrl } from "@/lib/public-api";

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

function getActiveInstance(event = {}, instanceTs = 0) {
  if (!event || typeof event !== "object") return null;

  if (
    event.date_type === "recurring" &&
    instanceTs &&
    !Number.isNaN(Number(instanceTs))
  ) {
    const rule = event.recurrence_rules?.[0];
    if (rule?.start_date) {
      const start = new Date(Number(instanceTs) * 1000);
      const startBase = new Date(rule.start_date);
      const endBase = new Date(rule.end_date || rule.start_date);
      const duration = endBase.getTime() - startBase.getTime();
      const end = new Date(start.getTime() + Math.max(duration, 0));
      return {
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        all_day: !!rule.all_day,
      };
    }
  }

  if (
    event.date_type === "standard" &&
    Array.isArray(event.event_days) &&
    event.event_days.length
  ) {
    return event.event_days[0];
  }

  if (Array.isArray(event.recurrence_rules) && event.recurrence_rules.length) {
    return event.recurrence_rules[0];
  }

  if (event.start_date) {
    return {
      start_date: event.start_date,
      end_date: event.end_date,
      all_day: !!event.all_day,
    };
  }

  return null;
}

function formatEventDateLine(event = {}, instanceTs = 0) {
  const instance = getActiveInstance(event, instanceTs);
  if (!instance?.start_date) return "";

  const start = new Date(instance.start_date);
  const end = instance?.end_date ? new Date(instance.end_date) : null;
  if (Number.isNaN(start.getTime())) return "";

  const sameYear = !end || start.getFullYear() === end.getFullYear();
  const startFmt = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(start);

  if (!end || Number.isNaN(end.getTime())) {
    return startFmt;
  }

  const endFmt = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  }).format(end);

  return `${startFmt} - ${endFmt}`;
}

function getRenderedEventDatetimeText() {
  if (typeof document === "undefined") return "";
  const node = document.querySelector(".ek-datetime");
  if (!node) return "";

  // Keep checkout summary perfectly aligned with the event details display.
  // Do not reformat from raw timestamps here, because that can drift from the
  // current rendered timezone/format rules.
  return node.textContent?.trim() || "";
}

function formatEventLocationLine(event = {}) {
  const first = Array.isArray(event.locations) ? event.locations[0] : null;
  if (first?.type === "virtual") {
    return first?.virtual_url || event.location_line || "";
  }

  const fromParts = [
    first?.name,
    first?.address1,
    first?.address2,
    first?.city,
    first?.state,
    first?.zip,
    first?.country,
  ]
    .filter(Boolean)
    .join(", ");

  return fromParts || event.location_line || "";
}

function readCheckoutSuccessFromUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  const checkoutStatus = String(
    url.searchParams.get("ek_checkout") || hashParams.get("ek_checkout") || "",
  );

  if (checkoutStatus !== "success" && checkoutStatus !== "pending") {
    return "";
  }

  if (checkoutStatus === "pending") {
    return "pending";
  }

  const sessionId = String(
    url.searchParams.get("ek_stripe_session_id") ||
      hashParams.get("ek_stripe_session_id") ||
      "",
  ).trim();

  const wcOrderId = String(
    url.searchParams.get("ek_wc_order_id") ||
      hashParams.get("ek_wc_order_id") ||
      "",
  ).trim();

  return wcOrderId ? `wc_${wcOrderId}` : sessionId || "success";
}

function clearCheckoutSuccessFromUrl() {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  url.searchParams.delete("ek_checkout");
  url.searchParams.delete("ek_stripe_session_id");
  url.searchParams.delete("ek_wc_order_id");
  hashParams.delete("ek_checkout");
  hashParams.delete("ek_stripe_session_id");
  hashParams.delete("ek_wc_order_id");
  const nextHash = hashParams.toString();
  window.history.replaceState(
    {},
    "",
    `${url.pathname}${url.search}${nextHash ? `#${nextHash}` : ""}`,
  );
}

const formatPrice = (value, currency = "USD") => {
  const amount = Number(value) || 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
      minimumFractionDigits: amount % 1 ? 2 : 0,
      maximumFractionDigits: amount % 1 ? 2 : 0,
    }).format(amount);
  } catch (e) {
    return `${currency} ${amount}`;
  }
};

function getTicketLimits(ticket) {
  const remainingCount =
    ticket?.remaining !== null && Number.isFinite(Number(ticket?.remaining))
      ? Number(ticket.remaining)
      : null;
  const maxPerOrderCount = Number(ticket?.max_per_order) || null;
  const maxAllowedQty =
    remainingCount !== null && maxPerOrderCount
      ? Math.min(remainingCount, maxPerOrderCount)
      : remainingCount !== null
        ? remainingCount
        : maxPerOrderCount;

  const soldOut = remainingCount !== null && remainingCount <= 0;
  const saleEnded =
    !ticket?.is_on_sale &&
    !!ticket?.sale_end &&
    Number.isFinite(
      Date.parse(String(ticket.sale_end).replace(" ", "T") + "Z"),
    ) &&
    Date.now() > Date.parse(String(ticket.sale_end).replace(" ", "T") + "Z");
  const saleNotStarted =
    !ticket?.is_on_sale &&
    !soldOut &&
    !saleEnded &&
    !!ticket?.sale_start &&
    Number.isFinite(
      Date.parse(String(ticket.sale_start).replace(" ", "T") + "Z"),
    ) &&
    Date.now() < Date.parse(String(ticket.sale_start).replace(" ", "T") + "Z");
  const unavailable = soldOut || !ticket?.is_on_sale;
  const unavailableLabel = soldOut
    ? __("Sold out", "eventkoi")
    : null;

  return {
    remainingCount,
    maxPerOrderCount,
    maxAllowedQty,
    soldOut,
    saleEnded,
    saleNotStarted,
    unavailable,
    unavailableLabel,
  };
}

function TicketsWidget({ eventId, instanceTs, mountEl }) {
  const idPrefix = useId().replace(/:/g, "");
  const firstNameId = `${idPrefix}-checkout-first-name`;
  const lastNameId = `${idPrefix}-checkout-last-name`;
  const emailId = `${idPrefix}-checkout-email`;
  const firstNameErrorId = `${idPrefix}-checkout-first-name-error`;
  const lastNameErrorId = `${idPrefix}-checkout-last-name-error`;
  const emailHelpId = `${idPrefix}-checkout-email-help`;
  const emailErrorId = `${idPrefix}-checkout-email-error`;
  const checkoutErrorId = `${idPrefix}-checkout-error`;
  const stepTwoHeadingId = `${idPrefix}-checkout-step-two-title`;
  const [data, setData] = useState(null);
  const stepOneCheckoutButtonRef = useRef(null);
  const firstNameInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState("tickets");
  const [checkoutError, setCheckoutError] = useState("");
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutAttempted, setCheckoutAttempted] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [checkoutSuccessSessionId, setCheckoutSuccessSessionId] = useState(
    () => readCheckoutSuccessFromUrl(),
  );
  const checkoutConfirmationSentRef = useRef(false);
  const checkoutSuccessFromUrl = readCheckoutSuccessFromUrl();
  const checkoutSuccessValue = checkoutSuccessSessionId || checkoutSuccessFromUrl;
  const [quantities, setQuantities] = useState({});
  const [billing, setBilling] = useState(() => ({
    first_name: String(eventkoi_params?.rsvp_user?.first_name || "").trim(),
    last_name: String(eventkoi_params?.rsvp_user?.last_name || "").trim(),
    email: String(eventkoi_params?.rsvp_user?.email || "").trim(),
  }));

  useEffect(() => {
    if (!eventId) return;

    const params = new URLSearchParams();
    if (instanceTs) {
      params.set("instance_ts", String(instanceTs));
    }

    const fetchTickets = async () => {
      try {
        setLoading(true);
        const res = await publicApi({
          path: resolvePublicRestUrl(
            `/events/${eventId}/tickets/public?${params.toString()}`,
          ),
        });
        setData(res);
      } catch (err) {
        setError(
          err?.message || err?.response?.message || "Unable to load tickets.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [eventId, instanceTs]);

  useEffect(() => {
    if (!mountEl || !data) return;

    if (data.attendance_mode !== "tickets") {
      const wrapper = mountEl.closest(".eventkoi-front");
      if (wrapper) {
        wrapper.remove();
      } else {
        mountEl.remove();
      }
    }
  }, [data, mountEl]);

  const tickets = useMemo(
    () => (Array.isArray(data?.tickets) ? data.tickets : []),
    [data],
  );
  const showRemainingTickets = data?.tickets_show_remaining !== false;
  const showUnavailableTickets = true;
  const visibleTickets = useMemo(
    () =>
      showUnavailableTickets
        ? tickets
        : tickets.filter((ticket) => !getTicketLimits(ticket).unavailable),
    [tickets, showUnavailableTickets],
  );

  useEffect(() => {
    if (!visibleTickets.length) return;
    setQuantities((prev) => {
      const next = { ...prev };
      visibleTickets.forEach((ticket) => {
        const id = String(ticket.id);
        const { maxAllowedQty, unavailable } = getTicketLimits(ticket);
        if (typeof next[id] !== "number") {
          next[id] = 0;
          return;
        }
        if (unavailable) {
          next[id] = 0;
          return;
        }
        if (maxAllowedQty !== null && next[id] > maxAllowedQty) {
          next[id] = maxAllowedQty;
        }
      });
      return next;
    });
  }, [visibleTickets]);

  useEffect(() => {
    if (!isDialogOpen) {
      setDialogStep("tickets");
      setCheckoutError("");
      setIsCheckoutLoading(false);
      setCheckoutAttempted(false);
      setEmailTouched(false);
    }
  }, [isDialogOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const successFromUrl = readCheckoutSuccessFromUrl();
    if (!successFromUrl) {
      return;
    }
    setCheckoutSuccessSessionId(successFromUrl);
    clearCheckoutSuccessFromUrl();
  }, []);

  useEffect(() => {
    const sessionId = String(checkoutSuccessValue || "").trim();
    if (!sessionId || sessionId === "success" || sessionId === "pending" || checkoutConfirmationSentRef.current) {
      return;
    }

    checkoutConfirmationSentRef.current = true;
    let cancelled = false;

    const sendConfirmation = () => {
      if (cancelled) return;
      const isWcOrder = sessionId.startsWith("wc_");
      publicApi({
        path: resolvePublicRestUrl("/tickets/orders/send-confirmation"),
        method: "POST",
        data: {
          checkout_session_id: isWcOrder ? "" : sessionId,
          wc_order_id: isWcOrder ? Number(sessionId.replace("wc_", "")) : 0,
          event_id: Number(eventId) || 0,
          instance_ts: Number(instanceTs) || 0,
        },
      }).catch(() => {
        if (!cancelled) {
          checkoutConfirmationSentRef.current = false;
        }
      });
    };

    // Small delay so the backend polling has time to find the completed order.
    const timer = setTimeout(sendConfirmation, 2000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [checkoutSuccessValue, eventId, instanceTs]);

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    if (dialogStep === "checkout") {
      requestAnimationFrame(() => {
        if (firstNameInputRef.current) {
          firstNameInputRef.current.focus();
        }
      });
      return;
    }

    requestAnimationFrame(() => {
      if (stepOneCheckoutButtonRef.current) {
        stepOneCheckoutButtonRef.current.focus();
      }
    });
  }, [isDialogOpen, dialogStep]);

  const eventTitle = decodeEntities(data?.event_title || "");
  const eventInstanceTitle = decodeEntities(
    data?.event_instance_title ||
      data?.instance_title ||
      eventkoi_params?.event?.instance_title ||
      "",
  );
  const eventMeta = eventkoi_params?.event || {};
  const footerEventTitle = decodeEntities(eventMeta?.title || eventTitle || "");
  const checkoutEventTitle = footerEventTitle || eventTitle || eventInstanceTitle;
  const checkoutEventInstanceTitle = eventInstanceTitle || checkoutEventTitle;
  const footerEventLocation = formatEventLocationLine(eventMeta);
  const footerEventDate =
    getRenderedEventDatetimeText() ||
    formatEventDateLine(eventMeta, instanceTs);

  const selectedTicketItems = useMemo(
    () =>
      visibleTickets
        .map((ticket) => {
          const qty = Math.max(0, Number(quantities[String(ticket.id)] || 0));
          if (qty < 1) return null;
          const price = Number(ticket.price) || 0;
          return {
            ticket_id: Number(ticket.id),
            name: String(ticket.name || ""),
            description: String(ticket.description || ""),
            quantity: qty,
            unit_price: price,
            line_total: qty * price,
          };
        })
        .filter(Boolean),
    [visibleTickets, quantities],
  );

  const summaryDate =
    formatEventDateLine(eventMeta, instanceTs) ||
    getRenderedEventDatetimeText() ||
    "";

  const checkoutNote = useMemo(() => {
    const parts = [];
    const renderedDate = getRenderedEventDatetimeText();
    if (renderedDate) {
      parts.push(renderedDate);
    } else if (summaryDate) {
      parts.push(summaryDate);
    }
    if (footerEventLocation) {
      parts.push(footerEventLocation);
    }
    return parts.join(" • ");
  }, [summaryDate, footerEventLocation]);

  if (!eventId) {
    return null;
  }

  if (loading) {
    return null;
  }

  if (error) {
    const normalized = String(error).toLowerCase();
    if (normalized.includes("invalid event")) {
      return null;
    }
    return (
      <div className="eventkoi-tickets__error text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!data || data.attendance_mode !== "tickets") {
    return null;
  }

  if (data.event_ended) {
    return (
      <div className="eventkoi-tickets__ended text-sm text-muted-foreground">
        This event has ended and is no longer accepting ticket purchases.
      </div>
    );
  }

  if (tickets.length === 0) {
    return null;
  }

  if (visibleTickets.length === 0) {
    return null;
  }

  const prices = visibleTickets
    .map((ticket) => Number(ticket.price))
    .filter((price) => Number.isFinite(price) && price >= 0);

  if (prices.length === 0) {
    return null;
  }

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const currency = visibleTickets[0]?.currency || tickets[0]?.currency || "USD";

  const formatWholeCurrency = (amount) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        currencyDisplay: "symbol",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch (e) {
      return formatPrice(amount, currency);
    }
  };

  const priceRange =
    minPrice === maxPrice
      ? formatWholeCurrency(minPrice)
      : `${formatWholeCurrency(minPrice)}-${formatWholeCurrency(
          maxPrice,
        ).replace(/^[^0-9]+/, "")}`;

  const latestSaleEndTs = visibleTickets.reduce((latest, ticket) => {
    if (!ticket?.sale_end) return latest;
    const normalized = String(ticket.sale_end).replace(" ", "T") + "Z";
    const parsed = Date.parse(normalized);
    if (!Number.isFinite(parsed)) return latest;
    if (latest === null || parsed > latest) return parsed;
    return latest;
  }, null);

  const saleEndLabel =
    latestSaleEndTs !== null
      ? new Intl.DateTimeFormat(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(new Date(latestSaleEndTs))
      : null;

  const allVisibleUnavailable =
    visibleTickets.length > 0 &&
    visibleTickets.every((ticket) => getTicketLimits(ticket).unavailable);

  const allVisibleSoldOut =
    allVisibleUnavailable &&
    visibleTickets.every((ticket) => getTicketLimits(ticket).soldOut);

  const allVisibleNotStarted =
    visibleTickets.length > 0 &&
    visibleTickets.every((ticket) => getTicketLimits(ticket).saleNotStarted);

  const allVisibleSaleEnded =
    visibleTickets.length > 0 &&
    visibleTickets.every((ticket) => {
      const limits = getTicketLimits(ticket);
      return limits.saleEnded || limits.soldOut;
    });

  const earliestSaleStartTs = visibleTickets.reduce((earliest, ticket) => {
    if (!ticket?.sale_start) return earliest;
    const normalized = String(ticket.sale_start).replace(" ", "T") + "Z";
    const parsed = Date.parse(normalized);
    if (!Number.isFinite(parsed)) return earliest;
    if (earliest === null || parsed < earliest) return parsed;
    return earliest;
  }, null);

  const saleStartLabel =
    earliestSaleStartTs !== null
      ? new Intl.DateTimeFormat(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(new Date(earliestSaleStartTs))
      : null;

  const orderTotal = visibleTickets.reduce((sum, ticket) => {
    const qty = Math.max(0, Number(quantities[String(ticket.id)] || 0));
    return sum + (Number(ticket.price) || 0) * qty;
  }, 0);
  const canCheckout = selectedTicketItems.length > 0;

  const saleEndByTicket = (saleEnd) => {
    if (!saleEnd) return null;
    const parsed = Date.parse(String(saleEnd).replace(" ", "T") + "Z");
    if (!Number.isFinite(parsed)) return null;
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(parsed));
  };

  const saleStartByTicket = (saleStart) => {
    if (!saleStart) return null;
    const parsed = Date.parse(String(saleStart).replace(" ", "T") + "Z");
    if (!Number.isFinite(parsed)) return null;
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(parsed));
  };

  const decrementQty = (ticket) => {
    const { unavailable } = getTicketLimits(ticket);
    if (unavailable) return;
    const id = String(ticket.id);
    setQuantities((prev) => {
      const current = Number.isFinite(Number(prev[id])) ? Number(prev[id]) : 0;
      const nextValue = Math.max(0, current - 1);
      return { ...prev, [id]: nextValue };
    });
  };

  const setQtyFromInput = (ticket, rawValue) => {
    const { maxPerOrderCount, remainingCount, unavailable } =
      getTicketLimits(ticket);
    if (unavailable) return;
    const id = String(ticket.id);
    const parsed = Number.parseInt(String(rawValue), 10);
    const safeValue = Number.isFinite(parsed) ? parsed : 0;

    let nextValue = Math.max(0, safeValue);
    if (maxPerOrderCount && nextValue > maxPerOrderCount) {
      nextValue = maxPerOrderCount;
    }
    if (
      remainingCount !== null &&
      Number.isFinite(remainingCount) &&
      nextValue > remainingCount
    ) {
      nextValue = remainingCount;
    }

    setQuantities((prev) => ({ ...prev, [id]: nextValue }));
  };

  const incrementQty = (ticket) => {
    const { maxPerOrderCount, remainingCount, unavailable } =
      getTicketLimits(ticket);
    if (unavailable) return;
    const id = String(ticket.id);
    setQuantities((prev) => {
      const current = Number.isFinite(Number(prev[id])) ? Number(prev[id]) : 0;
      let nextValue = current + 1;
      if (maxPerOrderCount && nextValue > maxPerOrderCount) {
        nextValue = maxPerOrderCount;
      }
      if (
        remainingCount !== null &&
        Number.isFinite(remainingCount) &&
        nextValue > remainingCount
      ) {
        nextValue = remainingCount;
      }
      return { ...prev, [id]: Math.max(0, nextValue) };
    });
  };

  const canContinueCheckout = selectedTicketItems.length > 0;
  const firstNameValue = String(billing.first_name || "").trim();
  const lastNameValue = String(billing.last_name || "").trim();
  const emailValue = String(billing.email || "").trim();
  const hasValidBillingEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  const isFirstNameInvalid = checkoutAttempted && firstNameValue === "";
  const isLastNameInvalid = checkoutAttempted && lastNameValue === "";
  const isEmailInvalid =
    (checkoutAttempted || emailTouched) &&
    emailValue !== "" &&
    !hasValidBillingEmail;
  const hasRequiredBillingFields =
    firstNameValue !== "" && lastNameValue !== "" && hasValidBillingEmail;

  const startHostedCheckout = async () => {
    if (!canContinueCheckout || isCheckoutLoading) return;
    setCheckoutAttempted(true);

    const email = emailValue;
    if (firstNameValue === "" || lastNameValue === "" || email === "") {
      setCheckoutError(__("Please complete all required fields.", "eventkoi"));
      return;
    }
    if (!hasValidBillingEmail) {
      setCheckoutError(__("Please enter a valid email address.", "eventkoi"));
      return;
    }

    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.set("ek_checkout", "success");
    const checkoutAttemptId =
      typeof window !== "undefined" &&
      window.crypto &&
      typeof window.crypto.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `ek-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    try {
      setCheckoutError("");
      setIsCheckoutLoading(true);

      // Final client-side inventory re-check before creating checkout session.
      const params = new URLSearchParams();
      if (instanceTs) {
        params.set("instance_ts", String(instanceTs));
      }
      const latest = await publicApi({
        path: resolvePublicRestUrl(
          `/events/${eventId}/tickets/public?${params.toString()}`,
        ),
      });

      const latestTickets = Array.isArray(latest?.tickets)
        ? latest.tickets
        : [];
      const latestById = new Map(
        latestTickets.map((ticket) => [Number(ticket.id), ticket]),
      );

      for (const selectedItem of selectedTicketItems) {
        const latestTicket = latestById.get(Number(selectedItem.ticket_id));
        if (!latestTicket) {
          throw new Error(
            __(
              "One or more selected tickets are no longer available.",
              "eventkoi",
            ),
          );
        }

        const limits = getTicketLimits(latestTicket);
        if (limits.unavailable) {
          throw new Error(
            sprintf(
              __("“%s” is no longer available.", "eventkoi"),
              latestTicket.name || __("Selected ticket", "eventkoi"),
            ),
          );
        }

        if (
          limits.remainingCount !== null &&
          Number(selectedItem.quantity) > Number(limits.remainingCount)
        ) {
          throw new Error(
            sprintf(
              __("Only %d left for “%s”.", "eventkoi"),
              Number(limits.remainingCount),
              latestTicket.name || __("Selected ticket", "eventkoi"),
            ),
          );
        }
      }

      // Keep UI in sync with latest availability after re-check.
      setData(latest);

      const payload = await publicApi({
        path: resolvePublicRestUrl("/tickets/checkout-session"),
        method: "POST",
        data: {
          event_id: Number(eventId) || 0,
          instance_ts: Number(instanceTs) || 0,
          event_instance_ts: Number(instanceTs) || 0,
          event_title: checkoutEventTitle,
          event_instance_title: checkoutEventInstanceTitle,
          checkout_attempt_id: checkoutAttemptId,
          return_url: returnUrl.toString(),
          checkout_note: checkoutNote,
          wp_user_id: Number(eventkoi_params?.rsvp_user?.id) || 0,
          wp_user_label:
            String(
              eventkoi_params?.rsvp_user?.username ||
                eventkoi_params?.rsvp_user?.user_login ||
                eventkoi_params?.rsvp_user?.name ||
                ""
            ).trim() || "",
          first_name: String(billing.first_name || "").trim(),
          last_name: String(billing.last_name || "").trim(),
          email,
          items: selectedTicketItems.map((item) => ({
            ticket_id: item.ticket_id,
            name: String(item.name || ""),
            description: String(item.description || ""),
            quantity: item.quantity,
            unit_amount: Math.round((Number(item.unit_price) || 0) * 100),
          })),
        },
      });

      const hostedUrl =
        payload?.hosted_url || payload?.checkout_url || payload?.url;
      if (!hostedUrl) {
        throw new Error(__("Checkout URL is missing.", "eventkoi"));
      }
      window.location.href = hostedUrl;
    } catch (err) {
      setCheckoutError(
        err?.response?.message ||
          err?.message ||
          __("Unable to set up checkout.", "eventkoi"),
      );
      setIsCheckoutLoading(false);
    }
  };

  return (
    <div className="eventkoi-tickets__widget w-full max-w-[450px] rounded-[10px] border p-6" style={{ backgroundColor: '#f3f3f3', borderColor: '#eeeeee' }}>
      <div className="flex flex-col gap-6">
        {checkoutSuccessValue && checkoutSuccessValue !== "pending" ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-emerald-900">
                    {__("Payment successful", "eventkoi")}
                  </div>
                  <div className="mt-0.5 text-xs text-emerald-800">
                    {__(
                      "Your order is confirmed and your tickets will be sent by email.",
                      "eventkoi",
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-100"
                onClick={() => {
                  setCheckoutSuccessSessionId("");
                  clearCheckoutSuccessFromUrl();
                }}
                aria-label={__("Dismiss success message", "eventkoi")}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        ) : null}
        {checkoutSuccessValue === "pending" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-amber-900">
                    {__("Order received", "eventkoi")}
                  </div>
                  <div className="mt-0.5 text-xs text-amber-800">
                    {__(
                      "Your tickets will be sent by email once payment is confirmed.",
                      "eventkoi",
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-amber-700 hover:bg-amber-100"
                onClick={() => {
                  setCheckoutSuccessSessionId("");
                  clearCheckoutSuccessFromUrl();
                }}
                aria-label={__("Dismiss message", "eventkoi")}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <div className="text-base font-semibold uppercase tracking-normal text-foreground">
            {__("Tickets", "eventkoi")}
          </div>
          <div className="text-3xl font-semibold leading-none text-foreground tabular-nums">
            {priceRange}
          </div>
        </div>

        {allVisibleSaleEnded && saleEndLabel ? (
          <div className="text-base text-muted-foreground">
            {sprintf(__("Ticket sales ended on %s.", "eventkoi"), saleEndLabel)}
          </div>
        ) : saleStartLabel && saleEndLabel ? (
          <div className="text-base text-muted-foreground">
            {sprintf(
              __("Ticket sales starts on %1$s and ends on %2$s.", "eventkoi"),
              saleStartLabel,
              saleEndLabel,
            )}
          </div>
        ) : saleEndLabel ? (
          <div className="text-base text-muted-foreground">
            {sprintf(__("Ticket sales end on %s.", "eventkoi"), saleEndLabel)}
          </div>
        ) : null}

        <Button
          type="button"
          className="h-14 w-full text-base font-semibold"
          onClick={() => {
            if (!allVisibleUnavailable || allVisibleNotStarted || allVisibleSaleEnded) {
              setIsDialogOpen(true);
            }
          }}
          disabled={allVisibleUnavailable && !allVisibleNotStarted && !allVisibleSaleEnded}
        >
          <Ticket className="mr-2 size-5" aria-hidden="true" />
          {allVisibleUnavailable && !allVisibleNotStarted && !allVisibleSaleEnded
            ? allVisibleSoldOut
              ? __("Sold out", "eventkoi")
              : __("Not on sale", "eventkoi")
            : __("Get tickets", "eventkoi")}
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent
            className="eventkoi-front w-[95vw] max-w-[900px] gap-0 overflow-hidden p-0"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <DialogHeader className="sr-only">
              <DialogTitle>{__("Ticket checkout", "eventkoi")}</DialogTitle>
              <DialogDescription>
                {__(
                  "Select tickets and complete billing information to continue to payment.",
                  "eventkoi",
                )}
              </DialogDescription>
            </DialogHeader>
            {dialogStep === "tickets" ? (
              <>
                <div className="p-5 pb-8 sm:p-6 sm:pb-10">
                  <div className="text-2xl font-semibold leading-none text-foreground">
                    {__("Buy tickets", "eventkoi")}
                  </div>
                </div>

                <div className="px-5 sm:px-6">
                  {visibleTickets.map((ticket, idx) => {
                    const qty = Math.max(
                      0,
                      Number(quantities[String(ticket.id)] || 0),
                    );
                    const ticketSaleEnd = saleEndByTicket(ticket.sale_end);
                    const ticketSaleStart = saleStartByTicket(ticket.sale_start);
                    const {
                      remainingCount,
                      maxPerOrderCount,
                      maxAllowedQty,
                      saleNotStarted,
                      saleEnded,
                      unavailable,
                      unavailableLabel,
                    } = getTicketLimits(ticket);
                    const liveTicketsLeft = remainingCount;
                    return (
                      <div key={ticket.id} data-ek-ticket-id={ticket.id}>
                        {idx > 0 ? (
                          <div className="h-px w-full bg-border" />
                        ) : null}
                        <div
                          className={`grid grid-cols-[1fr_auto] gap-6 py-6 ${
                            idx === 0 ? "pt-0" : ""
                          }`}
                        >
                          <div>
                            <div className="flex items-start gap-3">
                              <Ticket className="size-5 shrink-0 text-foreground" aria-hidden="true" />
                              <div className="min-w-0">
                                <div className="text-[20px] font-semibold leading-none text-foreground tabular-nums">
                                  {formatWholeCurrency(
                                    Number(ticket.price) || 0,
                                  )}
                                </div>
                                <div className="mt-1 text-sm font-medium leading-tight text-foreground">
                                  {ticket.name}
                                </div>
                                {ticket.description ? (
                                  <div className="text-sm leading-relaxed text-muted-foreground">
                                    {ticket.description}
                                  </div>
                                ) : null}
                                {saleNotStarted && ticketSaleStart && ticketSaleEnd ? (
                                  <div className="mt-2 text-xs font-semibold text-muted-foreground">
                                    {sprintf(
                                      __(
                                        "Ticket sales starts on %1$s and ends on %2$s.",
                                        "eventkoi",
                                      ),
                                      ticketSaleStart,
                                      ticketSaleEnd,
                                    )}
                                  </div>
                                ) : saleEnded && ticketSaleEnd ? (
                                  <div className="mt-2 text-xs font-semibold text-muted-foreground">
                                    {sprintf(
                                      __(
                                        "Ticket sales ended on %s.",
                                        "eventkoi",
                                      ),
                                      ticketSaleEnd,
                                    )}
                                  </div>
                                ) : ticketSaleStart && ticketSaleEnd ? (
                                  <div className="mt-2 text-xs font-semibold text-muted-foreground">
                                    {sprintf(
                                      __(
                                        "Ticket sales started on %1$s and ends on %2$s.",
                                        "eventkoi",
                                      ),
                                      ticketSaleStart,
                                      ticketSaleEnd,
                                    )}
                                  </div>
                                ) : ticketSaleEnd ? (
                                  <div className="text-sm text-muted-foreground">
                                    {sprintf(
                                      __(
                                        "Ticket sales ends on %s.",
                                        "eventkoi",
                                      ),
                                      ticketSaleEnd,
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className="flex min-w-[180px] flex-col items-end justify-center">
                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-input bg-background text-foreground disabled:opacity-50"
                                  onClick={() => decrementQty(ticket)}
                                  disabled={unavailable || qty <= 0}
                                  aria-label={sprintf(
                                    __("Decrease quantity for %s", "eventkoi"),
                                    ticket.name || __("ticket", "eventkoi"),
                                  )}
                                >
                                  <Minus className="size-3.5" />
                                </button>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  max={maxAllowedQty ?? undefined}
                                  value={qty}
                                  onChange={(e) =>
                                    setQtyFromInput(ticket, e.target.value)
                                  }
                                  className="h-8 w-[44px] rounded-sm border border-input bg-background px-1 text-center text-sm font-medium tabular-nums text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-50"
                                  aria-label={sprintf(
                                    __("Quantity for %s", "eventkoi"),
                                    ticket.name || __("ticket", "eventkoi"),
                                  )}
                                  disabled={unavailable}
                                />
                                <button
                                  type="button"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-foreground bg-foreground text-background disabled:opacity-50"
                                  onClick={() => incrementQty(ticket)}
                                  disabled={
                                    unavailable ||
                                    (maxPerOrderCount &&
                                      qty >= maxPerOrderCount) ||
                                    (remainingCount !== null &&
                                      qty >= remainingCount)
                                  }
                                  aria-label={sprintf(
                                    __("Increase quantity for %s", "eventkoi"),
                                    ticket.name || __("ticket", "eventkoi"),
                                  )}
                                >
                                  <Plus className="size-3.5" />
                                </button>
                              </div>
                              {unavailable ? (
                                <div className="mt-2 text-center text-xs text-muted-foreground">
                                  {unavailableLabel}
                                </div>
                              ) : showRemainingTickets &&
                                liveTicketsLeft !== null ? (
                                <div className="mt-2 text-center text-xs text-muted-foreground">
                                  {sprintf(
                                    __("%d tickets left.", "eventkoi"),
                                    liveTicketsLeft,
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-border bg-muted/30 px-5 py-5 sm:px-6 sm:py-6">
                  <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                    <div>
                      <div className="text-[18px] font-medium leading-tight text-foreground">
                        {footerEventTitle}
                      </div>
                      {footerEventLocation ? (
                        <div className="mt-1 flex items-center gap-2 text-sm text-foreground">
                          <MapPin className="size-4" />
                          <span>{footerEventLocation}</span>
                        </div>
                      ) : null}
                      {footerEventDate ? (
                        <div className="mt-1 flex items-center gap-2 text-sm text-foreground">
                          <Calendar className="size-4" />
                          <span>{footerEventDate}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col items-end justify-center gap-3">
                      <div className="flex items-center gap-3 leading-none">
                        <span className="text-sm leading-none text-muted-foreground">
                          {__("Total", "eventkoi")}
                        </span>
                        <span className="text-3xl leading-none font-semibold tabular-nums text-foreground">
                          <span role="status" aria-live="polite">
                            {formatWholeCurrency(orderTotal)}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-5">
                        <button
                          type="button"
                          className="text-sm leading-[20px] text-foreground border-0 border-b border-transparent hover:border-foreground transition-none"
                          onClick={() => {
                            const cleared = {};
                            visibleTickets.forEach((ticket) => {
                              cleared[String(ticket.id)] = 0;
                            });
                            setQuantities(cleared);
                          }}
                        >
                          {__("Clear all", "eventkoi")}
                        </button>
                        <button
                          ref={stepOneCheckoutButtonRef}
                          type="button"
                          data-ek-react-checkout="1"
                          className="!block min-w-[118px] rounded-md border border-transparent bg-primary px-4 py-[8px] text-sm font-medium text-primary-foreground text-center transition-none hover:bg-primary/90 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                          disabled={!canCheckout || allVisibleNotStarted || allVisibleSaleEnded}
                          onClick={() => {
                            setCheckoutError("");
                            setDialogStep("checkout");
                          }}
                        >
                          {__("Checkout", "eventkoi")}
                        </button>
                      </div>
                      {allVisibleNotStarted && saleStartLabel ? (
                        <div className="mt-1 text-sm font-medium text-destructive text-right">
                          {sprintf(
                            __("Ticket sales start on %s.", "eventkoi"),
                            saleStartLabel,
                          )}
                        </div>
                      ) : allVisibleSaleEnded ? (
                        <div className="mt-1 text-sm font-medium text-destructive text-right">
                          {__("Ticket sales have ended.", "eventkoi")}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-5 pt-10 pb-8 sm:p-6 sm:pt-10 sm:pb-10">
                <DialogHeader className="sr-only">
                  <DialogTitle>
                    {__("Checkout", "eventkoi")}
                  </DialogTitle>
                  <DialogDescription>
                    {__("Checkout billing step", "eventkoi")}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-12 md:grid-cols-[1fr_320px]">
                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      startHostedCheckout();
                    }}
                    noValidate
                  >
                    <h3
                      id={stepTwoHeadingId}
                      className="text-lg font-medium text-foreground"
                    >
                      {__("Billing information", "eventkoi")}
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label
                          htmlFor={firstNameId}
                          className="font-medium text-[13px] text-foreground"
                        >
                          {__("First name", "eventkoi")}
                        </label>
                        <input
                          id={firstNameId}
                          ref={firstNameInputRef}
                          type="text"
                          required
                          autoComplete="given-name"
                          aria-invalid={isFirstNameInvalid ? "true" : "false"}
                          aria-describedby={
                            isFirstNameInvalid ? firstNameErrorId : undefined
                          }
                          value={billing.first_name}
                          onChange={(event) =>
                            setBilling((prev) => ({
                              ...prev,
                              first_name: event.target.value,
                            }))
                          }
                          className={`h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 ${
                            isFirstNameInvalid
                              ? "border-destructive focus-visible:ring-destructive"
                              : "border-input focus-visible:ring-ring"
                          }`}
                        />
                        {isFirstNameInvalid ? (
                          <p
                            id={firstNameErrorId}
                            className="text-xs text-destructive"
                          >
                            {__("First name is required.", "eventkoi")}
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-1.5">
                        <label
                          htmlFor={lastNameId}
                          className="font-medium text-[13px] text-foreground"
                        >
                          {__("Last name", "eventkoi")}
                        </label>
                        <input
                          id={lastNameId}
                          type="text"
                          required
                          autoComplete="family-name"
                          aria-invalid={isLastNameInvalid ? "true" : "false"}
                          aria-describedby={
                            isLastNameInvalid ? lastNameErrorId : undefined
                          }
                          value={billing.last_name}
                          onChange={(event) =>
                            setBilling((prev) => ({
                              ...prev,
                              last_name: event.target.value,
                            }))
                          }
                          className={`h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 ${
                            isLastNameInvalid
                              ? "border-destructive focus-visible:ring-destructive"
                              : "border-input focus-visible:ring-ring"
                          }`}
                        />
                        {isLastNameInvalid ? (
                          <p
                            id={lastNameErrorId}
                            className="text-xs text-destructive"
                          >
                            {__("Last name is required.", "eventkoi")}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor={emailId}
                        className="font-medium text-[13px] text-foreground"
                      >
                        {__("Email address", "eventkoi")}
                      </label>
                      <input
                        id={emailId}
                        type="email"
                        required
                        autoComplete="email"
                        aria-invalid={isEmailInvalid ? "true" : "false"}
                        aria-describedby={
                          isEmailInvalid
                            ? `${emailHelpId} ${emailErrorId}`
                            : emailHelpId
                        }
                        value={billing.email}
                        onChange={(event) =>
                          setBilling((prev) => ({
                            ...prev,
                            email: event.target.value,
                          }))
                        }
                        onBlur={() => setEmailTouched(true)}
                        className={`h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 ${
                          isEmailInvalid
                            ? "border-destructive focus-visible:ring-destructive"
                            : "border-input focus-visible:ring-ring"
                        }`}
                      />
                      {isEmailInvalid ? (
                        <p
                          id={emailErrorId}
                          className="text-xs text-destructive"
                        >
                          {__(
                            "Please enter a valid email address.",
                            "eventkoi",
                          )}
                        </p>
                      ) : null}
                      <p
                        id={emailHelpId}
                        className="text-xs text-muted-foreground"
                      >
                        {__(
                          "We will send your tickets to this email address.",
                          "eventkoi",
                        )}
                      </p>
                    </div>

                    {checkoutError ? (
                      <div
                        id={checkoutErrorId}
                        role="alert"
                        aria-live="assertive"
                        className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                      >
                        {checkoutError}
                      </div>
                    ) : null}

                    <div className="flex items-center gap-10 pt-2">
                      <Button
                        type="submit"
                        aria-busy={isCheckoutLoading ? "true" : "false"}
                        aria-describedby={
                          checkoutError ? checkoutErrorId : undefined
                        }
                        disabled={
                          !canContinueCheckout ||
                          !hasRequiredBillingFields ||
                          isCheckoutLoading
                        }
                        className="min-w-[190px]"
                      >
                        {isCheckoutLoading ? (
                          <span
                            className="inline-flex items-center gap-2"
                            role="status"
                            aria-live="polite"
                          >
                            <Loader2 className="size-4 animate-spin" />
                            {__("Setting up payment", "eventkoi")}
                          </span>
                        ) : (
                          __("Checkout", "eventkoi")
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-muted-foreground hover:text-foreground"
                        disabled={isCheckoutLoading}
                        onClick={() => {
                          setCheckoutError("");
                          setDialogStep("tickets");
                        }}
                      >
                        {__("Back", "eventkoi")}
                      </Button>
                    </div>
                  </form>

                  <div className="rounded-xl border border-border bg-muted/50 px-6 py-6">
                    <div className="text-lg font-medium text-foreground">
                      {__("Order summary", "eventkoi")}
                    </div>
                    <div className="mt-6 border-b border-border pb-6">
                      <div className="text-sm font-medium leading-tight text-foreground">
                        {footerEventTitle}
                      </div>
                      {footerEventLocation ? (
                        <div className="mt-3 flex items-start gap-2 text-sm text-foreground">
                          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <span>{footerEventLocation}</span>
                        </div>
                      ) : null}
                      {footerEventDate ? (
                        <div className="mt-2.5 flex items-start gap-2 text-sm text-foreground">
                          <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <span>{footerEventDate}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="py-6 space-y-3">
                      {selectedTicketItems.map((item) => (
                        <div
                          key={item.ticket_id}
                          className="flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0 text-sm leading-tight text-foreground">
                            <div>{`${item.quantity}x ${item.name}`}</div>
                          </div>
                          <div className="shrink-0 text-sm font-medium text-foreground">
                            {formatPrice(item.line_total, currency)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-border pt-6">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-medium text-foreground">
                          {__("Total", "eventkoi")}
                        </span>
                        <span className="text-base font-medium tabular-nums text-foreground">
                          <span role="status" aria-live="polite">
                            {formatPrice(orderTotal, currency)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function mountTicketsWidgets() {
  document.querySelectorAll(".eventkoi-tickets").forEach((el) => {
    if (el.dataset.eventkoiMounted) return;
    const eventId = Number(el.getAttribute("data-event-id")) || 0;
    const instanceTs = getInstanceTsFromDom(el);
    const root = createRoot(el);
    root.render(
      <TicketsWidget eventId={eventId} instanceTs={instanceTs} mountEl={el} />,
    );
    el.dataset.eventkoiMounted = "true";
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountTicketsWidgets);
} else {
  mountTicketsWidgets();
}
