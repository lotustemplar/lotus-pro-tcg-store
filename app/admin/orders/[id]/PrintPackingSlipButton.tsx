"use client";

export function PrintPackingSlipButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border border-brand-500 px-4 py-2 text-sm font-semibold text-brand-200 transition hover:bg-brand-500/10 hover:text-white"
    >
      Print packing slip
    </button>
  );
}
