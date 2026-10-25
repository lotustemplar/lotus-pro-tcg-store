// Enriches page data from TCGplayer's public product-details endpoint (one call, on click) and posts to the store.
async function details(id) {
  try {
    const r = await fetch(`https://mp-search-api.tcgplayer.com/v1/product/${id}/details`, { headers: { accept: "application/json" } });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}
async function settings() { return chrome.storage.local.get({ storeUrl: "https://lotusprotcg.com", token: "" }); }

chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  (async () => {
    const { storeUrl, token } = await settings();
    const base = storeUrl.replace(/\/+$/, "");
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
