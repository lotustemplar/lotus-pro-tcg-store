import Link from "next/link";
import type { NavCategory } from "@/lib/nav";
import type { SiteSettings } from "@/lib/site-settings";

function renderLegalText(template: string, brandName: string) {
  return template
    .replaceAll("{year}", String(new Date().getFullYear()))
    .replaceAll("{brandName}", brandName);
}

export function Footer({
  categories,
  settings,
}: {
  categories: NavCategory[];
  settings: SiteSettings;
}) {
  return (
    <footer className="mt-20 px-4 pb-6">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,22,37,0.95),rgba(8,12,20,0.98))] shadow-[0_30px_90px_rgba(3,8,18,0.5)]">
        <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.15fr_0.9fr_0.95fr_0.9fr] lg:px-8 lg:py-10">
          <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-3">
                <img
                  src={settings.logoSquareUrl}
                  alt={settings.brandName}
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-white">{settings.brandName}</p>
                <p className="text-xs uppercase tracking-[0.28em] text-gray-500">Collector storefront</p>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-7 text-gray-400">{settings.footerDescription}</p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
              {settings.footerShopHeading}
            </h4>
            <ul className="space-y-3">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/category/${category.slug}`}
                    className="text-sm font-medium text-gray-300 transition hover:text-white"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
              {settings.footerSupportHeading}
            </h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li>
                <Link href={settings.footerContactHref} className="transition hover:text-white">
                  {settings.footerContactLabel}
                </Link>
              </li>
              <li>
                <Link href={settings.footerShippingHref} className="transition hover:text-white">
                  {settings.footerShippingLabel}
                </Link>
              </li>
              <li>
                <Link href={settings.footerFaqHref} className="transition hover:text-white">
                  {settings.footerFaqLabel}
                </Link>
              </li>
            </ul>
          </div>

          <div className="rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.16),rgba(255,255,255,0.02)_62%)] p-5">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
              {settings.footerShippingHeading}
            </h4>
            <p className="text-sm leading-7 text-gray-400">{settings.footerShippingLinePrimary}</p>
            <p className="mt-4 font-display text-xl font-bold text-brand-300">
              {settings.footerShippingLineHighlight}
            </p>
          </div>
        </div>

        <div className="border-t border-white/8 px-6 py-5 lg:px-8">
          <div className="flex flex-col gap-3 text-xs text-gray-500 md:flex-row md:items-center md:justify-between">
            <p className="max-w-3xl">{renderLegalText(settings.footerLegalText, settings.brandName)}</p>
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.24em]">
              <span>{settings.footerBottomPromoLeft}</span>
              <span className="text-brand-400">/</span>
              <span>{settings.footerBottomPromoRight}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
