import type { Metadata } from "next";
import "../globals.css";
import { CartProvider } from "@/components/CartContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { StickyPromoBar } from "@/components/StickyPromoBar";
import { getNavCategories } from "@/lib/nav";
import { getSiteSettings } from "@/lib/site-settings";
import { buildSocialMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = settings.siteMetaTitle;
  const description = settings.siteMetaDescription;

  return {
    title: {
      default: title,
      template: `%s | ${settings.brandName}`,
    },
    description,
    ...buildSocialMetadata({
      title,
      description,
      image: settings.logoSquareUrl,
      siteName: settings.brandName,
    }),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [categories, settings] = await Promise.all([getNavCategories(), getSiteSettings()]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-bg pb-20 text-white sm:pb-14">
        <CartProvider>
          <Header categories={categories} settings={settings} />
          <main className="mx-auto min-h-[60vh] max-w-[1500px] px-4 py-8">{children}</main>
          <Footer categories={categories} settings={settings} />
          <StickyPromoBar />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
