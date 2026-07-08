"use client";

import { useState } from "react";

export function RestockNotifyForm({ productId }: { productId: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/restock-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, email }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-lg border border-brand-700 bg-brand-900/30 px-4 py-3 text-sm text-brand-200">
        You're on the list — we'll email you the moment this is back in stock.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <p className="text-sm text-gray-400">This item is out of stock. Get notified when it's back:</p>
      <div className="flex gap-2">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-md border border-border bg-bg-panel px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
        >
          {status === "loading" ? "..." : "Notify Me"}
        </button>
      </div>
      {status === "error" && (
        <p className="text-xs text-red-400">Something went wrong — try again.</p>
      )}
    </form>
  );
}
