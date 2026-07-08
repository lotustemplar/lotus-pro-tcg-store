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
    <footer className="mt-16 border-t border-border bg-bg-panel">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <img
              src={settings.logoSquareUrl}
              alt={settings.brandName}
              className="h-[72px] w-[72px] object-contain"
            />
            <p className="mt-3 text-sm text-gray-400">{settings.footerDescription}</p>
          </div>
          <div>
            <h4 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-white">
              {settings.footerShopHeading}
            </h4>
            <ul className="space-y-1">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/category/${c.slug}`} className="text-sm text-gray-400 hover:text-brand-300">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-white">
              {settings.footerSupportHeading}
            </h4>
            <ul className="space-y-1 text-sm text-gray-400">
              <li>
                <Link href={settings.footerContactHref} className="hover:text-brand-300">
                  {settings.footerContactLabel}
                </Link>
              </li>
              <li>
                <Link href={settings.footerShippingHref} className="hover:text-brand-300">
                  {settings.footerShippingLabel}
                </Link>
              </li>
              <li>
                <Link href={settings.footerFaqHref} className="hover:text-brand-300">
                  {settings.footerFaqLabel}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-white">
              {settings.footerShippingHeading}
            </h4>
            <p className="text-sm text-gray-400">{settings.footerShippingLinePrimary}</p>
            <p className="text-sm text-brand-300">{settings.footerShippingLineHighlight}</p>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-gray-500 sm:flex-row">
          <p>{renderLegalText(settings.footerLegalText, settings.brandName)}</p>
          <div className="flex items-center gap-3">
            <span>{settings.footerBottomPromoLeft}</span>
            <span>|</span>
            <span>{settings.footerBottomPromoRight}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
