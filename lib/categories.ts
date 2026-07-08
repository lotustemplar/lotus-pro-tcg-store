// Single source of truth for the storefront nav + seed data.
// "subs" listed here are the dropdown items under each top-level menu.
// MTG gets three extra subcategories that no other game has.

export type CategoryDef = {
  name: string;
  slug: string;
  navStyle?: "default" | "patreon";
  subs: { name: string; slug: string }[];
};

const COMMON_SUBS = [
  { name: "Sealed Cases", slug: "sealed-cases" },
  { name: "Booster Boxes", slug: "booster-boxes" },
  { name: "Booster Packs", slug: "booster-packs" },
];

export const CATEGORY_TREE: CategoryDef[] = [
  {
    name: "Magic The Gathering",
    slug: "magic-the-gathering",
    subs: [
      ...COMMON_SUBS,
      { name: "Commander Decks (Pre-Cons)", slug: "commander-decks-precon" },
      { name: "Commander Decks (Lotus Pro Built)", slug: "commander-decks-lotus-pro-built" },
      { name: "Secret Lairs", slug: "secret-lairs" },
    ],
  },
  { name: "Pokemon", slug: "pokemon", subs: COMMON_SUBS },
  { name: "One Piece", slug: "one-piece", subs: COMMON_SUBS },
  { name: "Riftbound", slug: "riftbound", subs: COMMON_SUBS },
  { name: "Weiss Schwarz", slug: "weiss-schwarz", subs: COMMON_SUBS },
  { name: "Accessories", slug: "accessories", subs: [] },
  {
    name: "PATREON ACCESS",
    slug: "patreon-access",
    navStyle: "patreon",
    subs: [],
  },
];
