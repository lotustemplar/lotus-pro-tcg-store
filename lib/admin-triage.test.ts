import test from "node:test";
import assert from "node:assert/strict";
import {
  readInventoryQuantity,
  saleOrdersWhere,
  setAbsoluteQuantity,
  toTriageSaleFeed,
  TRIAGE_SALE_STATUSES,
  type InventoryDb,
  type StockProduct,
} from "@/lib/admin-triage";

const TOKEN = "x".repeat(32);

process.env.DATABASE_URL ??= "postgresql://triage:triage@127.0.0.1:5432/triage_test?schema=public";
process.env.EXTENSION_API_TOKEN ??= TOKEN;

type ProductRow = StockProduct & { name: string };

type Receipt = { key: string; productId: string; beforeQty: number; afterQty: number };

function createDb(seed: ProductRow[]) {
  const products = seed.map((product) => ({ ...product }));
  const keys = new Map<string, Receipt>();
  const updates: Array<{ id: string; data: Record<string, unknown> }> = [];

  function snapshot() {
    return {
      products: products.map((product) => ({ ...product })),
      keys: new Map([...keys].map(([key, receipt]) => [key, { ...receipt }])),
    };
  }

  function restore(saved: ReturnType<typeof snapshot>) {
    products.splice(0, products.length, ...saved.products.map((product) => ({ ...product })));
    keys.clear();
    for (const [key, receipt] of saved.keys) keys.set(key, receipt);
  }

  const product = {
    async findUnique({ where }: { where: { id: string } }) {
      return products.find((row) => row.id === where.id) ?? null;
    },
    async findMany({ where, take }: { where: { sourceProductId: number }; take?: number }) {
      const matched = products.filter((row) => row.sourceProductId === where.sourceProductId);
      return matched.slice(0, take ?? matched.length);
    },
    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      const row = products.find((item) => item.id === where.id);
      if (!row) throw new Error(`missing ${where.id}`);
      updates.push({ id: where.id, data: { ...data } });
      Object.assign(row, data);
      return row;
    },
  };

  const quantitySetIdempotency = {
    async findUnique({ where }: { where: { key: string } }) {
      const receipt = keys.get(where.key);
      return receipt ? { ...receipt } : null;
    },
    async create({ data }: { data: Receipt }) {
      if (keys.has(data.key)) {
        const error = new Error("Unique constraint failed on key") as Error & { code: string };
        error.code = "P2002";
        throw error;
      }
      keys.set(data.key, { ...data });
      return data;
    },
  };

  const db = {
    products,
    updates,
    keys,
    product,
    quantitySetIdempotency,
    async $transaction<T>(fn: (tx: InventoryDb) => Promise<T>) {
      const saved = snapshot();
      try {
        return await fn(db as unknown as InventoryDb);
      } catch (error) {
        restore(saved);
        throw error;
      }
    },
  };

  return db;
}

function box(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: "prod_box",
    name: "Modern Horizons 3 Play Booster Box",
    quantity: 4,
    priceCents: 2599,
    sourceProductId: 554433,
    ...overrides,
  };
}

test("triage routes return 401 without a bearer token", async () => {
  process.env.EXTENSION_API_TOKEN = TOKEN;
  const { NextRequest } = await import("next/server");
  const orders = await import("../app/api/admin/orders/route");
  const inventory = await import("../app/api/admin/inventory/route");
  const quantity = await import("../app/api/admin/inventory/quantity/route");

  const missing = [
    orders.GET(new NextRequest("http://localhost/api/admin/orders?since=2026-01-01T00:00:00.000Z")),
    inventory.GET(new NextRequest("http://localhost/api/admin/inventory?externalId=prod_box")),
    quantity.POST(
      new NextRequest("http://localhost/api/admin/inventory/quantity", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          externalId: "prod_box",
          quantity: 1,
          idempotencyKey: "k1",
          mode: "set",
          priceCents: null,
        }),
      }),
    ),
  ];

  for (const pending of missing) {
    const res = await pending;
    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { error: "Unauthorized" });
  }

  const wrong = await orders.GET(
    new NextRequest("http://localhost/api/admin/orders?since=2026-01-01T00:00:00.000Z", {
      headers: { authorization: "Bearer not-the-token" },
    }),
  );
  assert.equal(wrong.status, 401);

  const authedOrders = await orders.GET(
    new NextRequest("http://localhost/api/admin/orders", {
      headers: { authorization: `Bearer ${TOKEN}` },
    }),
  );
  assert.equal(authedOrders.status, 400);

  const priced = await quantity.POST(
    new NextRequest("http://localhost/api/admin/inventory/quantity", {
      method: "POST",
      headers: {
        authorization: `Bearer ${TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        externalId: "prod_box",
        quantity: 1,
        idempotencyKey: "changes-price",
        mode: "set",
        priceCents: 9999,
      }),
    }),
  );
  assert.equal(priced.status, 400);
  assert.match((await priced.json()).error, /priceCents must be null/);
  assert.equal(typeof orders.POST, "function");
});

test("paid sale feed shape uses nulls for sealed card fields", () => {
  const soldAt = new Date("2026-11-01T15:04:05.000Z");
  const feed = toTriageSaleFeed([
    {
      id: "ord_1",
      createdAt: soldAt,
      items: [
        {
          id: "line_1",
          nameSnapshot: "Modern Horizons 3 Play Booster Box",
          quantity: 2,
          productId: "prod_box",
          product: { sourceProductId: 554433 },
        },
        {
          id: "line_2",
          nameSnapshot: "Deck Box",
          quantity: 1,
          productId: "prod_deck_box",
          product: { sourceProductId: null },
        },
      ],
    },
  ]);

  assert.deepEqual(feed, {
    orders: [
      {
        id: "ord_1",
        soldAt: "2026-11-01T15:04:05.000Z",
        lines: [
          {
            id: "line_1",
            name: "Modern Horizons 3 Play Booster Box",
            setCode: null,
            collectorNumber: null,
            finish: null,
            condition: null,
            language: null,
            unit: null,
            quantity: 2,
            externalListingId: "prod_box",
            tcgplayerProductId: 554433,
            productKind: "sealed",
          },
          {
            id: "line_2",
            name: "Deck Box",
            setCode: null,
            collectorNumber: null,
            finish: null,
            condition: null,
            language: null,
            unit: null,
            quantity: 1,
            externalListingId: "prod_deck_box",
            tcgplayerProductId: null,
            productKind: "sealed",
          },
        ],
      },
    ],
  });
  assert.deepEqual(Object.keys(feed.orders[0].lines[0]), [
    "id",
    "name",
    "setCode",
    "collectorNumber",
    "finish",
    "condition",
    "language",
    "unit",
    "quantity",
    "externalListingId",
    "tcgplayerProductId",
    "productKind",
  ]);
});

test("sale query is paid and fulfilled orders since the timestamp", () => {
  const since = new Date("2026-11-01T00:00:00.000Z");
  assert.deepEqual(saleOrdersWhere(since), {
    status: { in: ["paid", "fulfilled"] },
    createdAt: { gte: since },
  });
  assert.deepEqual([...TRIAGE_SALE_STATUSES], ["paid", "fulfilled"]);
  const statuses: readonly string[] = TRIAGE_SALE_STATUSES;
  assert.equal(statuses.includes("pending"), false);
  assert.equal(statuses.includes("cancelled"), false);
});

test("setting quantity never changes price or any other product field", async () => {
  const db = createDb([box()]);
  const result = await setAbsoluteQuantity(db as unknown as InventoryDb, {
    externalId: "prod_box",
    quantity: 9,
    idempotencyKey: "set-9",
    mode: "set",
    priceCents: null,
  });

  assert.deepEqual(result.body, { ok: true, before: 4, after: 9 });
  assert.equal(result.revalidate, true);
  assert.equal(db.products[0].quantity, 9);
  assert.equal(db.products[0].priceCents, 2599);
  assert.equal(db.products[0].name, "Modern Horizons 3 Play Booster Box");
  assert.equal(db.products[0].sourceProductId, 554433);
  assert.equal(db.updates.length, 1);
  assert.deepEqual(db.updates[0].data, { quantity: 9 });

  const rejected = await setAbsoluteQuantity(db as unknown as InventoryDb, {
    externalId: "prod_box",
    quantity: 1,
    idempotencyKey: "nope-price",
    mode: "set",
    priceCents: 100,
  });
  assert.equal(rejected.status, 400);
  assert.equal(rejected.revalidate, false);

  const added = await setAbsoluteQuantity(db as unknown as InventoryDb, {
    externalId: "prod_box",
    quantity: 1,
    idempotencyKey: "nope-add",
    mode: "add",
    priceCents: null,
  });
  assert.equal(added.status, 400);

  const negative = await setAbsoluteQuantity(db as unknown as InventoryDb, {
    externalId: "prod_box",
    quantity: -1,
    idempotencyKey: "nope-negative",
    mode: "set",
    priceCents: null,
  });
  assert.equal(negative.status, 400);
  assert.match((negative.body as { error: string }).error, /non-negative/);

  assert.equal(db.products[0].quantity, 9);
  assert.equal(db.products[0].priceCents, 2599);
  assert.equal(db.updates.length, 1);
  assert.equal(db.keys.size, 1);
});

test("quantity sets are idempotent on idempotencyKey", async () => {
  const db = createDb([box(), box({ id: "prod_other", name: "Other", sourceProductId: 99, quantity: 2, priceCents: 500 })]);
  const first = await setAbsoluteQuantity(db as unknown as InventoryDb, {
    externalId: 554433,
    quantity: 1,
    idempotencyKey: "same-key",
    mode: "set",
    priceCents: null,
  });
  assert.deepEqual(first.body, { ok: true, before: 4, after: 1 });
  assert.equal(db.products[0].quantity, 1);

  const replay = await setAbsoluteQuantity(db as unknown as InventoryDb, {
    externalId: "prod_box",
    quantity: 8,
    idempotencyKey: "same-key",
    mode: "set",
    priceCents: null,
  });
  assert.equal(replay.status, 200);
  assert.deepEqual(replay.body, { ok: true, before: 4, after: 1 });
  assert.equal(db.products[0].quantity, 1);
  assert.equal(db.products[0].priceCents, 2599);
  assert.equal(db.products[1].quantity, 2);
  assert.equal(db.updates.length, 1);

  const other = await setAbsoluteQuantity(db as unknown as InventoryDb, {
    externalId: "prod_other",
    quantity: 0,
    idempotencyKey: "other-key",
    mode: "set",
    priceCents: null,
  });
  assert.deepEqual(other.body, { ok: true, before: 2, after: 0 });
  assert.equal(db.products[1].quantity, 0);
  assert.equal(db.products[1].priceCents, 500);
});

test("a unique-key race does not apply the quantity twice", async () => {
  const db = createDb([box()]);
  const winner = { key: "race", productId: "prod_box", beforeQty: 4, afterQty: 8 };
  let inTransaction = false;
  let outerReads = 0;
  const originalFind = db.quantitySetIdempotency.findUnique.bind(db.quantitySetIdempotency);
  db.quantitySetIdempotency.findUnique = async (args) => {
    if (args.where.key !== "race") return originalFind(args);
    if (inTransaction) return null;
    outerReads += 1;
    return outerReads === 1 ? null : { ...winner };
  };
  db.quantitySetIdempotency.create = async () => {
    const error = new Error("Unique constraint failed") as Error & { code: string };
    error.code = "P2002";
    throw error;
  };
  const originalTransaction = db.$transaction.bind(db);
  db.$transaction = async (fn) => {
    inTransaction = true;
    try {
      return await originalTransaction(fn);
    } finally {
      inTransaction = false;
    }
  };

  const result = await setAbsoluteQuantity(db as unknown as InventoryDb, {
    externalId: "prod_box",
    quantity: 1,
    idempotencyKey: "race",
    mode: "set",
    priceCents: null,
  });

  assert.deepEqual(result.body, { ok: true, before: 4, after: 8 });
  assert.equal(db.products[0].quantity, 4);
  assert.equal(db.products[0].priceCents, 2599);
  assert.equal(db.updates.length, 0);
});

test("inventory read uses the store id or tcgplayer product id", async () => {
  const db = createDb([
    box(),
    box({ id: "12345", name: "Numeric id", sourceProductId: null, quantity: 6, priceCents: 100 }),
  ]);
  const byStoreId = await readInventoryQuantity(db as unknown as InventoryDb, "prod_box");
  assert.deepEqual(byStoreId, { status: 200, body: { quantity: 4 } });

  const byTcgId = await readInventoryQuantity(db as unknown as InventoryDb, "554433");
  assert.deepEqual(byTcgId, { status: 200, body: { quantity: 4 } });

  const numericStoreId = await readInventoryQuantity(db as unknown as InventoryDb, "12345");
  assert.deepEqual(numericStoreId, { status: 200, body: { quantity: 6 } });
  db.products.push(box({ id: "other_tcg", sourceProductId: 12345, quantity: 9, priceCents: 100 }));
  const storeIdWins = await readInventoryQuantity(db as unknown as InventoryDb, "12345");
  assert.deepEqual(storeIdWins, { status: 200, body: { quantity: 6 } });

  const missing = await readInventoryQuantity(db as unknown as InventoryDb, "does-not-exist");
  assert.equal(missing.status, 404);

  db.products.push(box({ id: "prod_dup", sourceProductId: 554433, quantity: 3 }));
  const stillByStoreId = await readInventoryQuantity(db as unknown as InventoryDb, "prod_box");
  assert.deepEqual(stillByStoreId, { status: 200, body: { quantity: 4 } });
  const ambiguous = await readInventoryQuantity(db as unknown as InventoryDb, "554433");
  assert.equal(ambiguous.status, 409);

  const duplicateOnly = await readInventoryQuantity(db as unknown as InventoryDb, "777");
  assert.equal(duplicateOnly.status, 404);
  db.products.push(box({ id: "prod_dup_b", sourceProductId: 777, quantity: 1 }));
  db.products.push(box({ id: "prod_dup_c", sourceProductId: 777, quantity: 1 }));
  const conflict = await readInventoryQuantity(db as unknown as InventoryDb, "777");
  assert.equal(conflict.status, 409);
});
