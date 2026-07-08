import { ProductForm } from "../ProductForm";
import { getAllCategoriesWithParent, toAllOptions } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await getAllCategoriesWithParent();
  const options = toAllOptions(categories);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-white">Add Product</h1>
      <ProductForm categories={options} />
    </div>
  );
}
