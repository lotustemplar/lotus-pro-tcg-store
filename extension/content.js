// Reads only the TCGplayer product page the user is viewing. No crawling.
function text(sel) { const el = document.querySelector(sel); return el ? el.textContent.trim() : ""; }
function money(s) { const m = (s || "").replace(/,/g, "").match(/\$?\s*(\d+(?:\.\d{1,2})?)/); return m ? Math.round(parseFloat(m[1]) * 100) : null; }
function readPage() {
  const id = Number((location.pathname.match(/\/product\/(\d+)/) || [])[1] || 0);
  let ld = {};
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try { const j = JSON.parse(s.textContent); if (j && (j["@type"] === "Product" || j.name)) { ld = j; break; } } catch (e) {}
  }
  const crumbs = [...document.querySelectorAll('[class*="breadcrumb"] a, nav a[href*="/search/"]')].map((a) => a.textContent.trim()).filter(Boolean);
  const marketLabel = [...document.querySelectorAll("span, div, td, th")].find((el) => /^Market Price$/i.test(el.textContent.trim()));
  const marketText = marketLabel ? (marketLabel.nextElementSibling || marketLabel.parentElement).textContent : "";
  return {
    tcgplayerProductId: id,
    name: text("h1") || ld.name || document.title.replace(/\s*\|.*$/, ""),
    setName: text('[class*="product-details__set"]') || (crumbs.length > 2 ? crumbs[crumbs.length - 1] : ""),
    productLine: crumbs[1] || "",
    productType: "",
    imageUrl: (ld.image && (Array.isArray(ld.image) ? ld.image[0] : ld.image)) || (document.querySelector('meta[property="og:image"]') || {}).content || "",
    marketPriceCents: money(marketText) ?? (ld.offers && ld.offers.price ? Math.round(Number(ld.offers.price) * 100) : null),
    url: location.origin + location.pathname,
  };
}
chrome.runtime.onMessage.addListener((msg, _sender, reply) => { if (msg && msg.type === "lotus:read") reply(readPage()); });
