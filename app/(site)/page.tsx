import Link from "next/link";
import { Carousel } from "@/components/Carousel";
import { HeroBannerCarousel } from "@/components/HeroBannerCarousel";
import {
  MobileHeroFeaturedWidget,
  RotatingFeaturedShelf,
  RotatingHeroFeaturedList,
} from "@/components/RotatingFeaturedProducts";
import {
  getFeaturedProducts,
  getHomeCategoryPreviews,
  toCardProps,
} from "@/lib/products";
import { isExclusiveSaleFeaturedOrder } from "@/lib/featured-home";
import { getSiteSettings } from "@/lib/site-settings";
import { STORE_CATALOG_REVALIDATE_SECONDS } from "@/lib/storefront-cache";

export const revalidate = STORE_CATALOG_REVALIDATE_SECONDS;
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

const FEEDBACK_METRICS = [
  {
    value: "99.9%",
    label: "Positive Feedback",
    detail: "30, 90 & 365 Days",
    accentClassName:
      "border-emerald-200/80 bg-[linear-gradient(180deg,rgba(240,253,244,0.98),rgba(236,253,245,0.9))] text-emerald-700",
    icon: "shield",
  },
  {
    value: "15,180",
    label: "Lifetime Ratings",
    detail: "0.1% Neutral  |  0% Negative",
    accentClassName:
      "border-sky-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.98),rgba(243,248,255,0.9))] text-sky-700",
    icon: "badge",
  },
  {
    value: "2,954",
    label: "Confirmed Orders",
    detail: "Lifetime Total",
    accentClassName:
      "border-violet-200/80 bg-[linear-gradient(180deg,rgba(245,243,255,0.98),rgba(249,245,255,0.9))] text-violet-700",
    icon: "bag",
  },
] as const;

const FEEDBACK_RATINGS = [
  { label: "Grading" },
  { label: "Accuracy" },
  { label: "Packaging" },
] as const;

function FeedbackIcon({ kind, className = "h-7 w-7" }: { kind: "shield" | "badge" | "bag" | "star"; className?: string }) {
  if (kind === "shield") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path
          d="M12 2.5 4.5 5.4v5.4c0 5 3.1 9.6 7.5 10.7 4.4-1.1 7.5-5.7 7.5-10.7V5.4L12 2.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="m8.6 12.2 2.1 2.2 4.7-4.9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (kind === "badge") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path
          d="M12 2.8 14.7 6l4 .6-2.9 2.9.7 4.1L12 11.8 7.5 13.6l.7-4.1L5.3 6.6l4-.6L12 2.8Z"
          fill="currentColor"
        />
        <path
          d="M7.5 14.6v5.1l4.5-2.2 4.5 2.2v-5.1"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (kind === "bag") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path
          d="M7 8.3V7a5 5 0 0 1 10 0v1.3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M5.1 8.3h13.8l-1 10.9a1.8 1.8 0 0 1-1.8 1.6H7.9a1.8 1.8 0 0 1-1.8-1.6l-1-10.9Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="m9.2 13.1 1.9 1.9 3.7-4"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="m12 2.9 2.8 5.8 6.4.9-4.6 4.4 1.1 6.2L12 17.2l-5.7 3 1.1-6.2L2.8 9.6l6.4-.9L12 2.9Z" />
    </svg>
  );
}

function Laurel({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 60 96"
      fill="none"
      className={flip ? "h-14 w-9 scale-x-[-1] text-amber-400/90 sm:h-16 sm:w-10" : "h-14 w-9 text-amber-400/90 sm:h-16 sm:w-10"}
      aria-hidden="true"
    >
      <path
        d="M47 7C29 20 18 40 16 64c0 10 3 19 10 25"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {[
        "38 18c5 1 9 5 10 10-5 0-10-2-13-6",
        "31 28c5 1 9 5 10 10-5 0-10-2-13-6",
        "25 39c5 1 9 5 10 10-5 0-10-2-13-6",
        "20 51c5 1 9 5 10 10-5 0-10-2-13-6",
        "18 64c5 1 9 5 10 10-5 0-10-2-13-6",
      ].map((leaf) => (
        <path key={leaf} d={leaf} fill="currentColor" opacity="0.95" />
      ))}
    </svg>
  );
}

function FeedbackTestimonialsSection() {
  return (
    <section id="feedback-testimonials" className="py-8 sm:py-10">
      <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(246,248,253,0.97)_55%,rgba(234,240,251,0.97))] shadow-[0_34px_80px_rgba(2,6,23,0.45)]">
        <div className="px-4 pb-6 pt-6 sm:px-6 sm:pb-8 sm:pt-8 lg:px-10 lg:pt-10">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
              Feedback & Testimonials
            </p>
            <div className="mt-4 flex items-center justify-center gap-3 sm:gap-5">
              <Laurel />
              <div className="flex items-center gap-2 text-amber-400 sm:gap-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <FeedbackIcon key={index} kind="star" className="h-5 w-5 sm:h-6 sm:w-6" />
                ))}
              </div>
              <h2 className="font-display text-[2rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[3.4rem] lg:text-[5.2rem]">
                Trusted Feedback
              </h2>
              <div className="hidden items-center gap-3 text-amber-400 md:flex">
                {Array.from({ length: 3 }).map((_, index) => (
                  <FeedbackIcon key={index} kind="star" className="h-6 w-6" />
                ))}
              </div>
              <div className="hidden md:block">
                <Laurel flip />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-4 text-slate-300">
              <div className="hidden h-px w-16 bg-slate-300/80 sm:block lg:w-40" />
              <div className="flex flex-wrap items-center justify-center gap-3 rounded-full border border-sky-200 bg-white px-5 py-3 shadow-[0_10px_30px_rgba(59,130,246,0.12)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.3)]">
                  <FeedbackIcon kind="shield" className="h-6 w-6" />
                </div>
                <p className="text-left text-lg font-medium text-slate-900 sm:text-[1.05rem]">
                  <span className="font-semibold text-sky-700">Verified Seller</span> on eBay, TCGplayer &amp; ManaPool
                </p>
              </div>
              <div className="hidden h-px w-16 bg-slate-300/80 sm:block lg:w-40" />
            </div>
          </div>

          <div className="mt-8 grid gap-4 xl:grid-cols-[1.15fr_1.15fr_1.15fr_0.8fr_0.8fr_0.8fr]">
            {FEEDBACK_METRICS.map((item) => (
              <div
                key={item.label}
                className={`rounded-[24px] border px-4 py-5 shadow-[0_12px_30px_rgba(148,163,184,0.12)] sm:px-5 ${item.accentClassName}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 flex-none items-center justify-center rounded-full border border-current/15 bg-white/75 shadow-inner">
                    <FeedbackIcon kind={item.icon} className="h-8 w-8" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[2.2rem] font-semibold leading-none tracking-[-0.05em] sm:text-[3rem]">
                      {item.value}
                    </p>
                    <p className="mt-2 text-lg font-semibold leading-tight text-slate-900">{item.label}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                  </div>
                </div>
              </div>
            ))}

            {FEEDBACK_RATINGS.map((item) => (
              <div
                key={item.label}
                className="rounded-[24px] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,248,220,0.92))] px-4 py-5 text-center text-amber-500 shadow-[0_12px_30px_rgba(251,191,36,0.12)]"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-amber-200 bg-white/75 shadow-inner">
                  <FeedbackIcon kind="star" className="h-8 w-8" />
                </div>
                <div className="mt-5 flex justify-center gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <FeedbackIcon key={index} kind="star" className="h-4 w-4" />
                  ))}
                </div>
                <p className="mt-3 text-[1.1rem] font-semibold text-slate-900">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 border-t border-sky-950/10 bg-[linear-gradient(135deg,#081a43,#0d245f_54%,#112d76)] px-4 py-5 text-white sm:px-6 lg:grid-cols-2 lg:px-10">
          <div className="flex items-center justify-center gap-4 rounded-[22px] border border-white/12 bg-white/[0.03] px-4 py-4 text-center lg:justify-start lg:text-left">
            <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-[radial-gradient(circle_at_top,#60a5fa,#4338ca)] shadow-[0_0_30px_rgba(96,165,250,0.35)]">
              <FeedbackIcon kind="shield" className="h-8 w-8 text-white" />
            </div>
            <p className="text-lg text-slate-100">
              <span className="font-semibold text-white">Top-rated service.</span> Consistently excellent customer feedback.
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 rounded-[22px] border border-white/12 bg-white/[0.03] px-4 py-4 text-center lg:justify-start lg:text-left">
            <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full border border-white/20 bg-white/10">
              <FeedbackIcon kind="shield" className="h-8 w-8 text-white" />
            </div>
            <p className="text-lg text-slate-100">
              <span className="font-semibold text-white">Trusted across multiple marketplaces.</span> Built on repeat buyers and verified sales.
            </p>
          </div>
        </div>
      </div>
    </section>
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
  const inStockFeaturedProducts = featured.filter((product) => product.quantity > 0);
  const exclusiveFeaturedProduct =
    inStockFeaturedProducts.find((product) => isExclusiveSaleFeaturedOrder(product.featuredOrder)) ?? null;
  const regularFeaturedProducts = inStockFeaturedProducts.filter(
    (product) => product.id !== exclusiveFeaturedProduct?.id,
  );
  const rotatingHeroProducts = regularFeaturedProducts;

  const carouselProducts = regularFeaturedProducts.map(toCardProps);
  const mobileCategoryPreviews = categoryPreviews.slice(0, 4);

  return (
    <div className="space-y-0">
      <section className="relative left-1/2 w-screen -translate-x-1/2 border-b-0 bg-[#090d16] sm:border-b sm:border-white/8">
        <div
          className={`relative mx-auto max-w-[1500px] px-0 sm:px-4 sm:py-0 ${
            inStockFeaturedProducts.length > 0 ? "lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch lg:gap-4 lg:px-4 lg:py-4" : ""
          }`}
        >
          <div className="min-w-0">
            <HeroBannerCarousel slides={settings.heroSlides} brandName={settings.brandName} />
          </div>

          {inStockFeaturedProducts.length > 0 ? (
            <div className="hidden lg:flex lg:min-h-full lg:justify-end">
              <div className="hot-products-card w-full max-w-[420px] rounded-[28px] border border-red-300/45 bg-[linear-gradient(180deg,rgba(20,9,8,0.78),rgba(7,10,18,0.96))] p-4 backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-100 drop-shadow-[0_0_10px_rgba(251,146,60,0.42)]">
                      HOT PRODCUTS!
                    </p>
                  </div>
                  <Link
                    href="#featured-right-now"
                    className="rounded-full border border-red-200/35 bg-black/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-50 transition hover:border-orange-200/60 hover:text-white"
                  >
                    View All
                  </Link>
                </div>

                <RotatingHeroFeaturedList
                  exclusiveProduct={exclusiveFeaturedProduct}
                  products={rotatingHeroProducts}
                />
              </div>
            </div>
          ) : null}
        </div>

        {inStockFeaturedProducts.length > 0 ? (
          <div className="relative z-10 -mt-14 px-3 pb-3 lg:hidden">
            <MobileHeroFeaturedWidget
              exclusiveProduct={exclusiveFeaturedProduct}
              products={rotatingHeroProducts}
            />
          </div>
        ) : null}
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

        {regularFeaturedProducts.length > 0 ? (
          <>
            <div className="hidden xl:block">
              <RotatingFeaturedShelf products={regularFeaturedProducts} />
            </div>

            <div className="xl:hidden">
              <Carousel products={carouselProducts} featuredStockOverlay />
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-5 py-8 text-center text-gray-400">
            Your featured carousel is currently empty because the only featured product is pinned in the exclusive hero slot.
          </div>
        )}
      </section>

      <FeedbackTestimonialsSection />
    </div>
  );
}
