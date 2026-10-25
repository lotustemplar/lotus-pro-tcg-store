"use client";
// Anonymous visitor session id (random, localStorage). Used only for VisitorActivity.
const KEY = "lp_visitor_id";
export function getVisitorSessionId(): string {
  try {
    let v = localStorage.getItem(KEY);
    if (!v) { v = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`); localStorage.setItem(KEY, v); }
    return v;
  } catch { return "no-storage-session"; }
}
export function trackVisitor(action: "add_to_cart" | "remove_from_cart", productId: string, quantity = 1) {
  try {
    const body = JSON.stringify({ sessionId: getVisitorSessionId(), action, productId, quantity, path: location.pathname.slice(0, 200) });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/activity", new Blob([body], { type: "application/json" }));
    else void fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
  } catch {}
}
