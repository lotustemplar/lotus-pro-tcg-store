import { revalidateTag } from "next/cache";

export const STORE_CACHE_TAGS = {
  categories: "store-categories",
  products: "store-products",
  siteSettings: "store-site-settings",
} as const;

export const STORE_CATALOG_REVALIDATE_SECONDS = 3600;
export const STORE_CONFIG_REVALIDATE_SECONDS = 86400;
export const STORE_SEARCH_REVALIDATE_SECONDS = 300;
export const STORE_SITEMAP_REVALIDATE_SECONDS = 3600;

export function revalidateCatalogCache() {
  revalidateTag(STORE_CACHE_TAGS.categories);
  revalidateTag(STORE_CACHE_TAGS.products);
}

export function revalidateSiteSettingsCache() {
  revalidateTag(STORE_CACHE_TAGS.siteSettings);
}
