export function StockBadge({ quantity }: { quantity: number }) {
  if (quantity <= 0) return null;

  if (quantity === 1) {
    return (
      <div className="w-full rounded-lg bg-gradient-to-r from-red-600 via-orange-500 to-red-600 px-4 py-3 text-center font-display text-sm font-bold uppercase tracking-wide text-white shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-flicker">
        🔥 Only 1 Left In Stock — Hurry!
      </div>
    );
  }

  if (quantity < 5) {
    return (
      <div className="w-full rounded-lg bg-gradient-to-r from-orange-600 via-red-500 to-orange-600 px-4 py-3 text-center font-display text-sm font-bold uppercase tracking-wide text-white shadow-[0_0_16px_rgba(249,115,22,0.5)] animate-flicker">
        🔥 Very Low Stock!
      </div>
    );
  }

  return null;
}
