import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { applyManapoolChange, getSyncSettings } from "@/lib/sync/engine";
import { manapoolWritesEnabled } from "@/lib/sync/manapool";

export const dynamic = "force-dynamic";

async function requireAdmin() { if (!(await getAdminSession())) throw new Error("Unauthorized"); }

async function setMode(formData: FormData) {
  "use server";
  await requireAdmin();
  const mode = formData.get("mode") === "auto" ? "auto" : "approval";
  await prisma.syncSettings.upsert({ where: { id: "sync" }, update: { manapoolMode: mode }, create: { id: "sync", manapoolMode: mode } });
  revalidatePath("/admin/sync");
}

async function approve(formData: FormData) {
  "use server";
  await requireAdmin();
  const ids = formData.getAll("id").map(String);
  for (const id of ids) await applyManapoolChange(id);
  revalidatePath("/admin/sync");
}

async function reject(formData: FormData) {
  "use server";
  await requireAdmin();
  await prisma.channelChange.update({ where: { id: String(formData.get("id")) }, data: { status: "rejected" } });
  revalidatePath("/admin/sync");
}

async function resolveIssue(formData: FormData) {
  "use server";
  await requireAdmin();
  await prisma.syncIssue.update({ where: { id: String(formData.get("id")) }, data: { resolved: true } });
  revalidatePath("/admin/sync");
}

export default async function SyncPage() {
  const [settings, mp, tcg, recent, issues] = await Promise.all([
    getSyncSettings(),
    prisma.channelChange.findMany({ where: { channel: "manapool", status: { in: ["pending", "failed"] } }, include: { product: { select: { name: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.channelChange.findMany({ where: { channel: "tcgplayer", status: "pending" }, include: { product: { select: { name: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.inventoryEvent.findMany({ include: { product: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.syncIssue.findMany({ where: { resolved: false }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const writes = manapoolWritesEnabled();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Inventory Sync</h1>
        <p className="mt-2 text-sm text-gray-400">Sales on the store, Mana Pool or TCGplayer lower stock here and queue the same change for the other platforms.</p>
      </div>

      <section className="rounded-xl border border-border bg-bg-panel p-5">
        <h2 className="text-lg font-semibold text-white">Mana Pool updates</h2>
        <p className="mt-1 text-sm text-gray-400">Mode: <b className="text-white">{settings.manapoolMode === "auto" ? "Automatic" : "Approval list"}</b>. API writes {writes ? "enabled" : <b className="text-yellow-300">disabled (MANAPOOL_WRITES_ENABLED is not 1)</b>}.</p>
        <form action={setMode} className="mt-3 flex gap-2">
          <select name="mode" defaultValue={settings.manapoolMode} className="rounded-md bg-bg-elevated px-3 py-2 text-sm"><option value="approval">Approval list</option><option value="auto">Automatic</option></select>
          <button className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold">Save</button>
        </form>
        <form action={approve} className="mt-4 space-y-2">
          {mp.map((c) => (
            <label key={c.id} className="flex items-center gap-3 text-sm text-gray-200">
              <input type="checkbox" name="id" value={c.id} defaultChecked={c.status === "pending"} />
              <span className="text-white">{c.product.name}</span> <span>{c.delta}</span> <span className="text-gray-500">{c.note}</span>
              {c.status === "failed" && <span className="text-red-400">failed: {c.error}</span>}
            </label>
          ))}
          {mp.length === 0 ? <p className="text-sm text-gray-500">Nothing waiting.</p> : <button className="rounded-md bg-green-700 px-3 py-2 text-sm font-semibold">Apply selected to Mana Pool</button>}
        </form>
        {mp.filter((c) => c.status === "pending").map((c) => (
          <form key={c.id} action={reject} className="inline"><input type="hidden" name="id" value={c.id} /><button className="mr-2 mt-2 text-xs text-gray-500 underline">Reject {c.product.name}</button></form>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-bg-panel p-5">
        <h2 className="text-lg font-semibold text-white">TCGplayer staged CSV</h2>
        <p className="mt-1 text-sm text-gray-400">{tcg.length} change(s) waiting. Download, then in Seller Portal: delete staged inventory → Import to Staged → review → Move To Live.</p>
        <ul className="mt-2 text-sm text-gray-300">{tcg.map((c) => <li key={c.id}>{c.product.name}: {c.delta} <span className="text-gray-500">({c.note})</span></li>)}</ul>
        {tcg.length > 0 && <a href="/api/admin/sync/tcgplayer-csv" className="mt-3 inline-block rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold">Download CSV (marks these exported)</a>}
      </section>

      <section className="rounded-xl border border-border bg-bg-panel p-5">
        <h2 className="text-lg font-semibold text-white">Needs a look</h2>
        {issues.length === 0 ? <p className="text-sm text-gray-500">No unmatched sales.</p> : issues.map((i) => (
          <form key={i.id} action={resolveIssue} className="flex items-center gap-3 text-sm text-gray-200"><input type="hidden" name="id" value={i.id} />{i.source} {i.externalId}: {i.detail}<button className="text-xs underline">Resolved</button></form>
        ))}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-white">Recent sales</h2>
        <ul className="text-sm text-gray-300">{recent.map((e) => <li key={e.id}>{e.createdAt.toLocaleString("en-US", { timeZone: "America/Tijuana" })}: {e.source} sold {e.quantity} × {e.product.name}</li>)}</ul>
      </section>
    </div>
  );
}
