import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { STORE_CACHE_TAGS, STORE_CONFIG_REVALIDATE_SECONDS } from "./storefront-cache";

export type NavCategory = {
  name: string;
  slug: string;
  navStyle: string;
  subs: { name: string; slug: string }[];
};

type TopCategoryRow = {
  name: string;
  slug: string;
  navStyle: string;
  children: { name: string; slug: string }[];
};

const getCachedTopCategories = unstable_cache(
  async (): Promise<TopCategoryRow[]> =>
    prisma.category.findMany({
      where: { parentId: null },
      include: { children: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    }),
  ["nav-top-categories"],
  {
    revalidate: STORE_CONFIG_REVALIDATE_SECONDS,
    tags: [STORE_CACHE_TAGS.categories],
  },
);

export async function getNavCategories(): Promise<NavCategory[]> {
  const tops = await getCachedTopCategories();

  return tops.map((t: TopCategoryRow) => ({
    name: t.name,
    slug: t.slug,
    navStyle: t.navStyle,
    subs: t.children.map((c: { name: string; slug: string }) => ({ name: c.name, slug: c.slug })),
  }));
}
