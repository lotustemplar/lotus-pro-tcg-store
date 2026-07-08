# Lotus Pro Decks — Storefront + Admin

A full trading-card storefront for **lotusprodecks.com**, built with Next.js 14 (App
Router), Prisma, and Stripe Checkout. Dark theme matching the existing Lotus Pro Decks
brand (deep navy background, purple accent, Rajdhani/Inter type).

## What's included

- **Storefront** with the exact menu you specified: Magic The Gathering, Pokemon, One
  Piece, Riftbound, Weiss Schwarz, Accessories, and a gold-highlighted Patreon Access
  item. Magic gets three extra subcategories (Commander Decks Pre-Cons, Commander Decks
  Lotus Pro Built, Secret Lairs) that no other game has; every game gets Sealed Cases /
  Booster Boxes / Booster Packs.
- **Product pages** with Add to Cart above the fold, a flaming "Very Low Stock!" banner
  under 5 units, and "Only 1 Left In Stock — Hurry!" at exactly 1 unit.
- **Restock notifications** — customers can leave an email on any sold-out product;
  requests land in `/admin/restock-signups` ready to wire up to an email provider.
- **Front page carousel** with left/right arrows, driven entirely by the "Appear on Front
  Page" toggle in the admin product form.
- **Autocomplete search** in the header, backed by `/api/search`.
- **Cart + Stripe Checkout** — flat $5.99 shipping, waived automatically over $150 (see
  `lib/shipping.ts`). Prices are always re-verified server-side against the database
  before a Stripe session is created.
- **Admin panel** at `/admin` — product CRUD (price, quantity, images, SEO title/
  description/keywords, "appear on home" + carousel order, active/inactive), category
  management, order list, and restock-signup list. Single-admin login gated by
  `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`.
- **Static footer** with the $5.99 / free-over-$150 shipping messaging on every page.

## Tech stack

Next.js 14 (App Router, TypeScript), Tailwind CSS, Prisma ORM (SQLite locally,
Postgres-ready for production), Stripe Checkout + webhooks, `jose` for signed admin
session cookies.

## Getting started

```bash
npm install
cp .env.example .env      # then fill in real values, see below
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Visit `http://localhost:3000` for the storefront and `http://localhost:3000/admin` for
the admin panel (login with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in `.env`).

### Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `file:./dev.db` for local dev. Swap to a Postgres URL for production (see below). |
| `STRIPE_SECRET_KEY` | From the [Stripe dashboard](https://dashboard.stripe.com/test/apikeys). Use a **test** key until you're ready to go live. |
| `STRIPE_WEBHOOK_SECRET` | From `stripe listen` locally, or your webhook endpoint's signing secret in production. |
| `NEXT_PUBLIC_SITE_URL` | Your site's public URL, used for Stripe success/cancel redirects. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Login for `/admin`. Change these before deploying. |
| `ADMIN_SESSION_SECRET` | Random string used to sign the admin session cookie. Generate one with `openssl rand -hex 32`. |

### Stripe webhook (local dev)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET` in `.env`. This webhook is
what marks an order "paid" and decrements inventory once Stripe confirms payment — don't
skip it, or paid orders will sit at status `pending` forever.

## Deploying

1. Push this repo to GitHub and import it into [Vercel](https://vercel.com).
2. Provision a Postgres database (Neon, Supabase, or Vercel Postgres all work) and set
   `DATABASE_URL` to its connection string in Vercel's environment variables.
3. Set all the same environment variables from the table above in Vercel, using your
   **live** Stripe keys once you're ready to accept real payments.
4. Add a Stripe webhook endpoint pointing at
   `https://your-domain.com/api/webhooks/stripe` for the `checkout.session.completed`
   event, and put its signing secret in `STRIPE_WEBHOOK_SECRET`.
5. Point your `lotusprodecks.com` DNS at Vercel.

### Scheduled TCGPlayer sync

The recurring TCGPlayer price sync now runs through GitHub Actions every 2 hours.
Add `DATABASE_URL` as a GitHub Actions secret so the workflow can update tracked
products from TCGPlayer.

## Adding products & categories

Everything is done through `/admin` — no code changes needed for day-to-day store
management:

- **Products** (`/admin/products`): name, description, price, compare-at price, SKU,
  quantity, images (paste any image URL — an S3/Cloudinary/Imgix bucket works great),
  SEO title/description/keywords, "appear on Front Page carousel" + sort order, and
  active/inactive.
- **Categories** (`/admin/categories`): the seven main menu items and their
  subcategories already exist after seeding. Use this page to add further
  subcategories if you introduce a new game or product type later.
- **Orders** (`/admin/orders`): read-only list of everything that's come through Stripe.
- **Restock signups** (`/admin/restock-signups`): emails waiting on an out-of-stock
  product. Hook up an email provider (Resend, Postmark, SendGrid) and, when you restock
  an item, email everyone on that product's list — see the `TODO` note in
  `app/api/restock-signup/route.ts`.

## Logo assets

Placeholder lotus logos matching your brand palette are in `public/logo/` —
`logo-square.svg` (1:1) and `logo-wide.svg` (3:1). **Swap these for your real exported
logo files** (the ones you shared) before launch; same filenames, any format (SVG/PNG)
works as long as you update the `src` in `components/Header.tsx` and
`components/Footer.tsx` if you change the extension.

## A note on this build's verification

This project was built and its TypeScript was fully type-checked end-to-end in a
network-restricted sandbox that couldn't reach `binaries.prisma.sh` to download
Prisma's query engine (a common issue behind corporate firewalls too). Every file in
the app compiles and type-checks cleanly; the only step that couldn't be exercised here
was actually running the database (which needs that engine binary). On your own
machine, in GitHub Actions, or on Vercel — none of which block that domain — `npm
install && npx prisma generate` will work normally with no changes needed. If you ever
hit the same "binaries.prisma.sh — 403/blocked" error behind a strict corporate proxy,
see [Prisma's docs on custom engine mirrors](https://www.prisma.io/docs) for a
workaround.
