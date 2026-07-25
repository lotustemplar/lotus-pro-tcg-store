"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/format";

type ProductOption = {
  id: string;
  name: string;
  sourceSetName: string | null;
  sku: string | null;
  priceCents: number;
  quantity: number;
  isActive: boolean;
};

type LineDraft = {
  id: string;
  productId: string;
  quantity: number;
  priceInput: string;
};

type FormValues = {
  email: string;
  customerName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  status: "pending" | "paid" | "fulfilled" | "cancelled";
  shippingInput: string;
  reduceInventory: boolean;
};

const DEFAULT_VALUES: FormValues = {
  email: "",
  customerName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
  status: "paid",
  shippingInput: "5.99",
  reduceInventory: true,
};

function createLineDraft(productId = "", priceInput = ""): LineDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId,
    quantity: 1,
    priceInput,
  };
}

function parseCurrencyToCents(value: string) {
  const normalized = value.trim().replace(/[$,\s]/g, "");
  if (!normalized) return null;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return Math.round(parsed * 100);
}

export function ManualOrderForm({ products }: { products: ProductOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<FormValues>(DEFAULT_VALUES);
  const [lines, setLines] = useState<LineDraft[]>([createLineDraft()]);
  const [error, setError] = useState<string | null>(null);

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const shippingCents = parseCurrencyToCents(values.shippingInput) ?? 0;

  const subtotalCents = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const linePriceCents = parseCurrencyToCents(line.priceInput);
        if (linePriceCents == null) return sum;
        return sum + line.quantity * linePriceCents;
      }, 0),
    [lines],
  );

  const totalCents = subtotalCents + shippingCents;

  function updateValue<K extends keyof FormValues>(key: K, nextValue: FormValues[K]) {
    setValues((current) => ({
      ...current,
      [key]: nextValue,
    }));
  }

  function updateLine(id: string, updates: Partial<LineDraft>) {
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...updates } : line)),
    );
  }

  function addLine() {
    setLines((current) => [...current, createLineDraft()]);
  }

  function removeLine(id: string) {
    setLines((current) => (current.length > 1 ? current.filter((line) => line.id !== id) : current));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const preparedItems = lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      priceCents: parseCurrencyToCents(line.priceInput),
    }));

    if (preparedItems.some((item) => !item.productId)) {
      setError("Choose a product for every order line.");
      return;
    }

    if (preparedItems.some((item) => item.priceCents == null)) {
      setError("Each order line needs a valid unit price.");
      return;
    }

    const parsedShippingCents = parseCurrencyToCents(values.shippingInput);
    if (parsedShippingCents == null) {
      setError("Enter a valid shipping amount.");
      return;
    }

    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/admin/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...values,
            shippingCents: parsedShippingCents,
            items: preparedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceCents: item.priceCents,
            })),
          }),
        });

        const payload = (await response.json().catch(() => null)) as { id?: string; error?: string } | null;

        if (!response.ok || !payload?.id) {
          setError(payload?.error || "Failed to create the order.");
          return;
        }

        router.push(`/admin/orders/${payload.id}`);
        router.refresh();
      })();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-border bg-bg-panel p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
              Customer
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-gray-200">Email</span>
                <input
                  type="email"
                  required
                  value={values.email}
                  onChange={(event) => updateValue("email", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 text-white outline-none transition focus:border-brand-400/60"
                  placeholder="customer@example.com"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">Customer Name</span>
                <input
                  value={values.customerName}
                  onChange={(event) => updateValue("customerName", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 text-white outline-none transition focus:border-brand-400/60"
                  placeholder="Collector name"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">Phone</span>
                <input
                  value={values.phone}
                  onChange={(event) => updateValue("phone", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 text-white outline-none transition focus:border-brand-400/60"
                  placeholder="Optional"
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-bg-panel p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
              Shipping Address
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-gray-200">Address Line 1</span>
                <input
                  value={values.addressLine1}
                  onChange={(event) => updateValue("addressLine1", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 text-white outline-none transition focus:border-brand-400/60"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-gray-200">Address Line 2</span>
                <input
                  value={values.addressLine2}
                  onChange={(event) => updateValue("addressLine2", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 text-white outline-none transition focus:border-brand-400/60"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">City</span>
                <input
                  value={values.city}
                  onChange={(event) => updateValue("city", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 text-white outline-none transition focus:border-brand-400/60"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">State / Region</span>
                <input
                  value={values.state}
                  onChange={(event) => updateValue("state", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 text-white outline-none transition focus:border-brand-400/60"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">Postal Code</span>
                <input
                  value={values.postalCode}
                  onChange={(event) => updateValue("postalCode", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 text-white outline-none transition focus:border-brand-400/60"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">Country</span>
                <input
                  value={values.country}
                  onChange={(event) => updateValue("country", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 text-white outline-none transition focus:border-brand-400/60"
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-bg-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
                Order Items
              </h2>
              <button
                type="button"
                onClick={addLine}
                className="rounded-lg border border-brand-500/40 px-3 py-2 text-sm font-semibold text-brand-200 transition hover:border-brand-400/70 hover:text-white"
              >
                Add item
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {lines.map((line, index) => {
                const selectedProduct = line.productId ? productMap.get(line.productId) ?? null : null;

                return (
                  <div
                    key={line.id}
                    className="rounded-2xl border border-white/8 bg-bg px-4 py-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">Line {index + 1}</p>
                      {lines.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="text-sm font-semibold text-red-300 transition hover:text-red-200"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.8fr)_120px_140px]">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-gray-200">Product</span>
                        <select
                          value={line.productId}
                          onChange={(event) => {
                            const product = productMap.get(event.target.value);
                            updateLine(line.id, {
                              productId: event.target.value,
                              priceInput: product ? (product.priceCents / 100).toFixed(2) : line.priceInput,
                            });
                          }}
                          className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 text-white outline-none transition focus:border-brand-400/60"
                        >
                          <option value="">Choose a product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.sourceSetName ? `${product.sourceSetName} - ` : ""}
                              {product.name}
                              {product.sku ? ` (${product.sku})` : ""}
                            </option>
                          ))}
                        </select>
                        {selectedProduct ? (
                          <p className="text-xs text-gray-400">
                            Stock: {selectedProduct.quantity} | Store price: {formatCents(selectedProduct.priceCents)}
                            {!selectedProduct.isActive ? " | Inactive product" : ""}
                          </p>
                        ) : null}
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-medium text-gray-200">Qty</span>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={line.quantity}
                          onChange={(event) =>
                            updateLine(line.id, {
                              quantity: Math.max(1, Number.parseInt(event.target.value || "1", 10) || 1),
                            })
                          }
                          className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 text-white outline-none transition focus:border-brand-400/60"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-medium text-gray-200">Unit Price</span>
                        <input
                          value={line.priceInput}
                          onChange={(event) => updateLine(line.id, { priceInput: event.target.value })}
                          className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 text-white outline-none transition focus:border-brand-400/60"
                          placeholder="0.00"
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-border bg-bg-panel p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
              Fulfillment
            </h2>
            <div className="mt-4 space-y-4">
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">Order Status</span>
                <select
                  value={values.status}
                  onChange={(event) => updateValue("status", event.target.value as FormValues["status"])}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 text-white outline-none transition focus:border-brand-400/60"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="fulfilled">Fulfilled</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">Shipping Charge</span>
                <input
                  value={values.shippingInput}
                  onChange={(event) => updateValue("shippingInput", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-3 text-white outline-none transition focus:border-brand-400/60"
                  placeholder="5.99"
                />
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-white/8 bg-bg px-4 py-3">
                <input
                  type="checkbox"
                  checked={values.reduceInventory}
                  onChange={(event) => updateValue("reduceInventory", event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-bg text-brand-400"
                />
                <span className="text-sm text-gray-200">
                  Reduce inventory immediately when this manual order is created.
                </span>
              </label>

              {values.status === "cancelled" ? (
                <p className="text-xs text-amber-300">
                  Cancelled orders do not deduct inventory, even if the checkbox is on.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-bg-panel p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
              Totals
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-gray-400">Subtotal</dt>
                <dd className="font-medium text-white">{formatCents(subtotalCents)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-400">Shipping</dt>
                <dd className="font-medium text-white">{formatCents(shippingCents)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <dt className="text-gray-200">Order Total</dt>
                <dd className="text-lg font-semibold text-brand-200">{formatCents(totalCents)}</dd>
              </div>
            </dl>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="mt-5 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-300"
            >
              {isPending ? "Creating Order..." : "Create Manual Order"}
            </button>
          </div>
        </aside>
      </div>
    </form>
  );
}
