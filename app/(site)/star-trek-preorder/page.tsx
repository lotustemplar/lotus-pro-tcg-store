import type { Metadata } from "next";
import { StarTrekPreorderSection } from "@/components/StarTrekPreorderSection";
import { getStarTrekPreorderProducts } from "@/lib/products";
import { STORE_CATALOG_REVALIDATE_SECONDS } from "@/lib/storefront-cache";

export const revalidate = STORE_CATALOG_REVALIDATE_SECONDS;
export const metadata: Metadata = {
  title: "Star Trek Pre-Order | Lotus Pro TCG",
  description: "Pre-order Magic: The Gathering Star Trek sealed product: play booster boxes, bundles, collector boosters and Commander decks.",
};

export default async function StarTrekPreorderPage() {
  const products = await getStarTrekPreorderProducts();
  return <StarTrekPreorderSection products={products} showHeaderLink={false} />;
}
