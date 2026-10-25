import Image from "next/image";
import Link from "next/link";
import { Carousel } from "@/components/Carousel";
import { TrustStrip } from "@/components/TrustStrip";
import { getSellerStats } from "@/lib/seller-stats";
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
import { getStorefrontSiteSettings } from "@/lib/site-settings";
import { STORE_CATALOG_REVALIDATE_SECONDS } from "@/lib/storefront-cache";

export const revalidate = STORE_CATALOG_REVALIDATE_SECONDS;
export const dynamic = "force-dynamic";

const FEATURE_STRIP = [
  {
    title: "Authentic Products",
    description: "100% authenticity guaranteed",
  },
  {
    title: "Carefully Packed",
    description: "Secure and collector grade shipping",
  },
  {
    title: "Fast Shipping",
    description: "Quick dispatch on all orders",
  },
  {
    title: "Collector First",
    description: "Community focused, collector driven",
  },
];

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
          <Image
            src={image}
            alt={category.name}
            fill
            sizes={compact ? "50vw" : "(min-width: 1024px) 20vw, 50vw"}
            className="object-cover transition duration-500 group-hover:scale-105"
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
  const [featured, settings, categoryPreviews, sellerStats] = await Promise.all([
    getFeaturedProducts(),
    getStorefrontSiteSettings(),
    getHomeCategoryPreviews(5),
    getSellerStats(),
  ]);
  const inStockFeaturedProducts = featured.filter((product) => product.quantity > 0);
  const exclusiveFeaturedProduct =
    inStockFeaturedProducts.find((product) => isExclusiveSaleFeaturedOrder(product.featuredOrder)) ?? null;
  const regularFeaturedProducts = inStockFeaturedProducts.filter(
    (product) => product.id !== exclusiveFeaturedProduct?.id,
  );
  const rotatingHeroProducts = regularFeaturedProducts;

  const carouselProducts = regularFeaturedProducts.map(toCardProps);
  const mobileCategoryPreviews = categoryPreviews;

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
                    <p className="text-sm font-bold uppercase tracking-[0.14em] text-orange-100">
                      Hot Products
                    </p>
                  </div>
                  <Link
                    href="#featured-right-now"
                    className="rounded-full border border-red-200/35 bg-black/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-orange-50 transition hover:border-orange-200/60 hover:text-white"
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
              className="flex items-start gap-3 bg-[#0a0e17] px-4 py-4 sm:px-5 sm:py-5"
            >
              <span aria-hidden="true" className="mt-1.5 h-2 w-2 flex-none rounded-full bg-brand-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white sm:text-base">
                  {item.title}
                </p>
                <p className="mt-1 text-sm leading-5 text-gray-300">
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
            New sealed product is on the way. Check back soon.
          </div>
        )}
      </section>

      <TrustStrip stats={sellerStats} />
    </div>
  );
}
