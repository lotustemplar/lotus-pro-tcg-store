"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CATEGORY_SORT_OPTIONS, type CategorySortOption } from "@/lib/products";

export function CategoryPageControls({
  sort,
  hideOutOfStock,
}: {
  sort: CategorySortOption;
  hideOutOfStock: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(nextSort: CategorySortOption, nextHideOutOfStock: boolean) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextSort === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", nextSort);
    }

    if (nextHideOutOfStock) {
      params.set("hide-out-of-stock", "1");
    } else {
      params.delete("hide-out-of-stock");
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-bg-panel/80 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Browse Controls</p>
        <p className="mt-1 text-sm text-gray-300">Sort products and hide sold-out items while you shop.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-3 text-sm text-gray-200">
          <span className="whitespace-nowrap">Sort By</span>
          <select
            value={sort}
            onChange={(event) => updateParams(event.target.value as CategorySortOption, hideOutOfStock)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
          >
            {CATEGORY_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm text-gray-200">
          <input
            type="checkbox"
            checked={hideOutOfStock}
            onChange={(event) => updateParams(sort, event.target.checked)}
            className="h-4 w-4"
          />
          Hide out of stock
        </label>
      </div>
    </div>
  );
}
