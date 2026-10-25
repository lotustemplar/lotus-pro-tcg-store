"use client";

import { useState } from "react";

type Row = {
  productId: string | null; name: string; storeQty: number | null; manapoolQty: number | null; tcgplayerQty: number | null;
  proposedQty: number | null; change: number | null; status: string; note: string; manapoolProductId?: string | null; tcgplayerSku?: number | null;
};

const show = (n: number | null) => (n == null ? "—" : String(n));

export function SyncInventoriesButton() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [sources, setSources] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [qty, setQty] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [showSame, setShowSame] = useState(false);

  // If the "Add to Lotus Pro" extension (v1.1+) is installed, ask it to pull a fresh TCGplayer snapshot from
  // Filipe's own Seller Portal session. Resolves with a status line; never blocks if the extension is absent.
  function refreshFromExtension(): Promise<string | null> {
    return new Promise((resolve) => {
      const id = Math.random().toString(36).slice(2);
      let acked = false;
      const onMsg = (e: MessageEvent) => {
        if (e.source !== window || !e.data || e.data.id !== id) return;
        if (e.data.type === "lotus:tcg-ack") { acked = true; return; }
        if (e.data.type === "lotus:tcg-result") {
          window.removeEventListener("message", onMsg);
          resolve(e.data.ok ? `TCGplayer refreshed: ${e.data.sealedRows} sealed rows.` : `Extension couldn't refresh TCGplayer data: ${e.data.error}. Using the last snapshot (or upload the export).`);
        }
      };
      window.addEventListener("message", onMsg);
      window.postMessage({ type: "lotus:tcg-request", id }, window.location.origin);
      setTimeout(() => {
        if (!acked) {
          window.removeEventListener("message", onMsg);
          resolve("Add to Lotus Pro extension (v1.1+) not detected on this page, so TCGplayer wasn't refreshed. Install/reload the extension, reload this page, and try again (or upload the export).");
        }
      }, 2500);
      setTimeout(() => { window.removeEventListener("message", onMsg); resolve("TCGplayer refresh timed out; using the last snapshot."); }, 180000);
    });
  }

  async function syncFromExtension() {
    setLoading(true); setMsg("Refreshing TCGplayer inventory via the extension…");
    const warn = await refreshFromExtension();
    await review();
    if (warn) setMsg(warn);
  }

  async function review() {
    setLoading(true); setMsg(null);
    try {
      const fd = new FormData(); if (file) fd.append("tcgplayerCsv", file);
      const res = await fetch("/api/admin/inventory-sync", { method: "POST", body: fd });
      const j = await res.json(); if (!res.ok) throw new Error(j.error || "Review failed");
      setRows(j.rows); setSources(j.sources);
      const p: Record<string, boolean> = {}; const q: Record<string, string> = {};
      for (const r of j.rows as Row[]) if (r.productId) { p[r.productId] = r.status === "change"; q[r.productId] = r.proposedQty == null ? "" : String(r.proposedQty); }
      setPicked(p); setQty(q);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Review failed"); } finally { setLoading(false); }
  }

  async function apply() {
    if (!rows) return;
    const changes = rows.filter((r) => r.productId && picked[r.productId] && qty[r.productId] !== "" && Number(qty[r.productId]) !== r.storeQty)
      .map((r) => ({ productId: r.productId!, expectedQty: r.storeQty!, newQty: Math.max(0, Math.floor(Number(qty[r.productId!]))) }));
    if (!changes.length) { setMsg("Nothing selected."); return; }
    if (!confirm(`Update store quantity for ${changes.length} product(s)? Marketplaces are not touched.`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/inventory-sync/apply", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ changes }) });
      const j = await res.json(); if (!res.ok) throw new Error(j.error || "Apply failed");
      setMsg(`Applied ${j.applied.length}; skipped ${j.skipped.length}. Audit id ${j.runId}.`);
      await review();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Apply failed"); } finally { setLoading(false); }
  }

  const visible = (rows ?? []).filter((r) => showSame || r.status !== "same");
  const counts = (rows ?? []).reduce<Record<string, number>>((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {});

  return (
    <>
      <button onClick={() => { setOpen(true); if (!file) syncFromExtension(); }} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold tracking-wide text-white hover:bg-brand-400">
        SYNC INVENTORIES
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
          <div className="w-full max-w-6xl rounded-xl border border-border bg-bg-panel p-5 text-sm text-gray-200">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-white">Sync inventories (marketplaces → store)</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">Close</button>
            </div>
            <p className="mb-3 text-gray-400">
              Mana Pool and TCGplayer hold the real counts. This only changes store quantities and never writes to a marketplace.
              Mana Pool is read live. TCGplayer has no seller API, so upload the export from Seller Portal → Pricing → Export (the &quot;MyPricing&quot; CSV); sealed rows (Unopened) are used.
            </p>
            <p className="mb-3 text-xs text-gray-400">
              Rule: if a product is missing or at 0 on one marketplace, the other marketplace&apos;s count is used (single-channel listings are normal). ⚠ Flagged only when both marketplaces show different positive counts.
            </p>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <label className="text-gray-300">TCGplayer export CSV:{" "}
                <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" />
              </label>
              <button onClick={review} disabled={loading} className="rounded-md border border-white/15 px-3 py-1.5 hover:bg-white/5 disabled:opacity-50">
                {loading ? "Working…" : rows ? "Refresh review" : "Review changes"}
              </button>
              {rows && (
                <button onClick={apply} disabled={loading} className="rounded-md bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
                  Apply changes
                </button>
              )}
              {rows && <label className="flex items-center gap-1 text-gray-400"><input type="checkbox" checked={showSame} onChange={(e) => setShowSame(e.target.checked)} /> show unchanged</label>}
            </div>
            {msg && <p className="mb-3 text-amber-300">{msg}</p>}
            {rows && (
              <>
                <p className="mb-2 text-xs text-gray-400">
                  Mana Pool: {sources.manapool} · TCGplayer: {(sources.tcgplayer || "").replace(/\d{4}-\d\d-\d\dT[\d:.]+Z/, (iso) => new Date(iso).toLocaleString())} · {Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                </p>
                <div className="max-h-[65vh] overflow-auto rounded-lg border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-bg-panel text-gray-400">
                      <tr><th className="p-2"></th><th className="p-2">Product</th><th className="p-2">Store</th><th className="p-2">Mana Pool</th><th className="p-2">TCGplayer</th><th className="p-2">New store qty</th><th className="p-2">+/−</th><th className="p-2">Note</th></tr>
                    </thead>
                    <tbody>
                      {visible.map((r, i) => {
                        const id = r.productId; const v = id ? qty[id] ?? "" : "";
                        const delta = id && v !== "" && r.storeQty != null ? Number(v) - r.storeQty : null;
                        return (
                          <tr key={id ?? `new-${i}`} className={`border-t border-white/5 ${r.status === "flag" ? "bg-amber-500/10" : r.status === "not in store" ? "bg-sky-500/5" : ""}`}>
                            <td className="p-2">{id && <input type="checkbox" checked={!!picked[id]} onChange={(e) => setPicked({ ...picked, [id]: e.target.checked })} />}</td>
                            <td className="p-2 text-white">{r.name}</td>
                            <td className="p-2">{show(r.storeQty)}</td>
                            <td className="p-2">{show(r.manapoolQty)}</td>
                            <td className="p-2">{show(r.tcgplayerQty)}</td>
                            <td className="p-2">
                              {id ? <input value={v} onChange={(e) => setQty({ ...qty, [id]: e.target.value.replace(/[^0-9]/g, "") })} className="w-16 rounded border border-border bg-bg px-2 py-1" /> :
                                <a href="/admin/products/new" target="_blank" className="text-brand-300 hover:underline">Add</a>}
                            </td>
                            <td className={`p-2 ${delta && delta > 0 ? "text-emerald-400" : delta && delta < 0 ? "text-red-400" : "text-gray-500"}`}>{delta == null ? "" : delta > 0 ? `+${delta}` : delta}</td>
                            <td className="p-2 text-gray-400">{r.status === "flag" ? "⚠ " : ""}{r.note}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
