import { slugify } from "./format";
import type { CategoryRecord } from "./admin";
import { getDiscountedStorePriceCents } from "./pricing";

const TCGPLAYER_API_HEADERS = {
  accept: "application/json, text/plain, */*",
  origin: "https://www.tcgplayer.com",
  referer: "https://www.tcgplayer.com/",
  "user-agent": "Mozilla/5.0 (compatible; LotusProTCG/1.0; +https://lotusprotcg.com)",
};

type TcgplayerDetailsResponse = {
  productId?: number;
  productName?: string;
  productLineName?: string;
  productTypeName?: string;
  setName?: string;
  lowestPrice?: number | null;
  lowestPriceWithShipping?: number | null;
  marketPrice?: number | null;
  customAttributes?: {
    description?: string | null;
  } | null;
};

export type TcgplayerProductDetails = {
  productId: number;
  productName: string;
  productLineName: string;
  productTypeName: string;
  setName: string;
  lowestPrice: number | null;
  lowestPriceWithShipping: number | null;
  marketPrice: number | null;
  customAttributes: {
    description: string | null;
  } | null;
};

export type TcgplayerImportPreview = {
  autoUpdatePrice: boolean;
  categoryId: string;
  compareAtCents: number;
  description: string;
  images: { url: string; altText: string }[];
  name: string;
  priceCents: number;
  seoDescription: string;
  seoTitle: string;
  slug: string;
  sourceImageUrl: string;
  sourceMarketplace: "tcgplayer";
  sourcePriceCents: number;
  sourceProductId: number;
  sourceProductLine: string;
  sourceProductType: string;
  sourceSetName: string;
  sourceUrl: string;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function stripHtml(html: string | null | undefined) {
  if (!html) return "";

  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<li>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toCents(price: number | null | undefined) {
  return Math.max(0, Math.round((price ?? 0) * 100));
}

export function buildTcgplayerImageUrl(productId: number, size: 1000 | 437 | 200 = 1000) {
  if (size === 437) {
    return `https://product-images.tcgplayer.com/fit-in/437x437/${productId}.jpg`;
  }

  return `https://tcgplayer-cdn.tcgplayer.com/product/${productId}_in_${size}x${size}.jpg`;
}

export function extractTcgplayerProductId(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/product\/(\d+)/i);
  if (urlMatch) return Number(urlMatch[1]);

  try {
    const parsed = new URL(trimmed);
    const productId = parsed.searchParams.get("productId");
    if (productId && /^\d+$/.test(productId)) {
      return Number(productId);
    }
  } catch {
    return null;
  }

  return null;
}

export async function fetchTcgplayerProductDetails(productId: number) {
  const response = await fetch(`https://mp-search-api.tcgplayer.com/v2/product/${productId}/details`, {
    headers: TCGPLAYER_API_HEADERS,
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`TCGplayer lookup failed with status ${response.status}.`);
  }

  const data = (await response.json()) as TcgplayerDetailsResponse;

  if (!data.productId || !data.productName) {
    throw new Error("TCGplayer did not return a usable product record.");
  }

  return {
    productId: data.productId,
    productName: data.productName,
    productLineName: data.productLineName?.trim() ?? "",
    productTypeName: data.productTypeName?.trim() ?? "",
    setName: data.setName?.trim() ?? "",
    lowestPrice: data.lowestPrice ?? null,
    lowestPriceWithShipping: data.lowestPriceWithShipping ?? null,
    marketPrice: data.marketPrice ?? null,
    customAttributes: {
      description: data.customAttributes?.description ?? null,
    },
  } satisfies TcgplayerProductDetails;
}

function mapProductLineToTopLevelSlug(productLineName: string) {
  const productLine = normalizeText(productLineName);

  if (productLine.includes("magic")) return "magic-the-gathering";
  if (productLine.includes("pokemon") || productLine.includes("pokémon")) return "pokemon";
  if (productLine.includes("one piece")) return "one-piece";
  if (productLine.includes("riftbound")) return "riftbound";
  if (productLine.includes("weiss")) return "weiss-schwarz";
  if (productLine.includes("accessor")) return "accessories";

  return null;
}

function inferAccessoryTopLevelSlug({
  productLineName,
  productName,
  productTypeName,
}: {
  productLineName: string;
  productName: string;
  productTypeName: string;
}) {
  const haystack = `${productLineName} ${productName} ${productTypeName}`.toLowerCase();

  const accessoryKeywords = [
    "accessor",
    "playmat",
    "deck box",
    "deckbox",
    "sleeve",
    "binder",
    "portfolio",
    "top loader",
    "toploader",
    "storage box",
    "storage",
    "dice",
    "token",
  ];

  return accessoryKeywords.some((keyword) => haystack.includes(keyword)) ? "accessories" : null;
}

function inferSubcategorySlug({
  topLevelSlug,
  productName,
  productTypeName,
}: {
  topLevelSlug: string;
  productName: string;
  productTypeName: string;
}) {
  const haystack = `${productName} ${productTypeName}`.toLowerCase();

  if (topLevelSlug === "magic-the-gathering" && haystack.includes("secret lair")) {
    return "secret-lairs";
  }

  if (
    topLevelSlug === "magic-the-gathering" &&
    (haystack.includes("commander deck") || haystack.includes("commander") || haystack.includes("precon"))
  ) {
    return "commander-decks-precon";
  }

  if (haystack.includes("sealed case") || haystack.includes(" case")) {
    return "sealed-cases";
  }

  if (haystack.includes("booster box") || haystack.includes(" box")) {
    return "booster-boxes";
  }

  if (haystack.includes("booster pack") || haystack.includes(" pack")) {
    return "booster-packs";
  }

  return null;
}

export function findSuggestedCategoryId(categories: CategoryRecord[], details: {
  productLineName: string;
  productName: string;
  productTypeName: string;
}) {
  const topLevelSlug =
    mapProductLineToTopLevelSlug(details.productLineName) ??
    inferAccessoryTopLevelSlug(details);

  if (!topLevelSlug) {
    throw new Error(`No category mapping exists yet for "${details.productLineName}".`);
  }

  const topLevel = categories.find((category) => category.parentId === null && category.slug === topLevelSlug);
  if (!topLevel) {
    throw new Error(`Your store is missing the "${details.productLineName}" top-level category.`);
  }

  const directLeaf = categories.every((category) => category.parentId !== topLevel.id);
  if (directLeaf) {
    return topLevel.id;
  }

  const desiredSubSlug = inferSubcategorySlug({
    topLevelSlug,
    productName: details.productName,
    productTypeName: details.productTypeName,
  });

  if (desiredSubSlug) {
    const matchedChild = categories.find(
      (category) => category.parentId === topLevel.id && category.slug === desiredSubSlug
    );

    if (matchedChild) return matchedChild.id;
  }

  const fallbackChild = categories.find((category) => category.parentId === topLevel.id);
  if (!fallbackChild) {
    throw new Error(`Your store is missing subcategories for "${details.productLineName}".`);
  }

  return fallbackChild.id;
}

export async function importFromTcgplayerUrl(url: string, categories: CategoryRecord[]): Promise<TcgplayerImportPreview> {
  const productId = extractTcgplayerProductId(url);
  if (!productId) {
    throw new Error("Paste a full TCGplayer product URL so I can find the product ID.");
  }

  const details = await fetchTcgplayerProductDetails(productId);
  const productName = details.productName.trim();
  const description = stripHtml(details.customAttributes?.description);
  const sourcePriceCents = toCents(
    details.lowestPriceWithShipping ?? details.lowestPrice ?? details.marketPrice ?? 0
  );

  return {
    autoUpdatePrice: true,
    categoryId: findSuggestedCategoryId(categories, {
      productLineName: details.productLineName ?? "",
      productName,
      productTypeName: details.productTypeName,
    }),
    compareAtCents: sourcePriceCents,
    description,
    images: [{ url: buildTcgplayerImageUrl(productId, 1000), altText: productName }],
    name: productName,
    priceCents: getDiscountedStorePriceCents(sourcePriceCents),
    seoDescription: description.slice(0, 155),
    seoTitle: productName,
    slug: slugify(productName),
    sourceImageUrl: buildTcgplayerImageUrl(productId, 1000),
    sourceMarketplace: "tcgplayer",
    sourcePriceCents,
    sourceProductId: productId,
    sourceProductLine: details.productLineName,
    sourceProductType: details.productTypeName,
    sourceSetName: details.setName,
    sourceUrl: url.trim(),
  };
}
