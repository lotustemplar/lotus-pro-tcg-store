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
    <footer className="mt-14 border-t border-white/8 bg-[#090d16]">
      <div className="mx-auto max-w-[1500px] px-4 py-6">
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-[linear-gradient(135deg,rgba(95,55,165,0.45),rgba(9,13,22,0.92))] p-6">
            <div className="absolute inset-0 opacity-30" />
            <div className="relative max-w-sm">
              <h3 className="font-display text-3xl font-semibold text-white">Collector Favorites</h3>
              <p className="mt-2 text-sm text-gray-300">Hand-picked hits for serious collectors.</p>
              <Link
                href="/#featured-right-now"
                className="mt-5 inline-flex rounded-md bg-brand-700 px-5 py-3 text-sm font-medium text-white hover:bg-brand-600"
              >
                Explore Favorites
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-[linear-gradient(135deg,rgba(36,18,62,0.75),rgba(9,13,22,0.95))] p-6">
            <div className="absolute right-6 top-4 opacity-40">
              <img src={settings.logoSquareUrl} alt={settings.brandName} className="h-24 w-24 object-contain" />
            </div>
            <div className="relative max-w-sm">
              <h3 className="font-display text-3xl font-semibold text-white">Patreon Access</h3>
              <p className="mt-2 text-sm text-gray-300">Exclusive drops, early access, and member-only perks.</p>
              <Link
                href="/category/patreon-access"
                className="mt-5 inline-flex rounded-md bg-brand-700 px-5 py-3 text-sm font-medium text-white hover:bg-brand-600"
              >
                Join the Community
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-8 border-t border-white/8 pt-8 md:grid-cols-[1.15fr_1fr_1fr_1fr_1.2fr]">
          <div>
            <img src={settings.logoWideUrl} alt={settings.brandName} className="h-12 w-auto object-contain" />
            <p className="mt-4 max-w-xs text-sm leading-7 text-gray-400">{settings.footerDescription}</p>
          </div>

          <div>
            <h4 className="mb-3 font-semibold text-white">Shop</h4>
            <ul className="space-y-1 text-sm text-gray-400">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link href={`/category/${category.slug}`} className="hover:text-white">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold text-white">Customer Care</h4>
            <ul className="space-y-1 text-sm text-gray-400">
              <li>
                <Link href={settings.footerContactHref} className="hover:text-white">
                  {settings.footerContactLabel}
                </Link>
              </li>
              <li>
                <Link href={settings.footerShippingHref} className="hover:text-white">
                  {settings.footerShippingLabel}
                </Link>
              </li>
              <li>
                <Link href={settings.footerFaqHref} className="hover:text-white">
                  {settings.footerFaqLabel}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold text-white">Company</h4>
            <ul className="space-y-1 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white">About Us</a></li>
              <li><a href="#" className="hover:text-white">Patreon Access</a></li>
              <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold text-white">Stay in the Loop</h4>
            <p className="mb-3 text-sm text-gray-400">Get updates on new releases and exclusive offers.</p>
            <div className="flex overflow-hidden rounded-md border border-white/10 bg-white/[0.03]">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-gray-500 outline-none"
              />
              <button className="bg-brand-700 px-5 py-3 text-sm font-medium text-white hover:bg-brand-600">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/8 pt-4">
          <div className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-300">
            $5.99 Flat Rate Shipping and Free Shipping on All Orders Over $149 | Below Market Price
            Guarantee on Most Products
          </div>
          <div className="text-xs text-gray-500">
            {renderLegalText(settings.footerLegalText, settings.brandName)}
          </div>
        </div>
      </div>
    </footer>
  );
}
