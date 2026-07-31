import type { Metadata } from "next";
import { ReturnsPolicyContent } from "@/components/ReturnsPolicyContent";
import { buildSocialMetadata } from "@/lib/metadata";
import { getSiteSettings } from "@/lib/site-settings";
import { STORE_CONFIG_REVALIDATE_SECONDS } from "@/lib/storefront-cache";

export const revalidate = STORE_CONFIG_REVALIDATE_SECONDS;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = "Returns & Refund Policy";
  const description =
    "Review the Lotus Pro TCG final-sale policy for trading cards, sealed product, and accessories. All sales are final and returns are not accepted.";

  return {
    title,
    description,
    ...buildSocialMetadata({
      title: `${title} | ${settings.brandName}`,
      description,
      path: "/returns",
      image: settings.logoSquareUrl,
      siteName: settings.brandName,
    }),
  };
}

export default async function ReturnsPage() {
  const settings = await getSiteSettings();

  return <ReturnsPolicyContent brandName={settings.brandName} />;
}
