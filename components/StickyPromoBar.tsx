export function StickyPromoBar() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 border-t border-red-500/25 bg-[#070b14]/96 backdrop-blur-xl">
      <div className="mx-auto flex min-h-14 max-w-[1500px] items-center justify-center px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-100 sm:text-xs">
        <span>$5.99 Flat Rate Shipping and Free Shipping on All Orders Over $149</span>
        <span className="mx-2 text-red-400/70">|</span>
        <span className="animate-market-pulse text-red-400">
          Below Market Price
        </span>
        <span className="ml-2">Guarantee on Most Products</span>
      </div>
    </div>
  );
}
