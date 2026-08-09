import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ARCHIVED_DELETED_PRODUCT_KEYWORD } from "@/lib/product-delete";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const visibleProductsWhere = {
    seoKeywords: {
      not: ARCHIVED_DELETED_PRODUCT_KEYWORD,
    },
  } as const;

  const [productCount, lowStockCount, outOfStockCount, pendingOrders, restockSignups] = await Promise.all([
    prisma.product.count({ where: visibleProductsWhere }),
    prisma.product.count({ where: { ...visibleProductsWhere, quantity: { gt: 0, lt: 5 } } }),
    prisma.product.count({ where: { ...visibleProductsWhere, quantity: { lte: 0 } } }),
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

      {productCount === 0 ? (
        <div className="rounded-2xl border border-brand-500/30 bg-[linear-gradient(135deg,rgba(15,20,34,0.98),rgba(31,18,42,0.96))] p-6 shadow-[0_18px_60px_rgba(2,6,16,0.28)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-200/85">
            Railway Rebuild
          </p>
          <h2 className="mt-2 font-display text-2xl font-medium text-white">
            Your new database is live and ready for product imports.
          </h2>
          <p className="mt-3 max-w-[72ch] text-sm leading-6 text-gray-300">
            Categories, navigation, admin settings, checkout routes, and the public storefront are already up.
            The next step is simply loading inventory back in through Add Product and refreshing your homepage settings.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/admin/products/new"
              className="rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-500"
            >
              Add First Product
            </Link>
            <Link
              href="/admin/settings"
              className="rounded-lg border border-white/12 px-5 py-3 font-semibold text-gray-100 hover:border-brand-400/45 hover:text-white"
            >
              Review Site Settings
            </Link>
            <Link
              href="/admin/products"
              className="rounded-lg border border-white/12 px-5 py-3 font-semibold text-gray-100 hover:border-brand-400/45 hover:text-white"
            >
              Open Catalog Workspace
            </Link>
          </div>
        </div>
      ) : null}

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
