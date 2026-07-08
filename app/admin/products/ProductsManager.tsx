"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/format";

type TopLevelCategory = {
  id: string;
  name: string;
};

type LeafCategory = {
  id: string;
  name: string;
  topLevelId: string;
  topLevelName: string;
};

type AdminProduct = {
  id: string;
  name: string;
  priceCents: number;
  sourceMarketplace: string | null;
  sourceSetName: string | null;
  sourceProductType: string | null;
  sourcePriceCents: number | null;
  autoUpdatePrice: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  quantity: number;
  featuredOnHome: boolean;
  isActive: boolean;
  categoryId: string;
};

type ProductsManagerProps = {
  topLevels: TopLevelCategory[];
  leafCategories: LeafCategory[];
  initialProducts: AdminProduct[];
};

type Message = {
  type: "error" | "success";
  text: string;
};

type BulkCategoryState = {
  topLevelId: string;
  categoryId: string;
};

function cloneProducts(products: AdminProduct[]) {
  return products.map((product) => ({ ...product }));
}

function formatTimestamp(value: string | null) {
  if (!value) return "Not synced yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not synced yet";
  return date.toLocaleString();
}

export function ProductsManager({
  topLevels,
  leafCategories,
  initialProducts,
}: ProductsManagerProps) {
  const router = useRouter();
  const [products, setProducts] = useState(() => cloneProducts(initialProducts));
  const [savedProducts, setSavedProducts] = useState(() => cloneProducts(initialProducts));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [syncingSourcePrices, setSyncingSourcePrices] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [bulkCategory, setBulkCategory] = useState<BulkCategoryState>(() => {
    const firstTopLevel = topLevels[0];
    const firstCategory = firstTopLevel
      ? leafCategories.find((category) => category.topLevelId === firstTopLevel.id)
      : undefined;
    return {
      topLevelId: firstTopLevel?.id ?? "",
      categoryId: firstCategory?.id ?? "",
    };
  });

  const productsById = new Map(products.map((product) => [product.id, product]));
  const savedById = new Map(savedProducts.map((product) => [product.id, product]));

  const dirtyIds = products
    .filter((product) => {
      const saved = savedById.get(product.id);
      return JSON.stringify(saved) !== JSON.stringify(product);
    })
    .map((product) => product.id);

  const dirtyIdSet = new Set(dirtyIds);
  const savingIdSet = new Set(savingIds);
  const selectedIdSet = new Set(selectedIds);

  const groupedProducts = topLevels.map((topLevel) => ({
    topLevel,
    items: products
      .filter((product) => {
        const category = leafCategories.find((entry) => entry.id === product.categoryId);
        return category?.topLevelId === topLevel.id;
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));

  function setProductField<K extends keyof AdminProduct>(id: string, key: K, value: AdminProduct[K]) {
    setProducts((current) =>
      current.map((product) => (product.id === id ? { ...product, [key]: value } : product))
    );
  }

  function clearMessage() {
    setMessage(null);
  }

  function categoriesForTopLevel(topLevelId: string) {
    return leafCategories.filter((category) => category.topLevelId === topLevelId);
  }

  function topLevelForProduct(product: AdminProduct) {
    return leafCategories.find((category) => category.id === product.categoryId)?.topLevelId ?? "";
  }

  function categoryName(categoryId: string) {
    return leafCategories.find((category) => category.id === categoryId)?.name ?? "Unknown";
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, id]));
      return current.filter((value) => value !== id);
    });
  }

  function toggleSelectedGroup(ids: string[], checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, ...ids]));
      const idSet = new Set(ids);
      return current.filter((value) => !idSet.has(value));
    });
  }

  function toggleSelectedAll(checked: boolean) {
    setSelectedIds(checked ? products.map((product) => product.id) : []);
  }

  async function saveProduct(id: string) {
    const product = productsById.get(id);
    if (!product) return;

    clearMessage();
    setSavingIds((current) => Array.from(new Set([...current, id])));

    const response = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: product.name,
        categoryId: product.categoryId,
        priceCents: product.priceCents,
        autoUpdatePrice: product.autoUpdatePrice,
        quantity: product.quantity,
        featuredOnHome: product.featuredOnHome,
        isActive: product.isActive,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage({
        type: "error",
        text: typeof data.error === "string" ? data.error : `Failed to save ${product.name}.`,
      });
      setSavingIds((current) => current.filter((value) => value !== id));
      return;
    }

    setSavedProducts((current) => current.map((entry) => (entry.id === id ? { ...product } : entry)));
    setSavingIds((current) => current.filter((value) => value !== id));
    setMessage({ type: "success", text: `Saved ${product.name}.` });
  }

  async function saveAllDirty() {
    for (const id of dirtyIds) {
      // eslint-disable-next-line no-await-in-loop
      await saveProduct(id);
    }
  }

  async function deleteOne(id: string) {
    const product = productsById.get(id);
    if (!product) return;
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

    clearMessage();
    setSavingIds((current) => Array.from(new Set([...current, id])));

    const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setMessage({ type: "error", text: `Failed to delete ${product.name}.` });
      setSavingIds((current) => current.filter((value) => value !== id));
      return;
    }

    setProducts((current) => current.filter((entry) => entry.id !== id));
    setSavedProducts((current) => current.filter((entry) => entry.id !== id));
    setSelectedIds((current) => current.filter((value) => value !== id));
    setSavingIds((current) => current.filter((value) => value !== id));
    setMessage({ type: "success", text: `Deleted ${product.name}.` });
  }

  async function runBulkAction(payload: Record<string, unknown>, successMessage: string) {
    if (selectedIds.length === 0) return;

    clearMessage();
    setBulkBusy(true);

    const response = await fetch("/api/admin/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productIds: selectedIds,
        ...payload,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage({
        type: "error",
        text: typeof data.error === "string" ? data.error : "Bulk action failed.",
      });
      setBulkBusy(false);
      return;
    }

    if (payload.action === "delete") {
      const selectedSet = new Set(selectedIds);
      setProducts((current) => current.filter((entry) => !selectedSet.has(entry.id)));
      setSavedProducts((current) => current.filter((entry) => !selectedSet.has(entry.id)));
    } else if (payload.action === "setActive") {
      const value = Boolean(payload.value);
      setProducts((current) =>
        current.map((entry) => (selectedIdSet.has(entry.id) ? { ...entry, isActive: value } : entry))
      );
      setSavedProducts((current) =>
        current.map((entry) => (selectedIdSet.has(entry.id) ? { ...entry, isActive: value } : entry))
      );
    } else if (payload.action === "setFeatured") {
      const value = Boolean(payload.value);
      setProducts((current) =>
        current.map((entry) => (selectedIdSet.has(entry.id) ? { ...entry, featuredOnHome: value } : entry))
      );
      setSavedProducts((current) =>
        current.map((entry) => (selectedIdSet.has(entry.id) ? { ...entry, featuredOnHome: value } : entry))
      );
    } else if (payload.action === "setCategory") {
      const categoryId = String(payload.categoryId);
      setProducts((current) =>
        current.map((entry) => (selectedIdSet.has(entry.id) ? { ...entry, categoryId } : entry))
      );
      setSavedProducts((current) =>
        current.map((entry) => (selectedIdSet.has(entry.id) ? { ...entry, categoryId } : entry))
      );
    } else if (payload.action === "setAutoUpdatePrice") {
      const value = Boolean(payload.value);
      setProducts((current) =>
        current.map((entry) => (selectedIdSet.has(entry.id) ? { ...entry, autoUpdatePrice: value } : entry))
      );
      setSavedProducts((current) =>
        current.map((entry) => (selectedIdSet.has(entry.id) ? { ...entry, autoUpdatePrice: value } : entry))
      );
    }

    setSelectedIds([]);
    setBulkBusy(false);
    setMessage({ type: "success", text: successMessage });
  }

  async function syncNow() {
    if (dirtyIds.length > 0) {
      const shouldContinue = confirm(
        "You have unsaved inline changes. Running a live TCGplayer sync will refresh the panel and discard them. Continue?"
      );
      if (!shouldContinue) return;
    }

    clearMessage();
    setSyncingSourcePrices(true);

    const response = await fetch("/api/admin/products/sync-tcgplayer", { method: "POST" });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage({
        type: "error",
        text: typeof data.error === "string" ? data.error : "Failed to sync TCGplayer prices.",
      });
      setSyncingSourcePrices(false);
      return;
    }

    setMessage({
      type: "success",
      text: `Scanned ${data.scanned ?? 0} tracked product(s). Updated ${data.updatedPrices ?? 0} storefront price(s).`,
    });
    setSyncingSourcePrices(false);
    router.refresh();
  }

  const bulkCategoryOptions = categoriesForTopLevel(bulkCategory.topLevelId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-bg-panel p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-display text-xl font-bold text-white">Catalog Workspace</p>
          <p className="text-sm text-gray-400">
            Grouped by IP, with inline edits for price, quantity, category, visibility, and auto pricing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/admin/products/new"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
          >
            + Add Product
          </a>
          <button
            type="button"
            disabled={syncingSourcePrices}
            onClick={syncNow}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-gray-200 disabled:opacity-50"
          >
            {syncingSourcePrices ? "Syncing..." : "Sync TCGplayer Now"}
          </button>
          <button
            type="button"
            disabled={dirtyIds.length === 0 || savingIds.length > 0}
            onClick={saveAllDirty}
            className="rounded-lg border border-brand-500 px-4 py-2 text-sm font-semibold text-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save All Changes{dirtyIds.length > 0 ? ` (${dirtyIds.length})` : ""}
          </button>
        </div>
      </div>

      {message && (
        <p
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success" ? "bg-emerald-950 text-emerald-300" : "bg-red-950 text-red-300"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="rounded-xl border border-border bg-bg-panel p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-center gap-3">
            <input
              id="select-all-products"
              type="checkbox"
              checked={products.length > 0 && selectedIds.length === products.length}
              onChange={(event) => toggleSelectedAll(event.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="select-all-products" className="text-sm text-gray-300">
              Select all products
            </label>
            <span className="text-sm text-gray-500">{selectedIds.length} selected</span>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={bulkBusy || selectedIds.length === 0}
                onClick={() => runBulkAction({ action: "setActive", value: true }, "Selected products activated.")}
                className="rounded-lg border border-border px-3 py-2 text-sm text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Set Active
              </button>
              <button
                type="button"
                disabled={bulkBusy || selectedIds.length === 0}
                onClick={() =>
                  runBulkAction({ action: "setActive", value: false }, "Selected products deactivated.")
                }
                className="rounded-lg border border-border px-3 py-2 text-sm text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Set Inactive
              </button>
              <button
                type="button"
                disabled={bulkBusy || selectedIds.length === 0}
                onClick={() =>
                  runBulkAction({ action: "setFeatured", value: true }, "Selected products added to Home.")
                }
                className="rounded-lg border border-border px-3 py-2 text-sm text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Feature on Home
              </button>
              <button
                type="button"
                disabled={bulkBusy || selectedIds.length === 0}
                onClick={() =>
                  runBulkAction({ action: "setFeatured", value: false }, "Selected products removed from Home.")
                }
                className="rounded-lg border border-border px-3 py-2 text-sm text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove from Home
              </button>
              <button
                type="button"
                disabled={bulkBusy || selectedIds.length === 0}
                onClick={() =>
                  runBulkAction(
                    { action: "setAutoUpdatePrice", value: true },
                    "Selected products will now auto-update from TCGplayer."
                  )
                }
                className="rounded-lg border border-border px-3 py-2 text-sm text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Enable Auto Price
              </button>
              <button
                type="button"
                disabled={bulkBusy || selectedIds.length === 0}
                onClick={() =>
                  runBulkAction(
                    { action: "setAutoUpdatePrice", value: false },
                    "Selected products are now locked for manual pricing."
                  )
                }
                className="rounded-lg border border-border px-3 py-2 text-sm text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Lock Manual Price
              </button>
              <button
                type="button"
                disabled={bulkBusy || selectedIds.length === 0}
                onClick={async () => {
                  if (!confirm(`Delete ${selectedIds.length} selected product(s)? This cannot be undone.`)) return;
                  await runBulkAction({ action: "delete" }, "Selected products deleted.");
                }}
                className="rounded-lg border border-red-700 px-3 py-2 text-sm text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete Selected
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={bulkCategory.topLevelId}
                onChange={(event) => {
                  const topLevelId = event.target.value;
                  const firstCategory = categoriesForTopLevel(topLevelId)[0];
                  setBulkCategory({
                    topLevelId,
                    categoryId: firstCategory?.id ?? "",
                  });
                }}
                className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
              >
                {topLevels.map((topLevel) => (
                  <option key={topLevel.id} value={topLevel.id}>
                    {topLevel.name}
                  </option>
                ))}
              </select>
              <select
                value={bulkCategory.categoryId}
                onChange={(event) =>
                  setBulkCategory((current) => ({ ...current, categoryId: event.target.value }))
                }
                className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
              >
                {bulkCategoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={bulkBusy || selectedIds.length === 0 || !bulkCategory.categoryId}
                onClick={() =>
                  runBulkAction(
                    { action: "setCategory", categoryId: bulkCategory.categoryId },
                    "Selected products moved to the chosen category."
                  )
                }
                className="rounded-lg border border-border px-3 py-2 text-sm text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Move Selected
              </button>
            </div>
          </div>
        </div>
      </div>

      {groupedProducts.map(({ topLevel, items }) => {
        const groupIds = items.map((product) => product.id);
        const selectedInGroup = groupIds.filter((id) => selectedIdSet.has(id)).length;
        const allInGroupSelected = items.length > 0 && selectedInGroup === items.length;

        return (
          <details
            key={topLevel.id}
            open
            className="overflow-hidden rounded-xl border border-border bg-bg-panel"
          >
            <summary className="cursor-pointer list-none bg-bg-panel px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-bold text-white">{topLevel.name}</p>
                  <p className="text-sm text-gray-400">{items.length} product(s)</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={allInGroupSelected}
                    onChange={(event) => toggleSelectedGroup(groupIds, event.target.checked)}
                    onClick={(event) => event.stopPropagation()}
                    className="h-4 w-4"
                  />
                  Select IP group
                </label>
              </div>
            </summary>

            <div className="overflow-x-auto border-t border-border">
              <table className="w-full min-w-[1260px] text-left text-sm">
                <thead className="bg-bg/70 text-gray-400">
                  <tr>
                    <th className="px-4 py-3"></th>
                    <th className="px-4 py-3">IP</th>
                    <th className="px-4 py-3">Name of Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Auto Price</th>
                    <th className="px-4 py-3">Home</th>
                    <th className="px-4 py-3">Active</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((product) => {
                    const currentTopLevelId = topLevelForProduct(product);
                    const categoryOptions = categoriesForTopLevel(currentTopLevelId);
                    const dirty = dirtyIdSet.has(product.id);
                    const saving = savingIdSet.has(product.id);
                    const isTracked = product.sourceMarketplace === "tcgplayer";

                    return (
                      <tr key={product.id} className="border-t border-border bg-bg-panel/40 align-top">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIdSet.has(product.id)}
                            onChange={(event) => toggleSelected(product.id, event.target.checked)}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          <select
                            value={currentTopLevelId}
                            onChange={(event) => {
                              const nextTopLevelId = event.target.value;
                              const firstCategory = categoriesForTopLevel(nextTopLevelId)[0];
                              if (firstCategory) {
                                setProductField(product.id, "categoryId", firstCategory.id);
                              }
                            }}
                            className="w-44 rounded-md border border-border bg-bg px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
                          >
                            {topLevels.map((entry) => (
                              <option key={entry.id} value={entry.id}>
                                {entry.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            value={product.name}
                            onChange={(event) => setProductField(product.id, "name", event.target.value)}
                            className="w-full min-w-[220px] rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                          />
                          <div className="mt-2 space-y-1 text-xs text-gray-500">
                            <p>{isTracked ? "TCGplayer tracked" : "Manual product"}</p>
                            {(product.sourceSetName || product.sourceProductType) && (
                              <p>
                                {[product.sourceSetName, product.sourceProductType].filter(Boolean).join(" / ")}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={product.categoryId}
                            onChange={(event) => setProductField(product.id, "categoryId", event.target.value)}
                            className="w-52 rounded-md border border-border bg-bg px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
                          >
                            {categoryOptions.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={(product.priceCents / 100).toFixed(2)}
                            onChange={(event) =>
                              setProductField(
                                product.id,
                                "priceCents",
                                Math.max(0, Math.round(Number(event.target.value || "0") * 100))
                              )
                            }
                            className="w-28 rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                          />
                          <div className="mt-2 space-y-1 text-xs text-gray-500">
                            <p>Store: {formatCents(product.priceCents)}</p>
                            {product.sourcePriceCents != null && <p>TCG: {formatCents(product.sourcePriceCents)}</p>}
                            <p>{formatTimestamp(product.lastSyncedAt)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={product.quantity}
                            onChange={(event) =>
                              setProductField(product.id, "quantity", Math.max(0, Number(event.target.value || "0")))
                            }
                            className="w-24 rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <label className="flex items-center gap-2 text-sm text-gray-300">
                            <input
                              type="checkbox"
                              checked={product.autoUpdatePrice}
                              disabled={!isTracked}
                              onChange={(event) =>
                                setProductField(product.id, "autoUpdatePrice", event.target.checked)
                              }
                              className="h-4 w-4 disabled:opacity-50"
                            />
                            {isTracked ? "Live" : "N/A"}
                          </label>
                          <p className="mt-2 text-xs text-gray-500">
                            {isTracked
                              ? product.autoUpdatePrice
                                ? "Reprices every 2 hours"
                                : "Manual price lock"
                              : "No TCGplayer source"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={product.featuredOnHome}
                            onChange={(event) =>
                              setProductField(product.id, "featuredOnHome", event.target.checked)
                            }
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={product.isActive}
                            onChange={(event) => setProductField(product.id, "isActive", event.target.checked)}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={!dirty || saving}
                              onClick={() => saveProduct(product.id)}
                              className="rounded-md border border-brand-500 px-3 py-2 text-xs font-semibold text-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {saving ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => deleteOne(product.id)}
                              className="rounded-md border border-red-700 px-3 py-2 text-xs font-semibold text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                          <div className="mt-2 space-y-1 text-xs text-gray-500">
                            <p>{dirty ? "Unsaved changes" : categoryName(product.categoryId)}</p>
                            {product.lastSyncError && <p className="text-red-300">{product.lastSyncError}</p>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {items.length === 0 && <p className="p-6 text-center text-gray-400">No products in this IP yet.</p>}
            </div>
          </details>
        );
      })}
    </div>
  );
}
