import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { getDisplayProductName } from "./product-display";
import {
  STORE_CACHE_TAGS,
  STORE_CATALOG_REVALIDATE_SECONDS,
  STORE_CONFIG_REVALIDATE_SECONDS,
  STORE_SEARCH_REVALIDATE_SECONDS,
} from "./storefront-cache";

export const CATEGORY_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
] as const;

export type CategorySortOption = (typeof CATEGORY_SORT_OPTIONS)[number]["value"];

export type CategoryProductFilters = {
  hideOutOfStock?: boolean;
  sort?: CategorySortOption;
};

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  sourceSetName: string | null;
  priceCents: number;
  compareAtCents: number | null;
  quantity: number;
  images: { url: string }[];
};

export type HomeCategoryPreview = {
  name: string;
  slug: string;
  image: string | null;
  productCount: number;
};

export type CategoryWithChildren = {
  id: string;
  name: string;
  slug: string;
  children: { id: string; name: string; slug: string }[];
};

export type LeafCategory = {
  id: string;
  name: string;
  slug: string;
};

export async function getTopCategory(topSlug: string): Promise<CategoryWithChildren | null> {
  return unstable_cache(
    async () =>
      prisma.category.findFirst({
        where: { slug: topSlug, parentId: null },
        include: { children: { orderBy: { sortOrder: "asc" } } },
      }),
    ["top-category", topSlug],
    {
      revalidate: STORE_CONFIG_REVALIDATE_SECONDS,
      tags: [STORE_CACHE_TAGS.categories],
    },
  )();
}

export async function getSubCategory(topSlug: string, subSlug: string): Promise<LeafCategory | null> {
  const top = await unstable_cache(
    async () => prisma.category.findFirst({ where: { slug: topSlug, parentId: null } }),
    ["sub-category-parent", topSlug],
    {
      revalidate: STORE_CONFIG_REVALIDATE_SECONDS,
      tags: [STORE_CACHE_TAGS.categories],
    },
  )();
  if (!top) return null;

  return unstable_cache(
    async () => prisma.category.findFirst({ where: { slug: subSlug, parentId: top.id } }),
    ["sub-category", topSlug, subSlug],
    {
      revalidate: STORE_CONFIG_REVALIDATE_SECONDS,
      tags: [STORE_CACHE_TAGS.categories],
    },
  )();
}

function getCategorySortOrder(sort: CategorySortOption | undefined) {
  switch (sort) {
    case "price-asc":
      return [{ priceCents: "asc" as const }, { name: "asc" as const }];
    case "price-desc":
      return [{ priceCents: "desc" as const }, { name: "asc" as const }];
    case "name-asc":
      return [{ name: "asc" as const }];
    case "name-desc":
      return [{ name: "desc" as const }];
    default:
      return [{ createdAt: "desc" as const }];
  }
}

export async function getProductsForCategoryIds(
  categoryIds: string[],
  filters: CategoryProductFilters = {},
): Promise<ProductCardData[]> {
  const stableCategoryIds = [...categoryIds].sort();
  const sortKey = filters.sort ?? "newest";
  const stockKey = filters.hideOutOfStock ? "in-stock-only" : "all-stock";

  return unstable_cache(
    async () =>
      prisma.product.findMany({
        where: {
          categoryId: { in: stableCategoryIds },
          isActive: true,
          ...(filters.hideOutOfStock ? { quantity: { gt: 0 } } : {}),
        },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
        orderBy: getCategorySortOrder(filters.sort),
      }),
    ["products-for-categories", stableCategoryIds.join(","), sortKey, stockKey],
    {
      revalidate: STORE_CATALOG_REVALIDATE_SECONDS,
      tags: [STORE_CACHE_TAGS.categories, STORE_CACHE_TAGS.products],
    },
  )();
}

export function toCardProps(p: ProductCardData) {
  return {
    slug: p.slug,
    name: p.name,
    displayName: getDisplayProductName(p.name, p.sourceSetName),
    setName: p.sourceSetName,
    priceCents: p.priceCents,
    compareAtCents: p.compareAtCents,
    image: p.images[0]?.url ?? null,
    quantity: p.quantity,
  };
}

export async function getFeaturedProducts(): Promise<ProductCardData[]> {
  return unstable_cache(
    async () =>
      prisma.product.findMany({
        where: { featuredOnHome: true, isActive: true, quantity: { gt: 0 } },
        orderBy: { featuredOrder: "asc" },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      }),
    ["featured-products"],
    {
      revalidate: STORE_CATALOG_REVALIDATE_SECONDS,
      tags: [STORE_CACHE_TAGS.products],
    },
  )();
}

export async function searchProducts(q: string, limit = 24): Promise<ProductCardData[]> {
  const normalizedQuery = q.trim();
  if (normalizedQuery.length < 2) return [];

  return unstable_cache(
    async () =>
      prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: normalizedQuery, mode: "insensitive" } },
            { sku: { contains: normalizedQuery, mode: "insensitive" } },
            { description: { contains: normalizedQuery, mode: "insensitive" } },
          ],
        },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
        orderBy: [{ featuredOnHome: "desc" }, { createdAt: "desc" }],
        take: limit,
      }),
    ["search-products", normalizedQuery.toLowerCase(), String(limit)],
    {
      revalidate: STORE_SEARCH_REVALIDATE_SECONDS,
      tags: [STORE_CACHE_TAGS.products],
    },
  )();
}

export async function getHomeCategoryPreviews(limit = 5): Promise<HomeCategoryPreview[]> {
  const categories = await unstable_cache(
    async () =>
      prisma.category.findMany({
        where: { parentId: null },
        orderBy: { sortOrder: "asc" },
        take: limit,
        include: {
          products: {
            where: { isActive: true },
            orderBy: [{ featuredOnHome: "desc" }, { createdAt: "desc" }],
            take: 1,
            include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
          },
          children: {
            orderBy: { sortOrder: "asc" },
            include: {
              products: {
                where: { isActive: true },
                orderBy: [{ featuredOnHome: "desc" }, { createdAt: "desc" }],
                take: 1,
                include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
              },
            },
          },
        },
      }),
    ["home-category-previews", String(limit)],
    {
      revalidate: STORE_CATALOG_REVALIDATE_SECONDS,
      tags: [STORE_CACHE_TAGS.categories, STORE_CACHE_TAGS.products],
    },
  )();

  return categories.map((category) => {
    const directImage = category.products[0]?.images[0]?.url ?? null;
    const childWithImage = category.children.find((child) => child.products[0]?.images[0]?.url);
    const image = directImage ?? childWithImage?.products[0]?.images[0]?.url ?? null;
    const productCount =
      category.products.length + category.children.reduce((sum, child) => sum + child.products.length, 0);

    return {
      name: category.name,
      slug: category.slug,
      image,
      productCount,
    };
  });
}

export async function getProductBySlug(slug: string) {
  return unstable_cache(
    async () =>
      prisma.product.findUnique({
        where: { slug },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          category: { include: { parent: true } },
        },
      }),
    ["product-by-slug", slug],
    {
      revalidate: STORE_CATALOG_REVALIDATE_SECONDS,
      tags: [STORE_CACHE_TAGS.products],
    },
  )();
}
