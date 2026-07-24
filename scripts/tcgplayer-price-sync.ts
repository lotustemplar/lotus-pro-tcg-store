import { isDatabaseQuotaExceededError, syncTcgplayerProducts } from "../lib/tcgplayer-sync";

async function main() {
  const result = await syncTcgplayerProducts();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  if (isDatabaseQuotaExceededError(error)) {
    console.log(
      JSON.stringify(
        {
          skipped: true,
          reason: "database_quota_exceeded",
          detail:
            "Skipped TCGPlayer sync because the Neon database is currently over quota and rejecting reads.",
        },
        null,
        2,
      ),
    );
    process.exitCode = 0;
    return;
  }

  console.error(error);
  process.exitCode = 1;
});
