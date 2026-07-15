# Lotus Pro TCG - Storefront + Admin

A full trading-card storefront for **lotusprotcg.com**, built with Next.js 14 (App
Router), Prisma, and Stripe Checkout.

## What's included

- Storefront for Magic The Gathering, Pokemon, One Piece, Riftbound, Weiss Schwarz,
  Accessories, and Patreon Access.
- Product pages with stock messaging, add-to-cart flow, and restock signup support.
- Admin panel at `/admin` for products, categories, orders, restock signups, and site
  settings.
- Stripe Checkout with server-side price validation.
- TCGPlayer product import and scheduled price sync.
- Server-side storefront caching for public catalog, nav, site settings, and autocomplete
  queries.

## Tech stack

Next.js 14, TypeScript, Tailwind CSS, Prisma ORM on PostgreSQL, Stripe Checkout, and
`jose` for signed admin sessions.

## Getting started

```bash
npm install
cp .env.example .env
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Visit `http://localhost:3000` for the storefront and `http://localhost:3000/admin` for
the admin panel.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string. Neon is the recommended production host. |
| `STRIPE_SECRET_KEY` | Stripe API secret key. |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret. |
| `NEXT_PUBLIC_SITE_URL` | Public site URL used for redirects. |
| `NEXT_PUBLIC_TAWKTO_PROPERTY_ID` | tawk.to property ID. |
| `NEXT_PUBLIC_TAWKTO_WIDGET_ID` | tawk.to widget ID. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin login for `/admin`. |
| `ADMIN_SESSION_SECRET` | Random secret used to sign the admin session cookie. |

## Deploying

1. Push this repo to GitHub and import it into [Vercel](https://vercel.com).
2. Provision a PostgreSQL database. Neon is the recommended host.
3. Set `DATABASE_URL` and the other environment variables in Vercel.
4. Add a Stripe webhook endpoint for `checkout.session.completed`.
5. Point `lotusprotcg.com` DNS at Vercel.

## Scheduled TCGPlayer sync

The recurring TCGPlayer price sync runs through GitHub Actions every 2 hours. Add
`DATABASE_URL` as a GitHub Actions secret so the workflow can update tracked products.

## Moving from Supabase to Neon

The app already uses plain Postgres through Prisma, so the move is a database export,
database import, and connection-string swap. Follow
[docs/neon-cutover.md](docs/neon-cutover.md).
