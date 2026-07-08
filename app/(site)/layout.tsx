import type { Metadata } from "next";
import "../globals.css";
import { CartProvider } from "@/components/CartContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { getNavCategories } from "@/lib/nav";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: {
    default: "Lotus Pro Decks | MTG, Pokemon, One Piece, Riftbound & Weiss Schwarz",
    template: "%s | Lotus Pro Decks",
  },
  description:
    "Sealed product, singles, and pro-built decks for Magic the Gathering, Pokemon, One Piece, Riftbound, and Weiss Schwarz.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [categories, settings] = await Promise.all([getNavCategories(), getSiteSettings()]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-white">
        <CartProvider>
          <Header categories={categories} settings={settings} />
          <main className="mx-auto min-h-[60vh] max-w-7xl px-4 py-8">{children}</main>
          <Footer categories={categories} settings={settings} />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
