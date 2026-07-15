# Neon Cutover

This storefront already uses Prisma with a standard Postgres `DATABASE_URL`, so moving
from Supabase to Neon does not require an application rewrite. The cutover is:

1. Create a Neon project and database.
2. Copy the Neon connection string.
3. Export the current Supabase database.
4. Import that export into Neon.
5. Update `DATABASE_URL` anywhere the app runs.
6. Redeploy and verify the admin/storefront.

## 1. Create the Neon database

- Create a new Neon project for Lotus Pro TCG.
- Create a database for production.
- Copy the connection string with SSL enabled.

Example:

```text
postgresql://USER:PASSWORD@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

## 2. Export from Supabase

Use a full SQL export from the current production database.

PowerShell:

```powershell
$env:SUPABASE_DATABASE_URL="postgresql://..."
pg_dump --dbname "$env:SUPABASE_DATABASE_URL" --format=plain --no-owner --no-privileges --file supabase-export.sql
```

If `pg_dump` is not installed locally, install PostgreSQL tools first or export from a
machine that already has them.

## 3. Import into Neon

PowerShell:

```powershell
$env:NEON_DATABASE_URL="postgresql://..."
psql "$env:NEON_DATABASE_URL" -f .\supabase-export.sql
```

## 4. Update runtime configuration

Replace the production `DATABASE_URL` with the Neon connection string in every runtime:

- Vercel project environment variables
- GitHub Actions secret used by `.github/workflows/tcgplayer-price-sync.yml`
- Any local `.env` used for production debugging

## 5. Redeploy

After the environment variable change:

```powershell
npm run build
```

Then trigger a fresh production deployment.

## 6. Verify the cutover

Check these paths after deployment:

- `/`
- `/admin`
- `/admin/products`
- `/admin/settings`
- Add a test product edit and confirm it appears on the public site
- Run a manual TCGPlayer sync and confirm the sync succeeds

## Fresh-start alternative

If you do not need the existing Supabase data, point `DATABASE_URL` at Neon and create a
fresh database instead:

```powershell
npx prisma migrate deploy
npx prisma db seed
```
