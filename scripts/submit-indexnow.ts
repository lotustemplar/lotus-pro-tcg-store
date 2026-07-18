import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { submitFullSiteToIndexNow } = await import("@/lib/indexnow");
  await submitFullSiteToIndexNow();
  console.log("Submitted current public site URLs to IndexNow.");
}

main().catch((error) => {
  console.error("IndexNow submission failed.", error);
  process.exit(1);
});
