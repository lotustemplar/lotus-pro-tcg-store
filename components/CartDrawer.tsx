"use client";

import Image from "next/image";
import { useCart } from "./CartContext";
import { formatCents } from "@/lib/format";
import { calculateShippingCents, remainingForFreeShippingCents } from "@/lib/shipping";
import { useState } from "react";

export function CartDrawer() {
  const { items, isOpen, close, removeItem, setQuantity, subtotalCents, clear } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const shippingCents = calculateShippingCents(subtotalCents);
  const totalCents = subtotalCents + shippingCents;
  const remainingForFree = remainingForFreeShippingCents(subtotalCents);

  async function checkout() {
    setCheckingOut(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Checkout failed. Please try again.");
        setCheckingOut(false);
      }
    } catch {
      alert("Checkout failed. Please try again.");
      setCheckingOut(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={close} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-xl font-bold">Your Cart</h2>
          <button onClick={close} className="text-2xl leading-none text-gray-400 hover:text-white">
            ×
          </button>
        </div>

        {remainingForFree > 0 ? (
          <div className="border-b border-border bg-bg-elevated px-5 py-2 text-xs text-gray-300">
            Add <span className="font-semibold text-brand-300">{formatCents(remainingForFree)}</span> more for free shipping!
          </div>
        ) : (
          <div className="border-b border-border bg-brand-900/40 px-5 py-2 text-xs text-brand-200">
            🎉 You've unlocked free shipping!
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="text-sm text-gray-400">Your cart is empty.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.productId} className="flex gap-3">
                  <div className="relative h-16 w-16 flex-none overflow-hidden rounded-md bg-bg-elevated">
                    {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{item.name}</p>
                    <p className="text-sm text-brand-300">{formatCents(item.priceCents)}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={item.maxQuantity}
                        value={item.quantity}
                        onChange={(e) => setQuantity(item.productId, Number(e.target.value))}
                        className="w-14 rounded border border-border bg-bg px-2 py-1 text-xs text-white"
                      />
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-xs text-gray-500 hover:text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border px-5 py-4">
          <div className="mb-1 flex justify-between text-sm text-gray-300">
            <span>Subtotal</span>
            <span>{formatCents(subtotalCents)}</span>
          </div>
          <div className="mb-3 flex justify-between text-sm text-gray-300">
            <span>Shipping</span>
            <span>{shippingCents === 0 ? "FREE" : formatCents(shippingCents)}</span>
          </div>
          <div className="mb-4 flex justify-between font-display text-lg font-bold text-white">
            <span>Total</span>
            <span>{formatCents(totalCents)}</span>
          </div>
          <button
            disabled={items.length === 0 || checkingOut}
            onClick={checkout}
            className="w-full rounded-lg bg-brand-600 py-3 font-display text-base font-bold uppercase tracking-wide text-white hover:bg-brand-500 disabled:opacity-50"
          >
            {checkingOut ? "Redirecting..." : "Checkout with Stripe"}
          </button>
        </div>
      </div>
    </div>
  );
}
