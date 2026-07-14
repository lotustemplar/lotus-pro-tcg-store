import { slugify } from "./format";
import type { CategoryRecord } from "./admin";
import { getDiscountedStorePriceCents } from "./pricing";

const TCGPLAYER_API_HEADERS = {
  accept: "application/json, text/plain, */*",
  origin: "https://www.tcgplayer.com",
  referer: "https://www.tcgplayer.com/",
  "user-agent": "Mozilla/5.0 (compatible; LotusProTCG/1.0; +https://lotusprotcg.com)",
};

const TCGPLAYER_LISTINGS_API_HEADERS = {
  accept: "application/json, text/plain, */*",
  "content-type": "application/json",
  origin: "https://www.tcgplayer.com",
  referer: "https://www.tcgplayer.com/",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
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

type TcgplayerListingsResponse = {
  results?: Array<{
    results?: Array<{
      sellerName?: string | null;
      listingType?: string | null;
      price?: number | null;
      shippingPrice?: number | null;
      rankedShippingPrice?: number | null;
      sellerShippingPrice?: number | null;
      quantity?: number | null;
    }>;
  }>;
};

export type TcgplayerTopListing = {
  sellerName: string;
  price: number;
  shippingPrice: number;
  quantity: number;
  totalPrice: number;
};

export type ResolvedTcgplayerSourcePrice = {
  priceSource:
    | "topListingPriceWithShipping"
    | "lowestPriceWithShipping"
    | "marketPrice"
    | "lowestPrice"
    | "previousSourcePrice";
  sourcePriceCents: number;
  usedShippingInclusivePrice: boolean;
  topListing: TcgplayerTopListing | null;
};

function normalizeListing(
  listing:
    | {
        sellerName?: string | null;
        listingType?: string | null;
        price?: number | null;
        shippingPrice?: number | null;
        rankedShippingPrice?: number | null;
        sellerShippingPrice?: number | null;
        quantity?: number | null;
      }
    | null
    | undefined,
): TcgplayerTopListing | null {
  const price = positiveNumber(listing?.price);
  if (price == null || normalizeText(listing?.listingType ?? "") !== "standard") {
    return null;
  }

  const shippingPrice =
    nonNegativeNumber(listing?.shippingPrice) ??
    nonNegativeNumber(listing?.rankedShippingPrice) ??
    nonNegativeNumber(listing?.sellerShippingPrice) ??
    0;
  const quantity = Math.max(0, Math.trunc(nonNegativeNumber(listing?.quantity) ?? 0));

  return {
    sellerName: listing?.sellerName?.trim() || "TCGplayer seller",
    price,
    shippingPrice,
    quantity,
    totalPrice: Number((price + shippingPrice).toFixed(2)),
  };
}

function isSuspiciousOutlier({
  candidate,
  nextCandidate,
  details,
}: {
  candidate: TcgplayerTopListing;
  nextCandidate: TcgplayerTopListing | null;
  details: TcgplayerProductDetails;
}) {
  const detailsFloor =
    positiveNumber(details.lowestPriceWithShipping) ??
    positiveNumber(details.marketPrice) ??
    positiveNumber(details.lowestPrice);

  if (detailsFloor != null && candidate.totalPrice < detailsFloor * 0.85) {
    return true;
  }

  if (nextCandidate && candidate.totalPrice < nextCandidate.totalPrice * 0.85) {
    return true;
  }

  return false;
}

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

function positiveNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function nonNegativeNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
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

export async function fetchTcgplayerTopListing(productId: number): Promise<TcgplayerTopListing | null> {
  const response = await fetch(`https://mp-search-api.tcgplayer.com/v1/product/${productId}/listings`, {
    method: "POST",
    headers: TCGPLAYER_LISTINGS_API_HEADERS,
    body: JSON.stringify({
      filters: {
        term: {
          // Ignore TCGplayer custom listings such as "box only" or altered-language bundles.
          listingType: ["standard"],
        },
        range: {},
        exclude: {},
      },
      from: 0,
      size: 8,
      sort: {
        field: "price+shipping",
        order: "asc",
      },
      context: {
        shippingCountry: "US",
        cart: {},
      },
      aggregations: ["listingType"],
    }),
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`TCGplayer listings lookup failed with status ${response.status}.`);
  }

  const data = (await response.json()) as TcgplayerListingsResponse;
  const listings = (data.results?.[0]?.results ?? [])
    .map((listing) => normalizeListing(listing))
    .filter((listing): listing is TcgplayerTopListing => listing != null);

  return listings[0] ?? null;
}

export async function fetchResolvedTcgplayerPricing(
  productId: number,
  previousSourcePriceCents?: number | null,
): Promise<{
  details: TcgplayerProductDetails;
  resolved: ResolvedTcgplayerSourcePrice;
}> {
  const [firstDetails, topListingsResponse] = await Promise.all([
    fetchTcgplayerProductDetails(productId),
    fetch(`https://mp-search-api.tcgplayer.com/v1/product/${productId}/listings`, {
      method: "POST",
      headers: TCGPLAYER_LISTINGS_API_HEADERS,
      body: JSON.stringify({
        filters: {
          term: {
            // Ignore TCGplayer custom listings such as "box only" or altered-language bundles.
            listingType: ["standard"],
          },
          range: {},
          exclude: {},
        },
        from: 0,
        size: 8,
        sort: {
          field: "price+shipping",
          order: "asc",
        },
        context: {
          shippingCountry: "US",
          cart: {},
        },
        aggregations: ["listingType"],
      }),
      next: { revalidate: 0 },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`TCGplayer listings lookup failed with status ${response.status}.`);
        }
        return response.json() as Promise<TcgplayerListingsResponse>;
      })
      .catch(() => null),
  ]);

  const topListings = (topListingsResponse?.results?.[0]?.results ?? [])
    .map((listing) => normalizeListing(listing))
    .filter((listing): listing is TcgplayerTopListing => listing != null);

  const resolvedTopListing =
    topListings.find((candidate, index) => {
      const nextCandidate = topListings[index + 1] ?? null;
      return !isSuspiciousOutlier({
        candidate,
        nextCandidate,
        details: firstDetails,
      });
    }) ?? null;

  if (resolvedTopListing) {
    return {
      details: firstDetails,
      resolved: {
        priceSource: "topListingPriceWithShipping",
        sourcePriceCents: toCents(resolvedTopListing.totalPrice),
        usedShippingInclusivePrice: resolvedTopListing.shippingPrice > 0,
        topListing: resolvedTopListing,
      },
    };
  }

  const detailSamples = [firstDetails];

  if (!positiveNumber(firstDetails.lowestPriceWithShipping)) {
    detailSamples.push(await fetchTcgplayerProductDetails(productId));
  }

  const shippingInclusiveCandidates = detailSamples
    .map((sample) => positiveNumber(sample.lowestPriceWithShipping))
    .filter((value): value is number => value != null);

  if (shippingInclusiveCandidates.length > 0) {
    return {
      details: firstDetails,
      resolved: {
        priceSource: "lowestPriceWithShipping",
        sourcePriceCents: toCents(Math.max(...shippingInclusiveCandidates)),
        usedShippingInclusivePrice: true,
        topListing: null,
      },
    };
  }

  const lowestPriceCandidates = detailSamples
    .map((sample) => positiveNumber(sample.lowestPrice))
    .filter((value): value is number => value != null);
  const marketPriceCandidates = detailSamples
    .map((sample) => positiveNumber(sample.marketPrice))
    .filter((value): value is number => value != null);

  const fallbackMarketPrice =
    marketPriceCandidates.length > 0 ? Math.max(...marketPriceCandidates) : null;
  const fallbackLowestPrice =
    lowestPriceCandidates.length > 0 ? Math.max(...lowestPriceCandidates) : null;

  if (previousSourcePriceCents != null && previousSourcePriceCents > 0) {
    const fallbackFloorCents = toCents(
      Math.max(fallbackMarketPrice ?? 0, fallbackLowestPrice ?? 0),
    );

    if (fallbackFloorCents === 0 || previousSourcePriceCents >= fallbackFloorCents) {
      return {
        details: firstDetails,
        resolved: {
          priceSource: "previousSourcePrice",
          sourcePriceCents: previousSourcePriceCents,
          usedShippingInclusivePrice: false,
          topListing: null,
        },
      };
    }
  }

  if (fallbackMarketPrice != null) {
    return {
      details: firstDetails,
      resolved: {
        priceSource: "marketPrice",
        sourcePriceCents: toCents(fallbackMarketPrice),
        usedShippingInclusivePrice: false,
        topListing: null,
      },
    };
  }

  return {
    details: firstDetails,
    resolved: {
      priceSource: "lowestPrice",
      sourcePriceCents: toCents(fallbackLowestPrice ?? 0),
      usedShippingInclusivePrice: false,
      topListing: null,
    },
  };
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

  const { details, resolved } = await fetchResolvedTcgplayerPricing(productId);
  const productName = details.productName.trim();
  const description = stripHtml(details.customAttributes?.description);
  const sourcePriceCents = resolved.sourcePriceCents;

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
