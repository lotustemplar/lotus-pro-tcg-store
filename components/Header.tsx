"use client";

import Link from "next/link";
import { useState } from "react";
import type { NavCategory } from "@/lib/nav";
import type { SiteSettings } from "@/lib/site-settings";
import { SearchBar } from "./SearchBar";
import { useCart } from "./CartContext";

export function Header({
  categories,
  settings,
}: {
  categories: NavCategory[];
  settings: SiteSettings;
}) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { itemCount, open } = useCart();

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="mx-auto max-w-7xl space-y-3">
        <div className="lux-panel flex items-center justify-between rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.34em] text-gray-300">
          <span className="truncate">{settings.heroEyebrow}</span>
          <div className="hidden items-center gap-3 text-[10px] text-gray-400 sm:flex">
            <span>{settings.footerBottomPromoLeft}</span>
            <span className="text-brand-400">/</span>
            <span>{settings.footerBottomPromoRight}</span>
          </div>
        </div>

        <div className="lux-panel rounded-[28px] px-4 py-4 sm:px-5">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex min-w-0 flex-none items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-2.5">
                <img
                  src={settings.logoSquareUrl}
                  alt={`${settings.brandName} mark`}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="hidden min-w-0 md:block">
                <div className="truncate font-display text-xl font-bold tracking-[0.08em] text-white">
                  {settings.brandName}
                </div>
                <div className="truncate text-[11px] uppercase tracking-[0.28em] text-gray-500">
                  Collector-grade storefront
                </div>
              </div>
            </Link>

            <nav className="hidden flex-1 items-center justify-center gap-1 xl:flex">
              {categories.map((cat) => (
                <div
                  key={cat.slug}
                  className="relative"
                  onMouseEnter={() => setOpenSlug(cat.slug)}
                  onMouseLeave={() => setOpenSlug(null)}
                >
                  <Link
                    href={`/category/${cat.slug}`}
                    className={
                      cat.navStyle === "patreon"
                        ? "patreon-gradient rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-black shadow-[0_0_18px_rgba(212,175,55,0.35)]"
                        : "rounded-full px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-white/8 hover:text-white"
                    }
                  >
                    {cat.name}
                  </Link>
                  {cat.subs.length > 0 && openSlug === cat.slug && (
                    <div className="absolute left-1/2 top-[calc(100%+14px)] z-30 w-72 -translate-x-1/2 overflow-hidden rounded-[24px] border border-white/10 bg-[#0d1322]/95 p-2 shadow-[0_30px_70px_rgba(3,8,20,0.56)] backdrop-blur-xl">
                      {cat.subs.map((sub) => (
                        <Link
                          key={sub.slug}
                          href={`/category/${cat.slug}/${sub.slug}`}
                          className="block rounded-2xl px-4 py-3 text-sm text-gray-300 transition hover:bg-white/[0.05] hover:text-white"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            <div className="hidden min-w-0 flex-1 xl:block xl:max-w-md xl:flex-none">
              <SearchBar />
            </div>

            <button
              onClick={open}
              aria-label="Open cart"
              className="relative flex-none rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-brand-400/60 hover:bg-white/[0.08]"
            >
              Cart
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </button>

            <button
              className="flex-none rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08] xl:hidden"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label="Toggle menu"
            >
              Menu
            </button>
          </div>

          <div className="mt-4 xl:hidden">
            <SearchBar />
          </div>

          {mobileOpen && (
            <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-4 xl:hidden">
              {categories.map((cat) => (
                <div key={cat.slug} className="mb-3 last:mb-0">
                  <Link
                    href={`/category/${cat.slug}`}
                    className={
                      cat.navStyle === "patreon"
                        ? "patreon-gradient inline-block rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-black"
                        : "block py-1 text-sm font-semibold text-gray-100"
                    }
                  >
                    {cat.name}
                  </Link>
                  {cat.subs.length > 0 && (
                    <div className="ml-3 mt-2 space-y-2 border-l border-white/10 pl-4">
                      {cat.subs.map((sub) => (
                        <Link
                          key={sub.slug}
                          href={`/category/${cat.slug}/${sub.slug}`}
                          className="block text-xs uppercase tracking-[0.18em] text-gray-500"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
