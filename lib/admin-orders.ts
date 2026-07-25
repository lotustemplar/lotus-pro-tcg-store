import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

type OrderRecord = Awaited<ReturnType<typeof prisma.order.findUnique>>;

export type AdminOrderAddress = {
  name: string | null;
  phone: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  source: string | null;
};

export type AdminOrderStripeSummary = {
  sessionId: string | null;
  paymentIntentId: string | null;
  chargeId: string | null;
  balanceTransactionId: string | null;
  paymentStatus: string | null;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  address: AdminOrderAddress | null;
  grossCents: number | null;
  feeCents: number | null;
  netCents: number | null;
  currency: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  receiptUrl: string | null;
  lineItems: {
    id: string;
    description: string;
    quantity: number;
    amountSubtotalCents: number;
    currency: string | null;
  }[];
  error: string | null;
};

export type AdminOrderDetails = {
  id: string;
  email: string;
  status: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: Date | null;
  trackingEmailSentAt: Date | null;
  trackingEmailError: string | null;
  createdAt: Date;
  updatedAt: Date;
  shippingAddressRaw: string | null;
  items: {
    id: string;
    productId: string;
    productSlug: string | null;
    sku: string | null;
    setName: string | null;
    nameSnapshot: string;
    priceCents: number;
    quantity: number;
    lineTotalCents: number;
  }[];
  stripe: AdminOrderStripeSummary;
};

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeStripeAddress(
  address: Stripe.Address | null | undefined,
  name: string | null | undefined,
  phone: string | null | undefined,
  source: string | null,
): AdminOrderAddress | null {
  if (!address && !name && !phone) return null;

  return {
    name: normalizeString(name),
    phone: normalizeString(phone),
    line1: normalizeString(address?.line1),
    line2: normalizeString(address?.line2),
    city: normalizeString(address?.city),
    state: normalizeString(address?.state),
    postalCode: normalizeString(address?.postal_code),
    country: normalizeString(address?.country),
    source,
  };
}

function normalizeStoredAddress(snapshot: string | null): AdminOrderAddress | null {
  if (!snapshot) return null;

  try {
    const parsed = JSON.parse(snapshot) as
      | {
          name?: unknown;
          phone?: unknown;
          source?: unknown;
          address?: {
            line1?: unknown;
            line2?: unknown;
            city?: unknown;
            state?: unknown;
            postal_code?: unknown;
            country?: unknown;
          } | null;
          line1?: unknown;
          line2?: unknown;
          city?: unknown;
          state?: unknown;
          postalCode?: unknown;
          postal_code?: unknown;
          country?: unknown;
        }
      | null;

    if (!parsed) return null;
    const address = parsed.address ?? parsed;

    return {
      name: normalizeString(parsed.name),
      phone: normalizeString(parsed.phone),
      line1: normalizeString(address?.line1),
      line2: normalizeString(address?.line2),
      city: normalizeString(address?.city),
      state: normalizeString(address?.state),
      postalCode: normalizeString(address?.postal_code ?? parsed.postalCode),
      country: normalizeString(address?.country),
      source: normalizeString(parsed.source) ?? "stored_snapshot",
    };
  } catch {
    return null;
  }
}

export function formatAdminAddressLines(address: AdminOrderAddress | null) {
  if (!address) return [];

  return [
    address.name,
    [address.line1, address.line2].filter(Boolean).join(address.line1 && address.line2 ? ", " : ""),
    [address.city, address.state, address.postalCode].filter(Boolean).join(", "),
    address.country,
    address.phone ? `Phone: ${address.phone}` : null,
  ].filter((line): line is string => Boolean(line && line.trim().length > 0));
}

async function getStripeSummary(order: NonNullable<OrderRecord>): Promise<AdminOrderStripeSummary> {
  const fallback: AdminOrderStripeSummary = {
    sessionId: order.stripeSessionId ?? null,
    paymentIntentId: order.stripePaymentIntent ?? null,
    chargeId: null,
    balanceTransactionId: null,
    paymentStatus: null,
    customerEmail: order.email,
    customerName: null,
    customerPhone: null,
    address: normalizeStoredAddress(order.shippingAddress),
    grossCents: null,
    feeCents: null,
    netCents: null,
    currency: "usd",
    cardBrand: null,
    cardLast4: null,
    receiptUrl: null,
    lineItems: [],
    error: null,
  };

  if (!order.stripeSessionId) {
    return {
      ...fallback,
      error: "This order was created manually in the admin and does not have a Stripe session attached.",
    };
  }

  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === "sk_test_placeholder") {
    return {
      ...fallback,
      error: "Stripe is not fully configured on this environment yet.",
    };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
    const lineItemsResponse = await stripe.checkout.sessions.listLineItems(order.stripeSessionId, {
      limit: 100,
    });

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? order.stripePaymentIntent ?? null;

    let paymentIntent: Stripe.PaymentIntent | null = null;

    if (paymentIntentId) {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge.balance_transaction"],
      });
    }

    const latestCharge =
      paymentIntent?.latest_charge && typeof paymentIntent.latest_charge !== "string"
        ? paymentIntent.latest_charge
        : null;
    const balanceTransaction =
      latestCharge?.balance_transaction && typeof latestCharge.balance_transaction !== "string"
        ? latestCharge.balance_transaction
        : null;

    const shippingAddress = normalizeStripeAddress(
      session.shipping_details?.address,
      session.shipping_details?.name,
      session.customer_details?.phone,
      "stripe_shipping",
    );
    const customerAddress = normalizeStripeAddress(
      session.customer_details?.address,
      session.customer_details?.name,
      session.customer_details?.phone,
      "stripe_customer",
    );

    return {
      sessionId: session.id,
      paymentIntentId,
      chargeId: latestCharge?.id ?? null,
      balanceTransactionId: balanceTransaction?.id ?? null,
      paymentStatus: session.payment_status ?? paymentIntent?.status ?? null,
      customerEmail: normalizeString(session.customer_details?.email) ?? order.email,
      customerName:
        normalizeString(session.shipping_details?.name) ??
        normalizeString(session.customer_details?.name) ??
        null,
      customerPhone: normalizeString(session.customer_details?.phone),
      address: shippingAddress ?? customerAddress ?? normalizeStoredAddress(order.shippingAddress),
      grossCents: paymentIntent?.amount_received ?? latestCharge?.amount ?? session.amount_total ?? null,
      feeCents: balanceTransaction?.fee ?? null,
      netCents: balanceTransaction?.net ?? null,
      currency: normalizeString(paymentIntent?.currency ?? latestCharge?.currency ?? session.currency),
      cardBrand: normalizeString(latestCharge?.payment_method_details?.card?.brand),
      cardLast4: normalizeString(latestCharge?.payment_method_details?.card?.last4),
      receiptUrl: normalizeString(latestCharge?.receipt_url),
      lineItems: lineItemsResponse.data.map((item) => ({
        id: item.id,
        description: item.description ?? "Stripe line item",
        quantity: item.quantity ?? 0,
        amountSubtotalCents: item.amount_subtotal ?? 0,
        currency: normalizeString(item.currency),
      })),
      error: null,
    };
  } catch (error) {
    return {
      ...fallback,
      error: error instanceof Error ? error.message : "Unable to retrieve live Stripe details for this order.",
    };
  }
}

export async function getAdminOrderDetails(orderId: string): Promise<AdminOrderDetails | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: {
              slug: true,
              sku: true,
              sourceSetName: true,
            },
          },
        },
      },
    },
  });

  if (!order) return null;

  const stripeSummary = await getStripeSummary(order);

  return {
    id: order.id,
    email: order.email,
    status: order.status,
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    totalCents: order.totalCents,
    trackingCarrier: order.trackingCarrier,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    shippedAt: order.shippedAt,
    trackingEmailSentAt: order.trackingEmailSentAt,
    trackingEmailError: order.trackingEmailError,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    shippingAddressRaw: order.shippingAddress,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productSlug: item.product.slug,
      sku: item.product.sku,
      setName: item.product.sourceSetName,
      nameSnapshot: item.nameSnapshot,
      priceCents: item.priceCents,
      quantity: item.quantity,
      lineTotalCents: item.priceCents * item.quantity,
    })),
    stripe: stripeSummary,
  };
}
