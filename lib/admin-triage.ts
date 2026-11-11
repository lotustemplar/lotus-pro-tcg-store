import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

// Compile-time check that the idempotency delegate matches the migration.
type _QuantitySetDelegate = PrismaClient["quantitySetIdempotency"];

/** Paid sales the triage app should read. Fulfilled orders are included because shipping
 * flips status off "paid"; a since-cursor would otherwise drop a sale that shipped
 * before the next poll. Pending checkouts and cancellations are not sales. */
export const TRIAGE_SALE_STATUSES = ["paid", "fulfilled"] as const;

const productSelect = {
  id: true,
  quantity: true,
  priceCents: true,
  sourceProductId: true,
} as const;

export type StockProduct = {
  id: string;
  quantity: number;
  priceCents: number;
  sourceProductId: number | null;
};

export type QuantitySetReceipt = {
  key: string;
  productId: string;
  beforeQty: number;
  afterQty: number;
};

type ProductSelect = typeof productSelect;

export type InventoryTx = {
  product: {
    findUnique(args: { where: { id: string }; select: ProductSelect }): Promise<StockProduct | null>;
    update(args: { where: { id: string }; data: { quantity: number } }): Promise<unknown>;
  };
  quantitySetIdempotency: {
    findUnique(args: { where: { key: string } }): Promise<QuantitySetReceipt | null>;
    create(args: { data: QuantitySetReceipt }): Promise<unknown>;
  };
};

export type InventoryDb = {
  product: {
    findUnique(args: { where: { id: string }; select: ProductSelect }): Promise<StockProduct | null>;
    findMany(args: {
      where: { sourceProductId: number };
      select: ProductSelect;
      take?: number;
    }): Promise<StockProduct[]>;
  };
  quantitySetIdempotency: {
    findUnique(args: { where: { key: string } }): Promise<QuantitySetReceipt | null>;
  };
  $transaction<T>(fn: (tx: InventoryTx) => Promise<T>): Promise<T>;
};

export type SaleOrderRow = {
  id: string;
  createdAt: Date;
  items: Array<{
    id: string;
    nameSnapshot: string;
    quantity: number;
    productId: string;
    product: { sourceProductId: number | null } | null;
  }>;
};

export type TriageSaleLine = {
  id: string;
  name: string;
  setCode: null;
  collectorNumber: null;
  finish: null;
  condition: null;
  language: null;
  unit: null;
  quantity: number;
  externalListingId: string;
  tcgplayerProductId: number | null;
  productKind: "sealed";
};

const externalIdSchema = z.union([
  z.string().trim().min(1).max(200),
  z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
]).transform((value) => String(value));

const quantitySetSchema = z
  .object({
    externalId: externalIdSchema,
    quantity: z.number().int().min(0).max(2_147_483_647),
    idempotencyKey: z.string().trim().min(1).max(200),
    mode: z.literal("set"),
    // Omitted or null is fine. Any number is rejected so price can never be written.
    priceCents: z.null().optional(),
  })
  .strict();

export function parseSinceParam(raw: string | null): { date: Date } | { error: string } {
  if (!raw || !raw.trim()) return { error: "since must be an ISO timestamp" };
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return { error: "since must be an ISO timestamp" };
  return { date };
}

/** Inclusive lower bound on Order.createdAt. */
export function saleOrdersWhere(since: Date) {
  return {
    status: { in: [...TRIAGE_SALE_STATUSES] },
    createdAt: { gte: since },
  };
}

export function toTriageSaleFeed(orders: SaleOrderRow[]) {
  return {
    orders: orders.map((order) => ({
      id: order.id,
      soldAt: order.createdAt.toISOString(),
      lines: order.items.map((item): TriageSaleLine => ({
        id: item.id,
        name: item.nameSnapshot,
        setCode: null,
        collectorNumber: null,
        finish: null,
        condition: null,
        language: null,
        unit: null,
        quantity: item.quantity,
        externalListingId: item.productId,
        tcgplayerProductId: item.product?.sourceProductId ?? null,
        productKind: "sealed",
      })),
    })),
  };
}

export async function findStockProduct(
  db: InventoryDb,
  externalId: string,
): Promise<{ ok: true; product: StockProduct } | { ok: false; status: 404 | 409; error: string }> {
  const id = externalId.trim();
  if (!id) return { ok: false, status: 404, error: "Unknown product" };

  const byId = await db.product.findUnique({ where: { id }, select: productSelect });
  if (byId) return { ok: true, product: byId };

  if (!/^[0-9]+$/.test(id)) return { ok: false, status: 404, error: "Unknown product" };
  const sourceProductId = Number(id);
  if (!Number.isSafeInteger(sourceProductId) || sourceProductId <= 0) {
    return { ok: false, status: 404, error: "Unknown product" };
  }

  const matches = await db.product.findMany({
    where: { sourceProductId },
    select: productSelect,
    take: 2,
  });
  if (matches.length > 1) {
    return { ok: false, status: 409, error: "More than one product matches that externalId" };
  }
  if (matches.length === 0) return { ok: false, status: 404, error: "Unknown product" };
  return { ok: true, product: matches[0] };
}

export async function readInventoryQuantity(db: InventoryDb, externalId: string) {
  const found = await findStockProduct(db, externalId);
  if (!found.ok) return { status: found.status, body: { error: found.error } };
  return { status: 200 as const, body: { quantity: found.product.quantity } };
}

function quantitySetError(error: z.ZodError): string {
  const path = error.issues[0]?.path[0];
  if (path === "quantity") return "quantity must be a non-negative integer";
  if (path === "mode") return 'mode must be "set"';
  if (path === "priceCents") return "priceCents must be null; this endpoint only sets quantity";
  if (path === "idempotencyKey") return "idempotencyKey is required";
  if (path === "externalId") return "externalId is required";
  return "Invalid inventory quantity request";
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}

export type QuantitySetResult = {
  status: number;
  revalidate: boolean;
  body: { ok: true; before: number; after: number } | { error: string };
};

/**
 * Sets absolute on-hand quantity. The only Product column written is quantity.
 * Replays of idempotencyKey return the original before/after and do not write again.
 */
export async function setAbsoluteQuantity(
  db: InventoryDb,
  body: unknown,
): Promise<QuantitySetResult> {
  const parsed = quantitySetSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, revalidate: false, body: { error: quantitySetError(parsed.error) } };
  }

  const { externalId, quantity, idempotencyKey } = parsed.data;
  const prior = await db.quantitySetIdempotency.findUnique({ where: { key: idempotencyKey } });
  if (prior) {
    return {
      status: 200,
      revalidate: true,
      body: { ok: true, before: prior.beforeQty, after: prior.afterQty },
    };
  }

  const found = await findStockProduct(db, externalId);
  if (!found.ok) {
    return { status: found.status, revalidate: false, body: { error: found.error } };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.quantitySetIdempotency.findUnique({ where: { key: idempotencyKey } });
      if (existing) {
        return { before: existing.beforeQty, after: existing.afterQty };
      }

      const current = await tx.product.findUnique({
        where: { id: found.product.id },
        select: productSelect,
      });
      if (!current) return null;

      const before = current.quantity;
      // Insert the receipt before changing stock. A unique conflict then aborts
      // without an update, so a concurrent replay cannot apply twice.
      await tx.quantitySetIdempotency.create({
        data: {
          key: idempotencyKey,
          productId: current.id,
          beforeQty: before,
          afterQty: quantity,
        },
      });
      const quantityUpdate = { quantity } satisfies { quantity: number };
      await tx.product.update({
        where: { id: current.id },
        data: quantityUpdate,
      });
      return { before, after: quantity };
    });

    if (!result) return { status: 404, revalidate: false, body: { error: "Unknown product" } };
    return { status: 200, revalidate: true, body: { ok: true, before: result.before, after: result.after } };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const existing = await db.quantitySetIdempotency.findUnique({ where: { key: idempotencyKey } });
    if (!existing) throw error;
    return {
      status: 200,
      revalidate: true,
      body: { ok: true, before: existing.beforeQty, after: existing.afterQty },
    };
  }
}
