const SEALED_TYPES = /(sealed|booster|box|display|case|bundle|deck|tin|collection|kit|pack|set|starter|blister|prerelease|gift|elite trainer|etb)/i;
const SINGLE_TYPES = /^(cards?|singles?)$/i;

/** TCGplayer productTypeName for singles is "Cards". Everything else on a product page is sealed/accessory. */
export function isSealedProductType(productType: string, name = "") {
  const t = productType.trim();
  if (SINGLE_TYPES.test(t)) return false;
  if (t && SEALED_TYPES.test(t)) return true;
  if (!t) return SEALED_TYPES.test(name) && !/\b(foil|holo|near mint)\b/i.test(name);
  return false;
}
