import { ProductForm } from "../ProductForm";
import { getAllCategoriesWithParent, toLeafOptions } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await getAllCategoriesWithParent();
  const options = toLeafOptions(categories);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-white">Add Product</h1>
      <ProductForm categories={options} />
    </div>
  );
}
