"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents, slugify } from "@/lib/format";
import type { CategoryOption } from "@/lib/admin";

type ImageRow = { url: string; altText: string };

type TcgplayerImportResponse = {
  autoUpdatePrice: boolean;
  categoryId: string;
  description: string;
  images: ImageRow[];
  name: string;
  priceCents: number;
  seoDescription: string;
  seoTitle: string;
  slug: string;
  sourceImageUrl: string;
  sourceMarketplace: "tcgplayer";
  sourcePriceCents: number;
  sourceProductId: number;
  sourceProductLine: string;
  sourceProductType: string;
  sourceSetName: string;
  sourceUrl: string;
};

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  sourceMarketplace: string | null;
  sourceUrl: string | null;
  sourceProductId: number | null;
  sourceProductLine: string | null;
  sourceSetName: string | null;
  sourceProductType: string | null;
  sourcePriceCents: number | null;
  sourceImageUrl: string | null;
  autoUpdatePrice: boolean;
  compareAtCents: number | null;
  sku: string | null;
  quantity: number;
  categoryId: string;
  featuredOnHome: boolean;
  featuredOrder: number;
  isActive: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  images: ImageRow[];
};

function normalizeErrorMessage(error: unknown) {
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  if (error && typeof error === "object") {
    const fieldErrors = "fieldErrors" in error ? (error as { fieldErrors?: Record<string, string[]> }).fieldErrors : undefined;
    const formErrors = "formErrors" in error ? (error as { formErrors?: string[] }).formErrors : undefined;

    const firstFieldError = fieldErrors
      ? Object.values(fieldErrors).flat().find((message) => typeof message === "string" && message.trim().length > 0)
      : undefined;

    if (firstFieldError) {
      return firstFieldError;
    }

    const firstFormError = formErrors?.find((message) => typeof message === "string" && message.trim().length > 0);
    if (firstFormError) {
      return firstFormError;
    }
  }

  return "Failed to save product.";
}

export function ProductForm({
  categories,
  initial,
}: {
  categories: CategoryOption[];
  initial?: ProductFormValues;
}) {
  const router = useRouter();
  const hasCategories = categories.length > 0;
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const topLevels = Array.from(
    new Map(categories.map((category) => [category.topLevelId, category.topLevelName])).entries()
  ).map(([id, name]) => ({ id, name }));
  const initialCategory = initial?.categoryId ? categoryById.get(initial.categoryId) : undefined;
  const defaultTopLevelId = initialCategory?.topLevelId ?? topLevels[0]?.id ?? "";

  function categoriesForTopLevel(topLevelId: string) {
    const childCategories = categories.filter(
      (category) => category.topLevelId === topLevelId && category.id !== topLevelId
    );

    if (childCategories.length > 0) {
      return childCategories;
    }

    return categories.filter((category) => category.id === topLevelId);
  }

  const normalizedInitialCategoryId = initial?.categoryId
    ? (() => {
        const matchingCategories = categoriesForTopLevel(initialCategory?.topLevelId ?? "");
        const currentCategory = matchingCategories.find((category) => category.id === initial.categoryId);
        return currentCategory?.id ?? matchingCategories[0]?.id ?? initial.categoryId;
      })()
    : undefined;
  const defaultCategoryId = normalizedInitialCategoryId ?? categoriesForTopLevel(defaultTopLevelId)[0]?.id ?? "";
  const [values, setValues] = useState<ProductFormValues>(
    initial
      ? { ...initial, categoryId: normalizedInitialCategoryId ?? initial.categoryId }
      : {
          name: "",
          slug: "",
          description: "",
          priceCents: 0,
          sourceMarketplace: null,
          sourceUrl: null,
          sourceProductId: null,
          sourceProductLine: null,
          sourceSetName: null,
          sourceProductType: null,
          sourcePriceCents: null,
          sourceImageUrl: null,
          autoUpdatePrice: false,
          compareAtCents: null,
          sku: "",
          quantity: 0,
          categoryId: defaultCategoryId,
          featuredOnHome: false,
          featuredOrder: 0,
          isActive: true,
          seoTitle: "",
          seoDescription: "",
          seoKeywords: "",
          images: [{ url: "", altText: "" }],
        }
  );
  const [selectedTopLevelId, setSelectedTopLevelId] = useState(defaultTopLevelId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [importUrl, setImportUrl] = useState(initial?.sourceUrl ?? "");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importMessage, setImportMessage] = useState("");

  function update<K extends keyof ProductFormValues>(key: K, val: ProductFormValues[K]) {
    setValues((current) => ({ ...current, [key]: val }));
  }

  function syncCategory(categoryId: string) {
    const category = categoryById.get(categoryId);
    if (!category) {
      update("categoryId", categoryId);
      return;
    }

    setSelectedTopLevelId(category.topLevelId);
    update("categoryId", category.id);
  }

  function syncTopLevel(topLevelId: string) {
    setSelectedTopLevelId(topLevelId);

    const matchingCategories = categoriesForTopLevel(topLevelId);
    if (matchingCategories.length === 0) {
      update("categoryId", "");
      return;
    }

    const currentCategory = matchingCategories.find((category) => category.id === values.categoryId);
    update("categoryId", currentCategory?.id ?? matchingCategories[0].id);
  }

  useEffect(() => {
    const matchingCategories = categoriesForTopLevel(selectedTopLevelId);

    if (matchingCategories.length === 0) {
      if (values.categoryId !== "") {
        update("categoryId", "");
      }
      return;
    }

    const currentCategory = matchingCategories.find((category) => category.id === values.categoryId);
    if (!currentCategory) {
      update("categoryId", matchingCategories[0].id);
    }
  }, [selectedTopLevelId, values.categoryId]);

  function updateImage(idx: number, key: keyof ImageRow, val: string) {
    setValues((current) => {
      const images = [...current.images];
      images[idx] = { ...images[idx], [key]: val };
      return { ...current, images };
    });
  }

  async function importFromTcgplayer() {
    if (!importUrl.trim()) return;

    setImporting(true);
    setImportError("");
    setImportMessage("");

    const response = await fetch("/api/admin/products/import-tcgplayer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: importUrl.trim() }),
    });

    const data = (await response.json().catch(() => ({}))) as Partial<TcgplayerImportResponse> & {
      error?: string;
    };

    if (!response.ok) {
      setImportError(typeof data.error === "string" ? data.error : "Failed to import from TCGplayer.");
      setImporting(false);
      return;
    }

    setValues((current) => {
      const shouldReplaceImages =
        current.images.length === 0 ||
        current.images.every((image) => image.url.trim().length === 0) ||
        (!!current.sourceImageUrl && current.images[0]?.url === current.sourceImageUrl);

      return {
        ...current,
        name: data.name ?? current.name,
        slug: slugTouched ? current.slug : data.slug ?? current.slug,
        description: data.description ?? current.description,
        priceCents: data.priceCents ?? current.priceCents,
        sourceMarketplace: data.sourceMarketplace ?? current.sourceMarketplace,
        sourceUrl: data.sourceUrl ?? current.sourceUrl,
        sourceProductId: data.sourceProductId ?? current.sourceProductId,
        sourceProductLine: data.sourceProductLine ?? current.sourceProductLine,
        sourceSetName: data.sourceSetName ?? current.sourceSetName,
        sourceProductType: data.sourceProductType ?? current.sourceProductType,
        sourcePriceCents: data.sourcePriceCents ?? current.sourcePriceCents,
        sourceImageUrl: data.sourceImageUrl ?? current.sourceImageUrl,
        autoUpdatePrice: data.autoUpdatePrice ?? current.autoUpdatePrice,
        categoryId: data.categoryId ?? current.categoryId,
        seoTitle: data.seoTitle ?? current.seoTitle,
        seoDescription: data.seoDescription ?? current.seoDescription,
        images: shouldReplaceImages ? data.images ?? current.images : current.images,
      };
    });

    if (data.categoryId) {
      const importedCategory = categoryById.get(data.categoryId);
      if (importedCategory) {
        setSelectedTopLevelId(importedCategory.topLevelId);
      }
    }

    setImportMessage("TCGplayer product imported. Review anything you want, then save.");
    setImporting(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (!values.categoryId) {
      setError("Choose a category before saving this product.");
      setSaving(false);
      return;
    }

    const payload = {
      ...values,
      images: values.images.filter((img) => img.url.trim().length > 0),
    };

    const res = await fetch(
      initial?.id ? `/api/admin/products/${initial.id}` : "/api/admin/products",
      {
        method: initial?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (res.ok) {
      router.push("/admin/products");
      router.refresh();
      return;
    }

    const data = await res.json().catch(() => ({}));
    setError(normalizeErrorMessage(data.error));
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="max-w-4xl space-y-8">
      {error && <p className="rounded-md bg-red-950 px-4 py-2 text-sm text-red-300">{error}</p>}

      <section className="space-y-4 rounded-xl border border-border bg-bg-panel p-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Import from TCGplayer</h2>
            <p className="text-sm text-gray-400">
              Paste a TCGplayer product link to pull the product name, set, type, image, and live price.
            </p>
          </div>
          {importMessage && <p className="text-sm text-emerald-300">{importMessage}</p>}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row">
          <input
            value={importUrl}
            onChange={(event) => setImportUrl(event.target.value)}
            placeholder="https://www.tcgplayer.com/product/..."
            className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
          />
          <button
            type="button"
            onClick={importFromTcgplayer}
            disabled={importing || importUrl.trim().length === 0}
            className="rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
          >
            {importing ? "Importing..." : "Send"}
          </button>
        </div>

        {importError && <p className="rounded-md bg-red-950 px-4 py-2 text-sm text-red-300">{importError}</p>}

        {values.sourceMarketplace === "tcgplayer" && (
          <div className="grid gap-4 rounded-lg border border-border bg-bg/40 p-4 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.25em] text-brand-300">Live Source</p>
              <p className="text-sm text-gray-200">TCGplayer</p>
              <p className="text-sm text-gray-400">{values.sourceSetName || "Set unavailable"}</p>
              <p className="text-sm text-gray-400">{values.sourceProductType || "Type unavailable"}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.25em] text-brand-300">Tracked Price</p>
              <p className="text-lg font-semibold text-white">
                {values.sourcePriceCents != null ? formatCents(values.sourcePriceCents) : "Unavailable"}
              </p>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={values.autoUpdatePrice}
                  onChange={(event) => update("autoUpdatePrice", event.target.checked)}
                  className="h-4 w-4"
                />
                Auto-update storefront price every 2 hours
              </label>
              <p className="text-xs text-gray-500">
                Turn this off any time you want to manually override the live TCGplayer price.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-bg-panel p-5">
        <h2 className="font-display text-lg font-bold text-white">Basics</h2>
        <div>
          <label className="mb-1 block text-sm text-gray-400">Product Name</label>
          <input
            required
            value={values.name}
            onChange={(e) => {
              update("name", e.target.value);
              if (!slugTouched) update("slug", slugify(e.target.value));
            }}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-400">URL Slug</label>
          <input
            required
            value={values.slug}
            onChange={(e) => {
              setSlugTouched(true);
              update("slug", slugify(e.target.value));
            }}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
          />
          <p className="mt-1 text-xs text-gray-500">/product/{values.slug || "your-product-slug"}</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-gray-400">IP</label>
            <select
              value={selectedTopLevelId}
              onChange={(e) => syncTopLevel(e.target.value)}
              disabled={!hasCategories}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
            >
              {topLevels.map((topLevel) => (
                <option key={topLevel.id} value={topLevel.id}>
                  {topLevel.name}
                </option>
              ))}
            </select>
            {values.sourceProductLine && (
              <p className="mt-2 text-xs text-gray-500">Imported suggestion: {values.sourceProductLine}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Product Category</label>
            <select
              value={values.categoryId}
              onChange={(e) => syncCategory(e.target.value)}
              disabled={!hasCategories}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
            >
              {categoriesForTopLevel(selectedTopLevelId).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {values.sourceProductType && (
              <p className="mt-2 text-xs text-gray-500">Imported suggestion: {values.sourceProductType}</p>
            )}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-400">Description</label>
          <textarea
            rows={6}
            value={values.description}
            onChange={(e) => update("description", e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
          />
        </div>
        {!hasCategories && (
          <p className="rounded-md bg-red-950 px-4 py-2 text-xs text-red-300">
            Add at least one category in the admin categories page before creating products.
          </p>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-bg-panel p-5">
        <h2 className="font-display text-lg font-bold text-white">Pricing & Inventory</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-gray-400">Storefront Price (USD)</label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              value={values.priceCents / 100}
              onChange={(e) => update("priceCents", Math.round(Number(e.target.value) * 100))}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
            />
            {values.sourcePriceCents != null && (
              <p className="mt-1 text-xs text-gray-500">
                TCGplayer live price with shipping: {formatCents(values.sourcePriceCents)}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Compare-at Price (optional)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={values.compareAtCents != null ? values.compareAtCents / 100 : ""}
              onChange={(e) =>
                update("compareAtCents", e.target.value === "" ? null : Math.round(Number(e.target.value) * 100))
              }
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">SKU</label>
            <input
              value={values.sku ?? ""}
              onChange={(e) => update("sku", e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Quantity in Stock</label>
            <input
              required
              type="number"
              min="0"
              value={values.quantity}
              onChange={(e) => update("quantity", Number(e.target.value))}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
            />
            {values.quantity === 1 && (
              <p className="mt-1 text-xs text-red-400">Will show: "Only 1 Left In Stock - Hurry!"</p>
            )}
            {values.quantity > 1 && values.quantity < 5 && (
              <p className="mt-1 text-xs text-orange-400">Will show: "Very Low Stock!"</p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-bg-panel p-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Images</h2>
            <p className="text-sm text-gray-400">
              The first image is what TCGplayer imported. You can replace it or add your own manual image URLs.
            </p>
          </div>
        </div>

        {values.images.map((img, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              placeholder="Image URL"
              value={img.url}
              onChange={(e) => updateImage(idx, "url", e.target.value)}
              className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
            />
            <input
              placeholder="Alt text"
              value={img.altText}
              onChange={(e) => updateImage(idx, "altText", e.target.value)}
              className="w-48 rounded-md border border-border bg-bg px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
            />
            <button
              type="button"
              onClick={() =>
                setValues((current) => ({
                  ...current,
                  images: current.images.filter((_, imageIndex) => imageIndex !== idx),
                }))
              }
              className="rounded-md border border-border px-3 text-sm text-gray-400 hover:text-red-400"
            >
              x
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setValues((current) => ({
              ...current,
              images: [...current.images, { url: "", altText: "" }],
            }))
          }
          className="text-sm text-brand-400 hover:underline"
        >
          + Add another image
        </button>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-bg-panel p-5">
        <h2 className="font-display text-lg font-bold text-white">Homepage & Visibility</h2>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={values.featuredOnHome}
            onChange={(e) => update("featuredOnHome", e.target.checked)}
            className="h-4 w-4"
          />
          Appear on Front Page carousel
        </label>
        {values.featuredOnHome && (
          <div className="max-w-xs">
            <label className="mb-1 block text-sm text-gray-400">Carousel order (lower = earlier)</label>
            <input
              type="number"
              value={values.featuredOrder}
              onChange={(e) => update("featuredOrder", Number(e.target.value))}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
            />
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(e) => update("isActive", e.target.checked)}
            className="h-4 w-4"
          />
          Active (visible on storefront)
        </label>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-bg-panel p-5">
        <h2 className="font-display text-lg font-bold text-white">SEO</h2>
        <div>
          <label className="mb-1 block text-sm text-gray-400">SEO Title</label>
          <input
            value={values.seoTitle ?? ""}
            onChange={(e) => update("seoTitle", e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-400">Meta Description</label>
          <textarea
            rows={2}
            value={values.seoDescription ?? ""}
            onChange={(e) => update("seoDescription", e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-400">Keywords (comma separated)</label>
          <input
            value={values.seoKeywords ?? ""}
            onChange={(e) => update("seoKeywords", e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
          />
        </div>
      </section>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving || !hasCategories}
          className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
        >
          {saving ? "Saving..." : initial?.id ? "Save Changes" : "Create Product"}
        </button>
      </div>
    </form>
  );
}
