import { prisma } from "./prisma";

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

export async function getNavCategories(): Promise<NavCategory[]> {
  const tops: TopCategoryRow[] = await prisma.category.findMany({
    where: { parentId: null },
    include: { children: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  return tops.map((t: TopCategoryRow) => ({
    name: t.name,
    slug: t.slug,
    navStyle: t.navStyle,
    subs: t.children.map((c: { name: string; slug: string }) => ({ name: c.name, slug: c.slug })),
  }));
}
