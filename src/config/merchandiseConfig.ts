/**
 * ============================================================================
 * MERCHANDISE — CATALOG + REQUEST FORM CONFIG
 * ============================================================================
 * Products are added here one at a time as real items are provided — never
 * fabricate a product, price, or image. Each price tier's `price` is always
 * espPrice * (1 + MARKUP_RATE), rounded to the cent.
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

import type { MerchPriceTier, MerchProduct } from "@/types";

export const MARKUP_RATE = 0.05;

function clientPrice(espPrice: number): number {
  return Math.round(espPrice * (1 + MARKUP_RATE) * 100) / 100;
}

function tiers(pairs: [quantity: number, espPrice: number][]): MerchPriceTier[] {
  return pairs.map(([quantity, espPrice]) => ({
    quantity,
    espPrice,
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
  "Drinkware",
  "Bags",
  "Tech Accessories",
  "Office & Writing",
  "Event & Signage",
] as const;

// Real products sourced from live ESP+ search (espplus.com), September 2026.
// Each tier's espPrice is that product's ESP "Catalog Price" (the distributor
// selling price) at that quantity — never the raw supplier "Net Cost", which
// is not stored here. `price` = clientPrice(espPrice).
export const products: MerchProduct[] = [
  {
    id: "nike-dri-fit-polo",
    name: "Nike Dri-FIT Micro Pique 2.0 Polo",
    category: "Apparel",
    brand: "Nike",
    description:
      "Moisture-wicking pique polo in 20 colors — a reliable staple for staff and volunteer uniforms.",
    priceTiers: tiers([[1, 56.02]]),
    image: "/images/merch/nike-dri-fit-polo.jpg",
    imageAlt: "Nike Dri-FIT Micro Pique 2.0 Polo",
    colors: [
      "Anthracite", "Black", "Blue Tint", "Brilliant Orange", "Cool Grey",
      "Court Purple", "Game Royal", "Gorge Green", "Gym Blue", "Lucid Green",
      "Mint", "Navy", "Team Red", "Tidal Blue", "University Red",
      "Urban Lilac", "Valor Blue", "Varsity Maize", "Vivid Pink", "White",
    ],
  },
  {
    id: "nike-therma-fit-quarter-zip-fleece",
    name: "Nike Therma-FIT 1/4-Zip Fleece",
    category: "Apparel",
    brand: "Nike",
    description:
      "A fleece quarter-zip in 6 colors — a warm, recognizable-brand layering piece for cooler-weather events.",
    priceTiers: tiers([
      [1, 68.767],
      [12, 62.1],
    ]),
    image: "/images/merch/nike-therma-fit-quarter-zip-fleece.jpg",
    imageAlt: "Nike Therma-FIT 1/4-Zip Fleece",
    colors: [
      "Team Anthracite", "Team Black", "Team Dark Green", "Team Navy",
      "Team Royal", "Team Scarlet",
    ],
  },
  {
    id: "adidas-performance-polo-mens",
    name: "Adidas Men's Performance Polo",
    category: "Apparel",
    brand: "Adidas",
    description:
      "A budget-friendly, recognizable-brand polo in 14 colors — solid everyday staff and volunteer wear.",
    priceTiers: tiers([[1, 39.5]]),
    image: "/images/merch/adidas-performance-polo-mens.jpg",
    imageAlt: "Adidas Men's Performance Polo",
    colors: [
      "Black", "Collegiate Green", "Collegiate Red", "Collegiate Royal",
      "Grey Three", "Navy", "White", "Collegiate Gold", "Collegiate Purple",
      "Maroon", "Orange", "Bliss Pink", "Clear Mint", "Team Light Blue",
    ],
  },
  {
    id: "adidas-performance-polo-womens",
    name: "Adidas Women's Performance Polo",
    category: "Apparel",
    brand: "Adidas",
    description:
      "The women's counterpart to our Adidas polo, in 12 colors — the same budget-friendly, recognizable-brand staple.",
    priceTiers: tiers([[1, 39.5]]),
    image: "/images/merch/adidas-performance-polo-womens.jpg",
    imageAlt: "Adidas Women's Performance Polo",
    colors: [
      "Black", "Collegiate Red", "Collegiate Royal", "Grey Three", "Navy",
      "White", "Collegiate Purple", "Maroon", "Collegiate Green",
      "Bliss Pink", "Clear Mint", "Team Light Blue",
    ],
  },
  {
    id: "adidas-ultimate365-quarter-zip-mens",
    name: "Adidas Men's Ultimate365 Lightweight Quarter-Zip Pullover",
    category: "Apparel",
    brand: "Adidas",
    description:
      "A lightweight quarter-zip pullover in 11 colors — a versatile, recognizable-brand layering piece.",
    priceTiers: tiers([[1, 60.0]]),
    image: "/images/merch/adidas-ultimate365-quarter-zip-mens.jpg",
    imageAlt: "Adidas Men's Ultimate365 Lightweight Quarter-Zip Pullover",
    colors: [
      "Black", "Black Heather", "Collegiate Navy", "Collegiate Royal",
      "Grey Three", "Power Red", "White", "Blue Fusion", "Collegiate Green",
      "Grey Three Melange", "Onix",
    ],
  },
  {
    id: "adidas-spacer-quarter-zip-womens",
    name: "Adidas Women's Spacer Quarter-Zip Pullover",
    category: "Apparel",
    brand: "Adidas",
    description:
      "The women's counterpart quarter-zip pullover, in 6 colors — the same recognizable-brand layering piece.",
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
    description:
      "A midlayer quarter-zip pullover in 6 colors — a performance-brand option for cooler-weather events.",
    priceTiers: tiers([[1, 90.0]]),
    image: "/images/merch/under-armour-drive-midlayer-pullover.jpg",
    imageAlt: "Under Armour Men's Drive Midlayer Pullover",
    colors: [
      "Midnight Navy Heather", "Ceylon", "Castle Rock Heather", "Blue Haze",
      "Misty Sky Blue", "Seaspray",
    ],
  },
  {
    id: "brooks-brothers-mesh-polo-mens",
    name: "Brooks Brothers Mesh Pique Performance Polo",
    category: "Apparel",
    brand: "Brooks Brothers",
    description:
      "An upper-tier brand polo in 6 colors — a step up from our everyday options for client-facing staff.",
    priceTiers: tiers([
      [1, 51.383],
      [36, 44.717],
    ]),
    image: "/images/merch/brooks-brothers-mesh-polo-mens.jpg",
    imageAlt: "Brooks Brothers Mesh Pique Performance Polo",
    colors: ["Charter Blue", "Deep Black", "Navy Blazer", "Rich Red", "Soft Mint", "White"],
  },
  {
    id: "brooks-brothers-mesh-polo-womens",
    name: "Brooks Brothers Women's Mesh Pique Performance Polo",
    category: "Apparel",
    brand: "Brooks Brothers",
    description:
      "The women's counterpart to our Brooks Brothers polo, in 5 colors — the same upper-tier brand quality.",
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
    description:
      "A premium peached-finish quarter-zip pullover in 15 colors — a top-tier layering piece for leadership and donor events.",
    priceTiers: tiers([[1, 155.0]]),
    image: "/images/merch/holderness-bourne-westland-pullover.jpg",
    imageAlt: "Holderness & Bourne The Westland Peached Pullover",
    colors: [
      "Navy", "Charcoal", "Black", "Liberty Red", "Heathered Vista Blue",
      "Heathered Nectarine", "Heathered Vineyard", "Heathered Pacific Blue",
      "Heathered Cypress", "Heathered Driftwood", "Heathered Dune",
      "Heathered Windsor", "Heathered Palmetto", "Heathered Grape Bay",
      "Heathered Paget",
    ],
  },
  {
    id: "johnnie-o-sully-quarter-zip",
    name: "Johnnie-O Men's Sully Quarter-Zip Pullover Shirt",
    category: "Apparel",
    brand: "Johnnie-O",
    description:
      "A premium quarter-zip pullover in 14 colors — a polished, high-end layering option.",
    priceTiers: tiers([[1, 138.0]]),
    image: "/images/merch/johnnie-o-sully-quarter-zip.jpg",
    imageAlt: "Johnnie-O Men's Sully Quarter-Zip Pullover Shirt",
    colors: [
      "Light Gray-Blue", "Helious Blue-Gray", "Black", "Laguna", "White",
      "Port", "Grizzly", "Sequoia", "Sapphire", "Breeze", "Bayou",
      "Heather Black", "Huckleberry", "Canyon",
    ],
  },
  {
    id: "peter-millar-galway-stretch-vest",
    name: "Peter Millar Galway Stretch Loop Terry Quarter-Zip Vest",
    category: "Apparel",
    brand: "Peter Millar",
    description:
      "A stretch loop-terry quarter-zip vest in 4 colors — a luxury-tier layering piece. Priced at 6 units.",
    priceTiers: tiers([
      [6, 149.11],
      [12, 144.95],
      [24, 142.6],
      [48, 138.66],
    ]),
    image: "/images/merch/peter-millar-galway-stretch-vest.jpg",
    imageAlt: "Peter Millar Galway Stretch Loop Terry Quarter-Zip Vest",
    colors: ["Black", "Iron", "White", "Navy"],
  },
  {
    id: "peter-millar-essex-vest",
    name: "Peter Millar Men's Essex Vest",
    category: "Apparel",
    brand: "Peter Millar",
    description:
      "A quilted luxury-tier vest in 3 colors — our top-end winter option for leadership and donor-facing events. Priced at 6 units.",
    priceTiers: tiers([
      [6, 272.32],
      [12, 265.16],
      [24, 261.36],
      [48, 254.62],
    ]),
    image: "/images/merch/peter-millar-essex-vest.jpg",
    imageAlt: "Peter Millar Men's Essex Vest",
    colors: ["Black", "Dark Olive", "Navy"],
  },
  {
    id: "peter-millar-pine-performance-hoodie",
    name: "Men's Peter Millar Pine Performance Hoodie",
    category: "Apparel",
    brand: "Peter Millar",
    description:
      "A luxury-tier performance hoodie in 9 colors — a premium layering piece for leadership and top-tier gifting. Priced at 6 units.",
    priceTiers: tiers([[6, 150.0]]),
    image: "/images/merch/peter-millar-pine-performance-hoodie.jpg",
    imageAlt: "Men's Peter Millar Pine Performance Hoodie",
    colors: [
      "Black", "Navy", "White", "Gale Grey", "Red 3", "Fresh Mint",
      "Lakeside", "Pine Brook", "Sport Navy",
    ],
  },
  {
    id: "peter-millar-perth-quarter-zip-mens",
    name: "Peter Millar Men's Perth Performance Quarter-Zip",
    category: "Apparel",
    brand: "Peter Millar",
    description:
      "A luxury-tier performance quarter-zip in 8 colors — for leadership, donor-facing events, and top-tier client gifting. Priced at 6 units.",
    priceTiers: tiers([[6, 145.0]]),
    image: "/images/merch/peter-millar-perth-quarter-zip-mens.jpg",
    imageAlt: "Peter Millar Men's Perth Performance Quarter-Zip",
    colors: [
      "Black", "British Grey", "Cottage Blue", "Iron", "Navy", "White",
      "Red 3", "Blue 3",
    ],
  },
  {
    id: "peter-millar-perth-quarter-zip-womens",
    name: "Peter Millar Women's Perth Performance Quarter-Zip",
    category: "Apparel",
    brand: "Peter Millar",
    description:
      "The women's counterpart to our Peter Millar Perth quarter-zip, in 6 colors — the same luxury tier. Priced at 6 units.",
    priceTiers: tiers([[6, 145.0]]),
    image: "/images/merch/peter-millar-perth-quarter-zip-womens.jpg",
    imageAlt: "Peter Millar Women's Perth Performance Quarter-Zip",
    colors: ["Black", "Navy", "White", "Red 3", "Pine Brook", "Rainwater"],
  },
  {
    id: "peter-millar-jubilee-striped-polo",
    name: "Peter Millar Men's Jubilee Striped Polo",
    category: "Apparel",
    brand: "Peter Millar",
    description:
      "A striped luxury-tier polo in 4 colors — for leadership, donor-facing events, and top-tier client gifting. Priced at 6 units.",
    priceTiers: tiers([[6, 115.0]]),
    image: "/images/merch/peter-millar-jubilee-striped-polo.jpg",
    imageAlt: "Peter Millar Men's Jubilee Striped Polo",
    colors: ["Black", "Navy", "Cottage Blue", "Iron"],
  },
  {
    id: "peter-millar-hales-polo",
    name: "Peter Millar Hales Performance Short Sleeve Jersey Polo",
    category: "Apparel",
    brand: "Peter Millar",
    description:
      "A luxury-tier jersey polo in 3 colors — for leadership, donor-facing events, and top-tier client gifting.",
    priceTiers: tiers([[1, 115.0]]),
    image: "/images/merch/peter-millar-hales-polo.jpg",
    imageAlt: "Peter Millar Hales Performance Short Sleeve Jersey Polo",
    colors: ["Cottage Blue", "Navy Blue", "Pear Tart Green"],
  },
  {
    id: "peter-millar-polo-mens",
    name: "Peter Millar Men's Solid Performance Polo",
    category: "Apparel",
    brand: "Peter Millar",
    description:
      "Our luxury-tier polo in 5 colors — for leadership, donor-facing events, and top-tier client gifting. Priced at 6 units.",
    priceTiers: tiers([[6, 105.0]]),
    image: "/images/merch/peter-millar-polo-mens.jpg",
    imageAlt: "Peter Millar Men's Solid Performance Polo",
    colors: ["Black", "Cottage Blue", "Navy", "White", "Iron"],
  },
  {
    id: "peter-millar-polo-womens",
    name: "Peter Millar Women's Short Sleeve Button Polo",
    category: "Apparel",
    brand: "Peter Millar",
    description:
      "The women's counterpart to our Peter Millar polo, in 3 colors — the same luxury tier for leadership and top-tier gifting.",
    priceTiers: tiers([[1, 115.0]]),
    image: "/images/merch/peter-millar-polo-womens.jpg",
    imageAlt: "Peter Millar Women's Short Sleeve Button Polo",
    colors: ["Black", "White", "Navy Blue"],
  },
  {
    id: "callaway-lightweight-quarter-zip",
    name: "Callaway Men's Lightweight 1/4 Zip Pullover",
    category: "Apparel",
    brand: "Callaway",
    description: "A lightweight quarter-zip pullover in 3 colors — a recognizable-brand layering piece.",
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
    description:
      "A recognizable-brand insulated vest in 4 colors — a winter staple for canvassing and outdoor events.",
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
    description:
      "The women's counterpart to our Storm Creek insulated vest, in 6 colors — the same winter-ready warmth.",
    priceTiers: tiers([[1, 90.0]]),
    image: "/images/merch/storm-creek-front-runner-vest-womens.jpg",
    imageAlt: "Storm Creek Women's Front Runner 120 GSM Insulated Vest",
    colors: [
      "Black", "Platinum Gray", "Navy Blue", "White", "Jet Gray-Black",
      "Titanium Gray",
    ],
  },
  {
    id: "imperial-original-performance-cap",
    name: "Imperial The Original Performance Cap",
    category: "Apparel",
    brand: "Imperial",
    description:
      "A structured, unstructured-brim performance cap in 33 colors — the widest color range of any cap in the catalog.",
    priceTiers: tiers([
      [1, 20.33],
      [12, 19.5],
      [72, 19.17],
    ]),
    image: "/images/merch/imperial-original-performance-cap.jpg",
    imageAlt: "Imperial The Original Performance Cap",
    colors: [
      "Green", "Azure Blue", "Black", "Cobalt", "Pacific Blue", "Dark Gray",
      "Khaki", "Red Pepper", "Forest", "Light Blue", "True Navy",
      "Frost Gray", "Light Pink", "White", "Aqua", "Breaker Blue", "Cardinal",
      "Fog", "Lavender", "Olive", "Orange", "Petrol", "Putty", "Robin's Egg",
      "Sea Glass", "Laurel Green", "Macaroon", "Walnut", "Buckthorn Brown",
      "Peach", "Winter Green", "True Royal", "True Red",
    ],
  },
  {
    id: "gildan-ultra-cotton-tshirt",
    name: "Gildan Ultra Cotton T-Shirt",
    category: "Apparel",
    brand: "Gildan",
    description:
      "The industry-standard cotton tee in 61 colors — the most flexible, budget-friendly option for large-volume giveaways.",
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
      "Ash", "Azalea", "Black", "Carolina Blue", "Charcoal", "Cherry Red",
      "Daisy", "Dark Chocolate", "Heather Cardinal", "Heather Indigo",
      "Heliconia", "Indigo Blue", "Iris", "Irish Green", "Kelly Green",
      "Kiwi", "Light Blue", "Light Pink", "Lime", "Maroon", "Metro Blue",
      "Military Green", "Natural", "Navy", "Olive", "Orange", "Orchid",
      "Pistachio", "Prairie Dust", "Purple", "Red", "Royal", "Safety Orange",
      "Sand", "Sapphire", "Sky", "Sport Gray", "Stone Blue", "Tan",
      "Tangerine", "Texas Orange", "Vegas Gold", "White", "Antique Cherry Red",
      "Antique Irish Green", "Antique Royal", "Blue Dusk", "Cardinal Red",
      "Dark Heather", "Forest Green", "Gold", "Heather Navy",
      "Heather Sapphire", "Ice Gray", "Jade Dome", "Safety Green",
      "Safety Pink", "Cornsilk", "Galapagos Blue", "Mint Green",
    ],
  },
  {
    id: "6panel-upf-stretch-cap",
    name: "6-Panel UPF 50+ Cool Comfort Stretch Cap",
    category: "Apparel",
    brand: "Essentials",
    description:
      "A structured, stretch-fit performance cap in 7 colors — built for a cleaner, more finished look than a mesh trucker back.",
    priceTiers: tiers([
      [1, 12.7],
      [144, 12.6],
      [288, 12.5],
      [576, 12.4],
      [1296, 12.3],
    ]),
    image: "/images/merch/6panel-upf-stretch-cap.jpg",
    imageAlt: "6-Panel UPF 50+ Cool Comfort Stretch Cap",
    colors: [
      "Black", "Navy", "Red", "Royal", "Charcoal Gray", "White", "Neon Orange",
    ],
  },
  {
    id: "6panel-premium-relaxed-golf-cap",
    name: "6 Panel Premium Relaxed Golf Cap",
    category: "Apparel",
    brand: "Essentials",
    description:
      "A relaxed-fit golf dad cap in 20 colors — an affordable, casual everyday option. Priced at 12 units.",
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
      "Black", "Brown", "Royal", "Burgundy", "Dark Green", "Gold",
      "Kelly Green", "Khaki", "Light Blue", "Navy", "Olive", "Orange",
      "Pink", "Red", "Tie Dyed Pink", "Tie Dyed Navy", "Yellow", "Stone",
      "Sky Blue", "White",
    ],
  },
  {
    id: "summit-sweater-fleece-vest-mens",
    name: "Summit Sweater-Fleece Vest",
    category: "Apparel",
    brand: "Essentials",
    description:
      "A heathered sweater-fleece vest — a polished mid-tier layering piece for cooler weather. Priced at 1 unit.",
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
      "The women's counterpart to our Summit sweater-fleece vest, in 2 color-blocked options.",
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
    description:
      "Layered quarter-zip pullover in 10 colors — a polished option for cooler-weather canvassing and events.",
    priceTiers: tiers([[1, 65.8]]),
    image: "/images/merch/zen-quarter-zip-pullover.jpg",
    imageAlt: "Zen Quarter-Zip Pullover",
    colors: [
      "Black", "Carolina Blue", "Dark Grey", "Deep Maroon", "Navy", "Orange",
      "Purple", "Royal", "Silver", "Sport Red",
    ],
  },
  {
    id: "mesa-vest",
    name: "Mesa Vest",
    category: "Apparel",
    brand: "Essentials",
    description:
      "A quilted insulated vest in 5 colors — a polished layering piece for cooler-weather events and door-knocking season.",
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
      "Double-wall stainless steel bottle with a flip straw and handle, in 12 colors — one of the most-requested drinkware items on the market.",
    priceTiers: tiers([
      [24, 39.99],
      [72, 37.99],
      [144, 35.99],
    ]),
    image: "/images/merch/owala-freesip-24oz.jpg",
    imageAlt: "24 oz Owala Freesip Insulated Bottle",
    colors: [
      "Shy Marshmallow", "Very Very Dark", "Sugar High", "Coastal Mist",
      "Blue Oasis", "Calm Waters", "Rock On", "Green House", "Read My Lips",
      "Out Of The Blue", "Blue Steel", "Nailed It",
    ],
  },
  {
    id: "polar-30oz-tumbler",
    name: "Polar 30 oz. Stainless Steel Tumbler",
    category: "Drinkware",
    brand: "Essentials",
    description:
      "Vacuum-insulated tumbler in 4 colors, built for all-day use in the field or at the office.",
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
    description:
      "Budget-friendly insulated travel mug in 9 colors — a dependable everyday giveaway.",
    priceTiers: tiers([
      [100, 5.51],
      [250, 5.39],
      [500, 4.98],
      [1000, 4.66],
      [2500, 4.12],
    ]),
    image: "/images/merch/insulated-travel-mug-16oz.jpg",
    imageAlt: "16 oz. Insulated Stainless Steel Travel Mug",
    colors: [
      "Black", "Blue", "Green", "Lime Green", "Orange", "Pink", "Purple",
      "Red", "Yellow",
    ],
  },
  {
    id: "ceramic-mug-11oz",
    name: "11 oz. Traditional Ceramic Mug",
    category: "Drinkware",
    brand: "Essentials",
    description:
      "Classic ceramic coffee mug in 15 colors — an easy, budget-friendly giveaway for offices and events.",
    priceTiers: tiers([[72, 3.67]]),
    image: "/images/merch/ceramic-mug-11oz.jpg",
    imageAlt: "11 oz. Traditional Ceramic Mug",
    colors: [
      "Almond", "Black", "Brown", "Cobalt Blue", "Grey", "Lime Green",
      "Maroon", "Orange", "Pink", "Teal", "White", "Yellow", "Green",
      "Purple", "Red",
    ],
  },
  {
    id: "samsonite-weekender-duffel",
    name: "Samsonite Better Than Basic Weekender",
    category: "Bags",
    brand: "Samsonite",
    description:
      "A premium Samsonite weekender duffel in 2 colors — a higher-end gift for leadership, major donors, or top staff.",
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
    description:
      "A polished recycled laptop backpack in 2 colors — a higher-end option for staff and leadership gifting.",
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
    description:
      'A dependable 15" x 16" cotton canvas tote in 5 colors — our most popular tote on ESP by review volume.',
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
    description:
      "Budget-friendly recycled tote in 13 colors — sized for handouts, literature, and event swag.",
    priceTiers: tiers([[100, 2.15]]),
    image: "/images/merch/non-woven-recycled-tote.jpg",
    imageAlt: "Large Non-Woven Recycled Tote",
    colors: [
      "Black", "Burgundy", "Hunter Green", "Lime Green", "Navy Blue",
      "Orange", "Pink", "Reflex Blue", "Purple", "Red", "Teal", "Gray",
      "White",
    ],
  },
  {
    id: "gusset-shopping-tote",
    name: "Gusseted Shopping Tote",
    category: "Bags",
    brand: "Essentials",
    description:
      'Roomier gusseted tote (10.5"w x 11.75"h with an 8" gusset) in 7 colors, for heavier hauls.',
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
    description:
      "An inexpensive drawstring backpack in 10 colors — a lightweight option for field or event handouts.",
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
      "Black", "Hunter Green", "Lime", "Orange", "Pink", "Purple",
      "Royal Blue", "White", "Yellow", "Red",
    ],
  },
  {
    id: "magsafe-power-bank-10000mah",
    name: "10,000mAh MagSafe Power Bank",
    category: "Tech Accessories",
    brand: "Essentials",
    description:
      "Wired and wireless MagSafe-compatible power bank in 4 colors — a high-value tech giveaway.",
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
      "A compact magnetic Bluetooth speaker that clips to any metal surface — a distinctive, higher-end tech giveaway.",
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
    description:
      "A best-selling wireless charging pad — practical desk swag that keeps your brand in daily view.",
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
    description:
      "A dependable swivel USB drive in 22 colors — a practical giveaway for onboarding kits and conferences.",
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
      "Black", "Blue", "Royal Blue", "Navy Blue", "Light Blue", "Green",
      "Green (Emerald)", "Green (Forest)", "Orange", "Orange (Deep)",
      "Pearl Blue", "Purple", "Red", "Red (Cherry)", "Red (Maroon)",
      "Reflex Blue", "White", "Yellow", "Custom Shell Colors", "Silver",
      "Cola Red",
    ],
  },
  {
    id: "neoprene-laptop-sleeve",
    name: "Slim Reversible Neoprene Laptop Sleeve",
    category: "Tech Accessories",
    brand: "Essentials",
    description:
      'A budget-friendly 14" reversible laptop sleeve in 6 colors — a practical, low-cost tech giveaway.',
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
      "Bright Black", "Bright Blue", "Camouflage White", "Camouflage Yellow",
      "Metallic Pink", "Medium Gray",
    ],
  },
  {
    id: "the-decision-maker-padfolio",
    name: "The Decision Maker Leather Padfolio",
    category: "Office & Writing",
    brand: "Essentials",
    description:
      "A leather-look padfolio in 3 colors, sized for briefings and client meetings — a polished everyday-carry piece.",
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
    description:
      "Linen-textured journal in 6 colors — a refined giveaway for donors and VIP contacts.",
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
    description:
      "A dependable hardcover notebook for everyday note-taking and briefings.",
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
    description:
      "Full-size retractable banner stand for tables, entrances, and step-and-repeat setups.",
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
    description:
      "Breakaway safety lanyard in 9 colors — a staple for staff and volunteer credentials at events.",
    priceTiers: tiers([[150, 1.75]]),
    image: "/images/merch/silkscreen-lanyard.jpg",
    imageAlt: "3/4-inch Silkscreen Breakaway Lanyard",
    colors: [
      "Black", "White", "Navy", "Yellow", "Red", "Green", "Royal", "Orange",
      "Lime",
    ],
  },
];

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
