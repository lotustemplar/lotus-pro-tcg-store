"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { classifyMysteryTier } from "@/lib/mystery-bags";

type InventoryRow = {
  id: string;
  name: string;
  tcgplayerUrl: string | null;
  productId: string | null;
  quantity: number;
  marketValueCents: number;
  tier: string;
  imageUrl: string | null;
  notes: string | null;
};

type NewPackDraft = { name: string; quantity: string; marketValue: string; tcgplayerUrl: string; productId: string; imageUrl: string };
type PackDraft = NewPackDraft & { notes: string };

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function InventoryEditor({ inventory, pack, setPack, addPack, lookupTcgplayer, refreshPrices, updatePack, deletePack, busy, lookupBusy }: {
  inventory: InventoryRow[];
  pack: NewPackDraft;
  setPack: Dispatch<SetStateAction<NewPackDraft>>;
  addPack: (event: React.FormEvent) => void;
  lookupTcgplayer: () => void;
  refreshPrices: (id?: string) => void;
  updatePack: (id: string, draft: PackDraft) => void;
  deletePack: (id: string, name: string) => void;
  busy: boolean;
  lookupBusy: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<PackDraft | null>(null);
  const setNew = (key: keyof NewPackDraft, value: string) => setPack((current) => ({ ...current, [key]: value }));
  const setEdit = (key: keyof PackDraft, value: string) => setEditDraft((current) => current ? { ...current, [key]: value } : current);
  const beginEdit = (row: InventoryRow) => {
    setEditingId(row.id);
    setEditDraft({ name: row.name, quantity: row.quantity.toString(), marketValue: (row.marketValueCents / 100).toFixed(2), tcgplayerUrl: row.tcgplayerUrl ?? "", productId: row.productId ?? "", imageUrl: row.imageUrl ?? "", notes: row.notes ?? "" });
  };
  const cancelEdit = () => { setEditingId(null); setEditDraft(null); };
  const saveEdit = (event: React.FormEvent, id: string) => { event.preventDefault(); if (!editDraft) return; updatePack(id, editDraft); cancelEdit(); };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h2 className="font-display text-2xl font-bold">Pack inventory</h2><p className="mt-1 max-w-3xl text-sm text-gray-400">Enter the pack name and current market value. Tiers are assigned automatically; market value is the only replacement-cost basis used for profitability.</p></div>
      <button type="button" onClick={() => refreshPrices()} disabled={busy || lookupBusy} className="rounded-xl border border-gold/40 px-4 py-2.5 text-sm font-semibold text-gold hover:bg-gold/10 disabled:opacity-50">{busy ? "Refreshing..." : "Refresh TCGplayer prices"}</button>
    </div>
    <form onSubmit={addPack} className="lux-panel grid gap-3 rounded-2xl p-5 md:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 md:col-span-2 xl:col-span-4">TCGplayer URL<span className="mt-2 flex flex-col gap-2 sm:flex-row"><input type="url" value={pack.tcgplayerUrl} onChange={(event) => setNew("tcgplayerUrl", event.target.value)} onBlur={lookupTcgplayer} placeholder="Paste a direct TCGplayer product link" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-bg px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-brand-400" /><button type="button" onClick={lookupTcgplayer} disabled={busy || lookupBusy || !pack.tcgplayerUrl.trim()} className="rounded-xl border border-gold/40 px-4 py-2.5 text-sm font-bold text-gold disabled:opacity-50">{lookupBusy ? "Reading link..." : "Import name & price"}</button></span><span className="mt-2 block text-xs font-normal normal-case tracking-normal text-gray-500">The imported price is the primary TCGplayer offer shown in the purchase box, including shipping.</span></label>
      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 md:col-span-2">Pack name<input required value={pack.name} onChange={(event) => setNew("name", event.target.value)} placeholder="Marvel Spider-Man Play Booster Pack" className="mt-2 w-full rounded-xl border border-white/10 bg-bg px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-brand-400" /></label>
      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">TCGplayer Market Value / pack<input required type="number" min="0" step="0.01" value={pack.marketValue} onChange={(event) => setNew("marketValue", event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-bg px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-brand-400" /></label>
      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Quantity<input required type="number" min="0" step="1" value={pack.quantity} onChange={(event) => setNew("quantity", event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-bg px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-brand-400" /></label>
      <div className="flex items-end rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">Automatic tier</p><p className="mt-1 text-sm font-bold text-white">{classifyMysteryTier(Math.round(Math.max(0, Number(pack.marketValue) || 0) * 100))}</p><p className="mt-1 text-[10px] text-gray-500">Basic &lt; $8 · Premium $8–$24.99 · Ultra $25+</p></div></div>
      <div className="flex items-end md:col-span-2 xl:col-span-3"><button disabled={busy || lookupBusy} className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Add pack row</button></div>
    </form>
    <div className="lux-panel overflow-hidden rounded-2xl"><div className="border-b border-white/10 px-5 py-4"><h3 className="font-display text-lg font-bold">Current inventory</h3><p className="mt-1 text-xs text-gray-500">Edit prices or quantities at any time. Refresh uses the primary TCGplayer offer shown in the purchase box; packs without a link must be linked once through Edit.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-white/[0.03] text-xs uppercase tracking-[0.12em] text-gray-500"><tr><th className="px-5 py-3">Pack</th><th className="px-5 py-3">Tier</th><th className="px-5 py-3">Qty</th><th className="px-5 py-3">Market value</th><th className="px-5 py-3">Source</th><th className="px-5 py-3">Actions</th></tr></thead><tbody>{inventory.map((row) => editingId === row.id && editDraft ? <tr key={row.id} className="border-t border-white/8"><td colSpan={6} className="px-5 py-4"><form onSubmit={(event) => saveEdit(event, row.id)} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><label className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 xl:col-span-2">Pack name<input required value={editDraft.name} onChange={(event) => setEdit("name", event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-bg px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-brand-400" /></label><label className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Market value<input required type="number" min="0" step="0.01" value={editDraft.marketValue} onChange={(event) => setEdit("marketValue", event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-bg px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-brand-400" /></label><label className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Quantity<input required type="number" min="0" step="1" value={editDraft.quantity} onChange={(event) => setEdit("quantity", event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-bg px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-brand-400" /></label><label className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 xl:col-span-2">TCGplayer URL<input type="url" value={editDraft.tcgplayerUrl} onChange={(event) => setEdit("tcgplayerUrl", event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-bg px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-brand-400" /></label><div className="flex items-end gap-2 xl:col-span-3"><button disabled={busy} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Save changes</button><button type="button" onClick={cancelEdit} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-gray-300">Cancel</button><span className="self-center text-xs text-gray-500">Tier will recalculate to {classifyMysteryTier(Math.round(Math.max(0, Number(editDraft.marketValue) || 0) * 100))}.</span></div></form></td></tr> : <tr key={row.id} className="border-t border-white/8"><td className="px-5 py-3"><p className="font-semibold text-white">{row.name}</p>{row.tcgplayerUrl && <p className="text-xs text-gray-500">TCGplayer linked</p>}</td><td className="px-5 py-3"><span className="rounded-full bg-brand-400/10 px-2 py-1 text-xs text-brand-200">{row.tier}</span></td><td className="px-5 py-3 text-gray-300">{row.quantity}</td><td className="px-5 py-3 text-gray-300">{money(row.marketValueCents)}</td><td className="px-5 py-3 text-xs text-gray-400">{row.tcgplayerUrl ? "Primary offer" : "Manual — link in Edit to refresh"}</td><td className="px-5 py-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => beginEdit(row)} disabled={busy} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-gray-200 disabled:opacity-50">Edit</button><button type="button" onClick={() => refreshPrices(row.id)} disabled={busy || !row.tcgplayerUrl} title={row.tcgplayerUrl ? "Refresh this pack price" : "Add a TCGplayer link through Edit first"} className="rounded-lg border border-gold/30 px-3 py-1.5 text-xs font-semibold text-gold disabled:opacity-50">Refresh</button><button type="button" onClick={() => deletePack(row.id, row.name)} disabled={busy} className="rounded-lg border border-rose-400/30 px-3 py-1.5 text-xs font-semibold text-rose-200 disabled:opacity-50">Delete</button></div></td></tr>)}</tbody></table>{inventory.length === 0 && <p className="p-8 text-center text-sm text-gray-500">Inventory is empty. Add the first pack row above.</p>}</div></div>
  </div>;
}
