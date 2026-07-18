import { submitFullSiteToIndexNow } from "@/lib/indexnow";

async function main() {
  await submitFullSiteToIndexNow();
  console.log("Submitted current public site URLs to IndexNow.");
}

main().catch((error) => {
  console.error("IndexNow submission failed.", error);
  process.exit(1);
});
