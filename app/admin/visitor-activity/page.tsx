import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = {
  add_to_cart: "Added to cart",
  remove_from_cart: "Removed from cart",
  checkout_started: "Started checkout",
  legacy_pending_order: "Unpaid checkout (moved from Orders)",
};

export default async function VisitorActivityPage() {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [rows, counts] = await Promise.all([
    prisma.visitorActivity.findMany({ include: { product: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 300 }),
    prisma.visitorActivity.groupBy({ by: ["action"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Visitor Activity</h1>
        <p className="mt-2 text-sm text-gray-400">Cart adds and checkouts that were started but not paid. These are not orders. Paid orders appear under Orders.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {counts.map((c) => (
          <div key={c.action} className="rounded-xl border border-border bg-bg-panel p-4">
            <div className="text-xs text-gray-400">{LABEL[c.action] ?? c.action} (30 days)</div>
            <div className="mt-1 text-2xl font-bold text-white">{c._count._all}</div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg-panel text-gray-400">
            <tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Visitor</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border bg-bg-panel/40">
                <td className="px-4 py-3 text-gray-400">{r.createdAt.toLocaleString("en-US", { timeZone: "America/Tijuana" })}</td>
                <td className="px-4 py-3 text-gray-200">{LABEL[r.action] ?? r.action}</td>
                <td className="px-4 py-3 text-white">{r.product?.name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-300">{r.quantity}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.sessionId.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-center text-gray-400">No visitor activity yet.</p>}
      </div>
    </div>
  );
}
