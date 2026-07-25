import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ManualOrderForm } from "../ManualOrderForm";

export const dynamic = "force-dynamic";

export default async function NewManualOrderPage() {
  const products = await prisma.product.findMany({
    orderBy: [{ sourceSetName: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      sourceSetName: true,
      sku: true,
      priceCents: true,
      quantity: true,
      isActive: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-brand-500/25 bg-[linear-gradient(135deg,rgba(15,20,34,0.98),rgba(31,18,42,0.96))] p-6 shadow-[0_20px_60px_rgba(2,6,16,0.32)]">
        <Link href="/admin/orders" className="text-sm text-gray-400 hover:text-white">
          Back to Orders
        </Link>
        <h1 className="mt-3 font-display text-3xl font-bold text-white">Create Manual Order</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
          Use this page for phone orders, direct invoices, event sales, or any manual order you want
          tracked inside the admin. The order will appear in your normal Orders list and can use the
          same packing slip and tracking workflow afterward.
        </p>
      </div>

      <ManualOrderForm products={products} />
    </div>
  );
}
