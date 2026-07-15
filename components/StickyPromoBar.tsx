type StickyPromoBarProps = {
  shippingPrimary: string;
  shippingHighlight: string;
};

export function StickyPromoBar({ shippingPrimary, shippingHighlight }: StickyPromoBarProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 border-t border-red-500/25 bg-[#070b14]/96 backdrop-blur-xl">
      <div className="mx-auto max-w-[1500px] px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex flex-col items-center justify-center gap-1 text-center font-semibold uppercase text-gray-100 sm:flex-row sm:gap-2">
          <span className="max-w-[18rem] text-[9px] leading-[1.35] tracking-[0.18em] sm:max-w-none sm:text-xs sm:tracking-[0.22em]">
            {shippingPrimary} {shippingHighlight}
          </span>
          <span className="hidden text-red-400/70 sm:inline">|</span>
          <div className="flex items-center gap-2 text-[9px] leading-[1.35] tracking-[0.18em] sm:text-xs sm:tracking-[0.22em]">
            <span className="animate-market-pulse text-red-400">Below Market Price</span>
            <span>Guarantee on Most Products</span>
          </div>
        </div>
      </div>
    </div>
  );
}
