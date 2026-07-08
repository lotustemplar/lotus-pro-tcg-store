"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const scrollY = window.scrollY;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#090d16]/95 backdrop-blur">
      <div className="relative mx-auto max-w-[1500px] px-4">
        <div className="flex items-center gap-5 py-3">
          <Link href="/" className="flex-none">
            <img
              src={settings.logoWideUrl}
              alt={settings.brandName}
              className="h-8 w-auto object-contain sm:h-10 md:h-12"
            />
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-5 xl:flex">
            {categories.map((category) => (
              <div
                key={category.slug}
                className="relative"
                onMouseEnter={() => setOpenSlug(category.slug)}
                onMouseLeave={() => setOpenSlug(null)}
              >
                <Link
                  href={`/category/${category.slug}`}
                  className={
                    category.navStyle === "patreon"
                      ? "text-sm font-medium text-gold transition hover:text-white"
                      : "text-sm font-medium text-white/90 transition hover:text-brand-200"
                  }
                >
                  {category.name}
                </Link>
                {category.subs.length > 0 && openSlug === category.slug && (
                  <div className="absolute left-1/2 top-full z-30 mt-4 w-72 -translate-x-1/2 rounded-2xl border border-white/12 bg-[#0b1020] p-2 shadow-[0_24px_60px_rgba(2,6,16,0.68)]">
                    {category.subs.map((sub) => (
                      <Link
                        key={sub.slug}
                        href={`/category/${category.slug}/${sub.slug}`}
                        className="block rounded-xl bg-[#12192b] px-4 py-3 text-sm text-gray-200 transition hover:bg-[#1a2338] hover:text-white"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="hidden w-full max-w-sm xl:block">
            <SearchBar />
          </div>

          <div className="hidden items-center gap-3 xl:flex">
            <button
              type="button"
              aria-label="Account"
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-300 transition hover:bg-white/[0.04]"
            >
              ♡
            </button>
            <button
              type="button"
              onClick={open}
              aria-label="Open cart"
              className="relative rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-300 transition hover:bg-white/[0.04]"
            >
              Cart
              {itemCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </button>
          </div>

          <div className="ml-auto flex items-center gap-3 xl:hidden">
            <button
              type="button"
              onClick={open}
              aria-label="Open cart"
              className="relative rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-300 transition hover:bg-white/[0.04]"
            >
              Cart
              {itemCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </button>
            <button
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/[0.04]"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label="Toggle menu"
            >
              Menu
            </button>
          </div>
        </div>

        <div className="pb-3 xl:hidden">
          <SearchBar />
        </div>

        {mobileOpen && (
          <div className="absolute inset-x-4 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/8 bg-[#0b1020]/96 shadow-[0_20px_60px_rgba(2,6,16,0.45)] xl:hidden">
            <div className="max-h-[calc(100dvh-11rem)] overflow-y-auto overscroll-contain px-4 pb-8 pt-4">
              {categories.map((category) => (
                <div key={category.slug} className="mb-4 last:mb-0">
                  <Link
                    href={`/category/${category.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className={
                      category.navStyle === "patreon"
                        ? "text-sm font-semibold uppercase tracking-[0.14em] text-gold"
                        : "text-base font-semibold text-white"
                    }
                  >
                    {category.name}
                  </Link>
                  {category.subs.length > 0 && (
                    <div className="mt-2 space-y-1.5 pl-3">
                      {category.subs.map((sub) => (
                        <Link
                          key={sub.slug}
                          href={`/category/${category.slug}/${sub.slug}`}
                          onClick={() => setMobileOpen(false)}
                          className="block text-[11px] uppercase leading-5 tracking-[0.12em] text-gray-400"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
