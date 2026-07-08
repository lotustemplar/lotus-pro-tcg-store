"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/format";

type Result = {
  slug: string;
  name: string;
  priceCents: number;
  image: string | null;
};

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div ref={wrapRef} className="relative w-full max-w-xl">
      <div className="lux-ring flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-xl transition focus-within:border-brand-400/70 focus-within:bg-white/[0.07]">
        <span className="text-xs uppercase tracking-[0.3em] text-gray-500">Search</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim()) {
              router.push(`/search?q=${encodeURIComponent(query)}`);
              setOpen(false);
            }
          }}
          placeholder="Search products, sets, sealed boxes, and more"
          className="w-full bg-transparent text-sm text-white placeholder-gray-500 outline-none"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-3 w-full overflow-hidden rounded-[24px] border border-white/10 bg-[#0e1423]/95 shadow-[0_30px_80px_rgba(4,8,20,0.58)] backdrop-blur-xl">
          {loading && <div className="px-4 py-3 text-sm text-gray-400">Searching...</div>}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-400">No matches yet.</div>
          )}
          {!loading &&
            results.map((r) => (
              <a
                key={r.slug}
                href={`/product/${r.slug}`}
                className="flex items-center gap-3 border-t border-white/5 px-4 py-3 first:border-t-0 hover:bg-white/[0.04]"
              >
                <div className="h-12 w-12 flex-none overflow-hidden rounded-2xl border border-white/10 bg-bg-elevated">
                  {r.image ? (
                    <img src={r.image} alt={r.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{r.name}</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Product match</div>
                </div>
                <div className="flex-none text-sm font-semibold text-brand-300">
                  {formatCents(r.priceCents)}
                </div>
              </a>
            ))}
        </div>
      )}
    </div>
  );
}
