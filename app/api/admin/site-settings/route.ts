import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { triggerNetlifyBuildHook } from "@/lib/netlify-build-hook";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SITE_SETTINGS, SITE_SETTINGS_ID, mergeSiteSettings } from "@/lib/site-settings";

const siteSettingsSchema = z.object({
  brandName: z.string().min(1),
  logoWideUrl: z.string().min(1),
  logoSquareUrl: z.string().min(1),
  heroBannerUrl: z.string().nullable().optional(),
  heroEyebrow: z.string().min(1),
  heroTitle: z.string().min(1),
  heroDescription: z.string().min(1),
  heroPrimaryLabel: z.string().min(1),
  heroPrimaryHref: z.string().min(1),
  heroSecondaryLabel: z.string().min(1),
  heroSecondaryHref: z.string().min(1),
  featuredSectionTitle: z.string().min(1),
  siteMetaTitle: z.string().min(1),
  siteMetaDescription: z.string().min(1),
  footerDescription: z.string().min(1),
  footerShopHeading: z.string().min(1),
  footerSupportHeading: z.string().min(1),
  footerShippingHeading: z.string().min(1),
  footerContactLabel: z.string().min(1),
  footerContactHref: z.string().min(1),
  footerShippingLabel: z.string().min(1),
  footerShippingHref: z.string().min(1),
  footerFaqLabel: z.string().min(1),
  footerFaqHref: z.string().min(1),
  footerShippingLinePrimary: z.string().min(1),
  footerShippingLineHighlight: z.string().min(1),
  footerLegalText: z.string().min(1),
  footerBottomPromoLeft: z.string().min(1),
  footerBottomPromoRight: z.string().min(1),
});

export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = siteSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = mergeSiteSettings({
    ...DEFAULT_SITE_SETTINGS,
    ...parsed.data,
  });

  await prisma.siteSettings.upsert({
    where: { id: SITE_SETTINGS_ID },
    update: data,
    create: {
      id: SITE_SETTINGS_ID,
      ...data,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/admin/settings");

  const deploy = await triggerNetlifyBuildHook();

  return NextResponse.json({ ok: true, deploy });
}
