import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [productCount, lowStockCount, outOfStockCount, pendingOrders, restockSignups] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { quantity: { gt: 0, lt: 5 } } }),
    prisma.product.count({ where: { quantity: { lte: 0 } } }),
    prisma.order.count({ where: { status: "paid" } }),
    prisma.restockNotify.count({ where: { notified: false } }),
  ]);

  const cards = [
    { label: "Total Products", value: productCount, href: "/admin/products" },
    { label: "Low Stock (<5)", value: lowStockCount, href: "/admin/products" },
    { label: "Out of Stock", value: outOfStockCount, href: "/admin/products" },
    { label: "Paid Orders", value: pendingOrders, href: "/admin/orders" },
    { label: "Pending Restock Requests", value: restockSignups, href: "/admin/restock-signups" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold text-white">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-xl border border-border bg-bg-panel p-5 hover:border-brand-500"
          >
            <p className="text-3xl font-bold text-brand-300">{c.value}</p>
            <p className="mt-1 text-sm text-gray-400">{c.label}</p>
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/products/new"
          className="inline-block rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-500"
        >
          Add New Product
        </Link>
        <Link
          href="/admin/settings"
          className="inline-block rounded-lg border border-brand-500 px-5 py-3 font-semibold text-brand-300 hover:bg-bg-elevated"
        >
          Edit Site Branding
        </Link>
      </div>
    </div>
  );
}
