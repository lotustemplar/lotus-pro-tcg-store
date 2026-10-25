// Lets the store's /admin "SYNC INVENTORIES" button ask this extension to refresh TCGplayer data first.
// Page -> window.postMessage({ type: "lotus:tcg-request", id }) ; extension -> { type: "lotus:tcg-ack" | "lotus:tcg-result", id, ... }
window.addEventListener("message", (e) => {
  if (e.source !== window || !e.data || e.data.type !== "lotus:tcg-request") return;
  const id = e.data.id;
  window.postMessage({ type: "lotus:tcg-ack", id }, location.origin);
  chrome.runtime.sendMessage({ type: "lotus:tcg-send", storeOrigin: location.origin }, (r) => {
    window.postMessage({ type: "lotus:tcg-result", id, ...(r || { error: chrome.runtime.lastError?.message || "Extension did not respond" }) }, location.origin);
  });
});
document.documentElement.dataset.lotusExtension = "1.1.0";
