/**
 * Normalize order data coming from edge endpoints and local WP REST endpoints.
 */
const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toIsoString = (value) => {
  if (!value) return "";

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  }

  if (typeof value === "number") {
    const date = new Date(value * 1000);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
};

const parseMetadata = (value) => {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return {};
    }
  }
  return {};
};

const parseAddress = (value) => {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return null;
    }
  }
  return null;
};

const parseEventIds = (order) => {
  const addCandidate = (candidate, target) => {
    if (candidate === null || candidate === undefined || candidate === "") {
      return;
    }

    if (Array.isArray(candidate)) {
      candidate.forEach((item) => addCandidate(item, target));
      return;
    }

    if (typeof candidate === "object") {
      if ("event_id" in candidate) addCandidate(candidate.event_id, target);
      if ("event_ids" in candidate) addCandidate(candidate.event_ids, target);
      if ("eventId" in candidate) addCandidate(candidate.eventId, target);
      return;
    }

    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (!trimmed) return;

      if (
        (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
        (trimmed.startsWith("{") && trimmed.endsWith("}"))
      ) {
        try {
          const parsed = JSON.parse(trimmed);
          addCandidate(parsed, target);
          return;
        } catch {
          // Fall through to delimiter split.
        }
      }

      const normalized = trimmed
        .replace(/[{}]/g, "")
        .split(/[,\s|]+/)
        .filter(Boolean);

      if (normalized.length > 1) {
        normalized.forEach((part) => addCandidate(part, target));
        return;
      }
    }

    const numeric = Number.parseInt(String(candidate), 10);
    if (Number.isFinite(numeric) && numeric > 0) {
      target.add(numeric);
    }
  };

  const ids = new Set();
  addCandidate(order.event_ids, ids);
  addCandidate(order.event_id, ids);
  addCandidate(order.eventId, ids);
  addCandidate(order.event, ids);
  addCandidate(order.metadata?.event_ids, ids);
  addCandidate(order.metadata?.event_id, ids);
  addCandidate(order.metadata?.eventId, ids);
  addCandidate(order.meta?.event_ids, ids);
  addCandidate(order.meta?.event_id, ids);
  addCandidate(order.meta?.eventId, ids);
  addCandidate(order.ticket_items, ids);
  addCandidate(order.items, ids);
  return Array.from(ids);
};

export const normalizeOrder = (order) => {
  if (!order) return order;
  const metadata = parseMetadata(order.metadata);
  const normalizedCustomerAddress =
    parseAddress(order.customer_address) || parseAddress(order.billing_address) || null;
  const checkoutFirstFromRow = String(order.checkout_first_name || "").trim();
  const checkoutLastFromRow = String(order.checkout_last_name || "").trim();
  const checkoutFullFromRow = `${checkoutFirstFromRow} ${checkoutLastFromRow}`.trim();
  const checkoutNameFromRow = String(order.checkout_name || "").trim();
  const checkoutFirstName = String(metadata.first_name || "").trim();
  const checkoutLastName = String(metadata.last_name || "").trim();
  const checkoutFullName = `${checkoutFirstName} ${checkoutLastName}`.trim();
  const checkoutCustomerName = String(metadata.customer_name || "").trim();
  const rawCustomerName = String(order.customer_name ?? "").trim();
  const ticketHolderName =
    checkoutFullFromRow ||
    checkoutNameFromRow ||
    checkoutFullName ||
    checkoutCustomerName ||
    rawCustomerName ||
    "";
  const billingName = String(order.billing_name ?? "").trim();

  const total = toNumber(
    order.total ?? order.amount_total ?? order.total_amount ?? 0
  );
  const itemPrice = toNumber(order.item_price ?? 0);
  const rawStatus = (order.payment_status ?? order.status ?? "").toString();
  const status =
    rawStatus === "succeeded" || rawStatus === "completed"
      ? "complete"
      : rawStatus;
  const resolvedId = order.id ?? order.order_id ?? "";
  const resolvedOrderId = order.order_id ?? order.id ?? "";
  const eventIds = parseEventIds(order);

  const notes = Array.isArray(order.notes)
    ? order.notes.map((note) => ({
        ...note,
        created_at: toIsoString(note.created ?? note.created_at),
      }))
    : [];

  return {
    ...order,
    id: resolvedId,
    order_id: resolvedOrderId,
    metadata,
    checkout_first_name: checkoutFirstFromRow || checkoutFirstName,
    checkout_last_name: checkoutLastFromRow || checkoutLastName,
    checkout_name: checkoutNameFromRow || checkoutCustomerName || checkoutFullName,
    status,
    payment_status: status,
    ticket_holder_name: ticketHolderName,
    customer_name: ticketHolderName,
    billing_name: billingName,
    customer_email: order.customer_email ?? order.billing_email ?? "",
    customer_address: normalizedCustomerAddress,
    amount_total:
      order.amount_total ??
      order.total_amount ??
      Math.round((Number.isFinite(total) ? total : 0) * 100),
    total_amount:
      order.total_amount ??
      order.amount_total ??
      Math.round((Number.isFinite(total) ? total : 0) * 100),
    item_price:
      order.item_price ?? Math.round((Number.isFinite(itemPrice) ? itemPrice : 0) * 100),
    currency: (order.currency || "usd").toLowerCase(),
    quantity: Number(order.quantity ?? 0) || 0,
    event_ids: eventIds,
    event_names: order.event_names || (() => {
      const names = {};
      const title = String(order.event_instance_title || order.event_title || metadata.event_instance_title || metadata.event_title || "").trim();
      if (title) {
        for (const eid of eventIds) {
          names[eid] = title;
        }
      }
      return names;
    })(),
    created_at: toIsoString(order.created ?? order.created_at),
    last_modified: toIsoString(order.last_updated ?? order.last_modified),
    payment_method_type: order.payment_method_type ?? order.billing_type ?? "",
    stripe_payment_intent_id:
      order.stripe_payment_intent_id ?? order.payment_id ?? "",
    is_archived: order.is_archived === true,
    notes,
  };
};

export const normalizeOrders = (orders) =>
  Array.isArray(orders) ? orders.map(normalizeOrder) : [];

const isCountedSaleStatus = (statusRaw) => {
  const status = String(statusRaw || "").toLowerCase();
  return (
    status === "complete" ||
    status === "completed" ||
    status === "succeeded" ||
    status === "refunded" ||
    status === "partially_refunded"
  );
};
const isEarningsStatus = (statusRaw) => {
  const status = String(statusRaw || "").toLowerCase();
  return (
    status === "complete" ||
    status === "completed" ||
    status === "succeeded" ||
    status === "refunded" ||
    status === "partially_refunded"
  );
};

const normalizeCurrencyCode = (value) => {
  const code = String(value || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "USD";
};

const addCurrencyAmount = (target, currency, amount) => {
  const code = normalizeCurrencyCode(currency);
  const numericAmount = Number(amount || 0);
  if (!Number.isFinite(numericAmount) || numericAmount === 0) {
    return;
  }
  target[code] = (target[code] || 0) + numericAmount;
};

export const calculateSalesStats = (orders) => {
  const rows = normalizeOrders(orders);

  return rows.reduce(
    (acc, row) => {
      const quantity = Number(row.quantity || 0);
      const amount = Number(row.total_amount ?? row.amount_total ?? row.total ?? 0);
      const refund = Number(row.refund_amount || 0);
      const platformFee = Number(
        row.platform_fee_amount ??
          row.platform_fee_cents ??
          row.metadata?.platform_fee_cents ??
          0
      );
      const stripeFee = Number(
        row.stripe_fee_amount ??
          row.stripe_fee_cents ??
          row.metadata?.stripe_fee_cents ??
          0
      );
      const status = row.payment_status || row.status || "";
      const currency = row.currency || "USD";

      if (isCountedSaleStatus(status)) {
        acc.total_orders += 1;
        acc.tickets_sold += Number.isFinite(quantity) ? quantity : 0;
      }

      if (isEarningsStatus(status)) {
        const grossAmount = Number.isFinite(amount) ? amount : 0;
        const feeAmount =
          Number.isFinite(platformFee) && platformFee > 0 ? platformFee : 0;
        const stripeFeeAmount =
          Number.isFinite(stripeFee) && stripeFee > 0 ? stripeFee : 0;
        const refundAmount = Number.isFinite(refund) ? refund : 0;
        const netAmount = grossAmount - feeAmount - stripeFeeAmount - refundAmount;

        acc.total_earnings += netAmount;
        addCurrencyAmount(acc.net_earnings_by_currency, currency, netAmount);
      }

      if (Number.isFinite(refund) && refund > 0) {
        acc.refund_amount += refund;
        addCurrencyAmount(acc.refunds_by_currency, currency, refund);
      }

      return acc;
    },
    {
      total_orders: 0,
      total_earnings: 0,
      tickets_sold: 0,
      refund_amount: 0,
      net_earnings_by_currency: {},
      refunds_by_currency: {},
    }
  );
};
