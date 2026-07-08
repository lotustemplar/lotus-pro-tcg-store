import { PrismaClient } from "@prisma/client";
import { CATEGORY_TREE } from "../lib/categories";
import { slugify } from "../lib/format";

const prisma = new PrismaClient();

function placeholderImage(label: string, bg = "161B2E", fg = "a78bfa") {
  return `https://placehold.co/800x800/${bg}/${fg}?text=${encodeURIComponent(label)}`;
}

async function main() {
  console.log("Seeding categories...");

  const categoryIdBySlug: Record<string, string> = {};
  const subCategoryIdByPath: Record<string, string> = {};

  for (let i = 0; i < CATEGORY_TREE.length; i++) {
    const top = CATEGORY_TREE[i];
    const created = await prisma.category.upsert({
      where: { parentId_slug: { parentId: null as unknown as string, slug: top.slug } },
      update: {},
      create: {
        name: top.name,
        slug: top.slug,
        isTopLevel: true,
        navStyle: top.navStyle ?? "default",
        sortOrder: i,
      },
    });
    categoryIdBySlug[top.slug] = created.id;

    for (let j = 0; j < top.subs.length; j++) {
      const sub = top.subs[j];
      const createdSub = await prisma.category.upsert({
        where: { parentId_slug: { parentId: created.id, slug: sub.slug } },
        update: {},
        create: {
          name: sub.name,
          slug: sub.slug,
          isTopLevel: false,
          parentId: created.id,
          sortOrder: j,
        },
      });
      subCategoryIdByPath[`${top.slug}/${sub.slug}`] = createdSub.id;
    }
  }

  console.log("Seeding sample products...");

  type SeedProduct = {
    name: string;
    price: number;
    compareAt?: number;
    quantity: number;
    categoryPath: string; // "top/sub" or just "top" for leaf-less categories
    featured?: boolean;
    description: string;
  };

  const products: SeedProduct[] = [
    // Magic the Gathering
    { name: "MTG: Bloomburrow Sealed Case", price: 899.99, quantity: 3, categoryPath: "magic-the-gathering/sealed-cases", featured: true, description: "A full sealed case of Bloomburrow booster boxes. Factory sealed, ships in original case packaging." },
    { name: "MTG: Bloomburrow Booster Box", price: 149.99, quantity: 12, categoryPath: "magic-the-gathering/booster-boxes", featured: true, description: "36 Play Booster packs per box. Factory sealed." },
    { name: "MTG: Bloomburrow Booster Pack", price: 5.49, quantity: 1, categoryPath: "magic-the-gathering/booster-packs", description: "Single Play Booster pack from Bloomburrow." },
    { name: "MTG Commander Precon: Lifegain Matters", price: 39.99, quantity: 8, categoryPath: "magic-the-gathering/commander-decks-precon", description: "Official Wizards of the Coast preconstructed Commander deck, ready to play out of the box." },
    { name: "Lotus Pro Built: Meren Graveyard Engine", price: 189.0, quantity: 1, categoryPath: "magic-the-gathering/commander-decks-lotus-pro-built", featured: true, description: "Hand-tuned by our team. Sacrifice creatures, fill the yard, and drain your opponents dry. Includes pilot guide and upgrade path." },
    { name: "Secret Lair: Phyrexian Praetors Drop", price: 129.99, quantity: 4, categoryPath: "magic-the-gathering/secret-lairs", description: "Limited-run Secret Lair drop featuring alternate-art Phyrexian Praetors." },

    // Pokemon
    { name: "Pokemon: Scarlet & Violet Sealed Case", price: 749.99, quantity: 2, categoryPath: "pokemon/sealed-cases", featured: true, description: "Factory sealed case of Scarlet & Violet booster boxes." },
    { name: "Pokemon: Scarlet & Violet Booster Box", price: 119.99, quantity: 15, categoryPath: "pokemon/booster-boxes", description: "36 booster packs, factory sealed." },
    { name: "Pokemon: Scarlet & Violet Booster Pack", price: 4.49, quantity: 0, categoryPath: "pokemon/booster-packs", description: "Single booster pack." },

    // One Piece
    { name: "One Piece TCG: Sealed Case", price: 699.99, quantity: 3, categoryPath: "one-piece/sealed-cases", description: "Factory sealed case of One Piece TCG booster boxes." },
    { name: "One Piece TCG: Booster Box", price: 99.99, quantity: 4, categoryPath: "one-piece/booster-boxes", featured: true, description: "24 packs per box, factory sealed." },
    { name: "One Piece TCG: Booster Pack", price: 4.99, quantity: 20, categoryPath: "one-piece/booster-packs", description: "Single One Piece TCG booster pack." },

    // Riftbound
    { name: "Riftbound: Sealed Case", price: 599.99, quantity: 2, categoryPath: "riftbound/sealed-cases", description: "Factory sealed case of Riftbound booster boxes." },
    { name: "Riftbound: Booster Box", price: 89.99, quantity: 1, categoryPath: "riftbound/booster-boxes", featured: true, description: "Riftbound booster box, factory sealed." },
    { name: "Riftbound: Booster Pack", price: 4.99, quantity: 30, categoryPath: "riftbound/booster-packs", description: "Single Riftbound booster pack." },

    // Weiss Schwarz
    { name: "Weiss Schwarz: Sealed Case", price: 549.99, quantity: 3, categoryPath: "weiss-schwarz/sealed-cases", description: "Factory sealed case of Weiss Schwarz booster boxes." },
    { name: "Weiss Schwarz: Booster Box", price: 79.99, quantity: 10, categoryPath: "weiss-schwarz/booster-boxes", description: "Weiss Schwarz booster box, factory sealed." },
    { name: "Weiss Schwarz: Booster Pack", price: 3.99, quantity: 2, categoryPath: "weiss-schwarz/booster-packs", description: "Single Weiss Schwarz booster pack." },

    // Accessories (no subcategory - attaches directly to top-level category)
    { name: "Ultra Pro Deck Box (100ct)", price: 12.99, quantity: 40, categoryPath: "accessories", description: "Durable 100-count deck box for double-sleeved decks." },
    { name: "Premium Playmat - Lotus Edition", price: 24.99, quantity: 5, categoryPath: "accessories", featured: true, description: "Stitched-edge neoprene playmat featuring the Lotus Pro Decks lotus design." },

    // Patreon Access (no subcategory)
    { name: "Patreon Access: Monthly Membership", price: 9.99, quantity: 999, categoryPath: "patreon-access", description: "Monthly Patreon membership: early access to drops, discounts, and exclusive pro-built decklists." },
  ];

  let order = 0;
  for (const p of products) {
    const categoryId =
      subCategoryIdByPath[p.categoryPath] ?? categoryIdBySlug[p.categoryPath];
    if (!categoryId) {
      console.warn(`Skipping "${p.name}" — category path not found: ${p.categoryPath}`);
      continue;
    }

    const slug = slugify(p.name);
    await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        name: p.name,
        slug,
        description: p.description,
        priceCents: Math.round(p.price * 100),
        compareAtCents: p.compareAt ? Math.round(p.compareAt * 100) : null,
        quantity: p.quantity,
        categoryId,
        featuredOnHome: !!p.featured,
        featuredOrder: order++,
        seoTitle: p.name,
        seoDescription: p.description.slice(0, 155),
        images: {
          create: [{ url: placeholderImage(p.name), altText: p.name, sortOrder: 0 }],
        },
      },
    });
  }

  console.log("Seeding admin user env reminder...");
  await prisma.siteSettings.upsert({
    where: { id: "site" },
    update: {},
    create: { id: "site" },
  });
  console.log("Done. Log into /admin using ADMIN_EMAIL / ADMIN_PASSWORD from your .env file.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
