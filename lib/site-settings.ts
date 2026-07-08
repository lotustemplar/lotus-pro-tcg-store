import { prisma } from "./prisma";

export const SITE_SETTINGS_ID = "site";

export const DEFAULT_SITE_SETTINGS = {
  brandName: "Lotus Pro Decks",
  logoWideUrl: "/logo/logo-wide.svg",
  logoSquareUrl: "/logo/logo-square.svg",
  heroBannerUrl: null as string | null,
  heroEyebrow: "Expert-Built - Limited Runs - Every Major TCG",
  heroTitle: "Your Store for MTG, Pokemon, One Piece, Riftbound & Weiss Schwarz",
  heroDescription:
    "Sealed cases, booster boxes, booster packs, pro-built Commander decks, and more - shipped fast with a flat $5.99 rate, free over $150.",
  heroPrimaryLabel: "Shop Magic",
  heroPrimaryHref: "/category/magic-the-gathering",
  heroSecondaryLabel: "View Featured",
  heroSecondaryHref: "/#featured-right-now",
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
    heroSecondaryLabel: requiredValue(
      record?.heroSecondaryLabel,
      DEFAULT_SITE_SETTINGS.heroSecondaryLabel,
    ),
    heroSecondaryHref: requiredValue(
      record?.heroSecondaryHref,
      DEFAULT_SITE_SETTINGS.heroSecondaryHref,
    ),
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

export async function getSiteSettings(): Promise<SiteSettings> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: SITE_SETTINGS_ID },
  });

  return mergeSiteSettings(settings);
}
