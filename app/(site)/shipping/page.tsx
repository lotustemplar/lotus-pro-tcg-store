import type { Metadata } from "next";
import { ReturnsPolicyContent } from "@/components/ReturnsPolicyContent";
import { buildSocialMetadata } from "@/lib/metadata";
import { getSiteSettings } from "@/lib/site-settings";
import { STORE_CONFIG_REVALIDATE_SECONDS } from "@/lib/storefront-cache";

export const revalidate = STORE_CONFIG_REVALIDATE_SECONDS;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = "Shipping & Returns";
  const description =
    "Review the Lotus Pro TCG shipping and final-sale returns policy. Trading cards, sealed product, and accessories are not eligible for return or refund.";

  return {
    title,
    description,
    ...buildSocialMetadata({
      title: `${title} | ${settings.brandName}`,
      description,
      path: "/shipping",
      image: settings.logoSquareUrl,
      siteName: settings.brandName,
    }),
  };
}

export default async function ShippingPage() {
  const settings = await getSiteSettings();

  return <ReturnsPolicyContent brandName={settings.brandName} />;
}
