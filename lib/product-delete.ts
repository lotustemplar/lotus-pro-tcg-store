export const ARCHIVED_DELETED_PRODUCT_KEYWORD = "__archived_deleted_product__";

export function getArchivedDeletedProductData() {
  return {
    autoUpdatePrice: false,
    compareAtCents: null,
    featuredOnHome: false,
    featuredOrder: 0,
    isActive: false,
    quantity: 0,
    seoKeywords: ARCHIVED_DELETED_PRODUCT_KEYWORD,
    sourceMarketplace: null,
  };
}
