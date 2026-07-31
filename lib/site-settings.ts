import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { isStorefrontConnectionError, logStorefrontFallback } from "./storefront-db";
import { STORE_CACHE_TAGS, STORE_CONFIG_REVALIDATE_SECONDS } from "./storefront-cache";

export const SITE_SETTINGS_ID = "site";
const LEGACY_BRAND_NAME = "Lotus Pro Decks";
const CURRENT_BRAND_NAME = "Lotus Pro TCG";
const LEGACY_FREE_SHIPPING_COPY = {
  heroDescription:
    "Sealed cases, booster boxes, booster packs, pro-built Commander decks, and more - shipped fast with a flat $5.99 rate, free over $150.",
  footerShippingLineHighlight: "Free shipping on orders over $150.",
  footerBottomPromoRight: "Free shipping over $150",
} as const;
const CURRENT_FREE_SHIPPING_COPY = {
  heroDescription:
    "Sealed cases, booster boxes, booster packs, pro-built Commander decks, and more - shipped fast with a flat $5.99 rate, free over $75.",
  footerShippingLineHighlight: "Free shipping on orders over $75.",
  footerBottomPromoRight: "Free shipping over $75",
} as const;
const RECOVERY_SITE_BRANDING = {
  logoWideUrl: "/branding/recovery/logo-wide.webp",
  logoSquareUrl: "/branding/recovery/logo-square.webp",
  heroBannerUrl: "/branding/recovery/hero-banner.png",
  heroSlides: [
    {
      id: "legacy-slide-1",
      name: "Hero Banner",
      imageUrl: "/branding/recovery/hero-slide-1.webp",
      buttonLabel: "Shop Magic",
      buttonHref: "/category/magic-the-gathering",
    },
  ],
  categoryBackgrounds: {
    pokemon: "/branding/recovery/category-pokemon.webp",
    "one-piece": "/branding/recovery/category-one-piece.webp",
    "magic-the-gathering": "/branding/recovery/category-magic-the-gathering.webp",
    riftbound: "/branding/recovery/category-riftbound.webp",
    "weiss-schwarz": "/branding/recovery/category-weiss-schwarz.webp",
  },
} as const;

export type HeroSlide = {
  id: string;
  name: string;
  imageUrl: string | null;
  buttonLabel: string;
  buttonHref: string;
};

export type CategoryBackgroundMap = Record<string, string | null>;

export type SiteSettings = {
  brandName: string;
  logoWideUrl: string;
  logoSquareUrl: string;
  heroBannerUrl: string | null;
  heroSlides: HeroSlide[];
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroPrimaryLabel: string;
  heroPrimaryHref: string;
  heroSecondaryLabel: string;
  heroSecondaryHref: string;
  categoryBackgrounds: CategoryBackgroundMap;
  featuredSectionTitle: string;
  siteMetaTitle: string;
  siteMetaDescription: string;
  footerDescription: string;
  footerShopHeading: string;
  footerSupportHeading: string;
  footerShippingHeading: string;
  footerContactLabel: string;
  footerContactHref: string;
  footerShippingLabel: string;
  footerShippingHref: string;
  footerFaqLabel: string;
  footerFaqHref: string;
  footerShippingLinePrimary: string;
  footerShippingLineHighlight: string;
  footerLegalText: string;
  footerBottomPromoLeft: string;
  footerBottomPromoRight: string;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  brandName: CURRENT_BRAND_NAME,
  logoWideUrl: "/logo/logo-wide.svg",
  logoSquareUrl: "/logo/logo-square.svg",
  heroBannerUrl: null,
  heroSlides: [],
  heroEyebrow: "Expert-Built - Limited Runs - Every Major TCG",
  heroTitle: "Your Store for MTG, Pokemon, One Piece, Riftbound & Weiss Schwarz",
  heroDescription: CURRENT_FREE_SHIPPING_COPY.heroDescription,
  heroPrimaryLabel: "Shop Magic",
  heroPrimaryHref: "/category/magic-the-gathering",
  heroSecondaryLabel: "View Featured",
  heroSecondaryHref: "/#featured-right-now",
  categoryBackgrounds: {},
  featuredSectionTitle: "Featured Right Now",
  siteMetaTitle: "Lotus Pro TCG | MTG, Pokemon, One Piece, Riftbound & Weiss Schwarz",
  siteMetaDescription:
    "Sealed product, singles, and pro-built decks for Magic the Gathering, Pokemon, One Piece, Riftbound, and Weiss Schwarz.",
  footerDescription:
    "Sealed product, singles, and pro-built decks for Magic, Pokemon, One Piece, Riftbound, and Weiss Schwarz.",
  footerShopHeading: "Shop",
  footerSupportHeading: "Support",
  footerShippingHeading: "Shipping",
  footerContactLabel: "Contact Us",
  footerContactHref: "/contact",
  footerShippingLabel: "Shipping & Returns",
  footerShippingHref: "/shipping",
  footerFaqLabel: "FAQ",
  footerFaqHref: "/faq",
  footerShippingLinePrimary: "Flat rate: $5.99 on every order.",
  footerShippingLineHighlight: CURRENT_FREE_SHIPPING_COPY.footerShippingLineHighlight,
  footerLegalText:
    "Copyright {year} {brandName}. Not affiliated with Wizards of the Coast, Pokemon Company, Bandai, Riot Games, or Bushiroad.",
  footerBottomPromoLeft: "$5.99 flat shipping",
  footerBottomPromoRight: CURRENT_FREE_SHIPPING_COPY.footerBottomPromoRight,
};

function normalizeLegacyBrandValue(value: string) {
  return value.replaceAll(LEGACY_BRAND_NAME, CURRENT_BRAND_NAME);
}

function normalizeLegacyFreeShippingCopy(value: string) {
  if (value === LEGACY_FREE_SHIPPING_COPY.heroDescription) {
    return CURRENT_FREE_SHIPPING_COPY.heroDescription;
  }

  if (value === LEGACY_FREE_SHIPPING_COPY.footerShippingLineHighlight) {
    return CURRENT_FREE_SHIPPING_COPY.footerShippingLineHighlight;
  }

  if (value === LEGACY_FREE_SHIPPING_COPY.footerBottomPromoRight) {
    return CURRENT_FREE_SHIPPING_COPY.footerBottomPromoRight;
  }

  return value;
}

type SiteSettingsRecord =
  | (Partial<Omit<SiteSettings, "heroSlides" | "categoryBackgrounds">> & {
      heroSlides?: HeroSlide[];
      heroSlidesJson?: string | null;
      categoryBackgrounds?: CategoryBackgroundMap;
      categoryBackgroundsJson?: string | null;
    })
  | null
  | undefined;

function requiredValue(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function optionalValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeHeroSlide(slide: Partial<HeroSlide> | null | undefined, index: number): HeroSlide | null {
  const name = requiredValue(slide?.name, `Slide ${index + 1}`);
  const buttonLabel = requiredValue(slide?.buttonLabel, "Shop Now");
  const buttonHref = requiredValue(slide?.buttonHref, "/");
  const imageUrl = optionalValue(slide?.imageUrl);

  if (!imageUrl) return null;

  return {
    id: requiredValue(slide?.id, `slide-${index + 1}`),
    name,
    imageUrl,
    buttonLabel,
    buttonHref,
  };
}

function resolveHeroSlides(record: SiteSettingsRecord): HeroSlide[] {
  const slidesSource =
    record?.heroSlides ??
    parseJson<Partial<HeroSlide>[]>(record?.heroSlidesJson, []);

  const normalized = slidesSource
    .map((slide, index) => normalizeHeroSlide(slide, index))
    .filter((slide): slide is HeroSlide => !!slide);

  if (normalized.length > 0) {
    return normalized;
  }

  const legacyBanner = optionalValue(record?.heroBannerUrl);
  if (!legacyBanner) {
    return [];
  }

  return [
    {
      id: "legacy-slide-1",
      name: "Hero Banner",
      imageUrl: legacyBanner,
      buttonLabel: requiredValue(record?.heroPrimaryLabel, DEFAULT_SITE_SETTINGS.heroPrimaryLabel),
      buttonHref: requiredValue(record?.heroPrimaryHref, DEFAULT_SITE_SETTINGS.heroPrimaryHref),
    },
  ];
}

function resolveCategoryBackgrounds(record: SiteSettingsRecord): CategoryBackgroundMap {
  const backgrounds =
    record?.categoryBackgrounds ??
    parseJson<CategoryBackgroundMap>(record?.categoryBackgroundsJson, {});

  return Object.fromEntries(
    Object.entries(backgrounds).map(([slug, value]) => [slug, optionalValue(value)]),
  );
}

function hasCustomBrandAsset(
  value: string | null | undefined,
  defaultValue: string,
) {
  const trimmed = optionalValue(value);
  return !!trimmed && trimmed !== defaultValue;
}

function applyRecoveredBranding(record: SiteSettingsRecord): SiteSettingsRecord {
  const next = record ? { ...record } : {};
  const needsBrandRecovery =
    !hasCustomBrandAsset(next.logoWideUrl, DEFAULT_SITE_SETTINGS.logoWideUrl) &&
    !hasCustomBrandAsset(next.logoSquareUrl, DEFAULT_SITE_SETTINGS.logoSquareUrl) &&
    resolveHeroSlides(next).length === 0;

  if (!needsBrandRecovery) {
    return next;
  }

  next.logoWideUrl = RECOVERY_SITE_BRANDING.logoWideUrl;
  next.logoSquareUrl = RECOVERY_SITE_BRANDING.logoSquareUrl;
  next.heroBannerUrl = RECOVERY_SITE_BRANDING.heroBannerUrl;
  next.heroSlides = RECOVERY_SITE_BRANDING.heroSlides.map((slide) => ({ ...slide }));
  next.heroSlidesJson = JSON.stringify(RECOVERY_SITE_BRANDING.heroSlides);

  if (Object.values(resolveCategoryBackgrounds(next)).every((value) => !value)) {
    next.categoryBackgrounds = { ...RECOVERY_SITE_BRANDING.categoryBackgrounds };
    next.categoryBackgroundsJson = JSON.stringify(RECOVERY_SITE_BRANDING.categoryBackgrounds);
  }

  return next;
}

export function mergeSiteSettings(record: SiteSettingsRecord): SiteSettings {
  const resolvedRecord = applyRecoveredBranding(record);
  const merged: SiteSettings = {
    brandName: requiredValue(resolvedRecord?.brandName, DEFAULT_SITE_SETTINGS.brandName),
    logoWideUrl: requiredValue(resolvedRecord?.logoWideUrl, DEFAULT_SITE_SETTINGS.logoWideUrl),
    logoSquareUrl: requiredValue(resolvedRecord?.logoSquareUrl, DEFAULT_SITE_SETTINGS.logoSquareUrl),
    heroBannerUrl: optionalValue(resolvedRecord?.heroBannerUrl),
    heroSlides: resolveHeroSlides(resolvedRecord),
    heroEyebrow: requiredValue(resolvedRecord?.heroEyebrow, DEFAULT_SITE_SETTINGS.heroEyebrow),
    heroTitle: requiredValue(resolvedRecord?.heroTitle, DEFAULT_SITE_SETTINGS.heroTitle),
    heroDescription: requiredValue(resolvedRecord?.heroDescription, DEFAULT_SITE_SETTINGS.heroDescription),
    heroPrimaryLabel: requiredValue(resolvedRecord?.heroPrimaryLabel, DEFAULT_SITE_SETTINGS.heroPrimaryLabel),
    heroPrimaryHref: requiredValue(resolvedRecord?.heroPrimaryHref, DEFAULT_SITE_SETTINGS.heroPrimaryHref),
    heroSecondaryLabel: requiredValue(
      resolvedRecord?.heroSecondaryLabel,
      DEFAULT_SITE_SETTINGS.heroSecondaryLabel,
    ),
    heroSecondaryHref: requiredValue(
      resolvedRecord?.heroSecondaryHref,
      DEFAULT_SITE_SETTINGS.heroSecondaryHref,
    ),
    categoryBackgrounds: resolveCategoryBackgrounds(resolvedRecord),
    featuredSectionTitle: requiredValue(
      resolvedRecord?.featuredSectionTitle,
      DEFAULT_SITE_SETTINGS.featuredSectionTitle,
    ),
    siteMetaTitle: requiredValue(resolvedRecord?.siteMetaTitle, DEFAULT_SITE_SETTINGS.siteMetaTitle),
    siteMetaDescription: requiredValue(
      resolvedRecord?.siteMetaDescription,
      DEFAULT_SITE_SETTINGS.siteMetaDescription,
    ),
    footerDescription: requiredValue(resolvedRecord?.footerDescription, DEFAULT_SITE_SETTINGS.footerDescription),
    footerShopHeading: requiredValue(resolvedRecord?.footerShopHeading, DEFAULT_SITE_SETTINGS.footerShopHeading),
    footerSupportHeading: requiredValue(
      resolvedRecord?.footerSupportHeading,
      DEFAULT_SITE_SETTINGS.footerSupportHeading,
    ),
    footerShippingHeading: requiredValue(
      resolvedRecord?.footerShippingHeading,
      DEFAULT_SITE_SETTINGS.footerShippingHeading,
    ),
    footerContactLabel: requiredValue(resolvedRecord?.footerContactLabel, DEFAULT_SITE_SETTINGS.footerContactLabel),
    footerContactHref: requiredValue(resolvedRecord?.footerContactHref, DEFAULT_SITE_SETTINGS.footerContactHref),
    footerShippingLabel: requiredValue(
      resolvedRecord?.footerShippingLabel,
      DEFAULT_SITE_SETTINGS.footerShippingLabel,
    ),
    footerShippingHref: requiredValue(resolvedRecord?.footerShippingHref, DEFAULT_SITE_SETTINGS.footerShippingHref),
    footerFaqLabel: requiredValue(resolvedRecord?.footerFaqLabel, DEFAULT_SITE_SETTINGS.footerFaqLabel),
    footerFaqHref: requiredValue(resolvedRecord?.footerFaqHref, DEFAULT_SITE_SETTINGS.footerFaqHref),
    footerShippingLinePrimary: requiredValue(
      resolvedRecord?.footerShippingLinePrimary,
      DEFAULT_SITE_SETTINGS.footerShippingLinePrimary,
    ),
    footerShippingLineHighlight: requiredValue(
      resolvedRecord?.footerShippingLineHighlight,
      DEFAULT_SITE_SETTINGS.footerShippingLineHighlight,
    ),
    footerLegalText: requiredValue(resolvedRecord?.footerLegalText, DEFAULT_SITE_SETTINGS.footerLegalText),
    footerBottomPromoLeft: requiredValue(
      resolvedRecord?.footerBottomPromoLeft,
      DEFAULT_SITE_SETTINGS.footerBottomPromoLeft,
    ),
    footerBottomPromoRight: requiredValue(
      resolvedRecord?.footerBottomPromoRight,
      DEFAULT_SITE_SETTINGS.footerBottomPromoRight,
    ),
  };

  return {
    ...merged,
    brandName: normalizeLegacyBrandValue(merged.brandName),
    heroDescription: normalizeLegacyFreeShippingCopy(merged.heroDescription),
    siteMetaTitle: normalizeLegacyBrandValue(merged.siteMetaTitle),
    footerShippingLineHighlight: normalizeLegacyFreeShippingCopy(merged.footerShippingLineHighlight),
    footerLegalText: normalizeLegacyBrandValue(merged.footerLegalText),
    footerBottomPromoRight: normalizeLegacyFreeShippingCopy(merged.footerBottomPromoRight),
  };
}

export function serializeSiteSettingsForDb(settings: SiteSettings) {
  return {
    brandName: settings.brandName,
    logoWideUrl: settings.logoWideUrl,
    logoSquareUrl: settings.logoSquareUrl,
    heroBannerUrl: settings.heroBannerUrl,
    heroSlidesJson: JSON.stringify(settings.heroSlides),
    heroEyebrow: settings.heroEyebrow,
    heroTitle: settings.heroTitle,
    heroDescription: settings.heroDescription,
    heroPrimaryLabel: settings.heroPrimaryLabel,
    heroPrimaryHref: settings.heroPrimaryHref,
    heroSecondaryLabel: settings.heroSecondaryLabel,
    heroSecondaryHref: settings.heroSecondaryHref,
    categoryBackgroundsJson: JSON.stringify(settings.categoryBackgrounds),
    featuredSectionTitle: settings.featuredSectionTitle,
    siteMetaTitle: settings.siteMetaTitle,
    siteMetaDescription: settings.siteMetaDescription,
    footerDescription: settings.footerDescription,
    footerShopHeading: settings.footerShopHeading,
    footerSupportHeading: settings.footerSupportHeading,
    footerShippingHeading: settings.footerShippingHeading,
    footerContactLabel: settings.footerContactLabel,
    footerContactHref: settings.footerContactHref,
    footerShippingLabel: settings.footerShippingLabel,
    footerShippingHref: settings.footerShippingHref,
    footerFaqLabel: settings.footerFaqLabel,
    footerFaqHref: settings.footerFaqHref,
    footerShippingLinePrimary: settings.footerShippingLinePrimary,
    footerShippingLineHighlight: settings.footerShippingLineHighlight,
    footerLegalText: settings.footerLegalText,
    footerBottomPromoLeft: settings.footerBottomPromoLeft,
    footerBottomPromoRight: settings.footerBottomPromoRight,
  };
}

const getCachedSiteSettingsRecord = unstable_cache(
  async () =>
    prisma.siteSettings.findUnique({
      where: { id: SITE_SETTINGS_ID },
    }),
  ["site-settings-record-v2"],
  {
    revalidate: STORE_CONFIG_REVALIDATE_SECONDS,
    tags: [STORE_CACHE_TAGS.siteSettings],
  },
);

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const settings = await getCachedSiteSettingsRecord();

    return mergeSiteSettings(settings);
  } catch (error) {
    if (isStorefrontConnectionError(error)) {
      logStorefrontFallback("site settings", error);
      return mergeSiteSettings(DEFAULT_SITE_SETTINGS);
    }

    throw error;
  }
}
