import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/metadata";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const INDEXNOW_KEY = "11eaa36bbf3045bc9a04e37ad945c09f";

type CategoryUrlRecord = {
  slug: string;
  parent: {
    slug: string;
  } | null;
};

function getIndexNowKeyLocation() {
  return `${getSiteUrl()}/${INDEXNOW_KEY}.txt`;
}

function toSiteUrl(path: string) {
  return new URL(path, getSiteUrl()).toString();
}

function toCategoryUrl(category: CategoryUrlRecord) {
  if (category.parent?.slug) {
    return toSiteUrl(`/category/${category.parent.slug}/${category.slug}`);
  }

  return toSiteUrl(`/category/${category.slug}`);
}

function uniqueIndexableUrls(urls: Array<string | null | undefined>) {
  const siteOrigin = new URL(getSiteUrl()).origin;

  return [...new Set(
    urls
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => new URL(value, siteOrigin).toString())
      .filter((value) => new URL(value).origin === siteOrigin),
  )];
}

export async function submitIndexNowUrls(urls: Array<string | null | undefined>) {
  const urlList = uniqueIndexableUrls(urls);
  if (urlList.length === 0) return;

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        host: new URL(getSiteUrl()).host,
        key: INDEXNOW_KEY,
        keyLocation: getIndexNowKeyLocation(),
        urlList,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("IndexNow submission failed", response.status, detail);
    }
  } catch (error) {
    console.error("IndexNow submission error", error);
  }
}

export async function submitFullSiteToIndexNow() {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      select: {
        slug: true,
        parent: {
          select: {
            slug: true,
          },
        },
      },
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        slug: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  await submitIndexNowUrls([
    toSiteUrl("/"),
    toSiteUrl("/about-us"),
    ...categories.map((category) => toCategoryUrl(category)),
    ...products.map((product) => toSiteUrl(`/product/${product.slug}`)),
  ]);
}

export function getHomepageUrl() {
  return toSiteUrl("/");
}

export function getAboutPageUrl() {
  return toSiteUrl("/about-us");
}

export function getProductUrl(slug: string) {
  return toSiteUrl(`/product/${slug}`);
}

export function getCategoryUrl(category: CategoryUrlRecord) {
  return toCategoryUrl(category);
}
