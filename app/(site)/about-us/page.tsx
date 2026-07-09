import type { Metadata } from "next";
import Link from "next/link";
import { buildSocialMetadata } from "@/lib/metadata";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

const COMMUNITY_POINTS = [
  {
    title: "Family-Owned and Collector-Built",
    description:
      "Lotus Pro Decks started with a simple idea: take the same passion we bring to our own collections, decks, and events, and turn it into a store that treats every customer like part of the community.",
  },
  {
    title: "Always In The Community",
    description:
      "We do not just sell TCG products from a distance. We stay active in the scene, keep up with releases, talk strategy, follow the market, and stay plugged into the same games and conversations our customers care about.",
  },
  {
    title: "Competitive Mindset, Personal Service",
    description:
      "From tournament tables to collector chats, we understand that players and collectors want more than a checkout page. They want trustworthy products, honest communication, and people behind the store who actually know the hobby.",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = `About Us`;
  const description =
    "Learn how Lotus Pro Decks grew from a small family-owned passion project into a community-driven TCG storefront built by collectors and competitors.";

  return {
    title,
    description,
    ...buildSocialMetadata({
      title: `${title} | ${settings.brandName}`,
      description,
      path: "/about-us",
      image: settings.logoSquareUrl,
      siteName: settings.brandName,
    }),
  };
}

export default async function AboutUsPage() {
  const settings = await getSiteSettings();

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(56,28,102,0.82),rgba(10,14,24,0.98))] shadow-[0_24px_80px_rgba(3,8,20,0.42)]">
        <div className="grid gap-8 px-6 py-8 sm:px-10 sm:py-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-200/85">
              About {settings.brandName}
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-white sm:text-5xl">
              A small family-owned business sharing our love of trading card games with the world.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-gray-200 sm:text-base">
              What started as a family passion for TCGs grew into a storefront built around the same things
              we value most ourselves: authentic products, strong community ties, competitive energy, and a
              real love for the hobby. We created {settings.brandName} to give players, collectors, and fans
              a place that feels personal, trustworthy, and genuinely part of the scene.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-100/80">
              What Drives Us
            </p>
            <div className="mt-4 space-y-4 text-sm leading-6 text-gray-200">
              <p>
                We are constantly around the community, following releases, talking with other players,
                watching trends, and staying close to the games we love.
              </p>
              <p>
                We also bring a competitive mindset to what we do. We know the excitement of chasing the right
                deck, the right sealed product, and the right pickup at the right time, because we live that
                same experience ourselves.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {COMMUNITY_POINTS.map((point) => (
          <article
            key={point.title}
            className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,23,38,0.94),rgba(10,14,24,0.98))] p-6 shadow-[0_18px_44px_rgba(2,6,16,0.34)]"
          >
            <h2 className="font-display text-2xl font-medium text-white">{point.title}</h2>
            <p className="mt-3 text-sm leading-7 text-gray-300">{point.description}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[32px] border border-white/10 bg-[#0b111d] p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="font-display text-3xl font-semibold text-white">More Than Just A Store</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-gray-300">
              <p>
                We believe the best TCG businesses are built by people who are actually in the hobby, not just
                around it. That means staying connected to players, collectors, local scenes, major releases,
                competitive play, and the culture that makes trading card games special in the first place.
              </p>
              <p>
                Whether you are hunting sealed product, grabbing something for your next event, or adding to a
                long-term collection, our goal is to make every order feel like it came from people who
                understand why it matters.
              </p>
              <p>
                We are proud to be growing as a family-run business, and even more proud to do it alongside a
                wider community that shares the same excitement we do every time a new set drops.
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-brand-400/20 bg-[linear-gradient(180deg,rgba(91,53,168,0.18),rgba(9,13,22,0.24))] p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-200">
              Join The Journey
            </p>
            <p className="mt-4 text-sm leading-7 text-gray-200">
              We are here to keep building, keep competing, keep collecting, and keep sharing the hobby with
              more people every day.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/category/magic-the-gathering"
                className="rounded-md bg-brand-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
              >
                Shop The Store
              </Link>
              <Link
                href="/category/patreon-access"
                className="rounded-md border border-white/12 px-5 py-3 text-sm font-medium text-gray-200 transition hover:bg-white/[0.04] hover:text-white"
              >
                Join Our Community
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
