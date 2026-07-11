function getOverlayCopy(quantity: number) {
  if (quantity === 1) {
    return {
      text: "LAST ONE IN STOCK!",
      className:
        "border-red-300/70 bg-[linear-gradient(135deg,rgba(255,110,64,0.95),rgba(186,28,28,0.96))] shadow-[0_0_0_1px_rgba(255,240,220,0.2),0_0_22px_rgba(255,88,36,0.55),0_0_44px_rgba(239,68,68,0.35)]",
    };
  }

  if (quantity === 2 || quantity === 3) {
    return {
      text: "LOW STOCK!",
      className:
        "border-amber-200/70 bg-[linear-gradient(135deg,rgba(251,146,60,0.95),rgba(194,65,12,0.96))] shadow-[0_0_0_1px_rgba(255,244,214,0.18),0_0_20px_rgba(251,146,60,0.5),0_0_38px_rgba(249,115,22,0.32)]",
    };
  }

  return null;
}

export function FeaturedStockOverlay({ quantity }: { quantity: number }) {
  const overlay = getOverlayCopy(quantity);
  if (!overlay) return null;

  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex justify-center">
      <div
        className={`animate-[featuredFirePulse_1.8s_ease-in-out_infinite] rounded-md border px-4 py-2 text-center text-[11px] font-black uppercase tracking-[0.2em] text-white ${overlay.className}`}
      >
        <span className="drop-shadow-[0_0_8px_rgba(255,245,235,0.65)]">{overlay.text}</span>
      </div>
    </div>
  );
}
