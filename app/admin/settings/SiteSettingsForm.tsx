"use client";

import { useMemo, useState } from "react";
import type { SiteSettings } from "@/lib/site-settings";

type Message = {
  type: "error" | "success";
  text: string;
};

type SiteSettingsFormProps = {
  initial: SiteSettings;
};

type AssetFieldKey = "logoWideUrl" | "logoSquareUrl" | "heroBannerUrl";

const MAX_SOURCE_FILE_BYTES = 8 * 1024 * 1024;

const ASSET_FIELDS: Record<
  AssetFieldKey,
  {
    label: string;
    ratioClassName: string;
    maxWidth: number;
    maxHeight: number;
    helperText: string;
    optional?: boolean;
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
  heroBannerUrl: {
    label: "Hero Banner",
    ratioClassName: "aspect-[12/5]",
    maxWidth: 1920,
    maxHeight: 800,
    helperText: "Best as a wide banner around 1920 x 800.",
    optional: true,
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
  options: { maxWidth: number; maxHeight: number },
): Promise<string> {
  if (file.size > MAX_SOURCE_FILE_BYTES) {
    throw new Error("Please choose an image under 8 MB before upload.");
  }

  const originalDataUrl = await readFileAsDataUrl(file);

  if (file.type === "image/svg+xml") {
    return originalDataUrl;
  }

  const image = await loadImage(originalDataUrl);
  const { width, height } = fitWithin(
    image.naturalWidth,
    image.naturalHeight,
    options.maxWidth,
    options.maxHeight,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image compression is not available in this browser.");
  }

  context.drawImage(image, 0, 0, width, height);

  const outputType = file.type === "image/png" ? "image/png" : "image/webp";
  const output = canvas.toDataURL(outputType, outputType === "image/webp" ? 0.92 : undefined);
  if (!output || output === "data:,") {
    throw new Error("Failed to prepare the selected image.");
  }

  return output;
}

function getSuccessMessage(deploy?: { triggered?: boolean; reason?: string; detail?: string }) {
  if (deploy?.triggered) {
    return "Site settings saved. The content is live now, and a production rebuild was queued too.";
  }

  if (deploy?.reason === "failed") {
    return `Site settings saved and are live on refresh. The Netlify rebuild hook did not run: ${deploy.detail ?? "unknown error."}`;
  }

  return "Site settings saved. These changes are live on refresh because the storefront reads them from the database.";
}

export function SiteSettingsForm({ initial }: SiteSettingsFormProps) {
  const [values, setValues] = useState<SiteSettings>(initial);
  const [savedValues, setSavedValues] = useState<SiteSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<AssetFieldKey | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(savedValues), [savedValues, values]);

  function update<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  async function handleAssetUpload(key: AssetFieldKey, file: File | null) {
    if (!file) return;

    setUploadingAsset(key);
    setMessage(null);

    try {
      const dataUrl = await prepareAssetFile(file, ASSET_FIELDS[key]);
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

  async function save() {
    setSaving(true);
    setMessage(null);

    const response = await fetch("/api/admin/site-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
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

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-bg-panel p-5">
        <p className="font-display text-xl font-bold text-white">Storefront Controls</p>
        <p className="mt-2 max-w-3xl text-sm text-gray-400">
          Update the live storefront from here: logos, hero banner, homepage copy, footer text, and
          SEO text. You can paste image URLs or upload files directly. Uploaded images are compressed
          in the browser and stored with your site settings, so they stay live across Netlify deploys.
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

              {(["logoWideUrl", "logoSquareUrl", "heroBannerUrl"] as AssetFieldKey[]).map((key) => {
                const asset = ASSET_FIELDS[key];
                const currentValue = values[key];

                return (
                  <div key={key} className="rounded-xl border border-border bg-bg-elevated p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{asset.label}</p>
                        <p className="text-xs text-gray-400">{asset.helperText}</p>
                      </div>
                      {asset.optional && (
                        <button
                          type="button"
                          onClick={() => update(key, null as SiteSettings[typeof key])}
                          className="rounded-md border border-border px-3 py-1.5 text-xs text-gray-300 hover:bg-bg"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
                      <div className="space-y-3">
                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-gray-200">{asset.label} URL</span>
                          <input
                            value={currentValue ?? ""}
                            onChange={(event) =>
                              update(
                                key,
                                ((key === "heroBannerUrl" && event.target.value.length === 0)
                                  ? null
                                  : event.target.value) as SiteSettings[typeof key],
                              )
                            }
                            placeholder={
                              asset.optional ? "Optional - paste a URL or upload a file" : "Paste a URL or upload a file"
                            }
                            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-gray-200">Upload Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => void handleAssetUpload(key, event.target.files?.[0] ?? null)}
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
            <h2 className="font-display text-lg font-bold text-white">SEO & Browser Text</h2>
            <div className="mt-4 grid gap-4">
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
            <h2 className="font-display text-lg font-bold text-white">Homepage Hero</h2>
            <div className="mt-4 grid gap-4">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-200">Eyebrow Text</span>
                <input
                  value={values.heroEyebrow}
                  onChange={(event) => update("heroEyebrow", event.target.value)}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-200">Headline</span>
                <input
                  value={values.heroTitle}
                  onChange={(event) => update("heroTitle", event.target.value)}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-200">Description</span>
                <textarea
                  rows={4}
                  value={values.heroDescription}
                  onChange={(event) => update("heroDescription", event.target.value)}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-200">Primary Button Label</span>
                  <input
                    value={values.heroPrimaryLabel}
                    onChange={(event) => update("heroPrimaryLabel", event.target.value)}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-200">Primary Button Link</span>
                  <input
                    value={values.heroPrimaryHref}
                    onChange={(event) => update("heroPrimaryHref", event.target.value)}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-200">Secondary Button Label</span>
                  <input
                    value={values.heroSecondaryLabel}
                    onChange={(event) => update("heroSecondaryLabel", event.target.value)}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-200">Secondary Button Link</span>
                  <input
                    value={values.heroSecondaryHref}
                    onChange={(event) => update("heroSecondaryHref", event.target.value)}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                  />
                </label>
              </div>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-200">Featured Section Title</span>
                <input
                  value={values.featuredSectionTitle}
                  onChange={(event) => update("featuredSectionTitle", event.target.value)}
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
                <span className="text-xs text-gray-500">
                  Use <code>{"{year}"}</code> and <code>{"{brandName}"}</code> if you want those
                  values inserted automatically.
                </span>
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
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Square Logo</p>
                <AssetPreview
                  label="Square logo"
                  src={values.logoSquareUrl}
                  ratioClassName="aspect-square max-w-[220px]"
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Hero Banner</p>
                <AssetPreview label="Hero banner" src={values.heroBannerUrl} ratioClassName="aspect-[12/5]" />
              </div>
              <div className="rounded-xl border border-border bg-bg-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-400">
                  {values.heroEyebrow}
                </p>
                <p className="mt-3 font-display text-2xl font-bold text-white">{values.heroTitle}</p>
                <p className="mt-3 text-sm leading-6 text-gray-400">{values.heroDescription}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-brand-600 px-4 py-2 font-semibold text-white">
                    {values.heroPrimaryLabel}
                  </span>
                  <span className="rounded-full border border-border px-4 py-2 text-gray-200">
                    {values.heroSecondaryLabel}
                  </span>
                </div>
                <p className="mt-4 text-sm font-semibold text-white">{values.featuredSectionTitle}</p>
              </div>
              <div className="rounded-xl border border-border bg-bg-elevated p-4 text-sm">
                <p className="font-semibold text-white">{values.footerDescription}</p>
                <div className="mt-4 grid gap-3 text-gray-300">
                  <p>
                    {values.footerSupportHeading}: {values.footerContactLabel}, {values.footerShippingLabel},{" "}
                    {values.footerFaqLabel}
                  </p>
                  <p>
                    {values.footerShippingHeading}: {values.footerShippingLinePrimary}
                  </p>
                  <p className="text-brand-300">{values.footerShippingLineHighlight}</p>
                  <p className="text-gray-500">{values.footerLegalText}</p>
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
              If <code>NETLIFY_BUILD_HOOK_URL</code> is configured in Netlify, each save will also
              queue a production rebuild automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
