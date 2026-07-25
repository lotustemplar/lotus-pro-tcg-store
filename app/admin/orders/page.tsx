import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/format";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  email: string;
  status: string;
  totalCents: number;
  items: unknown[];
  createdAt: Date;
};

function statusClasses(status: string) {
  if (status === "paid") return "rounded-full bg-green-900 px-2 py-1 text-xs text-green-300";
  if (status === "pending") return "rounded-full bg-yellow-900 px-2 py-1 text-xs text-yellow-300";
  if (status === "fulfilled") return "rounded-full bg-brand-950 px-2 py-1 text-xs text-brand-200";
  if (status === "cancelled") return "rounded-full bg-red-950 px-2 py-1 text-xs text-red-300";
  return "rounded-full bg-gray-800 px-2 py-1 text-xs text-gray-400";
}

export default async function AdminOrdersPage() {
  const orders: OrderRow[] = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Orders</h1>
          <p className="mt-2 text-sm text-gray-400">
            Review Stripe checkouts, manual admin orders, packing slips, and fulfillment updates in one place.
          </p>
        </div>
        <Link
          href="/admin/orders/new"
          className="inline-flex rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-500"
        >
          Create Manual Order
        </Link>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg-panel text-gray-400">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o: OrderRow) => (
              <tr key={o.id} className="border-t border-border bg-bg-panel/40 transition hover:bg-bg-elevated/70">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="block">
                    <span className="block font-mono text-xs text-gray-400">{o.id.slice(0, 10)}</span>
                    <span className="mt-1 inline-flex text-xs font-semibold text-brand-300 hover:text-brand-200">
                      View order
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-white">{o.email}</td>
                <td className="px-4 py-3 text-gray-300">{o.items.length}</td>
                <td className="px-4 py-3 text-brand-300">{formatCents(o.totalCents)}</td>
                <td className="px-4 py-3">
                  <span className={statusClasses(o.status)}>{o.status}</span>
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {o.createdAt.toLocaleDateString()}
                  <div className="mt-1 text-xs text-gray-500">{o.createdAt.toLocaleTimeString()}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p className="p-6 text-center text-gray-400">No orders yet.</p>}
      </div>
    </div>
  );
}
