import { redirect } from "next/navigation";

// The store is sealed-only; the mystery booster bag page is retired.
// Admin + API for mystery bags are untouched. Restore from git history if needed.
export default function MysteryBoosterBagPage() {
  redirect("/");
}
