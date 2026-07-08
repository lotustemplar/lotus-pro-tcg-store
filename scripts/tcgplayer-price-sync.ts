import { syncTcgplayerProducts } from "../lib/tcgplayer-sync";

async function main() {
  const result = await syncTcgplayerProducts();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
