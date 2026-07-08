"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
    <div ref={wrapRef} className="relative w-full max-w-md">
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
        placeholder="Search products, sets, singles..."
        className="w-full rounded-full border border-border bg-bg-panel px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500"
      />
      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-border bg-bg-panel shadow-2xl">
          {loading && <div className="px-4 py-3 text-sm text-gray-400">Searching...</div>}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-400">No matches yet.</div>
          )}
          {!loading &&
            results.map((r) => (
              <a
                key={r.slug}
                href={`/product/${r.slug}`}
                className="flex items-center gap-3 px-4 py-2 hover:bg-bg-elevated"
              >
                <div className="relative h-10 w-10 flex-none overflow-hidden rounded bg-bg-elevated">
                  {r.image && <Image src={r.image} alt={r.name} fill className="object-cover" />}
                </div>
                <div className="flex-1 truncate text-sm text-white">{r.name}</div>
                <div className="flex-none text-sm text-brand-300">{formatCents(r.priceCents)}</div>
              </a>
            ))}
        </div>
      )}
    </div>
  );
}
