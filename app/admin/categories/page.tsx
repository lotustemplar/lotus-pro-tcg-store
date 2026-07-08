import { prisma } from "@/lib/prisma";
import { NewCategoryForm } from "./NewCategoryForm";

export const dynamic = "force-dynamic";

type CategoryRow = {
  id: string;
  name: string;
  children: { id: string; name: string }[];
  _count: { products: number };
};

export default async function AdminCategoriesPage() {
  const categories: CategoryRow[] = await prisma.category.findMany({
    include: { children: true, _count: { select: { products: true } } },
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold text-white">Categories</h1>

      <div className="space-y-4">
        {categories.map((cat: CategoryRow) => (
          <div key={cat.id} className="rounded-xl border border-border bg-bg-panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">{cat.name}</h2>
              <span className="text-xs text-gray-500">{cat._count.products} direct products</span>
            </div>
            {cat.children.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {cat.children.map((sub: { id: string; name: string }) => (
                  <li
                    key={sub.id}
                    className="rounded-full border border-border px-3 py-1 text-xs text-gray-300"
                  >
                    {sub.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-bg-panel p-5">
        <h2 className="mb-4 font-display text-lg font-bold text-white">Add Category / Subcategory</h2>
        <NewCategoryForm topLevelCategories={categories.map((c: CategoryRow) => ({ id: c.id, name: c.name }))} />
      </div>
    </div>
  );
}
