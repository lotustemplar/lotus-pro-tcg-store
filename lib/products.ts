import { prisma } from "./prisma";
import { getDisplayProductName } from "./product-display";

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
  return prisma.category.findFirst({
    where: { slug: topSlug, parentId: null },
    include: { children: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function getSubCategory(topSlug: string, subSlug: string): Promise<LeafCategory | null> {
  const top = await prisma.category.findFirst({ where: { slug: topSlug, parentId: null } });
  if (!top) return null;
  return prisma.category.findFirst({ where: { slug: subSlug, parentId: top.id } });
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
  return prisma.product.findMany({
    where: {
      categoryId: { in: categoryIds },
      isActive: true,
      ...(filters.hideOutOfStock ? { quantity: { gt: 0 } } : {}),
    },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    orderBy: getCategorySortOrder(filters.sort),
  });
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
  return prisma.product.findMany({
    where: { featuredOnHome: true, isActive: true, quantity: { gt: 0 } },
    orderBy: { featuredOrder: "asc" },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
}

export async function searchProducts(q: string): Promise<ProductCardData[]> {
  if (q.trim().length < 2) return [];
  return prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q } },
        { sku: { contains: q } },
        { description: { contains: q } },
      ],
    },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
}

export async function getHomeCategoryPreviews(limit = 5): Promise<HomeCategoryPreview[]> {
  const categories = await prisma.category.findMany({
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
  });

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
