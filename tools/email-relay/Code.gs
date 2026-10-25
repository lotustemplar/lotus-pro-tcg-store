/**
 * Lotus Pro TCG: TCGplayer sale email relay (Google Apps Script, runs inside Filipe's Gmail).
 * No AI/model calls. Every 5 minutes it looks for new TCGplayer "have sold" emails, POSTs the
 * plain-text bodies to the store, and labels them so each email is sent once.
 *
 * Setup: Project Settings -> Script properties:
 *   STORE_URL      = https://<store-domain>/api/webhooks/tcgplayer-email
 *   RELAY_SECRET   = same value as the store's EMAIL_RELAY_SECRET env var
 * Then run installTrigger() once and approve the Gmail permission prompt.
 */
var QUERY = 'from:sales@tcgplayer.com "have sold" newer_than:3d -label:lotus-synced';
var LABEL = 'lotus-synced';

function relayTcgplayerSales() {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('STORE_URL');
  var secret = props.getProperty('RELAY_SECRET');
  if (!url || !secret) throw new Error('Set STORE_URL and RELAY_SECRET script properties');
  var threads = GmailApp.search(QUERY, 0, 20);
  if (threads.length === 0) return; // nothing new: no request sent
  var label = GmailApp.getUserLabelByName(LABEL) || GmailApp.createLabel(LABEL);
  var messages = [];
  threads.forEach(function (t) {
    t.getMessages().forEach(function (m) {
      if (/have sold/i.test(m.getSubject())) messages.push({ id: m.getId(), body: m.getPlainBody() });
    });
  });
  var body = JSON.stringify({ messages: messages });
  var ts = String(Math.floor(Date.now() / 1000));
  var sigBytes = Utilities.computeHmacSha256Signature(ts + '.' + body, secret);
  var sig = sigBytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
  var res = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json', payload: body, muteHttpExceptions: true,
    headers: { 'X-Lotus-Timestamp': ts, 'X-Lotus-Signature': sig },
  });
  if (res.getResponseCode() !== 200) throw new Error('Store returned ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300));
  threads.forEach(function (t) { t.addLabel(label); });
}

function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('relayTcgplayerSales').timeBased().everyMinutes(5).create();
}
