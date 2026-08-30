import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MysteryBundleBuyButton } from "@/components/MysteryBundleBuyButton";
import { MYSTERY_BUNDLE_BATCH_SIZE, MYSTERY_BUNDLE_SKU } from "@/lib/mystery-bundle";

export const dynamic = "force-dynamic";

const bundleDetails = [
  ["01", "Fully randomized bundles", "Every bundle is randomized and pre-made before purchase."],
  ["02", "Premium odds", "3 in 8 bundles include a Premium or Ultra Premium pack."],
] as const;

export default async function MysteryBoosterBagPage() {
  let heroImageUrl: string | null = null;
  let mysteryBundleProduct: { id: string; slug: string; name: string; priceCents: number; quantity: number; image: string | null } | null = null;

  try {
    heroImageUrl = (await prisma.mysteryBagSettings.findUnique({
      where: { id: "mystery-bag" },
      select: { heroImageUrl: true },
    }))?.heroImageUrl ?? null;
    const product = await prisma.product.findUnique({
      where: { sku: MYSTERY_BUNDLE_SKU },
      select: {
        id: true,
        slug: true,
        name: true,
        priceCents: true,
        quantity: true,
        images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
      },
    });
    mysteryBundleProduct = product ? { ...product, image: product.images[0]?.url ?? null } : null;
  } catch {
    // The public page can render the launch state while the optional optimizer database is unavailable.
  }

  const batchSize = MYSTERY_BUNDLE_BATCH_SIZE;
  const remainingCount = mysteryBundleProduct
    ? Math.min(batchSize, Math.max(0, mysteryBundleProduct.quantity))
    : 0;
  const soldCount = batchSize - remainingCount;
  const soldPercent = (soldCount / batchSize) * 100;

  return (
    <div className="space-y-16 py-4 sm:py-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-gold/20 bg-[radial-gradient(circle_at_80%_20%,rgba(212,175,55,0.17),transparent_30%),linear-gradient(135deg,rgba(31,18,52,0.96),rgba(8,12,23,0.98))] px-6 py-12 sm:px-12 sm:py-20">
        {heroImageUrl && (
          <>
            <img src={heroImageUrl} alt="Mystery Booster Bundle" className="absolute inset-0 h-full w-full object-cover opacity-35" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,12,23,0.98)_0%,rgba(8,12,23,0.84)_46%,rgba(8,12,23,0.35)_100%)]" />
          </>
        )}
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-gold/10" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">Lotus Pro TCG · limited sealed run</p>
          <h1 className="mt-5 font-display text-5xl font-bold leading-[1.04] tracking-tight text-white sm:text-7xl">MYSTERY BOOSTER BUNDLE</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-300">
            A locked 3–6 pack bundle built from sealed inventory with a minimum value of $25 per bundle.
          </p>
          <div className="mt-8 space-y-4">
            {mysteryBundleProduct ? (
              <MysteryBundleBuyButton product={mysteryBundleProduct} />
            ) : (
              <p className="rounded-xl border border-gold/30 bg-gold/10 px-5 py-3 text-sm font-semibold text-gold">Bundle checkout is being prepared.</p>
            )}
            <p className="max-w-xl text-xs leading-5 text-gray-500">*Fine print: Free shipping does not apply to Mystery Booster Bundles. A flat $5.99 shipping rate applies.</p>
            <Link href="#how-it-works" className="inline-flex rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white">See how it works</Link>
          </div>
        </div>
      </section>

      <section id="bundle-details" className="grid gap-5 sm:grid-cols-3">
        <div className="lux-panel rounded-2xl p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">Every bundle</p>
          <p className="mt-3 font-display text-3xl font-bold text-white">3–6 packs</p>
          <p className="mt-2 text-sm text-gray-400">Sealed packs randomized and locked before purchase.</p>
        </div>
        <div className="lux-panel rounded-2xl p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">Guaranteed floor</p>
          <p className="mt-3 font-display text-3xl font-bold text-white">$25 minimum</p>
          <p className="mt-2 text-sm text-gray-400">Every bundle carries at least $25 in published market value.</p>
        </div>
        <div className="lux-panel rounded-2xl p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Limited batch</p>
          <p className="mt-3 font-display text-3xl font-bold text-white">30 prizes</p>
          <p className="mt-2 text-sm text-gray-400">This run is limited to 30 pre-made mystery bundles.</p>
        </div>
      </section>

      <section className="lux-panel rounded-3xl border-gold/20 p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Limited run · buy yours now!</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">This batch is moving.</h2>
          </div>
          <p className="font-display text-2xl font-bold text-white"><span className="text-gold">{soldCount}</span> sold <span className="text-gray-500">/ {batchSize}</span></p>
        </div>
        <div className="mt-6" aria-label={`${soldCount} of ${batchSize} mystery bundles sold`}>
          <div className="h-5 overflow-hidden rounded-full border border-white/10 bg-black/35 p-1">
            <div className="mystery-counter-shake h-full rounded-full bg-[linear-gradient(90deg,#7c3aed,#d4af37)] shadow-[0_0_18px_rgba(212,175,55,0.55)]" style={{ width: `${soldPercent}%` }} />
          </div>
          <div className="mt-3 flex justify-between text-sm font-semibold">
            <span className="text-gold">{soldCount} sold</span>
            <span className="text-gray-300">{remainingCount} left</span>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="grid items-start gap-10 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-300">What you can hit</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">Randomized before the seal.</h2>
          <div className="mt-7 space-y-6">
            {bundleDetails.map(([number, title, description]) => (
              <div key={number} className="flex gap-4">
                <span className="font-mono text-sm text-gold">{number}</span>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">{title}</h3>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-gray-400">{description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-gold/20 bg-gold/[0.06] p-5">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-gold">Premium or Ultra Premium odds</p>
            <p className="mt-2 text-2xl font-bold text-white">3 in 8 bundles</p>
            <p className="mt-2 text-sm leading-6 text-gray-400">That is a 37.5% chance of receiving a bundle with a Premium or Ultra Premium pack.</p>
          </div>
        </div>

        <div className="lux-panel rounded-3xl p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Built in advance</p>
              <h3 className="mt-2 font-display text-2xl font-bold text-white">Locked and ready</h3>
            </div>
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-300">Sealed</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-gray-400">Each bundle is pre-made from sealed inventory, then numbered and locked before it is offered for sale.</p>
          <div className="mt-6 space-y-2">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3"><p className="text-sm text-gray-200">3–6 sealed packs per bundle</p></div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3"><p className="text-sm text-gray-200">$25 minimum bundle value</p></div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3"><p className="text-sm text-gray-200">30 prizes in this limited batch</p></div>
          </div>
        </div>
      </section>

    </div>
  );
}
