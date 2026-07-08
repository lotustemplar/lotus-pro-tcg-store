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

export function SiteSettingsForm({ initial }: SiteSettingsFormProps) {
  const [values, setValues] = useState<SiteSettings>(initial);
  const [savedValues, setSavedValues] = useState<SiteSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(savedValues), [savedValues, values]);

  function update<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  async function save() {
    setSaving(true);
    setMessage(null);

    const response = await fetch("/api/admin/site-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage({
        type: "error",
        text: typeof data.error === "string" ? data.error : "Failed to save site settings.",
      });
      setSaving(false);
      return;
    }

    setSavedValues(values);
    setMessage({ type: "success", text: "Site settings saved. Refresh the storefront to see the new branding." });
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-bg-panel p-5">
        <p className="font-display text-xl font-bold text-white">Branding Controls</p>
        <p className="mt-2 max-w-3xl text-sm text-gray-400">
          Change the logos, homepage hero copy, and banner image from one place. Use direct image
          URLs or existing public paths like <code>/logo/logo-wide.svg</code>. For the hero banner,
          the sweet spot is a wide image around <code>1920 x 800</code> (12:5).
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
            <h2 className="font-display text-lg font-bold text-white">Logos</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-200">Brand Name</span>
                <input
                  value={values.brandName}
                  onChange={(event) => update("brandName", event.target.value)}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                />
              </label>
              <div className="rounded-lg border border-border bg-bg-elevated px-4 py-3 text-sm text-gray-400">
                This brand name is used for image alt text and storefront branding fallbacks.
              </div>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-200">Wide Logo URL</span>
                <input
                  value={values.logoWideUrl}
                  onChange={(event) => update("logoWideUrl", event.target.value)}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-200">Square Logo URL</span>
                <input
                  value={values.logoSquareUrl}
                  onChange={(event) => update("logoSquareUrl", event.target.value)}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-bg-panel p-5">
            <h2 className="font-display text-lg font-bold text-white">Homepage Hero</h2>
            <div className="mt-4 grid gap-4">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-200">Hero Banner URL</span>
                <input
                  value={values.heroBannerUrl ?? ""}
                  onChange={(event) => update("heroBannerUrl", event.target.value || null)}
                  placeholder="Optional - leave blank for a text-only hero"
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
                />
              </label>
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
            </div>
          </section>

          <section className="rounded-xl border border-border bg-bg-panel p-5">
            <h2 className="font-display text-lg font-bold text-white">Footer Copy</h2>
            <label className="mt-4 block space-y-2">
              <span className="text-sm font-semibold text-gray-200">Footer Description</span>
              <textarea
                rows={3}
                value={values.footerDescription}
                onChange={(event) => update("footerDescription", event.target.value)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
              />
            </label>
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
              </div>
            </div>
          </section>

          <div className="rounded-xl border border-border bg-bg-panel p-5">
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={save}
              className="w-full rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : dirty ? "Save Site Settings" : "All Changes Saved"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
