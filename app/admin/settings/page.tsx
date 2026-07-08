import { getSiteSettings } from "@/lib/site-settings";
import { SiteSettingsForm } from "./SiteSettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Site Settings</h1>
        <p className="mt-2 text-sm text-gray-400">
          Control storefront branding, hero content, and your main visual assets from the admin.
        </p>
      </div>
      <SiteSettingsForm initial={settings} />
    </div>
  );
}
