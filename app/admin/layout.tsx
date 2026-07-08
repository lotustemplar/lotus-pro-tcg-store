import "../globals.css";
import Link from "next/link";
import { getAdminSession } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/settings", label: "Site Settings" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/restock-signups", label: "Restock Signups" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-white">
        {session ? (
          <div className="flex min-h-screen">
            <aside className="w-60 flex-none border-r border-border bg-bg-panel px-4 py-6">
              <div className="mb-6 px-2 font-display text-lg font-bold text-brand-300">
                Lotus Pro Admin
              </div>
              <nav className="space-y-1">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-bg-elevated hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 border-t border-border pt-4">
                <Link href="/" className="block px-3 py-2 text-xs text-gray-500 hover:text-gray-300">
                  Back to storefront
                </Link>
                <LogoutButton />
              </div>
            </aside>
            <main className="flex-1 px-8 py-8">{children}</main>
          </div>
        ) : (
          <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
        )}
      </body>
    </html>
  );
}
