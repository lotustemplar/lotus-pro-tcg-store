const $ = (id) => document.getElementById(id);
let page = null;
function show(text, cls) { $("msg").textContent = text; $("msg").className = cls || "muted"; }
(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https:\/\/www\.tcgplayer\.com\/product\/\d+/.test(tab.url || "")) return show("Open a TCGplayer product page first.");
  page = await chrome.tabs.sendMessage(tab.id, { type: "lotus:read" }).catch(() => null);
  if (!page || !page.tcgplayerProductId) return show("Couldn't read this page. Reload it and try again.", "err");
  const r = await chrome.runtime.sendMessage({ type: "lotus:enrich", id: page.tcgplayerProductId });
  const d = r && r.details;
  if (d) {
    page.name = d.productName || page.name; page.setName = d.setName || page.setName;
    page.productLine = d.productLineName || page.productLine; page.productType = d.productTypeName || "";
    if (d.marketPrice != null) page.marketPriceCents = Math.round(d.marketPrice * 100);
  }
  if (!page.imageUrl) page.imageUrl = `https://tcgplayer-cdn.tcgplayer.com/product/${page.tcgplayerProductId}_in_1000x1000.jpg`;
  $("img").src = page.imageUrl; $("name").value = page.name; $("set").value = page.setName; $("type").value = page.productType;
  $("price").value = page.marketPriceCents ? (page.marketPriceCents / 100).toFixed(2) : "";
  $("meta").textContent = `TCGplayer #${page.tcgplayerProductId} · Market ${page.marketPriceCents ? "$" + (page.marketPriceCents / 100).toFixed(2) : "n/a"}` +
    (r && r.existing ? ` · In store: ${r.existing.quantity} @ $${(r.existing.priceCents / 100).toFixed(2)}` : "");
  if (/^cards?$/i.test(page.productType)) show("This is a single card. The store only takes sealed product.", "err");
  else show(r && r.configured ? `Store: ${r.storeUrl}` : "Set the store URL and token in Settings.", r && r.configured ? "muted" : "err");
  $("f").hidden = false;
})();
$("f").addEventListener("submit", async (e) => {
  e.preventDefault();
  show("Adding…");
  const payload = {
    tcgplayerProductId: page.tcgplayerProductId, name: $("name").value.trim(), setName: $("set").value.trim(),
    productLine: page.productLine || "", productType: $("type").value.trim(), imageUrl: page.imageUrl || undefined,
    marketPriceCents: page.marketPriceCents ?? null, priceCents: Math.round(parseFloat($("price").value) * 100),
    quantity: parseInt($("qty").value, 10), mode: document.querySelector('input[name="mode"]:checked').value, url: page.url,
  };
  const r = await chrome.runtime.sendMessage({ type: "lotus:add", payload });
  if (r && r.ok) show(`${r.created ? "Added" : "Updated"}: ${r.product.name}, now ${r.product.quantity} in stock.`, "ok");
  else show((r && r.error) || "Failed.", "err");
});
