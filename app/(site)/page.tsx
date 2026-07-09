import Link from "next/link";
import { Carousel } from "@/components/Carousel";
import { HeroBannerCarousel } from "@/components/HeroBannerCarousel";
import { StorefrontShelfCard } from "@/components/StorefrontShelfCard";
import { getFeaturedProducts, getHomeCategoryPreviews, toCardProps } from "@/lib/products";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

const FEATURE_STRIP = [
  {
    title: "AUTHENTIC PRODUCTS",
    description: "100% authenticity guaranteed",
    icon: "⭐",
  },
  {
    title: "CAREFULLY PACKED",
    description: "Secure and collector grade shipping",
    icon: "📦",
  },
  {
    title: "FAST SHIPPING",
    description: "Quick dispatch on all orders",
    icon: "✈️",
  },
  {
    title: "COLLECTOR FIRST",
    description: "Community focused, collector driven",
    icon: "🏆",
  },
];

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function HeroFeaturedProductCard({
  product,
}: {
  product: {
    id: string;
    slug: string;
    name: string;
    priceCents: number;
    compareAtCents: number | null;
    quantity: number;
    images: { url: string }[];
  };
}) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(9,13,22,0.82),rgba(9,13,22,0.94))] p-3 shadow-[0_20px_60px_rgba(2,6,16,0.46)] backdrop-blur-xl transition hover:border-brand-400/60 hover:bg-[linear-gradient(180deg,rgba(16,22,38,0.92),rgba(9,13,22,0.98))]"
    >
      <div className="flex h-[72px] items-center justify-center overflow-hidden rounded-xl bg-white/[0.04] p-2">
        {product.images[0]?.url ? (
          <img
            src={product.images[0].url}
            alt={product.name}
            className="max-h-full w-auto object-contain transition duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">No Image</div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-medium leading-5 text-white">{product.name}</p>
          {product.quantity <= 1 ? (
            <span className="rounded-full border border-red-400/30 bg-red-500/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-red-200">
              Low
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-white">{formatPrice(product.priceCents)}</p>
            {product.compareAtCents && product.compareAtCents > product.priceCents ? (
              <p className="text-xs text-gray-500 line-through">{formatPrice(product.compareAtCents)}</p>
            ) : null}
          </div>
          <span className="inline-flex rounded-full border border-brand-300/30 bg-brand-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-100 transition group-hover:border-white/30 group-hover:bg-brand-500/20">
            Shop
          </span>
        </div>
      </div>
    </Link>
  );
}

function CategoryCard({
  category,
  image,
  compact = false,
}: {
  category: { slug: string; name: string };
  image: string | null;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1220] shadow-[0_14px_34px_rgba(2,6,16,0.36)]"
    >
      <div className="absolute inset-0">
        {image ? (
          <img
            src={image}
            alt={category.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.38),rgba(9,13,22,1)_70%)]" />
        )}
        <div
          className={
            compact
              ? "absolute inset-0 bg-[linear-gradient(180deg,rgba(9,13,22,0.12),rgba(9,13,22,0.88))]"
              : "absolute inset-0 bg-[linear-gradient(180deg,rgba(9,13,22,0.08),rgba(9,13,22,0.85))]"
          }
        />
      </div>

      <div className={compact ? "relative flex min-h-[158px] flex-col justify-end p-4" : "relative flex min-h-[210px] flex-col justify-end p-5"}>
        <h2
          className={
            compact
              ? "font-display text-[1.35rem] font-medium leading-tight text-white"
              : "font-display text-[1.75rem] font-medium text-white sm:text-[2rem]"
          }
        >
          {category.name}
        </h2>
        <div className={compact ? "mt-2" : "mt-3"}>
          <span
            className={
              compact
                ? "inline-flex rounded-md bg-brand-700 px-3 py-1.5 text-xs font-medium text-white transition group-hover:bg-brand-600"
                : "inline-flex rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white transition group-hover:bg-brand-600"
            }
          >
            Shop Now
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const [featured, settings, categoryPreviews] = await Promise.all([
    getFeaturedProducts(),
    getSiteSettings(),
    getHomeCategoryPreviews(5),
  ]);

  const carouselProducts = featured.map(toCardProps);
  const mobileCategoryPreviews = categoryPreviews.slice(0, 4);

  return (
    <div className="space-y-0">
      <section className="relative left-1/2 w-screen -translate-x-1/2 border-b-0 bg-[#090d16] sm:border-b sm:border-white/8">
        <div className="relative mx-auto max-w-[1500px] px-0 sm:px-4 sm:py-0">
          <HeroBannerCarousel slides={settings.heroSlides} brandName={settings.brandName} />

          {featured.length > 0 ? (
            <div className="pointer-events-none absolute inset-x-6 bottom-6 z-10 hidden xl:flex xl:justify-end">
              <div className="pointer-events-auto w-full max-w-[430px] rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,10,18,0.72),rgba(7,10,18,0.9))] p-4 shadow-[0_28px_80px_rgba(2,6,16,0.52)] backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-200/80">
                      Featured Right Now
                    </p>
                    <p className="mt-1 text-sm text-gray-300">Quick access to your top highlighted products.</p>
                  </div>
                  <Link
                    href="#featured-right-now"
                    className="rounded-full border border-white/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80 transition hover:border-white/30 hover:text-white"
                  >
                    View All
                  </Link>
                </div>

                <div className="space-y-3">
                  {featured.slice(0, 3).map((product) => (
                    <HeroFeaturedProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="relative left-1/2 w-screen -translate-x-1/2 border-b border-white/8 bg-[#0a0e17]">
        <div className="mx-auto grid max-w-[1500px] grid-cols-2 gap-px bg-white/8 px-0 sm:px-4 xl:grid-cols-4">
          {FEATURE_STRIP.map((item) => (
            <div
              key={item.title}
              className="flex min-h-[92px] items-start gap-3 bg-[#0a0e17] px-3 py-3 sm:min-h-[104px] sm:px-4 sm:py-4"
            >
              <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-brand-400/35 bg-brand-500/10 text-base sm:h-9 sm:w-9 sm:text-lg">
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-white sm:text-[10px] sm:tracking-[0.14em]">
                  {item.title}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-gray-400 sm:text-xs sm:leading-5">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-4">
        <div className="grid grid-cols-2 gap-3 lg:hidden">
          {mobileCategoryPreviews.map((category) => (
            <CategoryCard
              key={category.slug}
              category={category}
              image={settings.categoryBackgrounds[category.slug] || category.image || null}
              compact
            />
          ))}
        </div>

        <div className="hidden gap-4 lg:grid lg:grid-cols-5">
          {categoryPreviews.map((category) => (
            <CategoryCard
              key={category.slug}
              category={category}
              image={settings.categoryBackgrounds[category.slug] || category.image || null}
            />
          ))}
        </div>
      </section>

      <section id="featured-right-now" className="py-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-3xl font-medium text-white">{settings.featuredSectionTitle}</h2>
          <div className="hidden items-center gap-2 md:flex">
            <Link
              href={settings.heroSecondaryHref}
              className="rounded-md border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/[0.04] hover:text-white"
            >
              View All
            </Link>
          </div>
        </div>

        <div className="hidden gap-4 xl:grid xl:grid-cols-6">
          {featured.slice(0, 6).map((product) => (
            <StorefrontShelfCard
              key={product.id}
              id={product.id}
              slug={product.slug}
              name={product.name}
              priceCents={product.priceCents}
              compareAtCents={product.compareAtCents}
              image={product.images[0]?.url ?? null}
              quantity={product.quantity}
            />
          ))}
        </div>

        <div className="xl:hidden">
          <Carousel products={carouselProducts} />
        </div>
      </section>
    </div>
  );
}
