import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classifyMysteryTier, MYSTERY_TIERS, MysteryRules, MysteryTier, optimizeMysteryBatch } from "@/lib/mystery-bags";
import { buildTcgplayerImageUrl, extractTcgplayerProductId, fetchTcgplayerProductDetails, fetchTcgplayerTopListing } from "@/lib/tcgplayer";

const packSchema = z.object({
  action: z.literal("create-pack"),
  name: z.string().trim().min(1).max(160),
  setName: z.string().trim().max(120).optional().or(z.literal("")),
  tcgplayerUrl: z.string().trim().url().optional().or(z.literal("")),
  productId: z.string().trim().max(80).optional().or(z.literal("")),
  imageUrl: z.string().trim().url().optional().or(z.literal("")),
  quantity: z.number().int().min(0),
  unitCostCents: z.number().int().min(0).optional(),
  marketValueCents: z.number().int().min(0),
  tier: z.enum(MYSTERY_TIERS).optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

const updatePackSchema = z.object({
  action: z.literal("update-pack"),
  id: z.string().min(1),
  name: z.string().trim().min(1).max(160),
  tcgplayerUrl: z.string().trim().url().optional().or(z.literal("")),
  productId: z.string().trim().max(80).optional().or(z.literal("")),
  imageUrl: z.string().trim().url().optional().or(z.literal("")),
  quantity: z.number().int().min(0),
  marketValueCents: z.number().int().min(0),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

const refreshPricesSchema = z.object({
  action: z.literal("refresh-prices"),
  id: z.string().min(1).optional(),
});

const deletePackSchema = z.object({
  action: z.literal("delete-pack"),
  id: z.string().min(1),
});

const lookupSchema = z.object({
  action: z.literal("lookup-tcgplayer"),
  tcgplayerUrl: z.string().trim().url(),
});

const heroSchema = z.object({
  action: z.literal("update-hero"),
  heroImageUrl: z.string().trim().url().optional().or(z.literal("")),
});

const rulesSchema = z.object({
  // Market value is the only supported cost basis for new optimizer runs.
  costBasis: z.literal("market").default("market"),
  minPacksPerBag: z.number().int().min(3).max(6),
  maxPacksPerBag: z.number().int().min(3).max(6),
  productPriceCents: z.number().int().min(0),
  shippingCollectedCents: z.number().int().min(0),
  postageCents: z.number().int().min(0),
  suppliesCents: z.number().int().min(0),
  paymentPercent: z.number().min(0).max(100),
  fixedPaymentFeeCents: z.number().int().min(0),
  platformFeeCents: z.number().int().min(0),
  minBagValueCents: z.number().int().min(0),
  minBasicPacks: z.number().int().min(0),
  allowDuplicatePacks: z.boolean(),
  allowDuplicateSets: z.boolean(),
  maxCopiesSamePack: z.number().int().min(1),
  basicOnlyBagCount: z.number().int().min(0),
  premiumBagCount: z.number().int().min(0),
  ultraPremiumBagCount: z.number().int().min(0),
  minBatchMarginPercent: z.number().min(0).max(100),
  marketValueBufferPercent: z.number().min(0).max(100).optional().default(10),
  useEveryPack: z.boolean(),
  leaveUnassigned: z.boolean(),
  // Kept only for backwards compatibility with older saved clients. The
  // current optimizer does not use individual-loss allowances; batch-level
  // replacement-cost profit and margin are authoritative.
  allowIndividualLosses: z.boolean().optional().default(false),
  bagCount: z.number().int().min(1).nullable(),
});

function dollarsToCents(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : -1;
}

function isAllowedTcgplayerUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "tcgplayer.com" || url.hostname.endsWith(".tcgplayer.com")) && extractTcgplayerProductId(value) !== null;
  } catch {
    return false;
  }
}

async function withTcgplayerTimeout<T>(promise: Promise<T>, timeoutMs = 8000) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("TCGplayer request timed out.")), timeoutMs);
    }),
  ]);
}

async function fetchLowestTcgplayerPrice(sourceUrl: string) {
  const productId = extractTcgplayerProductId(sourceUrl);
  if (!productId) throw new Error("That link does not contain a TCGplayer product ID.");
  const [detailsResult, listingResult] = await Promise.allSettled([
    fetchTcgplayerProductDetails(productId),
    fetchTcgplayerTopListing(productId),
  ]);

  // TCGplayer can block or change the listings endpoint independently of the
  // product details endpoint. A listings failure must not prevent a refresh
  // from using the lowest-price summary returned by the details endpoint.
  const details = detailsResult.status === "fulfilled" ? detailsResult.value : null;
  const lowestListing = listingResult.status === "fulfilled" ? listingResult.value : null;
  // The primary purchase box is the first standard offer returned by
  // TCGplayer's sorted listings feed. Use its item price plus shipping as the
  // source of truth. The product-details "as low as" summary is only a
  // fallback because it is not necessarily the currently surfaced offer.
  const primaryOfferPrice = lowestListing?.totalPrice ?? details?.lowestPriceWithShipping ?? details?.lowestPrice;
  if (!primaryOfferPrice || primaryOfferPrice <= 0) throw new Error("TCGplayer did not return a primary offer for that product.");

  return {
    productId,
    name: details?.productName ?? `TCGplayer product ${productId}`,
    imageUrl: buildTcgplayerImageUrl(productId),
    marketValueCents: Math.round(primaryOfferPrice * 100),
    priceSource: lowestListing
      ? "primary TCGplayer offer including shipping"
      : details?.lowestPriceWithShipping
        ? "TCGplayer lowest-price summary including shipping (fallback)"
        : "TCGplayer lowest-price summary (fallback)",
  };
}

const demoPacks = [
  ["Bloomburrow Play Booster", "Bloomburrow", 72, 245, 549, "Basic"],
  ["Outlaws of Thunder Junction Play Booster", "Outlaws of Thunder Junction", 48, 270, 599, "Basic"],
  ["Dominaria United Draft Booster", "Dominaria United", 24, 235, 529, "Basic"],
  ["Wilds of Eldraine Play Booster", "Wilds of Eldraine", 24, 255, 579, "Basic"],
  ["Phyrexia: All Will Be One Draft Booster", "Phyrexia: All Will Be One", 24, 265, 649, "Basic"],
  ["Modern Horizons 3 Play Booster", "Modern Horizons 3", 30, 430, 899, "Premium"],
  ["Commander Masters Draft Booster", "Commander Masters", 12, 650, 1399, "Premium"],
  ["Double Masters 2022 Draft Booster", "Double Masters 2022", 4, 1800, 3999, "Ultra Premium"],
] as const;

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [rawInventory, batches] = await Promise.all([
    prisma.mysteryPackInventory.findMany({ where: { quantity: { gt: 0 } }, orderBy: [{ tier: "asc" }, { name: "asc" }] }),
    prisma.mysteryBatch.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { id: true, name: true, status: true, createdAt: true, finalizedAt: true, metricsJson: true } }),
  ]);
  const inventory = rawInventory.map((pack) => ({ ...pack, tier: classifyMysteryTier(pack.marketValueCents) }));
  return NextResponse.json({ inventory, batches });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);

  if (body?.action === "lookup-tcgplayer") {
    const parsed = lookupSchema.safeParse(body);
    if (!parsed.success || !isAllowedTcgplayerUrl(parsed.data.tcgplayerUrl)) {
      return NextResponse.json({ error: "Paste a direct TCGplayer product link." }, { status: 400 });
    }

    try {
      const product = await withTcgplayerTimeout(fetchLowestTcgplayerPrice(parsed.data.tcgplayerUrl));
      return NextResponse.json({
        ok: true,
        productId: product.productId.toString(),
        name: product.name,
        imageUrl: product.imageUrl,
        marketValueCents: product.marketValueCents,
        priceSource: product.priceSource,
      });
    } catch {
      return NextResponse.json({ error: "TCGplayer lookup timed out or was blocked. You can still enter the pack name and market value manually." }, { status: 502 });
    } finally {
      // The lookup helper is intentionally best-effort; no inventory is changed here.
    }
  }

  if (body?.action === "refresh-prices") {
    const parsed = refreshPricesSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid price refresh request." }, { status: 400 });
    const [inventory, skipped] = await Promise.all([
      prisma.mysteryPackInventory.findMany({
        where: { ...(parsed.data.id ? { id: parsed.data.id } : {}), quantity: { gt: 0 }, tcgplayerUrl: { not: null } },
        orderBy: { name: "asc" },
      }),
      parsed.data.id
        ? Promise.resolve(0)
        : prisma.mysteryPackInventory.count({ where: { quantity: { gt: 0 }, tcgplayerUrl: null } }),
    ]);

    if (parsed.data.id && inventory.length === 0) {
      const pack = await prisma.mysteryPackInventory.findUnique({ where: { id: parsed.data.id }, select: { name: true, quantity: true, tcgplayerUrl: true } });
      if (!pack) return NextResponse.json({ error: "Pack inventory row not found." }, { status: 404 });
      if (pack.quantity <= 0) return NextResponse.json({ error: "This pack has no active inventory to refresh." }, { status: 422 });
      return NextResponse.json({ error: "This pack has no saved TCGplayer link. Edit the pack, paste its direct product link, and save it first." }, { status: 422 });
    }

    const updated: Array<{ id: string; name: string; marketValueCents: number; priceSource: string }> = [];
    const failed: Array<{ id: string; name: string; error: string }> = [];
    for (const pack of inventory) {
      try {
        const product = await withTcgplayerTimeout(fetchLowestTcgplayerPrice(pack.tcgplayerUrl ?? ""));
        await prisma.mysteryPackInventory.update({
          where: { id: pack.id },
          data: { marketValueCents: product.marketValueCents, unitCostCents: product.marketValueCents, tier: classifyMysteryTier(product.marketValueCents), productId: product.productId.toString(), imageUrl: product.imageUrl },
        });
        updated.push({ id: pack.id, name: pack.name, marketValueCents: product.marketValueCents, priceSource: product.priceSource });
      } catch (error) {
        failed.push({ id: pack.id, name: pack.name, error: error instanceof Error ? error.message : "TCGplayer price refresh failed." });
      }
    }
    return NextResponse.json({ ok: true, updated, failed, eligible: inventory.length, skipped });
  }

  if (body?.action === "update-pack") {
    const parsed = updatePackSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Check the pack fields and try again." }, { status: 400 });
    const existing = await prisma.mysteryPackInventory.findUnique({ where: { id: parsed.data.id } });
    if (!existing) return NextResponse.json({ error: "Pack inventory row not found." }, { status: 404 });
    const finalizedAssignments = await prisma.mysteryBagAssignment.findMany({ where: { inventoryId: parsed.data.id, bag: { batch: { status: "finalized" } } }, select: { quantity: true } });
    const reservedQuantity = finalizedAssignments.reduce((sum, assignment) => sum + assignment.quantity, 0);
    if (parsed.data.quantity < reservedQuantity) return NextResponse.json({ error: `Quantity cannot be lower than the ${reservedQuantity} pack(s) already reserved in finalized bags.` }, { status: 409 });
    const pack = await prisma.mysteryPackInventory.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        setName: parsed.data.name,
        tcgplayerUrl: parsed.data.tcgplayerUrl || null,
        productId: parsed.data.productId || null,
        imageUrl: parsed.data.imageUrl || null,
        quantity: parsed.data.quantity,
        unitCostCents: parsed.data.marketValueCents,
        marketValueCents: parsed.data.marketValueCents,
        tier: classifyMysteryTier(parsed.data.marketValueCents),
        notes: parsed.data.notes || null,
      },
    });
    return NextResponse.json({ ok: true, pack });
  }

  if (body?.action === "delete-pack") {
    const parsed = deletePackSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid pack deletion request." }, { status: 400 });
    const existing = await prisma.mysteryPackInventory.findUnique({ where: { id: parsed.data.id }, select: { id: true, name: true, notes: true } });
    if (!existing) return NextResponse.json({ error: "Pack inventory row not found." }, { status: 404 });
    const assignmentCount = await prisma.mysteryBagAssignment.count({ where: { inventoryId: parsed.data.id } });
    if (assignmentCount > 0) {
      await prisma.mysteryPackInventory.update({ where: { id: parsed.data.id }, data: { quantity: 0, notes: existing.notes ? `${existing.notes} · Archived for audit` : "Archived for audit" } });
      return NextResponse.json({ ok: true, archived: true, name: existing.name });
    }
    await prisma.mysteryPackInventory.delete({ where: { id: parsed.data.id } });
    return NextResponse.json({ ok: true, deleted: true, name: existing.name });
  }

  if (body?.action === "create-pack") {
    const parsed = packSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Check the pack fields and try again." }, { status: 400 });
    const pack = await prisma.mysteryPackInventory.create({ data: {
      name: parsed.data.name,
      setName: parsed.data.setName || parsed.data.name,
      tcgplayerUrl: parsed.data.tcgplayerUrl || null,
      productId: parsed.data.productId || null,
      imageUrl: parsed.data.imageUrl || null,
      quantity: parsed.data.quantity,
      // Historical cost is no longer entered; market value is the replacement-cost basis.
      unitCostCents: parsed.data.unitCostCents ?? parsed.data.marketValueCents,
      marketValueCents: parsed.data.marketValueCents,
      tier: classifyMysteryTier(parsed.data.marketValueCents),
      notes: parsed.data.notes || null,
    } });
    return NextResponse.json({ ok: true, pack });
  }

  if (body?.action === "seed-demo") {
    for (const [name, setName, quantity, cost, marketValue] of demoPacks) {
      const tier = classifyMysteryTier(marketValue);
      const existing = await prisma.mysteryPackInventory.findFirst({ where: { name, setName, notes: "Lotus demo inventory" } });
      if (existing) {
        await prisma.mysteryPackInventory.update({ where: { id: existing.id }, data: { quantity, unitCostCents: cost, marketValueCents: marketValue, tier } });
      } else {
        await prisma.mysteryPackInventory.create({ data: { name, setName, quantity, unitCostCents: cost, marketValueCents: marketValue, tier, notes: "Lotus demo inventory" } });
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (body?.action === "update-hero") {
    const parsed = heroSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid image URL." }, { status: 400 });
    const settings = await prisma.mysteryBagSettings.upsert({
      where: { id: "mystery-bag" },
      update: { heroImageUrl: parsed.data.heroImageUrl || null },
      create: { id: "mystery-bag", heroImageUrl: parsed.data.heroImageUrl || null },
    });
    revalidatePath("/mystery-booster-bag");
    revalidatePath("/admin/mystery-bags");
    return NextResponse.json({ ok: true, heroImageUrl: settings.heroImageUrl });
  }

  if (body?.action === "delete-demo") {
    const result = await prisma.$transaction(async (tx) => {
      const archived = await tx.mysteryPackInventory.updateMany({
        where: { notes: "Lotus demo inventory", assignments: { some: {} } },
        data: { quantity: 0, notes: "Lotus demo inventory (retained for finalized audit)" },
      });
      const deleted = await tx.mysteryPackInventory.deleteMany({
        where: { notes: "Lotus demo inventory", assignments: { none: {} } },
      });
      return { deleted: deleted.count, retained: archived.count };
    });
    return NextResponse.json({ ok: true, ...result });
  }

  if (body?.action === "generate") {
    const parsedRules = rulesSchema.safeParse(body.rules);
    if (!parsedRules.success) return NextResponse.json({ error: "Invalid batch rules." }, { status: 400 });
    const rules = parsedRules.data as MysteryRules;
    const inventory = await prisma.mysteryPackInventory.findMany({ orderBy: { createdAt: "asc" } });
    const result = optimizeMysteryBatch(inventory.map((pack) => ({ ...pack, tier: classifyMysteryTier(pack.marketValueCents) as MysteryTier })), rules);
    if (!result.ok) return NextResponse.json({ ok: false, diagnostics: result.diagnostics }, { status: 422 });
    const batch = await prisma.$transaction(async (tx) => {
      await tx.mysteryBatch.updateMany({ where: { status: "draft" }, data: { status: "voided", voidedAt: new Date(), voidReason: "Superseded by a regenerated draft." } });
      return tx.mysteryBatch.create({ data: {
        name: `Mystery Booster Bag · ${new Date().toLocaleDateString("en-US")}`,
        status: "draft",
        ruleSetJson: JSON.stringify(rules),
        seed: result.seed,
        auditId: `LMB-${Date.now().toString(36).toUpperCase()}`,
        metricsJson: JSON.stringify(result.metrics),
        claimsJson: JSON.stringify(result.claims),
        bags: { create: result.bags.map((bag) => ({
          bagNumber: bag.bagNumber,
          code: bag.code,
          totalMarketValueCents: bag.totalMarketValueCents,
          totalCostCents: bag.totalCostCents,
          profitCents: bag.profitCents,
          outcome: bag.outcome,
          assignments: { create: bag.packs.map((pack) => ({ inventoryId: pack.id, quantity: pack.quantity, nameSnapshot: pack.name, setNameSnapshot: pack.setName, tcgplayerUrlSnapshot: pack.tcgplayerUrl ?? null, imageUrlSnapshot: pack.imageUrl ?? null, unitCostCents: pack.unitCostCents, costBasisCents: rules.costBasis === "market" ? pack.marketValueCents : pack.unitCostCents, marketValueCents: pack.marketValueCents })) },
        })) },
      }, include: { bags: { include: { assignments: true }, orderBy: { bagNumber: "asc" } } } });
    });
    return NextResponse.json({ ok: true, batch });
  }

  return NextResponse.json({ error: "Unknown mystery bag action." }, { status: 400 });
}
