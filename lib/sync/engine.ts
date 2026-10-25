import { prisma } from "@/lib/prisma";
import { applySealedDelta, manapoolWritesEnabled } from "./manapool";
import { normalizeName } from "./tcgplayer-email";

export type Channel = "store" | "manapool" | "tcgplayer";

export async function getSyncSettings() {
  return prisma.syncSettings.upsert({ where: { id: "sync" }, update: {}, create: { id: "sync" } });
}

/**
 * Record one sale line from one channel. Idempotent on (source, externalOrderId, productId).
 * Decrements store stock (unless the source is the store and alreadyDecremented) and queues
 * decrements for the other channels the product is listed on.
 */
export async function recordSale(input: { source: Channel; externalOrderId: string; productId: string; quantity: number; storeAlreadyDecremented?: boolean }) {
  const { source, externalOrderId, productId, quantity } = input;
  if (quantity <= 0) return { duplicate: false, changes: 0 };
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.inventoryEvent.findUnique({ where: { source_externalOrderId_productId: { source, externalOrderId, productId } } });
    if (existing) return { duplicate: true, changeIds: [] as string[] };
    const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });
    const event = await tx.inventoryEvent.create({ data: { source, externalOrderId, productId, quantity } });
    if (!(source === "store" && input.storeAlreadyDecremented)) {
      const next = Math.max(0, product.quantity - quantity);
      await tx.product.update({ where: { id: productId }, data: { quantity: next } });
    }
    const changeIds: string[] = [];
    const targets: Channel[] = [];
    if (source !== "manapool" && product.manapoolProductId) targets.push("manapool");
    if (source !== "tcgplayer" && (product.tcgplayerSku || product.sourceProductId)) targets.push("tcgplayer");
    for (const channel of targets) {
      const c = await tx.channelChange.create({ data: { channel, productId, delta: -quantity, eventId: event.id, note: `${source} order ${externalOrderId}` } });
      changeIds.push(c.id);
    }
    return { duplicate: false, changeIds };
  });
  if (!result.duplicate) await maybeAutoApplyManapool(result.changeIds);
  return { duplicate: result.duplicate, changes: result.changeIds.length };
}

async function maybeAutoApplyManapool(changeIds: string[]) {
  if (changeIds.length === 0) return;
  const settings = await getSyncSettings();
  if (settings.manapoolMode !== "auto" || !manapoolWritesEnabled()) return;
  const pending = await prisma.channelChange.findMany({ where: { id: { in: changeIds }, channel: "manapool", status: "pending" } });
  for (const c of pending) await applyManapoolChange(c.id);
}

/** Apply one approved/pending Mana Pool change via the API. */
export async function applyManapoolChange(changeId: string) {
  const c = await prisma.channelChange.findUniqueOrThrow({ where: { id: changeId }, include: { product: true } });
  if (c.channel !== "manapool" || !["pending", "approved", "failed"].includes(c.status)) return c;
  if (!c.product.manapoolProductId) return prisma.channelChange.update({ where: { id: c.id }, data: { status: "failed", error: "Product has no Mana Pool product id" } });
  try {
    const r = await applySealedDelta(c.product.manapoolProductId, c.delta);
    return prisma.channelChange.update({ where: { id: c.id }, data: { status: "applied", appliedAt: new Date(), error: null, note: `${c.note ?? ""} | ${JSON.stringify(r)}` } });
  } catch (e) {
    return prisma.channelChange.update({ where: { id: c.id }, data: { status: "failed", error: e instanceof Error ? e.message : String(e) } });
  }
}

/** Find the store product for a Mana Pool order item. */
export async function matchManapoolItem(item: { product_id?: string; tcgsku?: number | null; custom_external_id?: string | null }) {
  const or: object[] = [];
  if (item.product_id) or.push({ manapoolProductId: item.product_id });
  if (item.tcgsku) or.push({ tcgplayerSku: Number(item.tcgsku) });
  if (item.custom_external_id) or.push({ id: item.custom_external_id }, { sku: item.custom_external_id });
  if (or.length === 0) return null;
  const rows = await prisma.product.findMany({ where: { OR: or }, take: 2 });
  return rows.length === 1 ? rows[0] : null;
}

/** Find the store product for a TCGplayer email line by exact normalized name (unique match only). */
export async function matchTcgplayerName(name: string) {
  const n = normalizeName(name);
  const candidates = await prisma.product.findMany({ select: { id: true, name: true, tcgplayerListingName: true } });
  const hits = candidates.filter((p) => normalizeName(p.tcgplayerListingName || "") === n);
  const hits2 = hits.length ? hits : candidates.filter((p) => normalizeName(p.name) === n);
  return hits2.length === 1 ? hits2[0] : null;
}

export async function logIssue(source: string, externalId: string, detail: string) {
  await prisma.syncIssue.upsert({ where: { source_externalId_detail: { source, externalId, detail } }, update: {}, create: { source, externalId, detail } });
}
