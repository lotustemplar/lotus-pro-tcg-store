import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SignupRow = {
  id: string;
  email: string;
  notified: boolean;
  createdAt: Date;
  product: { name: string };
};

export default async function RestockSignupsPage() {
  const signups: SignupRow[] = await prisma.restockNotify.findMany({
    include: { product: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-white">Restock Signups</h1>
      <p className="text-sm text-gray-400">
        Customers waiting to be notified when an out-of-stock item is restocked. Wire up an email
        provider and mark rows as notified once you've sent the alert.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg-panel text-gray-400">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Requested</th>
              <th className="px-4 py-3">Notified</th>
            </tr>
          </thead>
          <tbody>
            {signups.map((s: SignupRow) => (
              <tr key={s.id} className="border-t border-border bg-bg-panel/40">
                <td className="px-4 py-3 text-white">{s.product.name}</td>
                <td className="px-4 py-3 text-gray-300">{s.email}</td>
                <td className="px-4 py-3 text-gray-400">{s.createdAt.toLocaleDateString()}</td>
                <td className="px-4 py-3">{s.notified ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {signups.length === 0 && <p className="p-6 text-center text-gray-400">No signups yet.</p>}
      </div>
    </div>
  );
}
