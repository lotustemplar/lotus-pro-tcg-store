import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/metadata";
import { STORE_CACHE_TAGS, STORE_SITEMAP_REVALIDATE_SECONDS } from "@/lib/storefront-cache";

export const revalidate = STORE_SITEMAP_REVALIDATE_SECONDS;

const getCachedSitemapCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
      select: {
        slug: true,
        updatedAt: true,
        parentId: true,
        parent: {
          select: {
            slug: true,
          },
        },
      },
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
    }),
  ["sitemap-categories"],
  {
    revalidate: STORE_SITEMAP_REVALIDATE_SECONDS,
    tags: [STORE_CACHE_TAGS.categories],
  },
);

const getCachedSitemapProducts = unstable_cache(
  async () =>
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
  ["sitemap-products"],
  {
    revalidate: STORE_SITEMAP_REVALIDATE_SECONDS,
    tags: [STORE_CACHE_TAGS.products],
  },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const [categories, products] = await Promise.all([getCachedSitemapCategories(), getCachedSitemapProducts()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/about-us`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: category.parent?.slug
      ? `${siteUrl}/category/${category.parent.slug}/${category.slug}`
      : `${siteUrl}/category/${category.slug}`,
    lastModified: category.updatedAt,
    changeFrequency: "weekly",
    priority: category.parentId ? 0.7 : 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${siteUrl}/product/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
