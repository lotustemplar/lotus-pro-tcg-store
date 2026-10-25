// Build a TCGplayer "Import to Staged" pricing CSV in the same column layout as the Seller Portal export.
// Total Quantity is ignored on import; Add to Quantity is a signed delta (floored at 0 by TCGplayer).
export type StagedRow = { tcgplayerId: number | null; productLine: string; setName: string; productName: string; condition: string; addToQuantity: number; marketplacePriceCents: number };

export const STAGED_HEADER = ["TCGplayer Id", "Product Line", "Set Name", "Product Name", "Title", "Number", "Rarity", "Condition", "TCG Market Price", "TCG Direct Low", "TCG Low Price With Shipping", "TCG Low Price", "Total Quantity", "Add to Quantity", "TCG Marketplace Price", "Photo URL"];

function cell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildStagedCsv(rows: StagedRow[]) {
  const lines = [STAGED_HEADER.join(",")];
  for (const r of rows) {
    lines.push([r.tcgplayerId ?? "", r.productLine, r.setName, r.productName, "", "", "", r.condition || "Unopened", "", "", "", "", "", r.addToQuantity, (Math.max(1, r.marketplacePriceCents) / 100).toFixed(2), ""].map(cell).join(","));
  }
  return lines.join("\n") + "\n";
}
