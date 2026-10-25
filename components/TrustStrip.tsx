import type { SellerStats } from "@/lib/seller-stats";

const fmt = (n: number) => n.toLocaleString("en-US");

export function TrustStrip({ stats }: { stats: SellerStats }) {
  const items = [
    {
      name: "Mana Pool",
      href: stats.manapool.url,
      rating: `${stats.manapool.averageRating.toFixed(2)}★`,
      detail: `${fmt(stats.manapool.ratings365d)} ratings · ${fmt(stats.manapool.salesAllTime)} sales`,
    },
    {
      name: "TCGplayer",
      href: stats.tcgplayer.url,
      rating: `${Number(stats.tcgplayer.ratingPercent.toFixed(1))}%`,
      detail: `${stats.tcgplayer.sales} sales`,
    },
  ];

  return (
    <section aria-label="Seller ratings" className="mt-8 border-t border-white/10 pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-white">Verified seller on Mana Pool &amp; TCGplayer</p>
        <ul className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          {items.map((item) => (
            <li key={item.name}>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-baseline gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-gray-300 transition hover:border-brand-400/60 hover:text-white"
              >
                <span className="font-semibold text-white">{item.name}</span>
                <span className="font-semibold text-emerald-300">{item.rating}</span>
                <span className="text-gray-400">{item.detail}</span>
                <span aria-hidden="true" className="text-gray-500">↗</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
