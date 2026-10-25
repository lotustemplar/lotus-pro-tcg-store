const $ = (id) => document.getElementById(id);
chrome.storage.local.get({ storeUrl: "https://lotusprotcg.com", token: "" }, (s) => { $("url").value = s.storeUrl; $("token").value = s.token; });
$("save").onclick = () => chrome.storage.local.set({ storeUrl: $("url").value.trim(), token: $("token").value.trim() }, () => { $("msg").textContent = "Saved."; });
