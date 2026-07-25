import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintPackingSlipButton } from "../PrintPackingSlipButton";
import { formatCents } from "@/lib/format";
import { formatAdminAddressLines, getAdminOrderDetails } from "@/lib/admin-orders";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(value);
}

export default async function PackingSlipPage({ params }: { params: { id: string } }) {
  const [order, siteSettings] = await Promise.all([
    getAdminOrderDetails(params.id),
    getSiteSettings(),
  ]);

  if (!order) {
    notFound();
  }

  const addressLines = formatAdminAddressLines(order.stripe.address);

  return (
    <>
      <style>{`
        @media print {
          aside,
          .packing-slip-toolbar {
            display: none !important;
          }

          main {
            padding: 0 !important;
          }

          body,
          html {
            background: #ffffff !important;
          }

          .packing-slip-sheet {
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div className="space-y-6">
        <div className="packing-slip-toolbar flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <Link href={`/admin/orders/${order.id}`} className="rounded-lg border border-white/12 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-brand-400/50 hover:text-white">
              Back to order
            </Link>
            <Link href="/admin/orders" className="rounded-lg border border-white/12 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-brand-400/50 hover:text-white">
              Back to orders
            </Link>
          </div>

          <PrintPackingSlipButton />
        </div>

        <div className="packing-slip-sheet mx-auto max-w-4xl rounded-[28px] border border-white/10 bg-white p-8 text-black shadow-[0_24px_80px_rgba(2,6,16,0.32)] sm:p-10">
          <div className="flex flex-col gap-6 border-b border-black/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-4">
              <img src={siteSettings.logoWideUrl} alt={siteSettings.brandName} className="h-12 w-auto object-contain" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Packing Slip</h1>
                <p className="mt-2 text-sm text-black/60">
                  Please pack the order exactly as shown below before shipment.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-8">
                <span className="font-semibold text-black/60">Order #</span>
                <span className="font-mono">{order.id.slice(0, 10)}</span>
              </div>
              <div className="flex items-center justify-between gap-8">
                <span className="font-semibold text-black/60">Date</span>
                <span>{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-8">
                <span className="font-semibold text-black/60">Customer</span>
                <span>{order.stripe.customerName || order.stripe.customerEmail || order.email}</span>
              </div>
              <div className="flex items-center justify-between gap-8">
                <span className="font-semibold text-black/60">Status</span>
                <span className="uppercase tracking-[0.16em]">{order.status}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-2xl border border-black/10 bg-black/[0.02] p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-black/55">Ship To</h2>
              <div className="mt-4 space-y-1 text-sm leading-6">
                {addressLines.length > 0 ? (
                  addressLines.map((line) => <div key={line}>{line}</div>)
                ) : (
                  <>
                    <div>{order.stripe.customerName || "Customer address not captured"}</div>
                    <div>{order.stripe.customerEmail || order.email}</div>
                    <div className="text-black/55">No shipping address has been captured on this order yet.</div>
                  </>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-black/10 bg-black/[0.02] p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-black/55">Order Summary</h2>
              <dl className="mt-4 space-y-3 text-sm">
                {order.trackingNumber ? (
                  <>
                    <div className="flex items-center justify-between">
                      <dt className="text-black/60">Carrier</dt>
                      <dd>{order.trackingCarrier || "Carrier"}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-black/60">Tracking</dt>
                      <dd className="font-mono text-xs">{order.trackingNumber}</dd>
                    </div>
                  </>
                ) : null}
                <div className="flex items-center justify-between">
                  <dt className="text-black/60">Subtotal</dt>
                  <dd>{formatCents(order.subtotalCents)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-black/60">Shipping</dt>
                  <dd>{formatCents(order.shippingCents)}</dd>
                </div>
                <div className="flex items-center justify-between border-t border-black/10 pt-3 text-base font-semibold">
                  <dt>Total</dt>
                  <dd>{formatCents(order.totalCents)}</dd>
                </div>
              </dl>
            </section>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-black/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/[0.04] text-black/65">
                <tr>
                  <th className="px-4 py-3">Item #</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-t border-black/10">
                    <td className="px-4 py-3 font-mono text-xs">{item.sku || item.productId.slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.nameSnapshot}</div>
                      {item.setName ? <div className="mt-1 text-xs text-black/55">{item.setName}</div> : null}
                    </td>
                    <td className="px-4 py-3">{item.quantity}</td>
                    <td className="px-4 py-3">{formatCents(item.priceCents)}</td>
                    <td className="px-4 py-3 font-semibold">{formatCents(item.lineTotalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 rounded-2xl border border-black/10 bg-black/[0.02] px-5 py-4 text-sm text-black/75">
            Thank you for supporting {siteSettings.brandName}. We appreciate every order and hope your cards arrive safely and ready to enjoy.
          </div>
        </div>
      </div>
    </>
  );
}
