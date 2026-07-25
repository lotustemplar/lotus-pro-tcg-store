import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCents } from "@/lib/format";
import { formatAdminAddressLines, getAdminOrderDetails } from "@/lib/admin-orders";
import { ShipmentManager } from "./ShipmentManager";

export const dynamic = "force-dynamic";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function statusClasses(status: string) {
  if (status === "paid") return "bg-green-950/70 text-green-300 border-green-700/60";
  if (status === "pending") return "bg-yellow-950/70 text-yellow-300 border-yellow-700/60";
  if (status === "fulfilled") return "bg-brand-950/70 text-brand-200 border-brand-700/60";
  if (status === "cancelled") return "bg-red-950/70 text-red-300 border-red-700/60";
  return "bg-gray-900 text-gray-300 border-white/10";
}

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-bg-panel p-5 shadow-[0_16px_44px_rgba(2,6,16,0.22)]">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const order = await getAdminOrderDetails(params.id);

  if (!order) {
    notFound();
  }

  const addressLines = formatAdminAddressLines(order.stripe.address);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-brand-500/25 bg-[linear-gradient(135deg,rgba(15,20,34,0.98),rgba(31,18,42,0.96))] p-6 shadow-[0_20px_60px_rgba(2,6,16,0.32)] lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/admin/orders" className="text-sm text-gray-400 hover:text-white">
            Back to Orders
          </Link>
          <h1 className="mt-3 font-display text-3xl font-bold text-white">Order {order.id.slice(0, 10)}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClasses(order.status)}`}>
              {order.status}
            </span>
            <span className="text-sm text-gray-400">Placed {formatDateTime(order.createdAt)}</span>
            <span className="text-sm text-gray-500">Updated {formatDateTime(order.updatedAt)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/orders/${order.id}/packing-slip`}
            className="rounded-lg border border-brand-500 px-4 py-2 text-sm font-semibold text-brand-200 transition hover:bg-brand-500/10 hover:text-white"
          >
            Open packing slip
          </Link>
          {order.stripe.receiptUrl ? (
            <a
              href={order.stripe.receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-white/12 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-brand-400/50 hover:text-white"
            >
              Stripe receipt
            </a>
          ) : null}
        </div>
      </div>

      {order.stripe.error ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          Stripe details were only partially available for this order: {order.stripe.error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <DetailCard title="Items Ordered">
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg-elevated text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Item #</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-t border-border bg-bg-panel/40 align-top">
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">
                        {item.sku || item.productId.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{item.nameSnapshot}</div>
                        {item.setName ? <div className="mt-1 text-xs text-gray-500">{item.setName}</div> : null}
                        {item.productSlug ? (
                          <Link href={`/product/${item.productSlug}`} className="mt-2 inline-flex text-xs font-semibold text-brand-300 hover:text-brand-200">
                            View public product page
                          </Link>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{item.quantity}</td>
                      <td className="px-4 py-3 text-gray-300">{formatCents(item.priceCents)}</td>
                      <td className="px-4 py-3 font-semibold text-brand-200">{formatCents(item.lineTotalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DetailCard>

          <DetailCard title="Stripe Session Breakdown">
            {order.stripe.lineItems.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg-elevated text-gray-400">
                    <tr>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">Stripe Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.stripe.lineItems.map((item) => (
                      <tr key={item.id} className="border-t border-border bg-bg-panel/40">
                        <td className="px-4 py-3 text-white">{item.description}</td>
                        <td className="px-4 py-3 text-gray-300">{item.quantity}</td>
                        <td className="px-4 py-3 text-gray-300">{formatCents(item.amountSubtotalCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Stripe did not return a line-item breakdown for this order.</p>
            )}
          </DetailCard>
        </div>

        <div className="space-y-6">
          <DetailCard title="Customer & Shipping">
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="mt-1 text-white">{order.stripe.customerEmail || order.email}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Customer Name</dt>
                <dd className="mt-1 text-white">{order.stripe.customerName || "Not captured"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd className="mt-1 text-white">{order.stripe.customerPhone || "Not captured"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Shipping Address</dt>
                <dd className="mt-2 rounded-xl border border-white/10 bg-bg px-4 py-3 text-white">
                  {addressLines.length > 0 ? (
                    <div className="space-y-1">
                      {addressLines.map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-400">No shipping address has been captured on this order yet.</div>
                  )}
                </dd>
              </div>
            </dl>
          </DetailCard>

          <DetailCard title="Totals">
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-gray-400">Subtotal</dt>
                <dd className="font-medium text-white">{formatCents(order.subtotalCents)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-400">Shipping</dt>
                <dd className="font-medium text-white">{formatCents(order.shippingCents)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <dt className="text-gray-200">Order Total</dt>
                <dd className="text-lg font-semibold text-brand-200">{formatCents(order.totalCents)}</dd>
              </div>
            </dl>
          </DetailCard>

          <DetailCard title="Tracking & Customer Email">
            <ShipmentManager
              orderId={order.id}
              customerEmail={order.stripe.customerEmail || order.email}
              trackingCarrier={order.trackingCarrier}
              trackingNumber={order.trackingNumber}
              trackingUrl={order.trackingUrl}
              shippedAt={order.shippedAt?.toISOString() ?? null}
              trackingEmailSentAt={order.trackingEmailSentAt?.toISOString() ?? null}
              trackingEmailError={order.trackingEmailError}
            />
          </DetailCard>

          <DetailCard title="Stripe Payment Details">
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-gray-400">Session ID</dt>
                <dd className="font-mono text-xs text-gray-300">{order.stripe.sessionId || "Not available"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-gray-400">Payment Intent</dt>
                <dd className="font-mono text-xs text-gray-300">{order.stripe.paymentIntentId || "Not available"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-gray-400">Charge ID</dt>
                <dd className="font-mono text-xs text-gray-300">{order.stripe.chargeId || "Not available"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-400">Payment Status</dt>
                <dd className="text-white">{order.stripe.paymentStatus || "Not available"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-400">Card</dt>
                <dd className="text-white">
                  {order.stripe.cardBrand && order.stripe.cardLast4
                    ? `${order.stripe.cardBrand.toUpperCase()} •••• ${order.stripe.cardLast4}`
                    : "Not available"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-400">Gross Charged</dt>
                <dd className="text-white">
                  {order.stripe.grossCents !== null ? formatCents(order.stripe.grossCents) : "Not available"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-400">Stripe Fee</dt>
                <dd className="text-white">
                  {order.stripe.feeCents !== null ? formatCents(order.stripe.feeCents) : "Not available"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-400">Net Deposit</dt>
                <dd className="text-white">
                  {order.stripe.netCents !== null ? formatCents(order.stripe.netCents) : "Not available"}
                </dd>
              </div>
            </dl>
          </DetailCard>
        </div>
      </div>
    </div>
  );
}
