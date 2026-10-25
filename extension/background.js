import { fetchTcgplayerInventoryCsv } from "./tcgplayer-inventory.js";
// Enriches page data from TCGplayer's public product-details endpoint (one call, on click) and posts to the store.
async function details(id) {
  try {
    const r = await fetch(`https://mp-search-api.tcgplayer.com/v1/product/${id}/details`, { headers: { accept: "application/json" } });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}
async function settings() { return chrome.storage.local.get({ storeUrl: "https://lotusprotcg.com", token: "" }); }

async function sendTcgInventory(base, token) {
  if (!token) return { error: "Set the store URL and token in the extension Settings first." };
  let csv;
  try { csv = await fetchTcgplayerInventoryCsv(); } catch (e) { return { error: e.message || String(e) }; }
  const r = await fetch(`${base}/api/admin/extension/tcgplayer-inventory`, {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ csv, capturedAt: new Date().toISOString() }),
  });
  const j = await r.json().catch(() => ({}));
  return r.ok ? j : { error: j.error || `Store returned ${r.status}` };
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    const { storeUrl, token } = await settings();
    const base = storeUrl.replace(/\/+$/, "");
    if (msg.type === "lotus:tcg-send") {
      // From the admin page bridge: post to the store the page is on (must be the configured store or a preview of it).
      // Never send the token to an arbitrary site: only the configured store (or lotusprotcg.com itself).
      const trusted = [new URL(base).origin, "https://lotusprotcg.com", "https://www.lotusprotcg.com"];
      const origin = sender.tab && trusted.includes(msg.storeOrigin) ? msg.storeOrigin : base;
      return reply(await sendTcgInventory(origin, token));
    }
    if (msg.type === "lotus:enrich") {
      const d = await details(msg.id);
      let existing = null;
      if (token) {
        try {
          const r = await fetch(`${base}/api/admin/extension/products?tcgplayerProductId=${msg.id}`, { headers: { authorization: `Bearer ${token}` } });
          if (r.ok) existing = (await r.json()).product;
        } catch (e) {}
      }
      return reply({ details: d, existing, configured: !!token, storeUrl: base });
    }
    if (msg.type === "lotus:add") {
      if (!token) return reply({ error: "Set the store URL and token in the extension options first." });
      const r = await fetch(`${base}/api/admin/extension/products`, {
        method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(msg.payload),
      });
      const j = await r.json().catch(() => ({}));
      return reply(r.ok ? j : { error: j.error || `Store returned ${r.status}` });
    }
  })();
  return true;
});
