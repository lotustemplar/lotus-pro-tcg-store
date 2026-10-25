import Link from "next/link";

const SIZES = [768, 1280, 2048];
const set = (ext: string) => SIZES.map((w) => `/hero/autumn-warm-up-${w}.${ext} ${w}w`).join(", ");

/** Fall 2026 hero. Static optimized files in /public/hero (AVIF + WebP, 3 widths).
 *  Box uses the image's own 8:3 ratio + object-contain, so no text is cropped on any screen. */
export function AutumnHeroBanner({ href = "/category/magic-the-gathering" }: { href?: string }) {
  return (
    <Link href={href} className="block bg-[#120f1d]" aria-label="Autumn Warm Up Sale: shop new inventory">
      <picture>
        <source type="image/avif" srcSet={set("avif")} sizes="(min-width: 1500px) 1080px, (min-width: 1024px) 70vw, 100vw" />
        <source type="image/webp" srcSet={set("webp")} sizes="(min-width: 1500px) 1080px, (min-width: 1024px) 70vw, 100vw" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero/autumn-warm-up-1280.webp"
          alt="Autumn Warm Up Sale: cozy up with our new inventory and low prices"
          width={2048}
          height={768}
          fetchPriority="high"
          decoding="async"
          className="aspect-[8/3] h-auto w-full object-contain lg:h-full lg:min-h-[400px]"
        />
      </picture>
    </Link>
  );
}
