# Sealed inventory sync (event-driven, no AI)

All three channels list the **full** sealed quantity. A sale on one lowers the store DB and queues the same
decrement for the others. Nothing polls TCGplayer or Mana Pool on a short timer.

| Sale on | Trigger | Store | Mana Pool | TCGplayer |
|---|---|---|---|---|
| Store | Stripe `checkout.session.completed` → `/api/webhooks/stripe` (Order is created here, paid only) | decremented | queued (approval) or auto | queued → staged CSV |
| Mana Pool | `order_created` webhook → `/api/webhooks/manapool` (HMAC `MANAPOOL_WEBHOOK_SECRET`) | decremented | (MP already did it) | queued → staged CSV |
| TCGplayer | Sale email → Google Apps Script relay (every 5 min, inside Gmail) → `/api/webhooks/tcgplayer-email` (HMAC `EMAIL_RELAY_SECRET`) | decremented | queued (approval) or auto | (TCG already did it) |

- Idempotent: `InventoryEvent` is unique on (source, order id, product), so webhook retries never double-count.
- Mana Pool mode: Admin → Inventory Sync. Default **Approval list**. "Automatic" applies on the event. API writes
  also require env `MANAPOOL_WRITES_ENABLED=1` (off by default; safe for previews).
- TCGplayer: Admin → Inventory Sync → Download CSV (signed `Add to Quantity`). Delete staged → Import to Staged → Move To Live.
- Unmatched sale lines (e.g. an email title that doesn't match a product) show under "Needs a look". Set
  `tcgplayerListingName` on the product to the exact TCGplayer title to fix matching.
- Mapping fields on Product: `tcgplayerSku` (TCGplayer Id in pricing export), `manapoolProductId` (Mana Pool sealed product UUID),
  `tcgplayerListingName`. Mana Pool only sells MTG sealed; other games sync store ⇄ TCGplayer only.
- 12-hour reconcile: `docs/workflows/sealed-reconcile.yml` (copy into `.github/workflows/` to enable; the bot token lacks `workflow` scope) runs `scripts/sealed-reconcile.ts` at 00:00/12:00 PT.
  It writes a change-list CSV artifact and changes nothing. Pass `--tcg-export <pricing export>` locally to include TCGplayer.

## Env vars (names only)
`MANAPOOL_EMAIL`, `MANAPOOL_ACCESS_TOKEN`, `MANAPOOL_WEBHOOK_SECRET` (returned once by `PUT /webhooks/register`),
`MANAPOOL_WRITES_ENABLED`, `EMAIL_RELAY_SECRET`, `EXTENSION_API_TOKEN` (≥24 chars).

## Email relay setup (Filipe, ~5 min, free)
1. script.google.com signed in as the Gmail that receives TCGplayer sale emails → New project → paste `tools/email-relay/Code.gs`.
2. Script properties: `STORE_URL`, `RELAY_SECRET`.
3. Run `installTrigger` once and approve Gmail access.
Cost: Google runs it for free (288 short checks/day, a no-op unless a sale email exists); zero Grok/model tokens.

## Orders vs Visitor Activity
Orders are created only by a paid Stripe checkout (or a manual admin order). Cart adds, removals and checkout
starts are stored in `VisitorActivity` (anonymous session id, product, action, time; never card or address data)
and shown in Admin → Visitor Activity. Migration `20261024190000_sealed_sync_visitor_activity` moves old
unpaid "pending@checkout" orders into VisitorActivity (`legacy_pending_order`) before removing them from Orders.
Apply with `npx prisma migrate deploy` after approval (back up / branch the Neon DB first).
