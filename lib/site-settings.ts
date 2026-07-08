import { prisma } from "./prisma";

export const SITE_SETTINGS_ID = "site";

export const DEFAULT_SITE_SETTINGS = {
  brandName: "Lotus Pro Decks",
  logoWideUrl: "/logo/logo-wide.svg",
  logoSquareUrl: "/logo/logo-square.svg",
  heroBannerUrl: null as string | null,
  heroEyebrow: "Expert-Built · Limited Runs · Every Major TCG",
  heroTitle: "Your Store for MTG, Pokemon, One Piece, Riftbound & Weiss Schwarz",
  heroDescription:
    "Sealed cases, booster boxes, booster packs, pro-built Commander decks, and more — shipped fast with a flat $5.99 rate, free over $150.",
  heroPrimaryLabel: "Shop Magic",
  heroPrimaryHref: "/category/magic-the-gathering",
  heroSecondaryLabel: "View Featured",
  heroSecondaryHref: "/#featured-right-now",
  footerDescription:
    "Sealed product, singles, and pro-built decks for Magic, Pokemon, One Piece, Riftbound, and Weiss Schwarz.",
};

export type SiteSettings = typeof DEFAULT_SITE_SETTINGS;

type SiteSettingsRecord = Partial<SiteSettings> | null | undefined;

function requiredValue(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function optionalValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function mergeSiteSettings(record: SiteSettingsRecord): SiteSettings {
  return {
    brandName: requiredValue(record?.brandName, DEFAULT_SITE_SETTINGS.brandName),
    logoWideUrl: requiredValue(record?.logoWideUrl, DEFAULT_SITE_SETTINGS.logoWideUrl),
    logoSquareUrl: requiredValue(record?.logoSquareUrl, DEFAULT_SITE_SETTINGS.logoSquareUrl),
    heroBannerUrl: optionalValue(record?.heroBannerUrl),
    heroEyebrow: requiredValue(record?.heroEyebrow, DEFAULT_SITE_SETTINGS.heroEyebrow),
    heroTitle: requiredValue(record?.heroTitle, DEFAULT_SITE_SETTINGS.heroTitle),
    heroDescription: requiredValue(record?.heroDescription, DEFAULT_SITE_SETTINGS.heroDescription),
    heroPrimaryLabel: requiredValue(record?.heroPrimaryLabel, DEFAULT_SITE_SETTINGS.heroPrimaryLabel),
    heroPrimaryHref: requiredValue(record?.heroPrimaryHref, DEFAULT_SITE_SETTINGS.heroPrimaryHref),
    heroSecondaryLabel: requiredValue(record?.heroSecondaryLabel, DEFAULT_SITE_SETTINGS.heroSecondaryLabel),
    heroSecondaryHref: requiredValue(record?.heroSecondaryHref, DEFAULT_SITE_SETTINGS.heroSecondaryHref),
    footerDescription: requiredValue(record?.footerDescription, DEFAULT_SITE_SETTINGS.footerDescription),
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: SITE_SETTINGS_ID },
  });

  return mergeSiteSettings(settings);
}
