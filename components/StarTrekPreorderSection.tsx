import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { toCardProps, type ProductCardData } from "@/lib/products";

// Pure-CSS starfield + sci-fi grid (no images; ~0 KB extra).
const stars =
  "radial-gradient(1px 1px at 12% 18%,#fff,transparent),radial-gradient(1px 1px at 72% 32%,#cfe8ff,transparent),radial-gradient(1.5px 1.5px at 38% 74%,#fff,transparent),radial-gradient(1px 1px at 88% 82%,#fff,transparent),radial-gradient(1px 1px at 55% 12%,#bde0ff,transparent),radial-gradient(1px 1px at 22% 58%,#fff,transparent),radial-gradient(1.5px 1.5px at 92% 8%,#fff,transparent),radial-gradient(1px 1px at 64% 92%,#cfe8ff,transparent)";

export function StarTrekPreorderSection({ products, showHeaderLink = true }: { products: ProductCardData[]; showHeaderLink?: boolean }) {
  return (
    <section
      id="star-trek-preorder"
      className="relative left-1/2 my-4 w-screen -translate-x-1/2 overflow-hidden border-y border-cyan-400/20 py-10"
      style={{ background: "radial-gradient(ellipse at 50% -10%,rgba(56,189,248,.28),transparent 60%),radial-gradient(ellipse at 90% 110%,rgba(168,85,247,.22),transparent 55%),#03060f" }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-80" style={{ backgroundImage: stars, backgroundSize: "320px 320px" }} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-30"
        style={{
          backgroundImage: "linear-gradient(rgba(56,189,248,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,.5) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "linear-gradient(to top,#000,transparent)",
          WebkitMaskImage: "linear-gradient(to top,#000,transparent)",
          transform: "perspective(400px) rotateX(55deg)",
          transformOrigin: "bottom",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">Magic: The Gathering × Star Trek</p>
            <h2 className="font-display text-3xl font-medium text-white drop-shadow-[0_0_12px_rgba(56,189,248,.6)]">Star Trek Pre-Order</h2>
          </div>
          {showHeaderLink && (
            <Link href="/star-trek-preorder" className="rounded-md border border-cyan-300/40 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-400/20">
              View all Star Trek pre-orders →
            </Link>
          )}
        </div>
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} {...toCardProps(p)} />
            ))}
          </div>
        ) : (
          <p className="text-cyan-100/80">Star Trek pre-orders are coming soon.</p>
        )}
      </div>
    </section>
  );
}
