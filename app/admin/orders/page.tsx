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

export default async function AdminOrdersPage() {
  const orders: OrderRow[] = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-white">Orders</h1>
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
              <tr key={o.id} className="border-t border-border bg-bg-panel/40">
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{o.id.slice(0, 10)}</td>
                <td className="px-4 py-3 text-white">{o.email}</td>
                <td className="px-4 py-3 text-gray-300">{o.items.length}</td>
                <td className="px-4 py-3 text-brand-300">{formatCents(o.totalCents)}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      o.status === "paid"
                        ? "rounded-full bg-green-900 px-2 py-1 text-xs text-green-300"
                        : o.status === "pending"
                        ? "rounded-full bg-yellow-900 px-2 py-1 text-xs text-yellow-300"
                        : "rounded-full bg-gray-800 px-2 py-1 text-xs text-gray-400"
                    }
                  >
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">{o.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p className="p-6 text-center text-gray-400">No orders yet.</p>}
      </div>
    </div>
  );
}
