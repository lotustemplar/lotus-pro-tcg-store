import { prisma } from "./prisma";

export const SITE_SETTINGS_ID = "site";

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
  brandName: "Lotus Pro Decks",
  logoWideUrl: "/logo/logo-wide.svg",
  logoSquareUrl: "/logo/logo-square.svg",
  heroBannerUrl: null,
  heroSlides: [],
  heroEyebrow: "Expert-Built - Limited Runs - Every Major TCG",
  heroTitle: "Your Store for MTG, Pokemon, One Piece, Riftbound & Weiss Schwarz",
  heroDescription:
    "Sealed cases, booster boxes, booster packs, pro-built Commander decks, and more - shipped fast with a flat $5.99 rate, free over $150.",
  heroPrimaryLabel: "Shop Magic",
  heroPrimaryHref: "/category/magic-the-gathering",
  heroSecondaryLabel: "View Featured",
  heroSecondaryHref: "/#featured-right-now",
  categoryBackgrounds: {},
  featuredSectionTitle: "Featured Right Now",
  siteMetaTitle: "Lotus Pro Decks | MTG, Pokemon, One Piece, Riftbound & Weiss Schwarz",
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
  footerShippingLineHighlight: "Free shipping on orders over $150.",
  footerLegalText:
    "Copyright {year} {brandName}. Not affiliated with Wizards of the Coast, Pokemon Company, Bandai, Riot Games, or Bushiroad.",
  footerBottomPromoLeft: "$5.99 flat shipping",
  footerBottomPromoRight: "Free shipping over $150",
};

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

export function mergeSiteSettings(record: SiteSettingsRecord): SiteSettings {
  return {
    brandName: requiredValue(record?.brandName, DEFAULT_SITE_SETTINGS.brandName),
    logoWideUrl: requiredValue(record?.logoWideUrl, DEFAULT_SITE_SETTINGS.logoWideUrl),
    logoSquareUrl: requiredValue(record?.logoSquareUrl, DEFAULT_SITE_SETTINGS.logoSquareUrl),
    heroBannerUrl: optionalValue(record?.heroBannerUrl),
    heroSlides: resolveHeroSlides(record),
    heroEyebrow: requiredValue(record?.heroEyebrow, DEFAULT_SITE_SETTINGS.heroEyebrow),
    heroTitle: requiredValue(record?.heroTitle, DEFAULT_SITE_SETTINGS.heroTitle),
    heroDescription: requiredValue(record?.heroDescription, DEFAULT_SITE_SETTINGS.heroDescription),
    heroPrimaryLabel: requiredValue(record?.heroPrimaryLabel, DEFAULT_SITE_SETTINGS.heroPrimaryLabel),
    heroPrimaryHref: requiredValue(record?.heroPrimaryHref, DEFAULT_SITE_SETTINGS.heroPrimaryHref),
    heroSecondaryLabel: requiredValue(
      record?.heroSecondaryLabel,
      DEFAULT_SITE_SETTINGS.heroSecondaryLabel,
    ),
    heroSecondaryHref: requiredValue(
      record?.heroSecondaryHref,
      DEFAULT_SITE_SETTINGS.heroSecondaryHref,
    ),
    categoryBackgrounds: resolveCategoryBackgrounds(record),
    featuredSectionTitle: requiredValue(
      record?.featuredSectionTitle,
      DEFAULT_SITE_SETTINGS.featuredSectionTitle,
    ),
    siteMetaTitle: requiredValue(record?.siteMetaTitle, DEFAULT_SITE_SETTINGS.siteMetaTitle),
    siteMetaDescription: requiredValue(
      record?.siteMetaDescription,
      DEFAULT_SITE_SETTINGS.siteMetaDescription,
    ),
    footerDescription: requiredValue(record?.footerDescription, DEFAULT_SITE_SETTINGS.footerDescription),
    footerShopHeading: requiredValue(record?.footerShopHeading, DEFAULT_SITE_SETTINGS.footerShopHeading),
    footerSupportHeading: requiredValue(
      record?.footerSupportHeading,
      DEFAULT_SITE_SETTINGS.footerSupportHeading,
    ),
    footerShippingHeading: requiredValue(
      record?.footerShippingHeading,
      DEFAULT_SITE_SETTINGS.footerShippingHeading,
    ),
    footerContactLabel: requiredValue(record?.footerContactLabel, DEFAULT_SITE_SETTINGS.footerContactLabel),
    footerContactHref: requiredValue(record?.footerContactHref, DEFAULT_SITE_SETTINGS.footerContactHref),
    footerShippingLabel: requiredValue(
      record?.footerShippingLabel,
      DEFAULT_SITE_SETTINGS.footerShippingLabel,
    ),
    footerShippingHref: requiredValue(record?.footerShippingHref, DEFAULT_SITE_SETTINGS.footerShippingHref),
    footerFaqLabel: requiredValue(record?.footerFaqLabel, DEFAULT_SITE_SETTINGS.footerFaqLabel),
    footerFaqHref: requiredValue(record?.footerFaqHref, DEFAULT_SITE_SETTINGS.footerFaqHref),
    footerShippingLinePrimary: requiredValue(
      record?.footerShippingLinePrimary,
      DEFAULT_SITE_SETTINGS.footerShippingLinePrimary,
    ),
    footerShippingLineHighlight: requiredValue(
      record?.footerShippingLineHighlight,
      DEFAULT_SITE_SETTINGS.footerShippingLineHighlight,
    ),
    footerLegalText: requiredValue(record?.footerLegalText, DEFAULT_SITE_SETTINGS.footerLegalText),
    footerBottomPromoLeft: requiredValue(
      record?.footerBottomPromoLeft,
      DEFAULT_SITE_SETTINGS.footerBottomPromoLeft,
    ),
    footerBottomPromoRight: requiredValue(
      record?.footerBottomPromoRight,
      DEFAULT_SITE_SETTINGS.footerBottomPromoRight,
    ),
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

export async function getSiteSettings(): Promise<SiteSettings> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: SITE_SETTINGS_ID },
  });

  return mergeSiteSettings(settings);
}
