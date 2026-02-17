#!/usr/bin/env node

/**
 * Seed script for the AI Shopping Assistant.
 * Inserts ~100 mobile phone products into Supabase, then seeds
 * sample promotions, product-promotion links, bundles, and bundle items.
 *
 * Usage:
 *   node scripts/seed-products.mjs
 *
 * Reads SUPABASE_URL and SUPABASE_KEY from ../.env.local or environment.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

// ── Config ──────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const envPath = resolve(__dirname, "..", ".env.local");
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local not found — rely on environment variables
  }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
// Prefer service role key for admin operations (bypasses RLS), fall back to anon key
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL and SUPABASE_KEY (or SUPABASE_SERVICE_ROLE_KEY).");
  console.error("Set them in .env.local or as environment variables.");
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("⚠  SUPABASE_SERVICE_ROLE_KEY not set — using anon key. This may fail if RLS is enabled.");
  console.warn("   Add SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> to .env.local\n");
}

const REST = `${SUPABASE_URL}/rest/v1`;
const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// ── Supabase helpers ────────────────────────────────────────────────
async function supabasePost(table, rows) {
  const res = await fetch(`${REST}/${table}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST /${table} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function supabaseUpsert(table, rows, onConflict) {
  const res = await fetch(`${REST}/${table}`, {
    method: "POST",
    headers: { ...HEADERS, Prefer: "return=representation,resolution=merge-duplicates" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`UPSERT /${table} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function supabaseDelete(table) {
  // Delete all rows — use a filter that matches everything
  const url = `${REST}/${table}?id=not.is.null`;
  const res = await fetch(url, { method: "DELETE", headers: HEADERS });
  if (!res.ok) {
    const text = await res.text();
    // Ignore "no rows" errors
    if (res.status === 404) return;
    throw new Error(`DELETE /${table} failed (${res.status}): ${text}`);
  }
}

// ── Product data generation ─────────────────────────────────────────

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randRating() {
  return +(3.5 + Math.random() * 1.5).toFixed(1);
}

const PHONES = [
  // Apple iPhones (20 variants)
  ...["iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus", "iPhone 16", "iPhone 16e",
    "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
    "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14",
    "iPhone SE (2024)", "iPhone 13", "iPhone 13 Mini",
    "iPhone 16 Pro Max 1TB", "iPhone 16 Pro 512GB", "iPhone 15 Pro 256GB", "iPhone 14 128GB"
  ].map((name) => ({
    brand: "Apple",
    name,
    os: "iOS 18",
    processor: name.includes("16") ? "A18 Pro" : name.includes("15") ? "A17 Pro" : "A16 Bionic",
  })),

  // Samsung Galaxy (20 variants)
  ...["Galaxy S25 Ultra", "Galaxy S25+", "Galaxy S25", "Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24",
    "Galaxy S24 FE", "Galaxy S23 Ultra", "Galaxy S23+", "Galaxy S23",
    "Galaxy Z Fold 6", "Galaxy Z Flip 6", "Galaxy Z Fold 5", "Galaxy Z Flip 5",
    "Galaxy A55 5G", "Galaxy A35 5G", "Galaxy A25 5G", "Galaxy A16 5G", "Galaxy A05s",
    "Galaxy S25 Ultra 1TB"
  ].map((name) => ({
    brand: "Samsung",
    name,
    os: "Android 15",
    processor: name.includes("S25") ? "Snapdragon 8 Elite" : name.includes("S24") ? "Snapdragon 8 Gen 3" : "Exynos 2400",
  })),

  // Google Pixel (12 variants)
  ...["Pixel 9 Pro XL", "Pixel 9 Pro", "Pixel 9", "Pixel 9a",
    "Pixel 8 Pro", "Pixel 8", "Pixel 8a",
    "Pixel Fold", "Pixel 7 Pro", "Pixel 7", "Pixel 7a",
    "Pixel 9 Pro XL 512GB"
  ].map((name) => ({
    brand: "Google",
    name,
    os: "Android 15",
    processor: name.includes("9") ? "Tensor G4" : name.includes("8") ? "Tensor G3" : "Tensor G2",
  })),

  // OnePlus (10 variants)
  ...["OnePlus 13", "OnePlus 13R", "OnePlus 12", "OnePlus 12R",
    "OnePlus Nord 4", "OnePlus Nord CE 4", "OnePlus Open",
    "OnePlus 11", "OnePlus Nord 3", "OnePlus 13 512GB"
  ].map((name) => ({
    brand: "OnePlus",
    name,
    os: "Android 15",
    processor: name.includes("13") ? "Snapdragon 8 Elite" : "Snapdragon 8 Gen 3",
  })),

  // Xiaomi (10 variants)
  ...["Xiaomi 15 Ultra", "Xiaomi 15 Pro", "Xiaomi 15", "Xiaomi 14 Ultra", "Xiaomi 14 Pro",
    "Xiaomi 14T Pro", "Xiaomi 14T", "Redmi Note 14 Pro+ 5G", "Redmi Note 14 Pro 5G", "Poco F6 Pro"
  ].map((name) => ({
    brand: name.startsWith("Redmi") ? "Xiaomi" : name.startsWith("Poco") ? "Xiaomi" : "Xiaomi",
    name,
    os: "Android 15",
    processor: name.includes("Ultra") ? "Snapdragon 8 Elite" : "Snapdragon 8 Gen 3",
  })),

  // Sony (5 variants)
  ...["Xperia 1 VI", "Xperia 5 V", "Xperia 10 VI", "Xperia 1 V", "Xperia Pro-I"].map((name) => ({
    brand: "Sony",
    name,
    os: "Android 14",
    processor: "Snapdragon 8 Gen 2",
  })),

  // Huawei (5 variants)
  ...["Huawei Pura 70 Ultra", "Huawei Pura 70 Pro", "Huawei Mate 60 Pro", "Huawei Nova 12 Ultra", "Huawei P60 Pro"].map((name) => ({
    brand: "Huawei",
    name,
    os: "HarmonyOS 4",
    processor: "Kirin 9010",
  })),

  // Motorola (5 variants)
  ...["Motorola Edge 50 Ultra", "Motorola Edge 50 Pro", "Motorola Razr 50 Ultra", "Motorola Razr 50", "Moto G85 5G"].map((name) => ({
    brand: "Motorola",
    name,
    os: "Android 14",
    processor: "Snapdragon 8s Gen 3",
  })),

  // Nothing (5 variants)
  ...["Nothing Phone (2a) Plus", "Nothing Phone (2a)", "Nothing Phone (2)", "Nothing Phone (1)", "Nothing CMF Phone 1"].map((name) => ({
    brand: "Nothing",
    name,
    os: "Android 14",
    processor: "Dimensity 7200 Pro",
  })),

  // Honor (5 variants)
  ...["Honor Magic 7 Pro", "Honor Magic 6 Pro", "Honor 200 Pro", "Honor 200", "Honor X9b 5G"].map((name) => ({
    brand: "Honor",
    name,
    os: "Android 14",
    processor: "Snapdragon 8 Gen 3",
  })),
];


const STORAGE_OPTIONS = ["64GB", "128GB", "256GB", "512GB", "1TB"];
const RAM_OPTIONS = ["4GB", "6GB", "8GB", "12GB", "16GB"];
const SCREEN_SIZES = ["6.1 inches", "6.3 inches", "6.5 inches", "6.7 inches", "6.8 inches", "6.9 inches"];
const CAMERAS = ["12MP", "48MP", "50MP", "64MP", "108MP", "200MP"];
const BATTERY_SIZES = ["3500mAh", "4000mAh", "4500mAh", "5000mAh", "5500mAh", "6000mAh"];
const COLOURS = ["Black", "White", "Blue", "Green", "Purple", "Gold", "Silver", "Titanium"];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function priceForPhone(phone) {
  const n = phone.name.toLowerCase();
  if (n.includes("ultra") || n.includes("pro max") || n.includes("1tb") || n.includes("fold")) return rand(999, 1599);
  if (n.includes("pro") || n.includes("plus") || n.includes("512gb")) return rand(699, 1099);
  if (n.includes("fe") || n.includes("se") || n.includes("mini") || n.includes("a5") || n.includes("a3") || n.includes("a2") || n.includes("a1") || n.includes("a05") || n.includes("nord") || n.includes("redmi") || n.includes("poco") || n.includes("cmf") || n.includes("moto g") || n.includes("x9b")) return rand(149, 449);
  return rand(449, 899);
}

function buildProduct(phone) {
  const colour = pickRandom(COLOURS);
  const storage = phone.name.match(/(\d+GB|1TB)/i)?.[1] || pickRandom(STORAGE_OPTIONS.slice(1, 4));
  const ram = pickRandom(RAM_OPTIONS.slice(2));
  const screen = pickRandom(SCREEN_SIZES);
  const camera = pickRandom(CAMERAS.slice(1));
  const battery = pickRandom(BATTERY_SIZES.slice(2));

  return {
    name: phone.name,
    price: priceForPhone(phone),
    description: `${phone.name} with ${storage} storage, ${ram} RAM, ${screen} display, and ${camera} camera. Powered by ${phone.processor}.`,
    category: "Mobile",
    image_url: `https://placehold.co/400x400?text=${encodeURIComponent(phone.name)}`,
    specs: {
      storage,
      ram,
      screen_size: screen,
      camera,
      processor: phone.processor,
      battery,
      os: phone.os,
      colour,
    },
    brand: phone.brand,
    stock: rand(10, 100),
    rating: randRating(),
    tags: [phone.brand, phone.os.split(" ")[0], "5G", "Mobile", colour],
  };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log(`Generating ${PHONES.length} mobile phone products...`);

  // Clear existing data (order matters for FK constraints)
  console.log("Clearing existing data...");
  await supabaseDelete("bundle_items");
  await supabaseDelete("product_promotions");
  await supabaseDelete("bundle_items");
  await supabaseDelete("bundles");
  await supabaseDelete("promotions");
  await supabaseDelete("cart_items");
  await supabaseDelete("chat_history");
  await supabaseDelete("products");

  // Build and insert products
  const products = PHONES.map(buildProduct);
  let imported = 0;
  let skipped = 0;

  // Insert in batches of 20
  const BATCH = 20;
  const insertedProducts = [];

  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    try {
      const result = await supabaseUpsert("products", batch);
      insertedProducts.push(...result);
      imported += batch.length;
      console.log(`  Inserted batch ${Math.floor(i / BATCH) + 1} (${batch.length} products)`);
    } catch (err) {
      // Try one-by-one for the failed batch
      for (const p of batch) {
        try {
          const result = await supabaseUpsert("products", [p]);
          insertedProducts.push(...result);
          imported++;
        } catch (e) {
          console.warn(`  Skipped: ${p.name} — ${e.message}`);
          skipped++;
        }
      }
    }
  }

  console.log(`\nProducts: ${imported} imported, ${skipped} skipped (total: ${imported + skipped})`);

  // ── Seed promotions ─────────────────────────────────────────────
  console.log("\nSeeding promotions...");

  const promotions = [
    {
      name: "Summer Sale 15% Off",
      description: "Get 15% off selected phones this summer",
      discount_type: "percentage",
      discount_value: 15,
      promo_code: "SUMMER15",
      start_date: "2026-06-01T00:00:00Z",
      end_date: "2026-08-31T23:59:59Z",
      promotional_label: "Summer Sale",
      is_active: true,
    },
    {
      name: "New Customer £20 Off",
      description: "£20 off your first phone purchase",
      discount_type: "fixed_amount",
      discount_value: 20,
      promo_code: "WELCOME20",
      start_date: "2026-01-01T00:00:00Z",
      end_date: "2026-12-31T23:59:59Z",
      promotional_label: "New Customer Deal",
      is_active: true,
    },
    {
      name: "Flash Deal 10% Off Samsung",
      description: "10% off all Samsung phones — limited time",
      discount_type: "percentage",
      discount_value: 10,
      promo_code: null,
      start_date: "2026-02-01T00:00:00Z",
      end_date: "2026-03-31T23:59:59Z",
      promotional_label: "Flash Deal",
      is_active: true,
    },
    {
      name: "Apple Trade-In Bonus £50",
      description: "Extra £50 off when you trade in any old phone for an iPhone",
      discount_type: "fixed_amount",
      discount_value: 50,
      promo_code: "APPLETRADE",
      start_date: "2026-01-01T00:00:00Z",
      end_date: "2026-06-30T23:59:59Z",
      promotional_label: "Trade-In Bonus",
      is_active: true,
    },
    {
      name: "Pixel Launch 5% Off",
      description: "5% off Google Pixel 9 series at launch",
      discount_type: "percentage",
      discount_value: 5,
      promo_code: "PIXEL5",
      start_date: "2026-02-01T00:00:00Z",
      end_date: "2026-04-30T23:59:59Z",
      promotional_label: "Launch Offer",
      is_active: false,
    },
  ];

  const insertedPromos = await supabasePost("promotions", promotions);
  console.log(`  Inserted ${insertedPromos.length} promotions`);

  // Link promotions to products
  const promoLinks = [];
  const summerPromo = insertedPromos[0];
  const welcomePromo = insertedPromos[1];
  const samsungPromo = insertedPromos[2];
  const applePromo = insertedPromos[3];
  const pixelPromo = insertedPromos[4];

  for (const p of insertedProducts) {
    // Summer sale: applies to mid-range phones (price < 700)
    if (p.price < 700) {
      promoLinks.push({ product_id: p.id, promotion_id: summerPromo.id });
    }
    // Welcome promo: applies to all phones
    promoLinks.push({ product_id: p.id, promotion_id: welcomePromo.id });
    // Samsung flash deal
    if (p.brand === "Samsung") {
      promoLinks.push({ product_id: p.id, promotion_id: samsungPromo.id });
    }
    // Apple trade-in
    if (p.brand === "Apple") {
      promoLinks.push({ product_id: p.id, promotion_id: applePromo.id });
    }
    // Pixel launch
    if (p.brand === "Google" && p.name.includes("9")) {
      promoLinks.push({ product_id: p.id, promotion_id: pixelPromo.id });
    }
  }

  // Insert promo links in batches
  for (let i = 0; i < promoLinks.length; i += 50) {
    await supabasePost("product_promotions", promoLinks.slice(i, i + 50));
  }
  console.log(`  Linked ${promoLinks.length} product-promotion associations`);

  // ── Seed bundles ────────────────────────────────────────────────
  console.log("\nSeeding bundles...");

  const byBrand = {};
  for (const p of insertedProducts) {
    (byBrand[p.brand] ??= []).push(p);
  }

  const bundles = [
    {
      name: "Budget Phone Bundle",
      description: "Two great budget phones at a discount",
      discount_type: "percentage",
      discount_value: 12,
      is_active: true,
    },
    {
      name: "Flagship Duo Pack",
      description: "Pair of flagship phones — perfect for couples",
      discount_type: "percentage",
      discount_value: 8,
      is_active: true,
    },
    {
      name: "Samsung Family Pack",
      description: "Three Samsung phones for the whole family",
      discount_type: "fixed_amount",
      discount_value: 100,
      is_active: true,
    },
    {
      name: "Apple Ecosystem Bundle",
      description: "Two iPhones to keep the family connected",
      discount_type: "percentage",
      discount_value: 10,
      is_active: true,
    },
    {
      name: "Android Explorer Pack",
      description: "Try three different Android brands",
      discount_type: "fixed_amount",
      discount_value: 75,
      is_active: false,
    },
  ];

  const insertedBundles = await supabasePost("bundles", bundles);
  console.log(`  Inserted ${insertedBundles.length} bundles`);

  // Pick products for each bundle
  const budgetPhones = insertedProducts.filter((p) => p.price < 400).slice(0, 2);
  const flagships = insertedProducts.filter((p) => p.price > 900).slice(0, 2);
  const samsungPhones = (byBrand["Samsung"] || []).slice(0, 3);
  const applePhones = (byBrand["Apple"] || []).slice(0, 2);
  const androidMix = [
    (byBrand["Samsung"] || [])[0],
    (byBrand["Google"] || [])[0],
    (byBrand["OnePlus"] || [])[0],
  ].filter(Boolean);

  const bundleItemSets = [budgetPhones, flagships, samsungPhones, applePhones, androidMix];

  const bundleItemRows = [];
  for (let i = 0; i < insertedBundles.length; i++) {
    const items = bundleItemSets[i] || [];
    for (const p of items) {
      bundleItemRows.push({ bundle_id: insertedBundles[i].id, product_id: p.id });
    }
  }

  if (bundleItemRows.length > 0) {
    await supabasePost("bundle_items", bundleItemRows);
  }
  console.log(`  Linked ${bundleItemRows.length} bundle-item associations`);

  console.log("\nDone! Seed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
