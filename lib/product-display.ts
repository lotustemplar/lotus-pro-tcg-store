function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getDisplayProductName(name: string, sourceSetName?: string | null) {
  const trimmedName = name.trim();
  const trimmedSetName = sourceSetName?.trim();

  if (!trimmedSetName) {
    return trimmedName;
  }

  const strippedName = trimmedName
    .replace(new RegExp(`^${escapeRegExp(trimmedSetName)}\\s*[-:|]\\s*`, "i"), "")
    .replace(new RegExp(`^${escapeRegExp(trimmedSetName)}\\s+`, "i"), "")
    .trim();

  return strippedName.length > 0 ? strippedName : trimmedName;
}
