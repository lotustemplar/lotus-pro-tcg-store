import { syncTcgplayerProducts } from "../../lib/tcgplayer-sync";

export default async function handler(req) {
  const body = await req.json().catch(() => ({}));
  console.log("Running scheduled TCGplayer sync. Next run:", body?.next_run ?? "unknown");

  const result = await syncTcgplayerProducts();
  return Response.json({ ok: true, ...result });
}

export const config = {
  schedule: "0 */2 * * *",
};
