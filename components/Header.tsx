"use client";

import Link from "next/link";
import Image from "next/image";
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
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
        <Link href="/" className="flex-none">
          <Image src={settings.logoWideUrl} alt={settings.brandName} width={180} height={60} priority />
        </Link>

        <nav className="hidden flex-1 items-center gap-1 lg:flex">
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
                    ? "patreon-gradient rounded-md px-3 py-2 text-sm font-bold uppercase tracking-wide text-black shadow-[0_0_14px_rgba(212,175,55,0.5)]"
                    : "rounded-md px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-bg-panel hover:text-brand-300"
                }
              >
                {cat.name}
              </Link>
              {cat.subs.length > 0 && openSlug === cat.slug && (
                <div className="absolute left-0 top-full w-64 rounded-lg border border-border bg-bg-panel p-2 shadow-2xl">
                  {cat.subs.map((sub) => (
                    <Link
                      key={sub.slug}
                      href={`/category/${cat.slug}/${sub.slug}`}
                      className="block rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-bg-elevated hover:text-white"
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="hidden md:block md:flex-1 lg:flex-none">
          <SearchBar />
        </div>

        <button
          onClick={open}
          aria-label="Open cart"
          className="relative flex-none rounded-full border border-border p-2 hover:bg-bg-panel"
        >
          Cart
          {itemCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
              {itemCount}
            </span>
          )}
        </button>

        <button
          className="flex-none rounded-md border border-border p-2 text-white lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          Menu
        </button>
      </div>

      <div className="px-4 pb-3 md:hidden">
        <SearchBar />
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-bg-panel px-4 py-3 lg:hidden">
          {categories.map((cat) => (
            <div key={cat.slug} className="mb-2">
              <Link
                href={`/category/${cat.slug}`}
                className={
                  cat.navStyle === "patreon"
                    ? "patreon-gradient inline-block rounded-md px-3 py-1.5 text-sm font-bold uppercase text-black"
                    : "block py-1.5 text-sm font-semibold text-gray-200"
                }
              >
                {cat.name}
              </Link>
              {cat.subs.length > 0 && (
                <div className="ml-3 mt-1 space-y-1">
                  {cat.subs.map((sub) => (
                    <Link
                      key={sub.slug}
                      href={`/category/${cat.slug}/${sub.slug}`}
                      className="block text-xs text-gray-400"
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
    </header>
  );
}
