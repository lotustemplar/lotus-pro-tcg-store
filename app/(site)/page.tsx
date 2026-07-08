import Link from "next/link";
import { Carousel } from "@/components/Carousel";
import { CATEGORY_TREE } from "@/lib/categories";
import { getFeaturedProducts, toCardProps } from "@/lib/products";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, settings] = await Promise.all([getFeaturedProducts(), getSiteSettings()]);
  const carouselProducts = featured.map(toCardProps);

  return (
    <div className="space-y-16">
      <section className="overflow-hidden rounded-3xl border border-border bg-bg-panel p-6 sm:p-8 lg:p-10">
        <div className={`gap-8 ${settings.heroBannerUrl ? "grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center" : ""}`}>
          <div className={settings.heroBannerUrl ? "" : "text-center"}>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-400">
              {settings.heroEyebrow}
            </p>
            <h1
              className={`font-display text-4xl font-bold leading-tight text-white sm:text-6xl ${
                settings.heroBannerUrl ? "max-w-3xl" : "mx-auto max-w-3xl"
              }`}
            >
              {settings.heroTitle}
            </h1>
            <p
              className={`mt-4 text-gray-400 ${
                settings.heroBannerUrl ? "max-w-2xl" : "mx-auto max-w-2xl"
              }`}
            >
              {settings.heroDescription}
            </p>
            <div className={`mt-8 flex flex-wrap gap-3 ${settings.heroBannerUrl ? "" : "justify-center"}`}>
              <Link
                href={settings.heroPrimaryHref}
                className="rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-500"
              >
                {settings.heroPrimaryLabel}
              </Link>
              <Link
                href={settings.heroSecondaryHref}
                className="rounded-full border border-border bg-bg-elevated px-6 py-3 text-sm font-semibold text-gray-200 hover:border-brand-500 hover:text-brand-300"
              >
                {settings.heroSecondaryLabel}
              </Link>
            </div>
            <div className={`mt-8 flex flex-wrap gap-3 ${settings.heroBannerUrl ? "" : "justify-center"}`}>
              {CATEGORY_TREE.slice(0, 5).map((c) => (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  className="rounded-full border border-border bg-bg-elevated px-5 py-2 text-sm font-semibold text-gray-200 hover:border-brand-500 hover:text-brand-300"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>

          {settings.heroBannerUrl && (
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-bg-elevated shadow-[0_0_40px_rgba(124,58,237,0.2)]">
              <div className="relative aspect-[12/5] w-full">
                <img
                  src={settings.heroBannerUrl}
                  alt={`${settings.brandName} hero banner`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {carouselProducts.length > 0 && (
        <section id="featured-right-now">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-white">
              {settings.featuredSectionTitle}
            </h2>
          </div>
          <Carousel products={carouselProducts} />
        </section>
      )}
    </div>
  );
}
