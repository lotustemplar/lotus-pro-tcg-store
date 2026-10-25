// Read-only: fetch Filipe's TCGplayer "Export From Live" pricing CSV from HIS logged-in Seller Portal session.
// No credentials are stored; requests run inside a store.tcgplayer.com tab so his own cookies apply. Nothing is written to TCGplayer.
const PRICING_URL = "https://store.tcgplayer.com/admin/pricing";
const isCsv = (t) => typeof t === "string" && /TCGplayer Id/.test(t.slice(0, 2000)) && /Total Quantity/.test(t.slice(0, 2000));

async function getPricingTab() {
  const tabs = await chrome.tabs.query({ url: "https://store.tcgplayer.com/admin/pricing*" });
  if (tabs[0]) return { tab: tabs[0], created: false };
  const tab = await chrome.tabs.create({ url: PRICING_URL, active: false });
  await new Promise((res) => {
    const l = (id, info) => { if (id === tab.id && info.status === "complete") { chrome.tabs.onUpdated.removeListener(l); res(); } };
    chrome.tabs.onUpdated.addListener(l); setTimeout(res, 30000);
  });
  return { tab: await chrome.tabs.get(tab.id), created: true };
}

function inPage(fn, tabId, args = []) {
  return chrome.scripting.executeScript({ target: { tabId }, func: fn, args }).then((r) => r[0]?.result);
}

// Runs in the TCGplayer page.
function pageState() {
  const loginish = /login|signin|sign-in|account\/logon/i.test(location.href) || !!document.querySelector('input[type="password"]');
  return { url: location.href, loggedOut: loginish, hasExport: [...document.querySelectorAll("button,a")].some((b) => /export from live/i.test(b.textContent || "")) };
}
async function pageFetchText(url) {
  try { const r = await fetch(url, { credentials: "include" }); return { status: r.status, url: r.url, text: await r.text() }; }
  catch (e) { return { error: String(e) }; }
}
function pageClickExport() {
  const b = [...document.querySelectorAll("button,a")].find((x) => /export from live/i.test(x.textContent || ""));
  if (!b) return false; b.click(); return true;
}

async function viaDirectEndpoint(tabId) {
  // Known legacy export endpoint of the Seller Portal pricing page.
  const r = await inPage(pageFetchText, tabId, ["/admin/pricing/downloadmyexportcsv?type=Pricing"]);
  return r && isCsv(r.text) ? r.text : null;
}

async function viaExportButton(tabId) {
  // Click "Export From Live" like he would, catch the resulting download URL, cancel the file save, and read it in-page.
  return new Promise(async (resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; chrome.downloads.onCreated.removeListener(onCreated); resolve(v); } };
    const onCreated = async (item) => {
      if (!/tcgplayer\.com|^blob:|^data:/i.test(item.finalUrl || item.url || "")) return;
      const url = item.finalUrl || item.url;
      try { await chrome.downloads.cancel(item.id); await chrome.downloads.erase({ id: item.id }); } catch (e) {}
      if (url.startsWith("data:")) { try { return finish(decodeURIComponent(url.split(",")[1] || "")); } catch (e) { return finish(null); } }
      const r = await inPage(pageFetchText, tabId, [url]);
      finish(r && isCsv(r.text) ? r.text : null);
    };
    chrome.downloads.onCreated.addListener(onCreated);
    const clicked = await inPage(pageClickExport, tabId);
    if (!clicked) return finish(null);
    setTimeout(() => finish(null), 120000); // large inventories can take a while to build
  });
}

export async function fetchTcgplayerInventoryCsv() {
  const { tab, created } = await getPricingTab();
  try {
    const st = await inPage(pageState, tab.id);
    if (!st || st.loggedOut || !/store\.tcgplayer\.com\/admin/i.test(st.url))
      throw new Error("You're not signed in to the TCGplayer Seller Portal in this Chrome. Open store.tcgplayer.com/admin/pricing, sign in, then try again.");
    const csv = (await viaDirectEndpoint(tab.id)) || (await viaExportButton(tab.id));
    if (!csv) throw new Error("Couldn't read the TCGplayer export. Open store.tcgplayer.com/admin/pricing and check that \"Export From Live\" works, then try again (or upload the CSV in Sync Inventories).");
    return csv;
  } finally {
    if (created) chrome.tabs.remove(tab.id).catch(() => {});
  }
}
