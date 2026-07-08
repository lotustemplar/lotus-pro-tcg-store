import { prisma } from "./prisma";

export type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parent: { id: string; name: string } | null;
};

export type CategoryOption = { id: string; label: string };

export async function getAllCategoriesWithParent(): Promise<CategoryRecord[]> {
  return prisma.category.findMany({
    include: { parent: true },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
  });
}

// Only leaf categories (subcategories) or top-levels with no children (Accessories,
// Patreon Access) are valid places to attach a product.
export function toLeafOptions(categories: CategoryRecord[]): CategoryOption[] {
  return categories
    .filter((c) => c.parentId !== null || categories.every((x) => x.parentId !== c.id))
    .map((c) => ({
      id: c.id,
      label: c.parent ? `${c.parent.name} / ${c.name}` : c.name,
    }));
}

export function toAllOptions(categories: CategoryRecord[]): CategoryOption[] {
  return categories.map((c) => ({
    id: c.id,
    label: c.parent ? `${c.parent.name} / ${c.name}` : c.name,
  }));
}
