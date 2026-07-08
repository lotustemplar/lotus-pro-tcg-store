"use client";

import { useMemo, useState } from "react";
import { CATEGORY_TREE } from "@/lib/categories";
import type { HeroSlide, SiteSettings } from "@/lib/site-settings";

type Message = {
  type: "error" | "success";
  text: string;
};

type SiteSettingsFormProps = {
  initial: SiteSettings;
};

type HeroSlideSavePayload = Omit<HeroSlide, "imageUrl"> & {
  imageUrl?: string | null;
};

type SiteSettingsSavePayload = Partial<Omit<SiteSettings, "heroSlides" | "categoryBackgrounds">> & {
  heroSlides?: HeroSlideSavePayload[];
  categoryBackgrounds?: Record<string, string | null>;
};

type BrandAssetKey = "logoWideUrl" | "logoSquareUrl";

const MAX_SOURCE_FILE_BYTES = 8 * 1024 * 1024;
const HOMEPAGE_CATEGORY_SPECS = CATEGORY_TREE.slice(0, 5).map((category) => ({
  slug: category.slug,
  label: category.name,
}));

const BRAND_ASSETS: Record<
  BrandAssetKey,
  {
    label: string;
    ratioClassName: string;
    maxWidth: number;
    maxHeight: number;
    helperText: string;
  }
> = {
  logoWideUrl: {
    label: "Wide Logo",
    ratioClassName: "aspect-[3/1]",
    maxWidth: 1200,
    maxHeight: 400,
    helperText: "Best as a transparent logo around 1200 x 400.",
  },
  logoSquareUrl: {
    label: "Square Logo",
    ratioClassName: "aspect-square max-w-[220px]",
    maxWidth: 800,
    maxHeight: 800,
    helperText: "Best as a square export around 800 x 800.",
  },
};

function AssetPreview({
  label,
  src,
  ratioClassName,
}: {
  label: string;
  src: string | null;
  ratioClassName: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-elevated">
      <div className={`relative ${ratioClassName} w-full bg-bg`}>
        {src ? (
          <img src={src} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
            No preview yet
          </div>
        )}
      </div>
    </div>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to read file."));
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load selected image."));
    image.src = src;
  });
}

function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function prepareAssetFile(
  file: File,
  options: { maxWidth: number; maxHeight: number; maxOutputBytes: number },
): Promise<string> {
  if (file.size > MAX_SOURCE_FILE_BYTES) {
    throw new Error("Please choose an image under 8 MB before upload.");
  }

  const originalDataUrl = await readFileAsDataUrl(file);
  if (file.type === "image/svg+xml") {
    return originalDataUrl;
  }

  const image = await loadImage(originalDataUrl);
  const initialSize = fitWithin(image.naturalWidth, image.naturalHeight, options.maxWidth, options.maxHeight);
  const scales = [1, 0.85, 0.7, 0.55];
  const qualities = [0.86, 0.78, 0.7, 0.62, 0.54];
  let fallbackOutput = "";

  for (const scale of scales) {
    const width = Math.max(1, Math.round(initialSize.width * scale));
    const height = Math.max(1, Math.round(initialSize.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Image compression is not available in this browser.");
    }

    context.drawImage(image, 0, 0, width, height);

    for (const quality of qualities) {
      const output = canvas.toDataURL("image/webp", quality);
      if (!output || output === "data:,") {
        continue;
      }

      fallbackOutput = output;
      const base64 = output.split(",")[1] ?? "";
      const estimatedBytes = Math.floor((base64.length * 3) / 4);
      if (estimatedBytes <= options.maxOutputBytes) {
        return output;
      }
    }
  }

  if (!fallbackOutput) {
    throw new Error("Failed to prepare the selected image.");
  }

  return fallbackOutput;
}

function getSuccessMessage(deploy?: { triggered?: boolean; reason?: string; detail?: string }) {
  if (deploy?.triggered) {
    return "Site settings saved. The content is live now, and a production rebuild was queued too.";
  }

  if (deploy?.reason === "failed") {
    return `Site settings saved and are live on refresh. A deployment hook did not run: ${deploy.detail ?? "unknown error."}`;
  }

  return "Site settings saved. These changes are live on refresh because the storefront reads them from the database.";
}

function createSlide(index: number): HeroSlide {
  return {
    id: `slide-${Date.now()}-${index}`,
    name: `Slide ${index + 1}`,
    imageUrl: null,
    buttonLabel: "Shop Now",
    buttonHref: "/",
  };
}

function buildSiteSettingsPatch(current: SiteSettings, saved: SiteSettings): SiteSettingsSavePayload {
  const patch: SiteSettingsSavePayload = {};

  (Object.keys(current) as (keyof Omit<SiteSettings, "heroSlides" | "categoryBackgrounds">)[]).forEach((key) => {
    if (JSON.stringify(current[key]) !== JSON.stringify(saved[key])) {
      (patch as Record<string, string | null | undefined>)[key] = current[key];
    }
  });

  if (JSON.stringify(current.categoryBackgrounds) !== JSON.stringify(saved.categoryBackgrounds)) {
    const categoryPatch = Object.fromEntries(
      Object.entries(current.categoryBackgrounds).filter(
        ([slug, value]) => saved.categoryBackgrounds[slug] !== value,
      ),
    );

    patch.categoryBackgrounds = categoryPatch;
  }

  if (JSON.stringify(current.heroSlides) !== JSON.stringify(saved.heroSlides)) {
    patch.heroSlides = current.heroSlides.map((slide) => {
      const savedSlide = saved.heroSlides.find((item) => item.id === slide.id);
      const imageUnchanged = savedSlide?.imageUrl === slide.imageUrl;

      return {
        id: slide.id,
        name: slide.name,
        buttonLabel: slide.buttonLabel,
        buttonHref: slide.buttonHref,
        ...(imageUnchanged ? {} : { imageUrl: slide.imageUrl }),
      };
    });
  }

  return patch;
}

export function SiteSettingsForm({ initial }: SiteSettingsFormProps) {
  const [values, setValues] = useState<SiteSettings>(initial);
  const [savedValues, setSavedValues] = useState<SiteSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(savedValues), [savedValues, values]);

  function update<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  function updateSlide(index: number, patch: Partial<HeroSlide>) {
    setValues((current) => ({
      ...current,
      heroSlides: current.heroSlides.map((slide, slideIndex) =>
        slideIndex === index ? { ...slide, ...patch } : slide,
      ),
    }));
    setMessage(null);
  }

  function addSlide() {
    setValues((current) => ({
      ...current,
      heroSlides: [...current.heroSlides, createSlide(current.heroSlides.length)],
    }));
    setMessage(null);
  }

  function removeSlide(index: number) {
    setValues((current) => ({
      ...current,
      heroSlides: current.heroSlides.filter((_, slideIndex) => slideIndex !== index),
    }));
    setMessage(null);
  }

  async function handleBrandAssetUpload(key: BrandAssetKey, file: File | null) {
    if (!file) return;

    setUploadingAsset(key);
    setMessage(null);

    try {
      const dataUrl = await prepareAssetFile(file, {
        ...BRAND_ASSETS[key],
        maxOutputBytes: key === "logoWideUrl" ? 450 * 1024 : 400 * 1024,
      });
      update(key, dataUrl as SiteSettings[typeof key]);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to prepare that image.",
      });
    } finally {
      setUploadingAsset(null);
    }
  }

  async function handleSlideUpload(index: number, file: File | null) {
    if (!file) return;

    const uploadKey = `hero-slide-${index}`;
    setUploadingAsset(uploadKey);
    setMessage(null);

    try {
      const dataUrl = await prepareAssetFile(file, {
        maxWidth: 1600,
        maxHeight: 760,
        maxOutputBytes: 1200 * 1024,
      });
      updateSlide(index, { imageUrl: dataUrl });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to prepare that image.",
      });
    } finally {
      setUploadingAsset(null);
    }
  }

  async function handleCategoryBackgroundUpload(slug: string, file: File | null) {
    if (!file) return;

    const uploadKey = `category-${slug}`;
    setUploadingAsset(uploadKey);
    setMessage(null);

    try {
      const dataUrl = await prepareAssetFile(file, {
        maxWidth: 1100,
        maxHeight: 740,
        maxOutputBytes: 650 * 1024,
      });
      update("categoryBackgrounds", {
        ...values.categoryBackgrounds,
        [slug]: dataUrl,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to prepare that image.",
      });
    } finally {
      setUploadingAsset(null);
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);

    const payload = buildSiteSettingsPatch(values, savedValues);

    const response = await fetch("/api/admin/site-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage({
        type: "error",
        text: typeof data.error === "string" ? data.error : "Failed to save site settings.",
      });
      setSaving(false);
      return;
    }

    setSavedValues(values);
    setMessage({ type: "success", text: getSuccessMessage(data.deploy) });
    setSaving(false);
  }

  const firstSlide = values.heroSlides[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-bg-panel p-5">
        <p className="font-display text-xl font-bold text-white">Storefront Controls</p>
        <p className="mt-2 max-w-3xl text-sm text-gray-400">
          Manage the top banner carousel, slide button text and links, logos, category backgrounds,
          homepage copy, and footer content from one place.
        </p>
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

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-bg-panel p-5">
            <h2 className="font-display text-lg font-bold text-white">Branding Assets</h2>
            <div className="mt-4 grid gap-4">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-200">Brand Name</span>
                <input
                  value={values.brandName}
                  onChange={(event) => update("brandName", event.target.value)}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                />
              </label>

              {(["logoWideUrl", "logoSquareUrl"] as BrandAssetKey[]).map((key) => {
                const asset = BRAND_ASSETS[key];
                const currentValue = values[key];

                return (
                  <div key={key} className="rounded-xl border border-border bg-bg-elevated p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{asset.label}</p>
                        <p className="text-xs text-gray-400">{asset.helperText}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
                      <div className="space-y-3">
                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-gray-200">{asset.label} URL</span>
                          <input
                            value={currentValue}
                            onChange={(event) => update(key, event.target.value as SiteSettings[typeof key])}
                            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-gray-200">Upload Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => void handleBrandAssetUpload(key, event.target.files?.[0] ?? null)}
                            className="block w-full text-sm text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-brand-500"
                          />
                        </label>

                        {uploadingAsset === key && <p className="text-xs text-brand-300">Preparing image...</p>}
                      </div>

                      <div>
                        <AssetPreview label={asset.label} src={currentValue} ratioClassName={asset.ratioClassName} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-bg-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-white">Top Banner Carousel</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Each slide gets its own image, button text, and destination link.
                </p>
              </div>
              <button
                type="button"
                onClick={addSlide}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
              >
                Add Slide
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {values.heroSlides.length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-bg-elevated px-4 py-5 text-sm text-gray-400">
                  No banner slides yet. Add your first banner to start the rotating carousel.
                </div>
              )}

              {values.heroSlides.map((slide, index) => (
                <div key={slide.id} className="rounded-xl border border-border bg-bg-elevated p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">Slide {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeSlide(index)}
                      className="rounded-md border border-border px-3 py-1.5 text-xs text-gray-300 hover:bg-bg"
                    >
                      Remove Slide
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
                    <div className="space-y-3">
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-gray-200">Slide Name</span>
                        <input
                          value={slide.name}
                          onChange={(event) => updateSlide(index, { name: event.target.value })}
                          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-gray-200">Banner Image URL</span>
                        <input
                          value={slide.imageUrl ?? ""}
                          onChange={(event) => updateSlide(index, { imageUrl: event.target.value || null })}
                          placeholder="Paste a banner image URL or upload a file"
                          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-gray-200">Upload Banner Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => void handleSlideUpload(index, event.target.files?.[0] ?? null)}
                          className="block w-full text-sm text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-brand-500"
                        />
                      </label>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-gray-200">Button Text</span>
                          <input
                            value={slide.buttonLabel}
                            onChange={(event) => updateSlide(index, { buttonLabel: event.target.value })}
                            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-gray-200">Button Link</span>
                          <input
                            value={slide.buttonHref}
                            onChange={(event) => updateSlide(index, { buttonHref: event.target.value })}
                            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                          />
                        </label>
                      </div>

                      {uploadingAsset === `hero-slide-${index}` && (
                        <p className="text-xs text-brand-300">Preparing image...</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Slide Preview</p>
                      <div className="overflow-hidden rounded-xl border border-border bg-bg">
                        <div className="relative aspect-[12/5] w-full">
                          {slide.imageUrl ? (
                            <img src={slide.imageUrl} alt={slide.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                              No banner yet
                            </div>
                          )}
                          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,13,22,0.12),rgba(9,13,22,0.32))]" />
                          <div className="absolute bottom-3 left-3">
                            <span className="inline-flex rounded-md border border-brand-300/70 bg-black/35 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[0_0_18px_rgba(139,92,246,0.45)]">
                              {slide.buttonLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-bg-panel p-5">
            <h2 className="font-display text-lg font-bold text-white">Category Block Backgrounds</h2>
            <p className="mt-1 text-sm text-gray-400">
              Set the background image for the Magic, Pokemon, One Piece, Riftbound, and Weiss Schwarz homepage tiles.
            </p>

            <div className="mt-4 space-y-4">
              {HOMEPAGE_CATEGORY_SPECS.map((category) => {
                const currentValue = values.categoryBackgrounds[category.slug] ?? null;

                return (
                  <div key={category.slug} className="rounded-xl border border-border bg-bg-elevated p-4">
                    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{category.label}</p>
                          <p className="text-xs text-gray-400">Recommended around 1200 x 800.</p>
                        </div>

                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-gray-200">Background Image URL</span>
                          <input
                            value={currentValue ?? ""}
                            onChange={(event) =>
                              update("categoryBackgrounds", {
                                ...values.categoryBackgrounds,
                                [category.slug]: event.target.value || null,
                              })
                            }
                            placeholder="Paste a background URL or upload a file"
                            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                          />
                        </label>

                        <div className="flex flex-wrap gap-3">
                          <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-gray-200">Upload Background</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) =>
                                void handleCategoryBackgroundUpload(category.slug, event.target.files?.[0] ?? null)
                              }
                              className="block w-full text-sm text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-brand-500"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              update("categoryBackgrounds", {
                                ...values.categoryBackgrounds,
                                [category.slug]: null,
                              })
                            }
                            className="self-end rounded-md border border-border px-3 py-2 text-xs text-gray-300 hover:bg-bg"
                          >
                            Remove Background
                          </button>
                        </div>

                        {uploadingAsset === `category-${category.slug}` && (
                          <p className="text-xs text-brand-300">Preparing image...</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Tile Preview</p>
                        <AssetPreview
                          label={category.label}
                          src={currentValue}
                          ratioClassName="aspect-[6/4]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-bg-panel p-5">
            <h2 className="font-display text-lg font-bold text-white">Homepage & SEO Text</h2>
            <div className="mt-4 grid gap-4">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-200">Featured Section Title</span>
                <input
                  value={values.featuredSectionTitle}
                  onChange={(event) => update("featuredSectionTitle", event.target.value)}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-200">Default Site Title</span>
                <input
                  value={values.siteMetaTitle}
                  onChange={(event) => update("siteMetaTitle", event.target.value)}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-200">Default Site Description</span>
                <textarea
                  rows={3}
                  value={values.siteMetaDescription}
                  onChange={(event) => update("siteMetaDescription", event.target.value)}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-bg-panel p-5">
            <h2 className="font-display text-lg font-bold text-white">Footer Content</h2>
            <div className="mt-4 grid gap-4">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-200">Footer Description</span>
                <textarea
                  rows={3}
                  value={values.footerDescription}
                  onChange={(event) => update("footerDescription", event.target.value)}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-200">Shop Heading</span>
                  <input
                    value={values.footerShopHeading}
                    onChange={(event) => update("footerShopHeading", event.target.value)}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-200">Support Heading</span>
                  <input
                    value={values.footerSupportHeading}
                    onChange={(event) => update("footerSupportHeading", event.target.value)}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-200">Shipping Heading</span>
                  <input
                    value={values.footerShippingHeading}
                    onChange={(event) => update("footerShippingHeading", event.target.value)}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-200">Contact Label</span>
                  <input
                    value={values.footerContactLabel}
                    onChange={(event) => update("footerContactLabel", event.target.value)}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-200">Contact Link</span>
                  <input
                    value={values.footerContactHref}
                    onChange={(event) => update("footerContactHref", event.target.value)}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-200">Shipping Label</span>
                  <input
                    value={values.footerShippingLabel}
                    onChange={(event) => update("footerShippingLabel", event.target.value)}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-200">Shipping Link</span>
                  <input
                    value={values.footerShippingHref}
                    onChange={(event) => update("footerShippingHref", event.target.value)}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-200">FAQ Label</span>
                  <input
                    value={values.footerFaqLabel}
                    onChange={(event) => update("footerFaqLabel", event.target.value)}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-200">FAQ Link</span>
                  <input
                    value={values.footerFaqHref}
                    onChange={(event) => update("footerFaqHref", event.target.value)}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-200">Shipping Line</span>
                  <input
                    value={values.footerShippingLinePrimary}
                    onChange={(event) => update("footerShippingLinePrimary", event.target.value)}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-200">Shipping Highlight</span>
                  <input
                    value={values.footerShippingLineHighlight}
                    onChange={(event) => update("footerShippingLineHighlight", event.target.value)}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-200">Bottom Promo Left</span>
                  <input
                    value={values.footerBottomPromoLeft}
                    onChange={(event) => update("footerBottomPromoLeft", event.target.value)}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-200">Bottom Promo Right</span>
                  <input
                    value={values.footerBottomPromoRight}
                    onChange={(event) => update("footerBottomPromoRight", event.target.value)}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                  />
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-200">Legal Footer Text</span>
                <textarea
                  rows={3}
                  value={values.footerLegalText}
                  onChange={(event) => update("footerLegalText", event.target.value)}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                />
              </label>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-bg-panel p-5">
            <h2 className="font-display text-lg font-bold text-white">Live Preview</h2>
            <div className="mt-4 space-y-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Wide Logo</p>
                <AssetPreview label="Wide logo" src={values.logoWideUrl} ratioClassName="aspect-[3/1]" />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">First Banner Slide</p>
                <div className="overflow-hidden rounded-xl border border-border bg-bg">
                  <div className="relative aspect-[12/5] w-full">
                    {firstSlide?.imageUrl ? (
                      <img src={firstSlide.imageUrl} alt={firstSlide.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                        Add a slide to preview the hero carousel
                      </div>
                    )}
                    {firstSlide?.imageUrl && (
                      <>
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,13,22,0.12),rgba(9,13,22,0.32))]" />
                        <div className="absolute bottom-4 left-4">
                          <span className="inline-flex rounded-md border border-brand-300/70 bg-black/35 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[0_0_18px_rgba(139,92,246,0.45)]">
                            {firstSlide.buttonLabel}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-bg-elevated p-4 text-sm">
                <p className="font-semibold text-white">{values.featuredSectionTitle}</p>
                <div className="mt-4 grid gap-3 text-gray-300">
                  {HOMEPAGE_CATEGORY_SPECS.map((category) => (
                    <div key={category.slug} className="flex items-center justify-between gap-3">
                      <span>{category.label}</span>
                      <span className="text-xs text-gray-500">
                        {values.categoryBackgrounds[category.slug] ? "Background set" : "Using fallback image"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-bg-elevated p-4 text-sm">
                <p className="font-semibold text-white">{values.footerDescription}</p>
                <div className="mt-4 grid gap-3 text-gray-300">
                  <p>
                    {values.footerSupportHeading}: {values.footerContactLabel}, {values.footerShippingLabel},{" "}
                    {values.footerFaqLabel}
                  </p>
                  <p>{values.footerShippingHeading}: {values.footerShippingLinePrimary}</p>
                  <p className="text-brand-300">{values.footerShippingLineHighlight}</p>
                </div>
              </div>
            </div>
          </section>

          <div className="rounded-xl border border-border bg-bg-panel p-5">
            <button
              type="button"
              disabled={!dirty || saving || uploadingAsset !== null}
              onClick={save}
              className="w-full rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : dirty ? "Save Site Settings" : "All Changes Saved"}
            </button>
            <p className="mt-3 text-xs text-gray-500">
              Site settings save to the live database and appear on the storefront after refresh.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
