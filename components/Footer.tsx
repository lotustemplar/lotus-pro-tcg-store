import Link from "next/link";
import Image from "next/image";
import type { NavCategory } from "@/lib/nav";
import type { SiteSettings } from "@/lib/site-settings";

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
            <Image src={settings.logoSquareUrl} alt={settings.brandName} width={72} height={72} />
            <p className="mt-3 text-sm text-gray-400">{settings.footerDescription}</p>
          </div>
          <div>
            <h4 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-white">Shop</h4>
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
            <h4 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-white">Support</h4>
            <ul className="space-y-1 text-sm text-gray-400">
              <li>
                <Link href="/contact" className="hover:text-brand-300">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:text-brand-300">
                  Shipping & Returns
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-brand-300">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-white">Shipping</h4>
            <p className="text-sm text-gray-400">Flat rate: $5.99 on every order.</p>
            <p className="text-sm text-brand-300">Free shipping on orders over $150.</p>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-gray-500 sm:flex-row">
          <p>
            Copyright {new Date().getFullYear()} {settings.brandName}. Not affiliated with Wizards
            of the Coast, Pokemon Company, Bandai, Riot Games, or Bushiroad.
          </p>
          <div className="flex items-center gap-3">
            <span>$5.99 flat shipping</span>
            <span>|</span>
            <span>Free shipping over $150</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
