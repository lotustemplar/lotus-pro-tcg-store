import Link from "next/link";
import { Carousel } from "@/components/Carousel";
import { CATEGORY_TREE } from "@/lib/categories";
import { getFeaturedProducts, toCardProps } from "@/lib/products";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

const CATEGORY_SHOWCASE = [
  {
    slug: "magic-the-gathering",
    label: "Magic the Gathering",
    eyebrow: "Command the table",
    description: "Premium sealed product, Lotus-built decks, and collector-grade drops.",
    accent: "from-violet-500/35 via-fuchsia-500/10 to-transparent",
  },
  {
    slug: "pokemon",
    label: "Pokemon",
    eyebrow: "Chase the next hit",
    description: "Booster boxes, packs, and clean sealed inventory with fast rotation.",
    accent: "from-cyan-400/30 via-sky-500/8 to-transparent",
  },
  {
    slug: "one-piece",
    label: "One Piece",
    eyebrow: "Fast-moving sealed",
    description: "Sharp pricing on collector demand and current release momentum.",
    accent: "from-amber-400/26 via-orange-500/10 to-transparent",
  },
  {
    slug: "riftbound",
    label: "Riftbound",
    eyebrow: "Early-adopter heat",
    description: "A focused shelf for players watching the next breakout TCG closely.",
    accent: "from-emerald-400/24 via-teal-500/10 to-transparent",
  },
  {
    slug: "weiss-schwarz",
    label: "Weiss Schwarz",
    eyebrow: "Anime collector shelf",
    description: "Curated sealed product with a cleaner premium presentation.",
    accent: "from-pink-400/26 via-rose-500/10 to-transparent",
  },
  {
    slug: "accessories",
    label: "Accessories",
    eyebrow: "Finish the loadout",
    description: "Deck boxes, mats, and finishing pieces that belong beside premium inventory.",
    accent: "from-slate-300/18 via-slate-500/10 to-transparent",
  },
];

const TRUST_POINTS = [
  {
    title: "Curated Inventory",
    copy: "A tighter shelf built around what collectors and players actually want to buy now.",
  },
  {
    title: "Fast Category Discovery",
    copy: "Jump from Magic to Pokemon to One Piece without digging through generic store clutter.",
  },
  {
    title: "Premium Checkout Feel",
    copy: "Cleaner cards, stronger product hierarchy, and a storefront that feels more established.",
  },
];

function findCategory(slug: string) {
  return CATEGORY_TREE.find((category) => category.slug === slug);
}

export default async function HomePage() {
  const [featured, settings] = await Promise.all([getFeaturedProducts(), getSiteSettings()]);
  const carouselProducts = featured.map(toCardProps);

  return (
    <div className="space-y-20 pb-8 pt-2">
      <section className="relative overflow-hidden rounded-[36px] border border-white/10 px-6 py-7 shadow-[0_32px_120px_rgba(3,7,18,0.48)] sm:px-8 sm:py-9 lg:px-10 lg:py-12">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(92,42,166,0.32),rgba(10,14,24,0.82)_44%,rgba(212,175,55,0.1))]" />
        <div className="lux-grid absolute inset-0 opacity-35" />
        <div className="absolute -left-10 top-20 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -right-12 bottom-8 h-52 w-52 rounded-full bg-gold/10 blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.34em] text-brand-200">
              {settings.heroEyebrow}
            </div>

            <h1 className="mt-6 font-display text-5xl font-bold leading-[0.95] text-white sm:text-6xl xl:text-7xl">
              {settings.heroTitle}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-gray-300 sm:text-lg">
              {settings.heroDescription}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={settings.heroPrimaryHref}
                className="rounded-full bg-white px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-950 transition hover:bg-brand-100"
              >
                {settings.heroPrimaryLabel}
              </Link>
              <Link
                href={settings.heroSecondaryHref}
                className="rounded-full border border-white/12 bg-white/[0.05] px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:border-brand-400/60 hover:bg-white/[0.08]"
              >
                {settings.heroSecondaryLabel}
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 backdrop-blur-xl">
                <div className="font-display text-2xl font-bold text-white">{CATEGORY_TREE.length}</div>
                <div className="text-xs uppercase tracking-[0.26em] text-gray-400">Core IPs</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 backdrop-blur-xl">
                <div className="font-display text-2xl font-bold text-white">20+</div>
                <div className="text-xs uppercase tracking-[0.26em] text-gray-400">Product Lanes</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 backdrop-blur-xl">
                <div className="font-display text-2xl font-bold text-white">$5.99</div>
                <div className="text-xs uppercase tracking-[0.26em] text-gray-400">Flat Shipping</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#0e1527]/82 shadow-[0_20px_70px_rgba(4,8,20,0.45)]">
              {settings.heroBannerUrl ? (
                <div className="relative aspect-[12/8] w-full">
                  <img
                    src={settings.heroBannerUrl}
                    alt={`${settings.brandName} hero banner`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,20,0.08),rgba(8,10,20,0.84))]" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <div className="inline-flex rounded-full border border-white/12 bg-black/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-brand-200">
                      Collector Favorites
                    </div>
                    <p className="mt-3 max-w-sm font-display text-2xl font-bold text-white">
                      A sharper storefront built for sealed product, decks, and chase inventory.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative flex aspect-[12/8] flex-col justify-between overflow-hidden p-6">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.38),rgba(11,16,28,0.24)_42%,rgba(10,13,20,1))]" />
                  <div className="relative flex items-start justify-between">
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-gray-300">
                      Premium Stock
                    </span>
                    <img
                      src={settings.logoSquareUrl}
                      alt={settings.brandName}
                      className="h-16 w-16 rounded-2xl border border-white/10 bg-white/[0.05] p-2"
                    />
                  </div>
                  <div className="relative">
                    <p className="font-display text-4xl font-bold text-white">Lotus Pro TCG</p>
                    <p className="mt-3 max-w-sm text-sm leading-7 text-gray-300">
                      Built around the games, categories, and product lanes serious buyers actually shop.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {CATEGORY_TREE.slice(0, 3).map((category) => (
                <Link
                  key={category.slug}
                  href={`/category/${category.slug}`}
                  className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 transition hover:-translate-y-1 hover:border-brand-400/60 hover:bg-white/[0.06]"
                >
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Curated IP</p>
                  <p className="mt-2 font-display text-lg font-bold text-white">{category.name}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.88fr_1.12fr] xl:items-start">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-brand-300">
              Collector Categories
            </p>
            <h2 className="mt-3 font-display text-4xl font-bold text-white sm:text-5xl">
              Browse by game, not by store clutter.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-8 text-gray-400">
              Each lane is treated like its own curated storefront so buyers can jump straight into
              the exact TCG and product style they are hunting.
            </p>
          </div>

          <div className="grid gap-3">
            {TRUST_POINTS.map((point) => (
              <div
                key={point.title}
                className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5"
              >
                <p className="font-display text-xl font-bold text-white">{point.title}</p>
                <p className="mt-2 text-sm leading-7 text-gray-400">{point.copy}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {CATEGORY_SHOWCASE.map((item) => {
            const category = findCategory(item.slug);
            if (!category) return null;

            return (
              <Link
                key={item.slug}
                href={`/category/${item.slug}`}
                className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0d1322]/90 p-5 shadow-[0_18px_45px_rgba(4,8,20,0.34)] transition hover:-translate-y-1 hover:border-white/20"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.accent}`} />
                <div className="relative">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gray-400">
                    {item.eyebrow}
                  </p>
                  <h3 className="mt-3 font-display text-2xl font-bold text-white">{item.label}</h3>
                  <p className="mt-3 text-sm leading-7 text-gray-300">{item.description}</p>
                  <div className="mt-6 flex items-center justify-between text-xs uppercase tracking-[0.24em]">
                    <span className="text-gray-500">{category.subs.length || 1} lanes</span>
                    <span className="text-brand-300 transition group-hover:text-white">Enter shelf</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {carouselProducts.length > 0 && (
        <section id="featured-right-now" className="rounded-[34px] border border-white/10 bg-[#0d1220]/86 px-6 py-7 shadow-[0_28px_90px_rgba(4,8,18,0.42)] sm:px-7 lg:px-8 lg:py-8">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-brand-300">
                Featured Shelf
              </p>
              <h2 className="mt-2 font-display text-4xl font-bold text-white">
                {settings.featuredSectionTitle}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
                Spotlighted inventory with a more polished collector-first presentation and faster product scanning.
              </p>
            </div>

            <Link
              href={settings.heroPrimaryHref}
              className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-white transition hover:border-brand-400/60 hover:bg-white/[0.07]"
            >
              Shop Sealed
            </Link>
          </div>

          <Carousel products={carouselProducts} />
        </section>
      )}
    </div>
  );
}
