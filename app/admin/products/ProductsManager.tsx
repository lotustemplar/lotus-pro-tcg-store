"use client";

import Link from "next/link";
import { useState } from "react";
import { EXCLUSIVE_SALE_FEATURED_ORDER, isExclusiveSaleFeaturedOrder } from "@/lib/featured-home";
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
  imageUrl: string | null;
  sourceMarketplace: string | null;
  sourceSetName: string | null;
  sourceProductType: string | null;
  sourcePriceCents: number | null;
  autoUpdatePrice: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  quantity: number;
  featuredOnHome: boolean;
  featuredOrder: number;
  isActive: boolean;
  categoryId: string;
};

type ProductUpdateResponse = {
  ok: boolean;
  product?: AdminProduct;
  error?: string;
  archived?: boolean;
  deleted?: boolean;
  message?: string;
};

type BulkActionResponse = {
  ok: boolean;
  count?: number;
  deletedIds?: string[];
  archivedIds?: string[];
  error?: string;
  message?: string;
};

type TcgplayerSyncResult = {
  id: string;
  name: string;
  sourceSetName: string | null;
  sourceProductType: string | null;
  previousStorePriceCents: number;
  nextStorePriceCents: number;
  previousSourcePriceCents: number | null;
  nextSourcePriceCents: number | null;
  autoUpdatePrice: boolean;
  storefrontUpdated: boolean;
  sourceUpdated: boolean;
  warningMessage: string | null;
  errorMessage: string | null;
  lastSyncedAt: string;
};

type TcgplayerSyncResponse = {
  ok: boolean;
  error?: string;
  failed?: number;
  scanned?: number;
  results?: TcgplayerSyncResult[];
  synced?: number;
  updatedPrices?: number;
  warnings?: number;
};

type SyncReport = {
  failed: number;
  scanned: number;
  results: TcgplayerSyncResult[];
  synced: number;
  updatedPrices: number;
  warnings: number;
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

function isSyncWarning(message: string | null) {
  return (
    typeof message === "string" &&
    (message.startsWith("Warning:") || message.startsWith("Price discrepancy detected"))
  );
}

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

function getSyncDisplayName(result: TcgplayerSyncResult) {
  if (!result.sourceSetName) return result.name;
  if (result.name.toLowerCase().includes(result.sourceSetName.toLowerCase())) {
    return result.name;
  }

  return `${result.sourceSetName} - ${result.name}`;
}

function getPriceChangePercent(previousCents: number, nextCents: number) {
  if (previousCents <= 0 || previousCents === nextCents) return null;
  return ((nextCents - previousCents) / previousCents) * 100;
}

function formatPercentChange(value: number | null) {
  if (value == null) return "0.0%";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function getSyncResultStatus(result: TcgplayerSyncResult) {
  if (result.errorMessage) {
    return {
      className: "border-red-500/30 bg-red-950/40 text-red-200",
      description: result.errorMessage,
      label: "Failed",
    };
  }

  if (result.warningMessage) {
    return {
      className: "border-amber-500/30 bg-amber-950/40 text-amber-200",
      description: result.warningMessage,
      label: "Manual Review",
    };
  }

  if (result.storefrontUpdated) {
    return {
      className: "border-emerald-500/30 bg-emerald-950/40 text-emerald-200",
      description: "Storefront price was updated automatically.",
      label: "Store Updated",
    };
  }

  if (result.sourceUpdated) {
    return {
      className: "border-brand-500/30 bg-brand-950/35 text-brand-200",
      description: result.autoUpdatePrice
        ? "Tracked source changed."
        : "Tracked source changed, but the storefront is still locked to manual pricing.",
      label: "Tracked Only",
    };
  }

  return {
    className: "border-white/10 bg-white/[0.03] text-gray-300",
    description: result.autoUpdatePrice
      ? "No storefront price change was needed."
      : "Manual price lock kept the storefront unchanged.",
    label: "No Change",
  };
}

export function ProductsManager({
  topLevels,
  leafCategories,
  initialProducts,
}: ProductsManagerProps) {
  const [products, setProducts] = useState(() => cloneProducts(initialProducts));
  const [savedProducts, setSavedProducts] = useState(() => cloneProducts(initialProducts));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [syncingSourcePrices, setSyncingSourcePrices] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [syncReport, setSyncReport] = useState<SyncReport | null>(null);
  const [groupCategoryFilters, setGroupCategoryFilters] = useState<Record<string, string>>(() =>
    Object.fromEntries(topLevels.map((topLevel) => [topLevel.id, "all"])),
  );
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
  const syncReviewResults = [...(syncReport?.results ?? [])]
    .filter((result) => result.storefrontUpdated || result.sourceUpdated || result.warningMessage || result.errorMessage)
    .sort((left, right) => {
      const leftPriority = left.errorMessage ? 0 : left.warningMessage ? 1 : left.storefrontUpdated ? 2 : 3;
      const rightPriority = right.errorMessage ? 0 : right.warningMessage ? 1 : right.storefrontUpdated ? 2 : 3;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return getSyncDisplayName(left).localeCompare(getSyncDisplayName(right));
    });

  const groupedProducts = topLevels.map((topLevel) => {
    const allItems = products
      .filter((product) => {
        const category = leafCategories.find((entry) => entry.id === product.categoryId);
        return category?.topLevelId === topLevel.id;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    const categoryFilter = groupCategoryFilters[topLevel.id] ?? "all";
    const items =
      categoryFilter === "all"
        ? allItems
        : allItems.filter((product) => product.categoryId === categoryFilter);

    return {
      topLevel,
      allItems,
      items,
      categoryFilter,
    };
  });

  function setProductField<K extends keyof AdminProduct>(id: string, key: K, value: AdminProduct[K]) {
    setProducts((current) =>
      current.map((product) => (product.id === id ? { ...product, [key]: value } : product))
    );
  }

  function setProductFeaturedOnHome(id: string, checked: boolean) {
    setProducts((current) =>
      current.map((product) =>
        product.id === id
          ? {
              ...product,
              featuredOnHome: checked,
              featuredOrder: checked
                ? isExclusiveSaleFeaturedOrder(product.featuredOrder)
                  ? EXCLUSIVE_SALE_FEATURED_ORDER
                  : Math.max(0, product.featuredOrder)
                : 0,
            }
          : product,
      ),
    );
  }

  function setProductExclusiveSale(id: string, checked: boolean) {
    setProducts((current) =>
      current.map((product) =>
        product.id === id
          ? {
              ...product,
              featuredOnHome: checked ? true : product.featuredOnHome,
              featuredOrder: checked
                ? EXCLUSIVE_SALE_FEATURED_ORDER
                : isExclusiveSaleFeaturedOrder(product.featuredOrder)
                  ? 0
                  : product.featuredOrder,
            }
          : product,
      ),
    );
  }

  function sanitizeCurrencyInput(value: string) {
    const cleaned = value.replace(/[^\d.]/g, "");
    const [wholePart = "", ...fractionParts] = cleaned.split(".");
    const fractionalPart = fractionParts.join("").slice(0, 2);
    return fractionParts.length > 0 ? `${wholePart}.${fractionalPart}` : wholePart;
  }

  function sanitizeQuantityInput(value: string) {
    return value.replace(/[^\d]/g, "");
  }

  function visiblePriceValue(product: AdminProduct) {
    return priceDrafts[product.id] ?? (product.priceCents / 100).toFixed(2);
  }

  function visibleQuantityValue(product: AdminProduct) {
    return quantityDrafts[product.id] ?? String(product.quantity);
  }

  function handlePriceDraftChange(id: string, rawValue: string) {
    const product = productsById.get(id);
    if (product?.sourceMarketplace === "tcgplayer" && product.autoUpdatePrice) {
      setProductField(id, "autoUpdatePrice", false);
    }

    const sanitized = sanitizeCurrencyInput(rawValue);
    setPriceDrafts((current) => ({ ...current, [id]: sanitized }));

    if (sanitized === "") {
      setProductField(id, "priceCents", 0);
      return;
    }

    const parsed = Number(sanitized);
    if (Number.isFinite(parsed)) {
      setProductField(id, "priceCents", Math.max(0, Math.round(parsed * 100)));
    }
  }

  function handlePriceDraftBlur(product: AdminProduct) {
    const draft = priceDrafts[product.id];
    const normalized = sanitizeCurrencyInput(draft ?? "");
    const priceCents =
      normalized === "" ? 0 : Math.max(0, Math.round(Number(normalized || "0") * 100));

    setProductField(product.id, "priceCents", priceCents);
    setPriceDrafts((current) => ({
      ...current,
      [product.id]: (priceCents / 100).toFixed(2),
    }));
  }

  function handleQuantityDraftChange(id: string, rawValue: string) {
    const sanitized = sanitizeQuantityInput(rawValue);
    setQuantityDrafts((current) => ({ ...current, [id]: sanitized }));
    setProductField(id, "quantity", sanitized === "" ? 0 : Math.max(0, Number(sanitized)));
  }

  function handleQuantityDraftBlur(product: AdminProduct) {
    const draft = quantityDrafts[product.id];
    const normalized = sanitizeQuantityInput(draft ?? "");
    const quantity = normalized === "" ? 0 : Math.max(0, Number(normalized));

    setProductField(product.id, "quantity", quantity);
    setQuantityDrafts((current) => ({
      ...current,
      [product.id]: String(quantity),
    }));
  }

  function clearMessage() {
    setMessage(null);
  }

  function applySyncResults(results: TcgplayerSyncResult[]) {
    if (results.length === 0) return;

    const resultsById = new Map(results.map((result) => [result.id, result]));

    const applyOne = (product: AdminProduct) => {
      const result = resultsById.get(product.id);
      if (!result) return product;

      return {
        ...product,
        priceCents: result.nextStorePriceCents,
        sourceSetName: result.sourceSetName,
        sourceProductType: result.sourceProductType,
        sourcePriceCents: result.nextSourcePriceCents,
        lastSyncedAt: result.lastSyncedAt,
        lastSyncError: result.errorMessage ?? result.warningMessage,
      };
    };

    setProducts((current) => current.map(applyOne));
    setSavedProducts((current) => current.map(applyOne));
    setPriceDrafts((current) => {
      const next = { ...current };
      for (const result of results) {
        delete next[result.id];
      }
      return next;
    });
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
        featuredOrder: product.featuredOrder,
        isActive: product.isActive,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as ProductUpdateResponse;

    if (!response.ok) {
      setMessage({
        type: "error",
        text: typeof data.error === "string" ? data.error : `Failed to save ${product.name}.`,
      });
      setSavingIds((current) => current.filter((value) => value !== id));
      return;
    }

    const savedProduct = data.product ?? product;

    setProducts((current) => current.map((entry) => (entry.id === id ? { ...savedProduct } : entry)));
    setSavedProducts((current) => current.map((entry) => (entry.id === id ? { ...savedProduct } : entry)));
    setPriceDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setQuantityDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
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
    if (!confirm(`Remove "${product.name}" from the active catalog? This hides it from the store and admin list.`)) return;

    clearMessage();
    setSavingIds((current) => Array.from(new Set([...current, id])));

    const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    const data = (await response.json().catch(() => ({}))) as ProductUpdateResponse;

    if (!response.ok) {
      setMessage({
        type: "error",
        text: typeof data.error === "string" ? data.error : `Failed to delete ${product.name}.`,
      });
      setSavingIds((current) => current.filter((value) => value !== id));
      return;
    }

    if (data.archived && data.product) {
      setProducts((current) => current.filter((entry) => entry.id !== id));
      setSavedProducts((current) => current.filter((entry) => entry.id !== id));
      setMessage({
        type: "success",
        text: data.message ?? `${product.name} was removed from the active catalog.`,
      });
    } else {
      setProducts((current) => current.filter((entry) => entry.id !== id));
      setSavedProducts((current) => current.filter((entry) => entry.id !== id));
      setMessage({ type: "success", text: data.message ?? `Removed ${product.name} from the active catalog.` });
    }

    setSelectedIds((current) => current.filter((value) => value !== id));
    setSavingIds((current) => current.filter((value) => value !== id));
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

    const data = (await response.json().catch(() => ({}))) as BulkActionResponse;

    if (!response.ok) {
      setMessage({
        type: "error",
        text: typeof data.error === "string" ? data.error : "Bulk action failed.",
      });
      setBulkBusy(false);
      return;
    }

    if (payload.action === "delete") {
      const deletedIdSet = new Set(data.deletedIds ?? selectedIds);
      const archivedIdSet = new Set(data.archivedIds ?? []);
      const removedIdSet = new Set([...deletedIdSet, ...archivedIdSet]);

      setProducts((current) =>
        current
          .filter((entry) => !removedIdSet.has(entry.id)),
      );
      setSavedProducts((current) =>
        current
          .filter((entry) => !removedIdSet.has(entry.id)),
      );
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
        current.map((entry) =>
          selectedIdSet.has(entry.id)
            ? { ...entry, featuredOnHome: value, featuredOrder: value ? entry.featuredOrder : 0 }
            : entry,
        )
      );
      setSavedProducts((current) =>
        current.map((entry) =>
          selectedIdSet.has(entry.id)
            ? { ...entry, featuredOnHome: value, featuredOrder: value ? entry.featuredOrder : 0 }
            : entry,
        )
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
    setMessage({ type: "success", text: data.message ?? successMessage });
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
    setSyncReport(null);

    const response = await fetch("/api/admin/products/sync-tcgplayer", { method: "POST" });
    const data = (await response.json().catch(() => ({}))) as TcgplayerSyncResponse;

    if (!response.ok) {
      setMessage({
        type: "error",
        text: typeof data.error === "string" ? data.error : "Failed to sync TCGplayer prices.",
      });
      setSyncingSourcePrices(false);
      return;
    }

    const nextReport: SyncReport = {
      failed: data.failed ?? 0,
      scanned: data.scanned ?? 0,
      results: data.results ?? [],
      synced: data.synced ?? 0,
      updatedPrices: data.updatedPrices ?? 0,
      warnings: data.warnings ?? 0,
    };

    applySyncResults(nextReport.results);
    setSyncReport(nextReport);
    setMessage({
      type: "success",
      text: `Scanned ${nextReport.scanned} tracked product(s). Updated ${nextReport.updatedPrices} storefront price(s).${nextReport.warnings > 0 ? ` Flagged ${nextReport.warnings} warning(s).` : ""}${nextReport.failed > 0 ? ` Failed ${nextReport.failed} item(s).` : ""} Review the sync report below.`,
    });
    setSyncingSourcePrices(false);
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
          <p className="mt-1 text-xs text-gray-500">
            Use Full Edit on any product to open the full creation-style form for images, SEO, import links, and every advanced setting.
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

      {syncReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/80 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b111d] shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-200/80">
                  TCGplayer Sync Review
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold text-white">
                  Review price changes and flagged products
                </h2>
                <p className="mt-2 text-sm text-gray-400">
                  Anything marked for manual review includes the exact warning that caused the flag.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSyncReport(null)}
                className="rounded-lg border border-white/12 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-brand-400/50 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 border-b border-white/10 px-6 py-5 md:grid-cols-5">
              {[
                { label: "Scanned", value: syncReport.scanned },
                { label: "Synced", value: syncReport.synced },
                { label: "Storefront Updates", value: syncReport.updatedPrices },
                { label: "Warnings", value: syncReport.warnings },
                { label: "Failed", value: syncReport.failed },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="max-h-[58vh] overflow-auto px-6 py-5">
              {syncReviewResults.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-sm text-gray-300">
                  No products required review and no tracked values changed on this run.
                </div>
              ) : (
                <div className="space-y-4">
                  {syncReviewResults.map((result) => {
                    const status = getSyncResultStatus(result);
                    const percentChange = getPriceChangePercent(
                      result.previousStorePriceCents,
                      result.nextStorePriceCents,
                    );
                    const storeDeltaCents = result.nextStorePriceCents - result.previousStorePriceCents;
                    const trackedDeltaCents =
                      result.nextSourcePriceCents != null && result.previousSourcePriceCents != null
                        ? result.nextSourcePriceCents - result.previousSourcePriceCents
                        : null;

                    return (
                      <div
                        key={`${result.id}-${result.lastSyncedAt}`}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${status.className}`}>
                                {status.label}
                              </span>
                              <span className="text-xs text-gray-500">{formatTimestamp(result.lastSyncedAt)}</span>
                            </div>
                            <h3 className="font-display text-2xl font-medium text-white">
                              {getSyncDisplayName(result)}
                            </h3>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
                              {result.sourceSetName && <span>Set: {result.sourceSetName}</span>}
                              {result.sourceProductType && <span>Type: {result.sourceProductType}</span>}
                              {!result.autoUpdatePrice && (
                                <span className="text-amber-300">Manual price lock was enabled</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-300">{status.description}</p>
                          </div>

                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            <Link
                              href={`/admin/products/${result.id}`}
                              className="rounded-lg border border-brand-500 px-4 py-2 text-sm font-semibold text-brand-200 transition hover:bg-brand-500/10 hover:text-white"
                            >
                              Edit Product
                            </Link>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 lg:grid-cols-3">
                          <div className="rounded-2xl border border-white/8 bg-[#0a0f18] px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Storefront Price</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                              <span className="text-gray-400">Was:</span>
                              <span className="font-semibold text-white">{formatCents(result.previousStorePriceCents)}</span>
                              <span className="text-gray-500">|</span>
                              <span className="text-gray-400">Updated:</span>
                              <span className="font-semibold text-white">{formatCents(result.nextStorePriceCents)}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                              <span className={storeDeltaCents > 0 ? "text-emerald-300" : storeDeltaCents < 0 ? "text-red-300" : "text-gray-400"}>
                                {storeDeltaCents > 0 ? "Increase" : storeDeltaCents < 0 ? "Decrease" : "No change"}:
                              </span>
                              <span className={storeDeltaCents > 0 ? "text-emerald-300" : storeDeltaCents < 0 ? "text-red-300" : "text-gray-400"}>
                                {storeDeltaCents === 0 ? formatCents(0) : `${storeDeltaCents > 0 ? "+" : "-"}${formatCents(Math.abs(storeDeltaCents))}`}
                              </span>
                              <span className="text-gray-500">|</span>
                              <span className={storeDeltaCents > 0 ? "text-emerald-300" : storeDeltaCents < 0 ? "text-red-300" : "text-gray-400"}>
                                {formatPercentChange(percentChange)}
                              </span>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white/8 bg-[#0a0f18] px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Tracked TCGplayer Price</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                              <span className="text-gray-400">Was:</span>
                              <span className="font-semibold text-white">
                                {result.previousSourcePriceCents != null ? formatCents(result.previousSourcePriceCents) : "N/A"}
                              </span>
                              <span className="text-gray-500">|</span>
                              <span className="text-gray-400">Updated:</span>
                              <span className="font-semibold text-white">
                                {result.nextSourcePriceCents != null ? formatCents(result.nextSourcePriceCents) : "N/A"}
                              </span>
                            </div>
                            {trackedDeltaCents != null && (
                              <div className="mt-2 text-sm">
                                <span className={trackedDeltaCents > 0 ? "text-emerald-300" : trackedDeltaCents < 0 ? "text-red-300" : "text-gray-400"}>
                                  {trackedDeltaCents > 0 ? "Tracked increase" : trackedDeltaCents < 0 ? "Tracked decrease" : "No tracked change"}:{" "}
                                  {trackedDeltaCents === 0 ? formatCents(0) : `${trackedDeltaCents > 0 ? "+" : "-"}${formatCents(Math.abs(trackedDeltaCents))}`}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="rounded-2xl border border-white/8 bg-[#0a0f18] px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Review Notes</p>
                            <p className="mt-2 text-sm leading-6 text-gray-300">
                              {result.errorMessage ??
                                result.warningMessage ??
                                (result.autoUpdatePrice
                                  ? "The storefront was allowed to follow the tracked TCGplayer price."
                                  : "The tracked price refreshed, but the storefront stayed unchanged because manual pricing is locked.")}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
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
              Select all visible products
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

      {groupedProducts.map(({ topLevel, allItems, items, categoryFilter }) => {
        const groupIds = items.map((product) => product.id);
        const selectedInGroup = groupIds.filter((id) => selectedIdSet.has(id)).length;
        const allInGroupSelected = items.length > 0 && selectedInGroup === items.length;
        const groupCategoryOptions = categoriesForTopLevel(topLevel.id);

        return (
          <details
            key={topLevel.id}
            open
            className="rounded-xl border border-border bg-bg-panel"
          >
            <summary className="cursor-pointer list-none bg-bg-panel px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-bold text-white">{topLevel.name}</p>
                  <p className="text-sm text-gray-400">
                    {items.length}
                    {items.length !== allItems.length ? ` of ${allItems.length}` : ""} product(s)
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div
                    className="flex items-center gap-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <label
                      htmlFor={`group-filter-${topLevel.id}`}
                      className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400"
                    >
                      Category View
                    </label>
                    <select
                      id={`group-filter-${topLevel.id}`}
                      value={categoryFilter}
                      onChange={(event) =>
                        setGroupCategoryFilters((current) => ({
                          ...current,
                          [topLevel.id]: event.target.value,
                        }))
                      }
                      className="min-w-[190px] rounded-md border border-border bg-bg px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
                    >
                      <option value="all">All products</option>
                      {groupCategoryOptions.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label
                    className="flex items-center gap-2 text-sm text-gray-300"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={allInGroupSelected}
                      onChange={(event) => toggleSelectedGroup(groupIds, event.target.checked)}
                      className="h-4 w-4"
                    />
                    Select visible
                  </label>
                </div>
              </div>
            </summary>

            <div className="admin-scrollbar max-w-full overflow-x-scroll overscroll-x-contain border-t border-border pb-4 [scrollbar-gutter:stable]">
              <table className="w-full min-w-[1440px] table-fixed text-left text-sm">
                <thead className="bg-bg/70 text-gray-400">
                  <tr>
                    <th className="w-12 px-2 py-3 text-center">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="w-24 px-3 py-3">Preview</th>
                    <th className="px-4 py-3">Set</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Auto Price</th>
                    <th className="px-4 py-3">Visibility</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((product) => {
                    const currentTopLevelId = topLevelForProduct(product);
                    const dirty = dirtyIdSet.has(product.id);
                    const saving = savingIdSet.has(product.id);
                    const isTracked = product.sourceMarketplace === "tcgplayer";
                    const isExclusiveSale = isExclusiveSaleFeaturedOrder(product.featuredOrder);

                    return (
                      <tr key={product.id} className="border-t border-border bg-bg-panel/40 align-top">
                        <td className="px-2 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIdSet.has(product.id)}
                            onChange={(event) => toggleSelected(product.id, event.target.checked)}
                            className="h-4 w-4"
                            aria-label={`Select ${product.name}`}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-bg shadow-[0_10px_24px_rgba(2,6,16,0.24)]">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="px-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                                No Image
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="min-w-[220px] max-w-[240px] space-y-1.5">
                            <p className="text-sm font-medium leading-5 text-white">
                              {product.sourceSetName || "Manual / No set"}
                            </p>
                            <div className="space-y-0.5 text-xs text-gray-500">
                              <p>{product.sourceProductType || "Type unavailable"}</p>
                              <p>{isTracked ? topLevel.name : "Manual product"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            value={product.name}
                            onChange={(event) => setProductField(product.id, "name", event.target.value)}
                            className="w-full min-w-[260px] rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                          />
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                            <p>{isTracked ? "TCGplayer tracked" : "Manual product"}</p>
                            <p>
                              <Link
                                href={`/admin/products/${product.id}`}
                                className="font-semibold text-brand-300 hover:text-brand-200 hover:underline"
                              >
                                Open full editor
                              </Link>
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={product.categoryId}
                            onChange={(event) => setProductField(product.id, "categoryId", event.target.value)}
                            className="w-44 rounded-md border border-border bg-bg px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
                          >
                            {topLevels.map((entry) => {
                              const categoryOptions = categoriesForTopLevel(entry.id);
                              return (
                                <optgroup key={entry.id} label={entry.name}>
                                  {categoryOptions.map((category) => (
                                    <option key={category.id} value={category.id}>
                                      {category.name}
                                    </option>
                                  ))}
                                </optgroup>
                              );
                            })}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={visiblePriceValue(product)}
                            onChange={(event) => handlePriceDraftChange(product.id, event.target.value)}
                            onBlur={() => handlePriceDraftBlur(product)}
                            className="w-24 rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                          />
                          <div className="mt-2 space-y-1 text-xs text-gray-500">
                            <p>Store: {formatCents(product.priceCents)}</p>
                            {product.sourcePriceCents != null && <p>TCG: {formatCents(product.sourcePriceCents)}</p>}
                            {isTracked && product.autoUpdatePrice && (
                              <p className="text-amber-300">Typing a new price here switches this item to manual pricing.</p>
                            )}
                            <p>{formatTimestamp(product.lastSyncedAt)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={visibleQuantityValue(product)}
                            onChange={(event) => handleQuantityDraftChange(product.id, event.target.value)}
                            onBlur={() => handleQuantityDraftBlur(product)}
                            className="w-20 rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
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
                                ? "Reprices every 12 hours"
                                : "Manual price lock"
                              : "No TCGplayer source"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="min-w-[132px] space-y-2">
                            <label className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-bg/60 px-2 py-1.5 text-xs text-gray-300">
                              <span>Home</span>
                              <input
                                type="checkbox"
                                checked={product.featuredOnHome}
                                onChange={(event) => setProductFeaturedOnHome(product.id, event.target.checked)}
                                className="h-4 w-4"
                              />
                            </label>
                            <label className="flex items-center justify-between gap-2 rounded-md border border-amber-300/18 bg-[linear-gradient(180deg,rgba(52,24,12,0.52),rgba(16,12,22,0.84))] px-2 py-1.5 text-xs text-amber-100">
                              <span>Exclusive</span>
                              <input
                                type="checkbox"
                                checked={isExclusiveSale}
                                onChange={(event) => setProductExclusiveSale(product.id, event.target.checked)}
                                className="h-4 w-4"
                              />
                            </label>
                            <label className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-bg/60 px-2 py-1.5 text-xs text-gray-300">
                              <span>Active</span>
                              <input
                                type="checkbox"
                                checked={product.isActive}
                                onChange={(event) => setProductField(product.id, "isActive", event.target.checked)}
                                className="h-4 w-4"
                              />
                            </label>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="rounded-md border border-white/12 px-3 py-2 text-xs font-semibold text-gray-200 transition hover:border-brand-400/50 hover:text-white"
                            >
                              Full Edit
                            </Link>
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
                          <div className="mt-2 space-y-1 text-right text-xs text-gray-500">
                            <p>{dirty ? "Unsaved changes" : categoryName(product.categoryId)}</p>
                            {isExclusiveSale && <p className="text-amber-300">Pinned as the static hero sale card.</p>}
                            {isExclusiveSale && product.quantity <= 0 && (
                              <p className="text-red-300">
                                Hidden on the live homepage until this product has stock above 0.
                              </p>
                            )}
                            {product.lastSyncError && (
                              <p className={isSyncWarning(product.lastSyncError) ? "text-amber-300" : "text-red-300"}>
                                {product.lastSyncError}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {items.length === 0 && (
                <p className="p-6 text-center text-gray-400">
                  {allItems.length === 0
                    ? "No products in this IP yet."
                    : "No products match the selected category filter."}
                </p>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
