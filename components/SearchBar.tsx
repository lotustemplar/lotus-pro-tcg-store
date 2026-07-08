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
    function onClickOutside(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
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
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setResults(data.results ?? []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5">
        <span className="text-sm text-gray-400">⌕</span>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && query.trim()) {
              router.push(`/search?q=${encodeURIComponent(query)}`);
              setOpen(false);
            }
          }}
          placeholder="Search products..."
          className="w-full bg-transparent text-sm text-white placeholder-gray-500 outline-none"
        />
      </div>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0e1422] shadow-[0_28px_70px_rgba(2,6,18,0.58)]">
          {loading && <div className="px-4 py-3 text-sm text-gray-400">Searching...</div>}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-400">No matches yet.</div>
          )}
          {!loading &&
            results.map((result) => (
              <a
                key={result.slug}
                href={`/product/${result.slug}`}
                className="flex items-center gap-3 border-t border-white/6 px-4 py-3 first:border-t-0 hover:bg-white/[0.03]"
              >
                <div className="h-10 w-10 overflow-hidden rounded-md bg-white/[0.04]">
                  {result.image ? (
                    <img src={result.image} alt={result.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 truncate text-sm text-white">{result.name}</div>
                <div className="text-sm text-brand-300">{formatCents(result.priceCents)}</div>
              </a>
            ))}
        </div>
      )}
    </div>
  );
}
