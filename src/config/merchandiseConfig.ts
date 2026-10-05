/**
 * ============================================================================
 * MERCHANDISE — CATALOG + REQUEST FORM CONFIG
 * ============================================================================
 * Products are added here one at a time as real items are provided — never
 * fabricate a product, price, or image. Each price tier's `price` is always
 * the ESP catalog price * (1 + MARKUP_RATE), rounded to the cent.
 *
 * Pricing model (verified): the 5% surcharge applies to the ESP selling
 * price, NOT raw supplier cost — the ESP price already has ASI's own markup
 * baked in. Example: supplier cost $0.60, ESP price $1.00 -> client pays
 * $1.05. There is no revenue split beyond that; see src/lib/asi/pricing.ts
 * for the full order-time quote logic (quantity, setup, decoration,
 * shipping) once real SmartLink data is wired in.
 *
 * Quantity-break pricing: `tiers()` below takes [quantity, espPrice] pairs
 * straight from each product's ESP+ pricing table. Some products were
 * catalogued before quantity breaks were tracked and only have a single
 * tier — real data, just not the full ESP breakdown yet.
 *
 * `brand` groups the catalog and drives display order (see
 * ProductCatalog.tsx): items from recognizable name brands are shown before
 * unbranded/private-label "Essentials" items as a quality anchor.
 * ============================================================================
 */

import type { ImprintArea, MerchPriceTier, MerchProduct } from "@/types";
import colorImageMapJson from "./colorImages.json";
import colorImagesExtra1 from "./colorImages.extra1.json";
import colorImagesExtra2 from "./colorImages.extra2.json";
import importedProductsJson from "./importedProducts.json";

export const MARKUP_RATE = 0.05;

export function clientPrice(espPrice: number): number {
  return Math.round(espPrice * (1 + MARKUP_RATE) * 100) / 100;
}

/**
 * Turns [quantity, ESP catalog price] pairs into client-visible tiers. Only the
 * marked-up `price` is kept; the raw ESP number never lands on a product object.
 */
function tiers(pairs: [quantity: number, espPrice: number][]): MerchPriceTier[] {
  return pairs.map(([quantity, espPrice]) => ({
    quantity,
    price: clientPrice(espPrice),
  }));
}

export const merchandisePage = {
  eyebrow: "Merchandise",
  headline: "Campaign & Business Merchandise",
  subtitle:
    "Browse a few of our most-requested items below, or tell us what you're looking for — we can source almost anything through our supplier network.",
  requestEyebrow: "Don't See It?",
  requestHeadline: "Request Any Product",
  requestSubtitle:
    "Describe what you need — product type, quantity, budget, and deadline — and we'll source it and send back a quote.",
  deliveryEstimate:
    "Typical production is 2–3 weeks from art approval to delivery, depending on the item and quantity — we'll confirm your exact timeline before placing the order.",
  pricingDisclaimer:
    "Prices shown are per unit at the listed quantity. Setup, decoration, shipping, and tax are confirmed when we review your order — not included in the estimate above.",
};

export const merchandiseCategories = [
  "Apparel",
  "Headwear",
  "Drinkware",
  "Bags",
  "Tech Accessories",
  "Office & Writing",
  "Event & Signage",
  "Knives & Tools",
  "Gifts & Entertaining",
  "Outdoor & Sports",
  "Health & Wellness",
  "Home & Decor",
  "Food & Treats",
  "Automotive",
  "Seasonal & Holiday",
  "Kids & Toys",
  "Awards & Recognition",
] as const;

// Real products sourced from live ESP+ search (espplus.com), September 2026.
// The numbers passed to tiers() are that product's ESP "Catalog Price" (the
// distributor selling price) at that quantity — never the raw supplier "Net
// Cost", which is not stored here. Each tier's `price` = clientPrice(that number).
const curatedProducts: MerchProduct[] = [
  {
    id: "nike-dri-fit-polo",
    name: "Nike Dri-FIT Micro Pique 2.0 Polo",
    category: "Apparel",
    brand: "Nike",
    description: "Moisture-wicking pique polo. Priced at 1 unit.",
    priceTiers: tiers([[1, 56.02]]),
    image: "/images/merch/nike-dri-fit-polo.jpg",
    imageAlt: "Nike Dri-FIT Micro Pique 2.0 Polo",
    colors: [
      "Anthracite",
      "Black",
      "Blue Tint",
      "Brilliant Orange",
      "Cool Grey",
      "Court Purple",
      "Game Royal",
      "Gorge Green",
      "Gym Blue",
      "Lucid Green",
      "Mint",
      "Navy",
      "Team Red",
      "Tidal Blue",
      "University Red",
      "Urban Lilac",
      "Valor Blue",
      "Varsity Maize",
      "Vivid Pink",
      "White",
    ],
  },
  {
    id: "nike-therma-fit-quarter-zip-fleece",
    name: "Nike Therma-FIT 1/4-Zip Fleece",
    category: "Apparel",
    brand: "Nike",
    description: "Fleece quarter-zip pullover. Priced at 1 unit.",
    priceTiers: tiers([
      [1, 68.767],
      [12, 62.1],
    ]),
    image: "/images/merch/nike-therma-fit-quarter-zip-fleece.jpg",
    imageAlt: "Nike Therma-FIT 1/4-Zip Fleece",
    colors: [
      "Team Anthracite",
      "Team Black",
      "Team Dark Green",
      "Team Navy",
      "Team Royal",
      "Team Scarlet",
    ],
  },
  {
    id: "adidas-performance-polo-mens",
    name: "Adidas Men's Performance Polo",
    category: "Apparel",
    brand: "Adidas",
    description: "Performance polo. Priced at 1 unit.",
    priceTiers: tiers([[1, 39.5]]),
    image: "/images/merch/adidas-performance-polo-mens.jpg",
    imageAlt: "Adidas Men's Performance Polo",
    colors: [
      "Black",
      "Collegiate Green",
      "Collegiate Red",
      "Collegiate Royal",
      "Grey Three",
      "Navy",
      "White",
      "Collegiate Gold",
      "Collegiate Purple",
      "Maroon",
      "Orange",
      "Bliss Pink",
      "Clear Mint",
      "Team Light Blue",
    ],
  },
  {
    id: "adidas-performance-polo-womens",
    name: "Adidas Women's Performance Polo",
    category: "Apparel",
    brand: "Adidas",
    description: "Women's counterpart to our Adidas men's performance polo. Priced at 1 unit.",
    priceTiers: tiers([[1, 39.5]]),
    image: "/images/merch/adidas-performance-polo-womens.jpg",
    imageAlt: "Adidas Women's Performance Polo",
    colors: [
      "Black",
      "Collegiate Red",
      "Collegiate Royal",
      "Grey Three",
      "Navy",
      "White",
      "Collegiate Purple",
      "Maroon",
      "Collegiate Green",
      "Bliss Pink",
      "Clear Mint",
      "Team Light Blue",
    ],
  },
  {
    id: "adidas-ultimate365-quarter-zip-mens",
    name: "Adidas Men's Ultimate365 Lightweight Quarter-Zip Pullover",
    category: "Apparel",
    brand: "Adidas",
    description: "Lightweight quarter-zip pullover. Priced at 1 unit.",
    priceTiers: tiers([[1, 60.0]]),
    image: "/images/merch/adidas-ultimate365-quarter-zip-mens.jpg",
    imageAlt: "Adidas Men's Ultimate365 Lightweight Quarter-Zip Pullover",
    colors: [
      "Black",
      "Black Heather",
      "Collegiate Navy",
      "Collegiate Royal",
      "Grey Three",
      "Power Red",
      "White",
      "Blue Fusion",
      "Collegiate Green",
      "Grey Three Melange",
      "Onix",
    ],
  },
  {
    id: "adidas-spacer-quarter-zip-womens",
    name: "Adidas Women's Spacer Quarter-Zip Pullover",
    category: "Apparel",
    brand: "Adidas",
    description: "Women's counterpart to our Adidas men's quarter-zip pullover. Priced at 1 unit.",
    priceTiers: tiers([[1, 71.98]]),
    image: "/images/merch/adidas-spacer-quarter-zip-womens.jpg",
    imageAlt: "Adidas Women's Spacer Quarter-Zip Pullover",
    colors: ["Black", "Collegiate Navy", "Core White", "Grey Five", "Halo Blue", "Silver Pebble"],
  },
  {
    id: "under-armour-drive-midlayer-pullover",
    name: "Under Armour Men's Drive Midlayer Pullover",
    category: "Apparel",
    brand: "Under Armour",
    description: "Midlayer quarter-zip pullover. Priced at 1 unit.",
    priceTiers: tiers([[1, 90.0]]),
    image: "/images/merch/under-armour-drive-midlayer-pullover.jpg",
    imageAlt: "Under Armour Men's Drive Midlayer Pullover",
    colors: [
      "Midnight Navy Heather",
      "Ceylon",
      "Castle Rock Heather",
      "Blue Haze",
      "Misty Sky Blue",
      "Seaspray",
    ],
  },
  {
    id: "brooks-brothers-mesh-polo-mens",
    name: "Brooks Brothers Mesh Pique Performance Polo",
    category: "Apparel",
    brand: "Brooks Brothers",
    description: "Mesh pique performance polo. Priced at 1 unit.",
    priceTiers: tiers([
      [1, 51.383],
      [36, 44.717],
    ]),
    image: "/images/merch/brooks-brothers-mesh-polo-mens.jpg",
    imageAlt: "Brooks Brothers Mesh Pique Performance Polo",
    colors: ["Charter Blue", "Deep Black", "Navy Blazer", "Rich Red", "Soft Mint", "White"],
    colorImages: {
      "Navy Blazer": "/images/merch/brooks-brothers-mesh-polo-mens-navy-blazer.webp",
      "Deep Black": "/images/merch/brooks-brothers-mesh-polo-mens-deep-black.webp",
    },
  },
  {
    id: "brooks-brothers-mesh-polo-womens",
    name: "Brooks Brothers Women's Mesh Pique Performance Polo",
    category: "Apparel",
    brand: "Brooks Brothers",
    description:
      "Women's counterpart to our Brooks Brothers mesh pique performance polo. Priced at 1 unit.",
    priceTiers: tiers([
      [1, 51.383],
      [36, 44.717],
    ]),
    image: "/images/merch/brooks-brothers-mesh-polo-womens.jpg",
    imageAlt: "Brooks Brothers Women's Mesh Pique Performance Polo",
    colors: ["Charter Blue", "Deep Black", "Navy Blazer", "Soft Mint", "White"],
  },
  {
    id: "holderness-bourne-westland-pullover",
    name: "Holderness & Bourne The Westland Peached Pullover",
    category: "Apparel",
    brand: "Holderness & Bourne",
    description: "Peached-finish quarter-zip pullover. Priced at 1 unit.",
    priceTiers: tiers([[1, 155.0]]),
    image: "/images/merch/holderness-bourne-westland-pullover.jpg",
    imageAlt: "Holderness & Bourne The Westland Peached Pullover",
    colors: [
      "Navy",
      "Charcoal",
      "Black",
      "Liberty Red",
      "Heathered Vista Blue",
      "Heathered Nectarine",
      "Heathered Vineyard",
      "Heathered Pacific Blue",
      "Heathered Cypress",
      "Heathered Driftwood",
      "Heathered Dune",
      "Heathered Windsor",
      "Heathered Palmetto",
      "Heathered Grape Bay",
      "Heathered Paget",
    ],
  },
  {
    id: "johnnie-o-sully-quarter-zip",
    name: "Johnnie-O Men's Sully Quarter-Zip Pullover Shirt",
    category: "Apparel",
    brand: "Johnnie-O",
    description: "Quarter-zip pullover shirt. Priced at 1 unit.",
    priceTiers: tiers([[1, 138.0]]),
    image: "/images/merch/johnnie-o-sully-quarter-zip.jpg",
    imageAlt: "Johnnie-O Men's Sully Quarter-Zip Pullover Shirt",
    colors: [
      "Light Gray-Blue",
      "Helious Blue-Gray",
      "Black",
      "Laguna",
      "White",
      "Port",
      "Grizzly",
      "Sequoia",
      "Sapphire",
      "Breeze",
      "Bayou",
      "Heather Black",
      "Huckleberry",
      "Canyon",
    ],
  },
  {
    id: "peter-millar-galway-stretch-vest",
    name: "Peter Millar Galway Stretch Loop Terry Quarter-Zip Vest",
    category: "Apparel",
    brand: "Peter Millar",
    description: "Stretch loop-terry quarter-zip vest. Priced at 6 units.",
    priceTiers: tiers([
      [6, 149.11],
      [12, 144.95],
      [24, 142.6],
      [48, 138.66],
    ]),
    image: "/images/merch/peter-millar-galway-stretch-vest.jpg",
    imageAlt: "Peter Millar Galway Stretch Loop Terry Quarter-Zip Vest",
    colors: ["Black", "Iron", "White", "Navy"],
    colorImages: {
      Black: "/images/merch/peter-millar-galway-vest-black.webp",
      Iron: "/images/merch/peter-millar-galway-vest-iron.webp",
      White: "/images/merch/peter-millar-galway-vest-white.webp",
      Navy: "/images/merch/peter-millar-galway-vest-navy.webp",
    },
  },
  {
    id: "peter-millar-essex-vest",
    name: "Peter Millar Men's Essex Vest",
    category: "Apparel",
    brand: "Peter Millar",
    description: "Quilted vest. Priced at 6 units.",
    priceTiers: tiers([
      [6, 272.32],
      [12, 265.16],
      [24, 261.36],
      [48, 254.62],
    ]),
    image: "/images/merch/peter-millar-essex-vest.jpg",
    imageAlt: "Peter Millar Men's Essex Vest",
    colors: ["Black", "Dark Olive", "Navy"],
    colorImages: {
      Black: "/images/merch/peter-millar-essex-vest-black.webp",
      "Dark Olive": "/images/merch/peter-millar-essex-vest-dark-olive.webp",
      Navy: "/images/merch/peter-millar-essex-vest-navy.webp",
    },
  },
  {
    id: "peter-millar-pine-performance-hoodie",
    name: "Men's Peter Millar Pine Performance Hoodie",
    category: "Apparel",
    brand: "Peter Millar",
    description: "Performance hoodie. Priced at 6 units.",
    priceTiers: tiers([[6, 150.0]]),
    image: "/images/merch/peter-millar-pine-performance-hoodie.jpg",
    imageAlt: "Men's Peter Millar Pine Performance Hoodie",
    colors: ["Black", "Navy", "White", "Gale Grey", "Red 3", "Fresh Mint", "Sport Navy"],
    colorImages: {
      Black: "/images/merch/peter-millar-pine-hoodie-black.webp",
      Navy: "/images/merch/peter-millar-pine-hoodie-navy.webp",
      White: "/images/merch/peter-millar-pine-hoodie-white.webp",
      "Gale Grey": "/images/merch/peter-millar-pine-hoodie-gale-grey.webp",
      "Red 3": "/images/merch/peter-millar-pine-hoodie-red3.webp",
      "Fresh Mint": "/images/merch/peter-millar-pine-hoodie-fresh-mint.webp",
      "Sport Navy": "/images/merch/peter-millar-pine-hoodie-sport-navy.webp",
    },
  },
  {
    id: "peter-millar-perth-quarter-zip-mens",
    name: "Peter Millar Men's Perth Performance Quarter-Zip",
    category: "Apparel",
    brand: "Peter Millar",
    description: "Performance quarter-zip. Priced at 6 units.",
    priceTiers: tiers([[6, 145.0]]),
    image: "/images/merch/peter-millar-perth-quarter-zip-mens.jpg",
    imageAlt: "Peter Millar Men's Perth Performance Quarter-Zip",
    colors: ["Black", "British Grey", "Cottage Blue", "Iron", "Navy", "White", "Red 3", "Blue 3"],
    colorImages: {
      Black: "/images/merch/peter-millar-perth-qz-mens-black.webp",
      "British Grey": "/images/merch/peter-millar-perth-qz-mens-british-grey.webp",
      "Cottage Blue": "/images/merch/peter-millar-perth-qz-mens-cottage-blue.webp",
      Iron: "/images/merch/peter-millar-perth-qz-mens-iron.webp",
      Navy: "/images/merch/peter-millar-perth-qz-mens-navy.webp",
      White: "/images/merch/peter-millar-perth-qz-mens-white.webp",
      "Red 3": "/images/merch/peter-millar-perth-qz-mens-red3.webp",
      "Blue 3": "/images/merch/peter-millar-perth-qz-mens-blue3.webp",
    },
  },
  {
    id: "peter-millar-perth-quarter-zip-womens",
    name: "Peter Millar Women's Perth Performance Quarter-Zip",
    category: "Apparel",
    brand: "Peter Millar",
    description:
      "Women's counterpart to our Peter Millar Perth performance quarter-zip. Priced at 6 units.",
    priceTiers: tiers([[6, 145.0]]),
    image: "/images/merch/peter-millar-perth-quarter-zip-womens.jpg",
    imageAlt: "Peter Millar Women's Perth Performance Quarter-Zip",
    colors: ["Black", "Navy", "White", "Red 3", "Pine Brook", "Rainwater"],
    colorImages: {
      Black: "/images/merch/peter-millar-perth-qz-womens-black.webp",
      Navy: "/images/merch/peter-millar-perth-qz-womens-navy.webp",
      White: "/images/merch/peter-millar-perth-qz-womens-white.webp",
      "Red 3": "/images/merch/peter-millar-perth-qz-womens-red3.webp",
      "Pine Brook": "/images/merch/peter-millar-perth-qz-womens-pine-brook.webp",
      Rainwater: "/images/merch/peter-millar-perth-qz-womens-rainwater.webp",
    },
  },
  {
    id: "peter-millar-jubilee-striped-polo",
    name: "Peter Millar Men's Jubilee Striped Polo",
    category: "Apparel",
    brand: "Peter Millar",
    description: "Striped polo. Priced at 6 units.",
    priceTiers: tiers([[6, 115.0]]),
    image: "/images/merch/peter-millar-jubilee-striped-polo.jpg",
    imageAlt: "Peter Millar Men's Jubilee Striped Polo",
    colors: ["Black", "Navy", "Cottage Blue", "Iron", "Red Coral"],
    colorImages: {
      Black: "/images/merch/peter-millar-jubilee-polo-black.webp",
      Navy: "/images/merch/peter-millar-jubilee-polo-navy.webp",
      "Cottage Blue": "/images/merch/peter-millar-jubilee-polo-cottage-blue.webp",
      Iron: "/images/merch/peter-millar-jubilee-polo-iron.webp",
      "Red Coral": "/images/merch/peter-millar-jubilee-polo-red-coral.webp",
    },
  },
  {
    id: "peter-millar-hales-polo",
    name: "Peter Millar Hales Performance Short Sleeve Jersey Polo",
    category: "Apparel",
    brand: "Peter Millar",
    description: "Performance short-sleeve jersey polo. Priced at 1 unit.",
    priceTiers: tiers([[1, 115.0]]),
    image: "/images/merch/peter-millar-hales-polo.jpg",
    imageAlt: "Peter Millar Hales Performance Short Sleeve Jersey Polo",
    colors: ["Cottage Blue", "Navy"],
    colorImages: {
      "Cottage Blue": "/images/merch/peter-millar-hales-polo-cottage-blue.webp",
      Navy: "/images/merch/peter-millar-hales-polo-navy.webp",
    },
  },
  {
    id: "peter-millar-polo-mens",
    name: "Peter Millar Men's Solid Performance Polo",
    category: "Apparel",
    brand: "Peter Millar",
    description: "Solid performance polo. Priced at 6 units.",
    priceTiers: tiers([[6, 105.0]]),
    image: "/images/merch/peter-millar-polo-mens.jpg",
    imageAlt: "Peter Millar Men's Solid Performance Polo",
    colors: ["Black", "Cottage Blue", "Navy", "White", "Iron"],
    colorImages: {
      Black: "/images/merch/peter-millar-solid-polo-mens-black.webp",
      "Cottage Blue": "/images/merch/peter-millar-solid-polo-mens-cottage-blue.webp",
      Navy: "/images/merch/peter-millar-solid-polo-mens-navy.webp",
      White: "/images/merch/peter-millar-solid-polo-mens-white.webp",
      Iron: "/images/merch/peter-millar-solid-polo-mens-iron.webp",
    },
  },
  {
    id: "peter-millar-polo-womens",
    name: "Peter Millar Women's Short Sleeve Button Polo",
    category: "Apparel",
    brand: "Peter Millar",
    description:
      "Women's short-sleeve button polo, the counterpart to our Peter Millar men's polo. Priced at 1 unit.",
    priceTiers: tiers([[1, 115.0]]),
    image: "/images/merch/peter-millar-polo-womens.jpg",
    imageAlt: "Peter Millar Women's Short Sleeve Button Polo",
    colors: ["Black", "Navy", "White"],
    colorImages: {
      Black: "/images/merch/peter-millar-solid-polo-womens-black.webp",
      Navy: "/images/merch/peter-millar-solid-polo-womens-navy.webp",
      White: "/images/merch/peter-millar-solid-polo-womens-white.webp",
    },
  },
  {
    id: "callaway-lightweight-quarter-zip",
    name: "Callaway Men's Lightweight 1/4 Zip Pullover",
    category: "Apparel",
    brand: "Callaway",
    description: "Lightweight quarter-zip pullover. Priced at 1 unit.",
    priceTiers: tiers([[1, 90.0]]),
    image: "/images/merch/callaway-lightweight-quarter-zip.jpg",
    imageAlt: "Callaway Men's Lightweight 1/4 Zip Pullover",
    colors: ["Black", "Coastal Fjord", "Tradewinds"],
  },
  {
    id: "storm-creek-front-runner-vest-mens",
    name: "Storm Creek Men's Front Runner 120 GSM Insulated Vest",
    category: "Apparel",
    brand: "Storm Creek",
    description: "120 GSM insulated vest. Priced at 1 unit.",
    priceTiers: tiers([[1, 90.0]]),
    image: "/images/merch/storm-creek-front-runner-vest-mens.jpg",
    imageAlt: "Storm Creek Men's Front Runner 120 GSM Insulated Vest",
    colors: ["Titanium Gray", "Black", "Navy Blue", "Jet Gray-Black"],
  },
  {
    id: "storm-creek-front-runner-vest-womens",
    name: "Storm Creek Women's Front Runner 120 GSM Insulated Vest",
    category: "Apparel",
    brand: "Storm Creek",
    description: "Women's counterpart to our Storm Creek insulated vest. Priced at 1 unit.",
    priceTiers: tiers([[1, 90.0]]),
    image: "/images/merch/storm-creek-front-runner-vest-womens.jpg",
    imageAlt: "Storm Creek Women's Front Runner 120 GSM Insulated Vest",
    colors: ["Black", "Platinum Gray", "Navy Blue", "White", "Jet Gray-Black", "Titanium Gray"],
  },
  {
    id: "imperial-original-performance-cap",
    name: "Imperial The Original Performance Cap",
    category: "Headwear",
    brand: "Imperial",
    description: "Performance cap. Priced at 1 unit.",
    priceTiers: tiers([
      [1, 20.33],
      [12, 19.5],
      [72, 19.17],
    ]),
    image: "/images/merch/imperial-original-performance-cap.jpg",
    imageAlt: "Imperial The Original Performance Cap",
    colors: [
      "Green",
      "Azure Blue",
      "Black",
      "Cobalt",
      "Pacific Blue",
      "Dark Gray",
      "Khaki",
      "Red Pepper",
      "Forest",
      "Light Blue",
      "True Navy",
      "Frost Gray",
      "Light Pink",
      "White",
      "Aqua",
      "Breaker Blue",
      "Cardinal",
      "Fog",
      "Lavender",
      "Olive",
      "Orange",
      "Petrol",
      "Putty",
      "Robin's Egg",
      "Sea Glass",
      "Laurel Green",
      "Macaroon",
      "Walnut",
      "Buckthorn Brown",
      "Peach",
      "Winter Green",
      "True Royal",
      "True Red",
    ],
  },
  {
    id: "gildan-ultra-cotton-tshirt",
    name: "Gildan Ultra Cotton T-Shirt",
    category: "Apparel",
    brand: "Gildan",
    description: "Cotton t-shirt. Priced at 72 units.",
    priceTiers: tiers([
      [72, 9.05],
      [144, 8.15],
      [288, 7.59],
      [576, 6.89],
      [1008, 6.49],
    ]),
    image: "/images/merch/gildan-ultra-cotton-tshirt.jpg",
    imageAlt: "Gildan Ultra Cotton T-Shirt",
    colors: [
      "Ash",
      "Azalea",
      "Black",
      "Carolina Blue",
      "Charcoal",
      "Cherry Red",
      "Daisy",
      "Dark Chocolate",
      "Heather Cardinal",
      "Heather Indigo",
      "Heliconia",
      "Indigo Blue",
      "Iris",
      "Irish Green",
      "Kelly Green",
      "Kiwi",
      "Light Blue",
      "Light Pink",
      "Lime",
      "Maroon",
      "Metro Blue",
      "Military Green",
      "Natural",
      "Navy",
      "Olive",
      "Orange",
      "Orchid",
      "Pistachio",
      "Prairie Dust",
      "Purple",
      "Red",
      "Royal",
      "Safety Orange",
      "Sand",
      "Sapphire",
      "Sky",
      "Sport Gray",
      "Stone Blue",
      "Tan",
      "Tangerine",
      "Texas Orange",
      "Vegas Gold",
      "White",
      "Antique Cherry Red",
      "Antique Irish Green",
      "Antique Royal",
      "Blue Dusk",
      "Cardinal Red",
      "Dark Heather",
      "Forest Green",
      "Gold",
      "Heather Navy",
      "Heather Sapphire",
      "Ice Gray",
      "Jade Dome",
      "Safety Green",
      "Safety Pink",
      "Cornsilk",
      "Galapagos Blue",
      "Mint Green",
    ],
  },
  {
    id: "6panel-upf-stretch-cap",
    name: "6-Panel UPF 50+ Cool Comfort Stretch Cap",
    category: "Headwear",
    brand: "Essentials",
    description: "Structured, stretch-fit performance cap with UPF 50+. Priced at 1 unit.",
    priceTiers: tiers([
      [1, 12.7],
      [144, 12.6],
      [288, 12.5],
      [576, 12.4],
      [1296, 12.3],
    ]),
    image: "/images/merch/6panel-upf-stretch-cap.jpg",
    imageAlt: "6-Panel UPF 50+ Cool Comfort Stretch Cap",
    colors: ["Black", "Navy", "Red", "Royal", "Charcoal Gray", "White", "Neon Orange"],
  },
  {
    id: "6panel-premium-relaxed-golf-cap",
    name: "6 Panel Premium Relaxed Golf Cap",
    category: "Headwear",
    brand: "Essentials",
    description: "Relaxed-fit golf dad cap. Priced at 12 units.",
    priceTiers: tiers([
      [12, 7.5],
      [48, 7.417],
      [144, 7.333],
      [576, 7.25],
      [1008, 7.167],
    ]),
    image: "/images/merch/6panel-premium-relaxed-golf-cap.jpg",
    imageAlt: "6 Panel Premium Relaxed Golf Cap",
    colors: [
      "Black",
      "Brown",
      "Royal",
      "Burgundy",
      "Dark Green",
      "Gold",
      "Kelly Green",
      "Khaki",
      "Light Blue",
      "Navy",
      "Olive",
      "Orange",
      "Pink",
      "Red",
      "Tie Dyed Pink",
      "Tie Dyed Navy",
      "Yellow",
      "Stone",
      "Sky Blue",
      "White",
    ],
  },
  {
    id: "summit-sweater-fleece-vest-mens",
    name: "Summit Sweater-Fleece Vest",
    category: "Apparel",
    brand: "Essentials",
    description: "Heathered sweater-fleece vest. Priced at 1 unit.",
    priceTiers: tiers([
      [1, 74.6],
      [12, 70.3],
      [96, 65.98],
    ]),
    image: "/images/merch/summit-sweater-fleece-vest-mens.jpg",
    imageAlt: "Summit Sweater-Fleece Vest",
    colors: ["Iceberg"],
  },
  {
    id: "summit-sweater-fleece-vest-womens",
    name: "Women's Summit Sweater Fleece Blocked Vest",
    category: "Apparel",
    brand: "Essentials",
    description:
      "Women's color-blocked counterpart to our Summit sweater-fleece vest. Priced at 1 unit.",
    priceTiers: tiers([
      [1, 75.7],
      [12, 71.3],
      [96, 66.98],
    ]),
    image: "/images/merch/summit-sweater-fleece-vest-womens.jpg",
    imageAlt: "Women's Summit Sweater Fleece Blocked Vest",
    colors: ["Iceberg Heather/Black", "Iceberg Heather/Navy"],
  },
  {
    id: "zen-quarter-zip-pullover",
    name: "Zen Quarter-Zip Pullover",
    category: "Apparel",
    brand: "Essentials",
    description: "Layered quarter-zip pullover. Priced at 1 unit.",
    priceTiers: tiers([[1, 65.8]]),
    image: "/images/merch/zen-quarter-zip-pullover.jpg",
    imageAlt: "Zen Quarter-Zip Pullover",
    colors: [
      "Black",
      "Carolina Blue",
      "Dark Grey",
      "Deep Maroon",
      "Navy",
      "Orange",
      "Purple",
      "Royal",
      "Silver",
      "Sport Red",
    ],
  },
  {
    id: "mesa-vest",
    name: "Mesa Vest",
    category: "Apparel",
    brand: "Essentials",
    description: "Quilted insulated vest. Priced at 1 unit.",
    priceTiers: tiers([
      [1, 59.2],
      [12, 55.6],
      [96, 51.98],
    ]),
    image: "/images/merch/mesa-vest.jpg",
    imageAlt: "Mesa Vest",
    colors: ["Black", "Dark Grey", "Loden Green", "Saddle", "True Navy"],
  },
  {
    id: "owala-freesip-bottle-24oz",
    name: "24 oz Owala Freesip Insulated Bottle",
    category: "Drinkware",
    brand: "Owala",
    description:
      "Double-wall stainless steel bottle with a flip straw and handle. Priced at 24 units.",
    priceTiers: tiers([
      [24, 39.99],
      [72, 37.99],
      [144, 35.99],
    ]),
    image: "/images/merch/owala-freesip-24oz.jpg",
    imageAlt: "24 oz Owala Freesip Insulated Bottle",
    colors: [
      "Shy Marshmallow",
      "Very Very Dark",
      "Sugar High",
      "Coastal Mist",
      "Blue Oasis",
      "Calm Waters",
      "Rock On",
      "Green House",
      "Read My Lips",
      "Out Of The Blue",
      "Blue Steel",
      "Nailed It",
    ],
  },
  {
    id: "polar-30oz-tumbler",
    name: "Polar 30 oz. Stainless Steel Tumbler",
    category: "Drinkware",
    brand: "Essentials",
    description: "Vacuum-insulated stainless steel tumbler. Priced at 25 units.",
    priceTiers: tiers([
      [25, 14.2],
      [50, 12.7],
      [100, 12.0],
      [250, 11.85],
      [500, 11.7],
    ]),
    image: "/images/merch/polar-30oz-tumbler.jpg",
    imageAlt: "Polar 30 oz. Stainless Steel Tumbler",
    colors: ["Silver", "Black", "White", "Navy Blue"],
  },
  {
    id: "insulated-travel-mug-16oz",
    name: "16 oz. Insulated Stainless Steel Travel Mug",
    category: "Drinkware",
    brand: "Essentials",
    description: "Insulated stainless steel travel mug. Priced at 100 units.",
    priceTiers: tiers([
      [100, 5.51],
      [250, 5.39],
      [500, 4.98],
      [1000, 4.66],
      [2500, 4.12],
    ]),
    image: "/images/merch/insulated-travel-mug-16oz.jpg",
    imageAlt: "16 oz. Insulated Stainless Steel Travel Mug",
    colors: ["Black", "Blue", "Green", "Lime Green", "Orange", "Pink", "Purple", "Red", "Yellow"],
  },
  {
    id: "ceramic-mug-11oz",
    name: "11 oz. Traditional Ceramic Mug",
    category: "Drinkware",
    brand: "Essentials",
    description: "Classic ceramic coffee mug. Priced at 72 units.",
    priceTiers: tiers([[72, 3.67]]),
    image: "/images/merch/ceramic-mug-11oz.jpg",
    imageAlt: "11 oz. Traditional Ceramic Mug",
    colors: [
      "Almond",
      "Black",
      "Brown",
      "Cobalt Blue",
      "Grey",
      "Lime Green",
      "Maroon",
      "Orange",
      "Pink",
      "Teal",
      "White",
      "Yellow",
      "Green",
      "Purple",
      "Red",
    ],
  },
  {
    id: "samsonite-weekender-duffel",
    name: "Samsonite Better Than Basic Weekender",
    category: "Bags",
    brand: "Samsonite",
    description: "Weekender duffel bag. Priced at 6 units.",
    priceTiers: tiers([
      [6, 165.5],
      [25, 141.94],
      [50, 114.38],
      [100, 109.98],
    ]),
    image: "/images/merch/samsonite-weekender-duffel.jpg",
    imageAlt: "Samsonite Better Than Basic Weekender",
    colors: ["Black", "Limestone"],
  },
  {
    id: "fletcher-rpet-laptop-backpack",
    name: "Fletcher Recycled rPET Laptop Backpack",
    category: "Bags",
    brand: "Essentials",
    description: "Recycled rPET laptop backpack. Priced at 12 units.",
    priceTiers: tiers([
      [12, 48.59],
      [25, 41.67],
      [50, 36.38],
      [100, 34.98],
    ]),
    image: "/images/merch/fletcher-rpet-laptop-backpack.jpg",
    imageAlt: "Fletcher Recycled rPET Laptop Backpack",
    colors: ["Black Sand", "Navy Heather"],
  },
  {
    id: "cotton-canvas-tote-7oz",
    name: "7 oz. Cotton Canvas Tote Bag",
    category: "Bags",
    brand: "Essentials",
    description: '15" x 16" cotton canvas tote. Priced at 100 units.',
    priceTiers: tiers([
      [100, 2.9],
      [250, 2.84],
      [500, 2.77],
      [1000, 2.7],
      [2500, 2.61],
    ]),
    image: "/images/merch/cotton-canvas-tote-7oz.jpg",
    imageAlt: "7 oz. Cotton Canvas Tote Bag",
    colors: ["Natural", "Black", "Navy Blue", "Royal Blue", "Red"],
  },
  {
    id: "non-woven-recycled-tote",
    name: "Large Non-Woven Recycled Tote",
    category: "Bags",
    brand: "Essentials",
    description: "Large recycled non-woven tote. Priced at 100 units.",
    priceTiers: tiers([[100, 2.15]]),
    image: "/images/merch/non-woven-recycled-tote.jpg",
    imageAlt: "Large Non-Woven Recycled Tote",
    colors: [
      "Black",
      "Burgundy",
      "Hunter Green",
      "Lime Green",
      "Navy Blue",
      "Orange",
      "Pink",
      "Reflex Blue",
      "Purple",
      "Red",
      "Teal",
      "Gray",
      "White",
    ],
  },
  {
    id: "gusset-shopping-tote",
    name: "Gusseted Shopping Tote",
    category: "Bags",
    brand: "Essentials",
    description: 'Gusseted tote, 10.5"w x 11.75"h with an 8" gusset. Priced at 150 units.',
    priceTiers: tiers([[150, 5.12]]),
    image: "/images/merch/gusset-shopping-tote.jpg",
    imageAlt: "Gusseted Shopping Tote",
    colors: ["Black", "Lime", "Orange", "Purple", "Royal Blue", "Red", "Cream"],
  },
  {
    id: "non-woven-drawstring-backpack",
    name: "Non-Woven Drawstring Backpack",
    category: "Bags",
    brand: "Essentials",
    description: "Lightweight non-woven drawstring backpack. Priced at 150 units.",
    priceTiers: tiers([
      [150, 1.79],
      [250, 1.69],
      [500, 1.59],
      [1000, 1.49],
      [2500, 1.39],
    ]),
    image: "/images/merch/non-woven-drawstring-backpack.jpg",
    imageAlt: "Non-Woven Drawstring Backpack",
    colors: [
      "Black",
      "Hunter Green",
      "Lime",
      "Orange",
      "Pink",
      "Purple",
      "Royal Blue",
      "White",
      "Yellow",
      "Red",
    ],
  },
  {
    id: "magsafe-power-bank-10000mah",
    name: "10,000mAh MagSafe Power Bank",
    category: "Tech Accessories",
    brand: "Essentials",
    description: "Wired and wireless MagSafe-compatible power bank. Priced at 100 units.",
    priceTiers: tiers([[100, 22.13]]),
    image: "/images/merch/magsafe-power-bank.jpg",
    imageAlt: "10,000mAh MagSafe Power Bank",
    colors: ["Black", "White", "Blue", "Pink"],
  },
  {
    id: "micro-mag-bluetooth-speaker",
    name: "Micro Mag Magnetic Bluetooth Speaker",
    category: "Tech Accessories",
    brand: "Essentials",
    description:
      "Compact magnetic Bluetooth speaker that clips to any metal surface. Priced at 25 units.",
    priceTiers: tiers([
      [25, 20.13],
      [120, 19.33],
      [210, 18.53],
      [310, 17.73],
      [400, 15.98],
    ]),
    image: "/images/merch/micro-mag-bluetooth-speaker.jpg",
    imageAlt: "Micro Mag Magnetic Bluetooth Speaker",
    colors: ["Black"],
  },
  {
    id: "wireless-charging-pad",
    name: "Wireless Phone Charging Pad",
    category: "Tech Accessories",
    brand: "Essentials",
    description: "Wireless phone charging pad. Priced at 50 units.",
    priceTiers: tiers([[50, 18.27]]),
    image: "/images/merch/wireless-charging-pad.jpg",
    imageAlt: "Wireless Phone Charging Pad",
    colors: ["Red"],
  },
  {
    id: "classic-swivel-usb-drive",
    name: "Classic Swivel USB Flash Drive",
    category: "Tech Accessories",
    brand: "Essentials",
    description: "Swivel USB flash drive. Priced at 50 units.",
    priceTiers: tiers([
      [50, 5.7],
      [100, 3.77],
      [200, 3.68],
      [300, 2.4],
      [500, 2.07],
    ]),
    image: "/images/merch/classic-swivel-usb-drive.jpg",
    imageAlt: "Classic Swivel USB Flash Drive",
    colors: [
      "Black",
      "Blue",
      "Royal Blue",
      "Navy Blue",
      "Light Blue",
      "Green",
      "Green (Emerald)",
      "Green (Forest)",
      "Orange",
      "Orange (Deep)",
      "Pearl Blue",
      "Purple",
      "Red",
      "Red (Cherry)",
      "Red (Maroon)",
      "Reflex Blue",
      "White",
      "Yellow",
      "Custom Shell Colors",
      "Silver",
      "Cola Red",
    ],
  },
  {
    id: "neoprene-laptop-sleeve",
    name: "Slim Reversible Neoprene Laptop Sleeve",
    category: "Tech Accessories",
    brand: "Essentials",
    description: 'Slim 14" reversible neoprene laptop sleeve. Priced at 100 units.',
    priceTiers: tiers([
      [100, 3.917],
      [300, 3.583],
      [500, 3.55],
      [1000, 3.4],
      [3000, 3.35],
    ]),
    image: "/images/merch/neoprene-laptop-sleeve.jpg",
    imageAlt: "Slim Reversible Neoprene Laptop Sleeve",
    colors: [
      "Bright Black",
      "Bright Blue",
      "Camouflage White",
      "Camouflage Yellow",
      "Metallic Pink",
      "Medium Gray",
    ],
  },
  {
    id: "the-decision-maker-padfolio",
    name: "The Decision Maker Leather Padfolio",
    category: "Office & Writing",
    brand: "Essentials",
    description:
      "Leather-look padfolio sized for briefings and client meetings. Priced at 12 units.",
    priceTiers: tiers([
      [12, 49.95],
      [25, 49.0],
      [50, 42.5],
      [100, 41.5],
      [250, 36.25],
    ]),
    image: "/images/merch/the-decision-maker-padfolio.jpg",
    imageAlt: "The Decision Maker Leather Padfolio",
    colors: ["Black", "Brown", "Navy"],
  },
  {
    id: "textured-linen-notebook",
    name: "Textured Linen Notebook",
    category: "Office & Writing",
    brand: "Essentials",
    description: "Linen-textured journal. Priced at 100 units.",
    priceTiers: tiers([[100, 6.99]]),
    image: "/images/merch/textured-linen-notebook.jpg",
    imageAlt: "Textured Linen Notebook",
    colors: ["Black", "Green", "Gray", "Blue", "Orange", "Pink"],
  },
  {
    id: "classic-hardcover-notebook",
    name: "Classic Hard Cover Notebook",
    category: "Office & Writing",
    brand: "Essentials",
    description: "Hardcover notebook. Priced at 50 units.",
    priceTiers: tiers([[50, 13.32]]),
    image: "/images/merch/classic-hardcover-notebook.jpg",
    imageAlt: "Classic Hard Cover Notebook",
    colors: ["Black"],
  },
  {
    id: "retractable-banner-stand",
    name: '32" x 79" Retractable Banner Stand',
    category: "Event & Signage",
    brand: "Essentials",
    description: 'Full-size 32" x 79" retractable banner stand. Priced at 1 unit.',
    priceTiers: tiers([[1, 354.9]]),
    image: "/images/merch/retractable-banner-stand.jpg",
    imageAlt: "32 by 79 inch Retractable Banner Stand",
    colors: ["Custom (full-color print)"],
  },
  {
    id: "silkscreen-lanyard",
    name: '3/4" Silkscreen Breakaway Lanyard',
    category: "Event & Signage",
    brand: "Essentials",
    description: '3/4" breakaway safety lanyard. Priced at 150 units.',
    priceTiers: tiers([[150, 1.75]]),
    image: "/images/merch/silkscreen-lanyard.jpg",
    imageAlt: "3/4-inch Silkscreen Breakaway Lanyard",
    colors: ["Black", "White", "Navy", "Yellow", "Red", "Green", "Royal", "Orange", "Lime"],
  },
  {
    id: "buck-bantam-285-blw-lockback-knife",
    name: "Buck Bantam 285 BLW Lockback Knife",
    category: "Knives & Tools",
    brand: "Buck",
    description:
      'Made-in-USA lockback knife with a 3 1/8" stainless steel blade and textured thermoplastic handle. Priced at 24 units.',
    priceTiers: tiers([
      [24, 25.8],
      [96, 24.9],
      [288, 24.0],
    ]),
    image: "/images/merch/buck-bantam-285-blw-lockback-knife.webp",
    imageAlt: "Buck Bantam 285 BLW Lockback Knife",
    colors: ["Black"],
  },
  {
    id: "leatherman-rev-multi-tool",
    name: "Leatherman® Rev",
    category: "Knives & Tools",
    brand: "Leatherman",
    description:
      'Made-in-USA stainless steel multi-tool, 4" closed, with pliers, screwdrivers, wire cutters, and more. Priced at 24 units.',
    priceTiers: tiers([
      [24, 43.225],
      [48, 42.575],
      [144, 40.918],
    ]),
    image: "/images/merch/leatherman-rev-multi-tool.webp",
    imageAlt: "Leatherman Rev Multi-Tool",
    colors: ["Silver"],
  },
  {
    id: "cedar-creek-valor-pocket-knife",
    name: "Cedar Creek® Valor Pocket Knife",
    category: "Knives & Tools",
    brand: "Essentials",
    description: "Textured-handle pocket knife. Priced at 48 units.",
    priceTiers: tiers([
      [48, 7.05],
      [144, 6.75],
      [288, 6.3],
    ]),
    image: "/images/merch/cedar-creek-valor-pocket-knife.webp",
    imageAlt: "Cedar Creek Valor Pocket Knife",
    colors: ["Black", "Green"],
  },
  {
    id: "astor-bamboo-cheese-board-knife-set",
    name: "Astor Bamboo Cheese Board Knife Set",
    category: "Gifts & Entertaining",
    brand: "Essentials",
    description:
      "Bamboo cheese board with a cheese knife, cheese fork, and chisel knife. Priced at 25 units.",
    priceTiers: tiers([
      [25, 13.5],
      [50, 12.9],
      [100, 12.3],
      [250, 12.0],
      [500, 11.7],
    ]),
    image: "/images/merch/astor-bamboo-cheese-board-knife-set.webp",
    imageAlt: "Astor Bamboo Cheese Board Knife Set",
    colors: ["Bamboo"],
  },
  {
    id: "pu-leather-magnetic-phone-wallet",
    name: "PU Leather Magnetic Phone Card Wallet",
    category: "Tech Accessories",
    brand: "Essentials",
    description:
      "Magnetic PU leather card wallet that attaches to the back of a phone. Priced at 100 units.",
    priceTiers: tiers([
      [100, 2.9],
      [250, 2.4],
      [500, 2.3],
      [1000, 2.2],
      [2500, 2.1],
    ]),
    image: "/images/merch/pu-leather-magnetic-phone-wallet.webp",
    imageAlt: "PU Leather Magnetic Phone Card Wallet",
    colors: ["Black", "Red", "Yellow", "Green", "Purple", "Brown", "Navy Blue"],
  },
  {
    id: "u-go-travel-toiletry-kit",
    name: "U-Go Travel Kit",
    category: "Gifts & Entertaining",
    brand: "Essentials",
    description:
      "Travel toiletry kit with a nylon pouch, bandages, tissue pack, toothbrush, toothpaste, deodorant soap, and shampoo. Priced at 50 units.",
    priceTiers: tiers([
      [50, 6.3],
      [250, 6.06],
      [500, 5.82],
      [1000, 5.61],
    ]),
    image: "/images/merch/u-go-travel-toiletry-kit.webp",
    imageAlt: "U-Go Travel Kit",
    colors: ["Blue", "Red", "White", "Black"],
  },
  {
    id: "rpet-roll-up-picnic-blanket",
    name: "rPET Roll-Up Picnic Blanket",
    category: "Gifts & Entertaining",
    brand: "Essentials",
    description: "Recycled-material roll-up picnic blanket. Priced at 25 units.",
    priceTiers: tiers([
      [25, 7.83],
      [50, 7.602],
      [100, 7.38],
      [250, 7.164],
      [500, 6.954],
    ]),
    image: "/images/merch/rpet-roll-up-picnic-blanket.webp",
    imageAlt: "rPET Roll-Up Picnic Blanket",
    colors: [
      "Orange Multi",
      "Red Flap/Blkred Blanket",
      "Nav Flap/Grnnav Blanket",
      "Blk Flap/Blkgra Blanket",
      "Nav Flap/Navwht Blanket",
      "Lime/Lt Blue",
      "Red/Black",
      "Royal Blue/Black",
    ],
  },
  {
    id: "rain-gauge",
    name: "Rain Gauge",
    category: "Gifts & Entertaining",
    brand: "Essentials",
    description: 'Plastic rain gauge with a heavy-gauge 4" tub. Priced at 150 units.',
    priceTiers: tiers([
      [150, 2.634],
      [250, 2.532],
      [500, 2.472],
      [1000, 2.418],
      [1500, 2.31],
    ]),
    image: "/images/merch/rain-gauge.webp",
    imageAlt: "Rain Gauge",
    colors: ["White", "Blue", "Red", "Black", "Green"],
  },
  {
    id: "8pc-bbq-grill-tool-set",
    name: "8 Pc BBQ Grill Tool Set",
    category: "Gifts & Entertaining",
    brand: "Essentials",
    description:
      'Eight-piece BBQ set with spatula, fork, tongs, basting brush, and four skewers in a zip polyester case with 12" handles. Priced at 25 units.',
    priceTiers: tiers([
      [25, 21.59],
      [75, 20.59],
      [150, 19.59],
      [300, 18.59],
    ]),
    image: "/images/merch/8pc-bbq-grill-tool-set.webp",
    imageAlt: "8 Pc BBQ Grill Tool Set",
    colors: ["Black"],
  },
  {
    id: "pickleball-paddle",
    name: "Pickleball Paddle",
    category: "Outdoor & Sports",
    brand: "Essentials",
    description: "Single pickleball paddle. Priced at 100 units.",
    priceTiers: tiers([
      [100, 6.1],
      [300, 5.94],
      [600, 5.82],
      [1200, 5.57],
      [1800, 5.3],
    ]),
    image: "/images/merch/pickleball-paddle.webp",
    imageAlt: "Pickleball Paddle",
    colors: ["White-Black"],
  },
  {
    id: "carbon-fiber-pickleball-set",
    name: "Carbon Fiber Pickleball Racket Paddle Set",
    category: "Outdoor & Sports",
    brand: "Essentials",
    description:
      "Carbon fiber pickleball set with 2 rackets, 4 balls, and a carrying bag, in a lightweight, fast-swing design. Priced at 50 units.",
    priceTiers: tiers([
      [50, 35.683],
      [100, 35.517],
      [300, 35.35],
      [1000, 35.183],
    ]),
    image: "/images/merch/carbon-fiber-pickleball-set.webp",
    imageAlt: "Carbon Fiber Pickleball Racket Paddle Set",
    colors: ["Black", "Gray"],
  },
  {
    id: "cross-classic-century-pen",
    name: "Cross® Classic Century Ballpoint Pen",
    category: "Office & Writing",
    brand: "Cross",
    description: "Chrome ballpoint pen from Cross. Priced at 12 units.",
    priceTiers: tiers([[12, 34.99]]),
    image: "/images/merch/cross-classic-century-pen.webp",
    imageAlt: "Cross Classic Century Ballpoint Pen",
    colors: ["Chrome"],
  },
  {
    id: "bic-clic-stic-pen",
    name: "BIC® Clic Stic® Pen",
    category: "Office & Writing",
    brand: "BIC",
    description: "Retractable ballpoint pen. Priced at 250 units.",
    priceTiers: tiers([[250, 0.59]]),
    image: "/images/merch/bic-clic-stic-pen.webp",
    imageAlt: "BIC Clic Stic Pen",
    colors: [
      "Black",
      "Forest Green",
      "Metallic Sand",
      "Slate",
      "Blue",
      "Green",
      "Navy",
      "Teal",
      "Burgundy",
      "Metallic Dark Blue",
      "Orange",
      "White",
    ],
  },
  {
    id: "bamboo-desk-organizer",
    name: "Bamboo Desk Organizer with Stylus Pen and Phone Holder",
    category: "Office & Writing",
    brand: "Essentials",
    description:
      "Bamboo desk organizer with a stylus pen, phone holder, 3 pen slots, and a sticky note pad. Priced at 75 units.",
    priceTiers: tiers([
      [75, 8.35],
      [150, 8.25],
      [250, 8.15],
      [500, 8.05],
      [1000, 7.95],
    ]),
    image: "/images/merch/bamboo-desk-organizer.webp",
    imageAlt: "Bamboo Desk Organizer with Stylus Pen and Phone Holder",
    colors: ["Brown"],
  },
  {
    id: "die-cut-stickers",
    name: "Die-Cut Stickers",
    category: "Event & Signage",
    brand: "Essentials",
    description:
      'Full-color custom vinyl die-cut stickers in your choice of shape, from 2" to 5". Priced at 50 units.',
    priceTiers: tiers([
      [50, 1.61],
      [100, 0.96],
      [200, 0.6],
      [300, 0.468],
    ]),
    image: "/images/merch/die-cut-stickers.webp",
    imageAlt: "Die-Cut Stickers",
    colors: ["Custom (full-color print)"],
  },
];

// Per-color photos live in colorImages.json (productId -> color -> image path)
// so they can be sourced in bulk without touching individual product entries.
type ColorImageMap = Record<string, Record<string, string>>;

// Several agents add photos in parallel, each into its own file; they are merged here.
function mergeColorImageMaps(...maps: ColorImageMap[]): ColorImageMap {
  const merged: ColorImageMap = {};
  for (const map of maps) {
    for (const [productId, byColor] of Object.entries(map)) {
      merged[productId] = { ...merged[productId], ...byColor };
    }
  }
  return merged;
}

const colorImageOverrides = mergeColorImageMaps(
  colorImageMapJson as ColorImageMap,
  colorImagesExtra1 as ColorImageMap,
  colorImagesExtra2 as ColorImageMap
);

function withColorImages(product: MerchProduct): MerchProduct {
  const extra = colorImageOverrides[product.id];
  return extra ? { ...product, colorImages: { ...product.colorImages, ...extra } } : product;
}

/**
 * Bulk-imported catalog (scripts/importCatalog.mjs). importedProducts.json
 * holds raw ESP "Catalog Price" tiers only; the 5% markup is applied here,
 * once, through tiers() — the same path every curated product uses. The file
 * never carries ESP ids, suppliers or product numbers (it ships to browsers).
 */
export interface ImportedProductRecord {
  id: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  /** [quantity, ESP catalog price] pairs, ascending by quantity. */
  tiers: [quantity: number, espPrice: number][];
  image: string;
  imageAlt: string;
  colors: string[];
}

export function isImportedProductRecord(value: unknown): value is ImportedProductRecord {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.name === "string" &&
    typeof r.category === "string" &&
    typeof r.brand === "string" &&
    typeof r.description === "string" &&
    typeof r.image === "string" &&
    typeof r.imageAlt === "string" &&
    Array.isArray(r.colors) &&
    r.colors.every((c) => typeof c === "string") &&
    Array.isArray(r.tiers) &&
    r.tiers.length > 0 &&
    r.tiers.every(
      (t) =>
        Array.isArray(t) && t.length === 2 && typeof t[0] === "number" && typeof t[1] === "number"
    )
  );
}

export function toImportedProduct(record: ImportedProductRecord): MerchProduct {
  return {
    id: record.id,
    name: record.name,
    category: record.category,
    brand: record.brand,
    description: record.description,
    priceTiers: tiers(record.tiers),
    image: record.image,
    imageAlt: record.imageAlt,
    colors: record.colors,
  };
}

const importedProducts: MerchProduct[] = (importedProductsJson as unknown[])
  .filter(isImportedProductRecord)
  .map(toImportedProduct);

export const products: MerchProduct[] = [...curatedProducts, ...importedProducts].map(
  withColorImages
);

import imprintAreasJson from "./imprintAreas.json";

// Logo placement for the "see your logo on it" preview. Values are % of the
// rendered product photo: top/left are the logo's center point, width is the
// logo's width as % of the photo width.
//
// Resolution order (see resolveImprintArea): a product's own `imprintArea`,
// then its entry in imprintAreas.json, then CATEGORY_IMPRINT_DEFAULTS, then
// FALLBACK_IMPRINT. Layers merge field by field, so a JSON entry can be just
// { "width": 30 } or { "hide": true } and inherit the rest.
//
// The category defaults are for photos nobody has tuned yet, so they favour
// the most common shot in each category (e.g. left-chest on a polo model).
// Anything that deviates, such as centered tee prints, flat-lay garments,
// cylindrical drinkware photographed as a collage, belongs in the JSON file.
export const CATEGORY_IMPRINT_DEFAULTS: Record<string, ImprintArea> = {
  // Left chest: the wearer's left sits on the viewer's right of the garment.
  Apparel: { top: 38, left: 59, width: 9 },
  // Center of the barrel, a little above the midpoint.
  Drinkware: { top: 52, left: 50, width: 22 },
  Bags: { top: 48, left: 50, width: 24 },
  "Tech Accessories": { top: 50, left: 50, width: 20 },
  "Office & Writing": { top: 48, left: 50, width: 20 },
  "Event & Signage": { top: 50, left: 50, width: 22 },
  // Caps/visors/beanies: front panel, above center and fairly small.
  Headwear: { top: 38, left: 45, width: 16 },
  // Mixed bag (balls, towels, umbrellas, coolers...): centered, mid-size.
  "Outdoor & Sports": { top: 50, left: 50, width: 20 },
  // Bottles, kits, sanitizer, etc.: lower-center like drinkware, slightly smaller.
  "Health & Wellness": { top: 48, left: 50, width: 22 },
  // Rugs and floor mats: the logo is printed large across the center.
  "Home & Decor": { top: 50, left: 50, width: 40 },
  // Packaged food, car items, seasonal gifts, toys: centered, mid-size.
  "Food & Treats": { top: 50, left: 50, width: 24 },
  Automotive: { top: 50, left: 50, width: 26 },
  "Seasonal & Holiday": { top: 50, left: 50, width: 24 },
  "Kids & Toys": { top: 50, left: 50, width: 22 },
  "Awards & Recognition": { top: 50, left: 50, width: 30 },
  // Boards, blankets, kits: centered, mid-size.
  "Gifts & Entertaining": { top: 50, left: 50, width: 22 },
  // Blades and handles are small and photographed at angles; keep it modest.
  "Knives & Tools": { top: 50, left: 40, width: 12 },
};

const FALLBACK_IMPRINT: ImprintArea = { top: 50, left: 50, width: 22 };

/** Per-product overrides keyed by product id; any subset of ImprintArea. */
export type ImprintOverrides = Record<string, Partial<ImprintArea>>;

const IMPRINT_OVERRIDES = imprintAreasJson as unknown as ImprintOverrides;

/**
 * Pure lookup so the layering can be tested without the whole catalog.
 * Product's own imprintArea wins over the JSON entry, which wins over the
 * category default, which wins over the fallback.
 */
export function resolveImprintArea(
  product: Pick<MerchProduct, "id" | "category" | "imprintArea">,
  overrides: ImprintOverrides = IMPRINT_OVERRIDES
): ImprintArea {
  return {
    ...(CATEGORY_IMPRINT_DEFAULTS[product.category] ?? FALLBACK_IMPRINT),
    ...overrides[product.id],
    ...product.imprintArea,
  };
}

export function getImprintArea(product: MerchProduct): ImprintArea {
  return resolveImprintArea(product);
}

export function getProductById(id: string): MerchProduct | undefined {
  return products.find((product) => product.id === id);
}

/** Best (lowest per-unit) price the given quantity qualifies for. */
export function tierForQuantity(product: MerchProduct, quantity: number): MerchPriceTier {
  const sorted = [...product.priceTiers].sort((a, b) => a.quantity - b.quantity);
  let best = sorted[0];
  for (const tier of sorted) {
    if (quantity >= tier.quantity) best = tier;
  }
  return best;
}

/** Lowest-quantity tier's price — used as each product's headline "starting" price. */
export function startingPrice(product: MerchProduct): number {
  return [...product.priceTiers].sort((a, b) => a.quantity - b.quantity)[0].price;
}

/**
 * Groups products by brand and orders brands by their priciest item,
 * highest first — a simple anchoring effect so premium/name-brand items
 * (Peter Millar, Holderness & Bourne, Samsonite...) are seen before
 * "Essentials" private-label items, setting a quality impression up front.
 * "Essentials" is always pushed last regardless of its price spread.
 */
export function groupByBrand(list: MerchProduct[]): { brand: string; items: MerchProduct[] }[] {
  const byBrand = new Map<string, MerchProduct[]>();
  for (const product of list) {
    const group = byBrand.get(product.brand);
    if (group) group.push(product);
    else byBrand.set(product.brand, [product]);
  }

  const groups = Array.from(byBrand.entries()).map(([brand, items]) => ({
    brand,
    items: [...items].sort((a, b) => startingPrice(b) - startingPrice(a)),
  }));

  groups.sort((a, b) => {
    if (a.brand === "Essentials") return 1;
    if (b.brand === "Essentials") return -1;
    return startingPrice(b.items[0]) - startingPrice(a.items[0]);
  });

  return groups;
}

/**
 * Groups products by category (in the fixed merchandiseCategories order —
 * how shoppers actually browse: "I need drinkware," not "I want Peter
 * Millar"). Within each category, name-brand items still lead and
 * "Essentials" private-label items still trail, same anchoring effect as
 * groupByBrand, just applied inside each category instead of across the
 * whole catalog.
 */
export function groupByCategory(
  list: MerchProduct[]
): { category: string; items: MerchProduct[] }[] {
  const byCategory = new Map<string, MerchProduct[]>();
  for (const product of list) {
    const group = byCategory.get(product.category);
    if (group) group.push(product);
    else byCategory.set(product.category, [product]);
  }

  return merchandiseCategories
    .filter((category) => byCategory.has(category))
    .map((category) => ({
      category,
      items: [...byCategory.get(category)!].sort((a, b) => {
        if (a.brand === "Essentials" && b.brand !== "Essentials") return 1;
        if (b.brand === "Essentials" && a.brand !== "Essentials") return -1;
        return startingPrice(b) - startingPrice(a);
      }),
    }));
}
