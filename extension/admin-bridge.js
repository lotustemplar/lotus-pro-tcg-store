// Lets the store's /admin "SYNC INVENTORIES" button ask this extension to refresh TCGplayer data first.
// Page -> window.postMessage({ type: "lotus:tcg-request", id }) ; extension -> { type: "lotus:tcg-ack" | "lotus:tcg-result", id, ... }
const RELOAD_MSG = "The Add to Lotus Pro extension was updated or reloaded after this page opened. Reload this page and click SYNC INVENTORIES again.";
window.addEventListener("message", (e) => {
  if (e.source !== window || !e.data || e.data.type !== "lotus:tcg-request") return;
  const id = e.data.id;
  const result = (r) => window.postMessage({ type: "lotus:tcg-result", id, ...r }, location.origin);
  window.postMessage({ type: "lotus:tcg-ack", id, version: "1.1.1" }, location.origin);
  try {
    if (!chrome.runtime?.id) return result({ error: RELOAD_MSG });
    chrome.runtime.sendMessage({ type: "lotus:tcg-send", storeOrigin: location.origin }, (r) => {
      const err = chrome.runtime.lastError?.message;
      result(r || { error: err && /context invalidated|Receiving end/i.test(err) ? RELOAD_MSG : err || "Extension did not respond" });
    });
  } catch (err) {
    result({ error: /context invalidated/i.test(String(err)) ? RELOAD_MSG : String(err) });
  }
});
document.documentElement.dataset.lotusExtension = "1.1.1";
