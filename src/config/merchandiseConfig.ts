/**
 * ============================================================================
 * MERCHANDISE — CATALOG + REQUEST FORM CONFIG
 * ============================================================================
 * Products are added here one at a time as real items are provided — never
 * fabricate a product, price, or image. `price` is always
 * espPrice * (1 + MARKUP_RATE), rounded to the cent.
 *
 * Pricing model (verified): the 5% surcharge applies to the ESP selling
 * price, NOT raw supplier cost — the ESP price already has ASI's own markup
 * baked in. Example: supplier cost $0.60, ESP price $1.00 -> client pays
 * $1.05. There is no revenue split beyond that; see src/lib/asi/pricing.ts
 * for the full order-time quote logic (quantity, setup, decoration,
 * shipping) once real SmartLink data is wired in.
 * ============================================================================
 */

import type { MerchProduct } from "@/types";

export const MARKUP_RATE = 0.05;

function clientPrice(espPrice: number): number {
  return Math.round(espPrice * (1 + MARKUP_RATE) * 100) / 100;
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
// espPrice is each product's ESP "Catalog Price" (the distributor selling
// price) at the quantity noted in its description — never the raw supplier
// "Net Cost", which is not stored here. `price` = clientPrice(espPrice).
export const products: MerchProduct[] = [
  {
    id: "nike-dri-fit-polo",
    name: "Nike Dri-FIT Micro Pique 2.0 Polo",
    category: "Apparel",
    description:
      "Moisture-wicking pique polo in 20 colors — a reliable staple for staff and volunteer uniforms. Priced at 1 unit; volume pricing available on request.",
    espPrice: 56.02,
    price: clientPrice(56.02),
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
    id: "omega-mesh-tech-polo",
    name: "Omega Solid Mesh Tech Polo",
    category: "Apparel",
    description:
      "Lightweight mesh tech polo in 22 colors, built for all-day wear at events and in the field. Priced at 1 unit; volume pricing available on request.",
    espPrice: 37.5,
    price: clientPrice(37.5),
    image: "/images/merch/omega-mesh-tech-polo.jpg",
    imageAlt: "Omega Solid Mesh Tech Polo",
    colors: [
      "Athletic Gold", "Berry Pink", "Black", "Brown", "Carolina Blue",
      "Citron", "Dark Forest", "Dark Grey", "Deep Maroon", "Grey",
      "Island Blue", "Lawn", "Lime", "Navy", "Orange", "Purple", "Real Red",
      "Royal", "Sport Red", "Sunburst", "Teal", "White",
    ],
  },
  {
    id: "zen-quarter-zip-pullover",
    name: "Zen Quarter-Zip Pullover",
    category: "Apparel",
    description:
      "Layered quarter-zip pullover in 10 colors — a polished option for cooler-weather canvassing and events. Priced at 1 unit; volume pricing available on request.",
    espPrice: 65.8,
    price: clientPrice(65.8),
    image: "/images/merch/zen-quarter-zip-pullover.jpg",
    imageAlt: "Zen Quarter-Zip Pullover",
    colors: [
      "Black", "Carolina Blue", "Dark Grey", "Deep Maroon", "Navy", "Orange",
      "Purple", "Royal", "Silver", "Sport Red",
    ],
  },
  {
    id: "gildan-ultra-cotton-tshirt",
    name: "Gildan Ultra Cotton T-Shirt",
    category: "Apparel",
    description:
      "The industry-standard cotton tee in 61 colors — the most flexible, budget-friendly option for large-volume giveaways. Priced at 72 units.",
    espPrice: 9.05,
    price: clientPrice(9.05),
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
    id: "mesa-vest",
    name: "Mesa Vest",
    category: "Apparel",
    description:
      "A quilted insulated vest in 5 colors — a polished layering piece for cooler-weather events and door-knocking season. Priced per unit.",
    espPrice: 59.2,
    price: clientPrice(59.2),
    image: "/images/merch/mesa-vest.jpg",
    imageAlt: "Mesa Vest",
    colors: ["Black", "Dark Grey", "Loden Green", "Saddle", "True Navy"],
  },
  {
    id: "flexfit-performance-trucker-cap",
    name: "Flexfit Performance Trucker Cap",
    category: "Apparel",
    description:
      "A structured performance trucker cap in 30 color combinations — the most-requested item type we didn't have yet. Priced at 15 units.",
    espPrice: 26.1,
    price: clientPrice(26.1),
    image: "/images/merch/flexfit-performance-trucker-cap.jpg",
    imageAlt: "Flexfit Performance Trucker Cap",
    colors: [
      "Athletic Gold-Black-White", "Athletic Gold-Navy-White",
      "Black-Red-White", "Black-Royal-White", "Columbia-Navy-White",
      "Maroon-Black-White", "Navy-Red-White", "Orange-Black-White",
      "White-Navy-Red", "White-Royal-Red", "Black-White", "Dark Green-White",
      "Graphite-Black", "Graphite-White", "Navy-White", "Red-White",
      "Royal-White", "Black", "Navy", "White", "Kelly Green-White",
      "Purple-White", "Red", "Royal", "Vegas Gold-Navy-White",
      "Vegas Gold-Black-White", "Black-Graphite", "Maroon-Graphite",
      "White-Navy Blue-Navy Blue", "White-Black-Black",
    ],
  },
  {
    id: "owala-freesip-bottle-24oz",
    name: "24 oz Owala Freesip Insulated Bottle",
    category: "Drinkware",
    description:
      "Double-wall stainless steel bottle with a flip straw and handle, in 12 colors — one of the most-requested drinkware items on the market. Priced at 24-unit minimum.",
    espPrice: 39.99,
    price: clientPrice(39.99),
    image: "/images/merch/owala-freesip-24oz.jpg",
    imageAlt: "24 oz Owala Freesip Insulated Bottle",
    colors: [
      "Shy Marshmallow", "Very Very Dark", "Sugar High", "Coastal Mist",
      "Blue Oasis", "Calm Waters", "Rock On", "Green House", "Read My Lips",
      "Out Of The Blue", "Blue Steel", "Nailed It",
    ],
  },
  {
    id: "ceramic-mug-11oz",
    name: "11 oz. Traditional Ceramic Mug",
    category: "Drinkware",
    description:
      "Classic ceramic coffee mug in 15 colors — an easy, budget-friendly giveaway for offices and events. Priced at 72 units.",
    espPrice: 3.67,
    price: clientPrice(3.67),
    image: "/images/merch/ceramic-mug-11oz.jpg",
    imageAlt: "11 oz. Traditional Ceramic Mug",
    colors: [
      "Almond", "Black", "Brown", "Cobalt Blue", "Grey", "Lime Green",
      "Maroon", "Orange", "Pink", "Teal", "White", "Yellow", "Green",
      "Purple", "Red",
    ],
  },
  {
    id: "polar-30oz-tumbler",
    name: "Polar 30 oz. Stainless Steel Tumbler",
    category: "Drinkware",
    description:
      "Vacuum-insulated tumbler in 4 colors, built for all-day use in the field or at the office. Priced at 25 units.",
    espPrice: 14.2,
    price: clientPrice(14.2),
    image: "/images/merch/polar-30oz-tumbler.jpg",
    imageAlt: "Polar 30 oz. Stainless Steel Tumbler",
    colors: ["Silver", "Black", "White", "Navy Blue"],
  },
  {
    id: "insulated-travel-mug-16oz",
    name: "16 oz. Insulated Stainless Steel Travel Mug",
    category: "Drinkware",
    description:
      "Budget-friendly insulated travel mug in 9 colors — a dependable everyday giveaway. Priced at 100 units.",
    espPrice: 5.51,
    price: clientPrice(5.51),
    image: "/images/merch/insulated-travel-mug-16oz.jpg",
    imageAlt: "16 oz. Insulated Stainless Steel Travel Mug",
    colors: [
      "Black", "Blue", "Green", "Lime Green", "Orange", "Pink", "Purple",
      "Red", "Yellow",
    ],
  },
  {
    id: "cotton-canvas-tote-7oz",
    name: "7 oz. Cotton Canvas Tote Bag",
    category: "Bags",
    description:
      'A dependable 15" x 16" cotton canvas tote in 5 colors — our most popular tote on ESP by review volume. Priced at 100 units.',
    espPrice: 2.9,
    price: clientPrice(2.9),
    image: "/images/merch/cotton-canvas-tote-7oz.jpg",
    imageAlt: "7 oz. Cotton Canvas Tote Bag",
    colors: ["Natural", "Black", "Navy Blue", "Royal Blue", "Red"],
  },
  {
    id: "non-woven-recycled-tote",
    name: "Large Non-Woven Recycled Tote",
    category: "Bags",
    description:
      "Budget-friendly recycled tote in 13 colors — sized for handouts, literature, and event swag. Priced at 100 units.",
    espPrice: 2.15,
    price: clientPrice(2.15),
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
    description:
      'Roomier gusseted tote (10.5"w x 11.75"h with an 8" gusset) in 7 colors, for heavier hauls. Priced at 150 units.',
    espPrice: 5.12,
    price: clientPrice(5.12),
    image: "/images/merch/gusset-shopping-tote.jpg",
    imageAlt: "Gusseted Shopping Tote",
    colors: ["Black", "Lime", "Orange", "Purple", "Royal Blue", "Red", "Cream"],
  },
  {
    id: "fletcher-rpet-laptop-backpack",
    name: "Fletcher Recycled rPET Laptop Backpack",
    category: "Bags",
    description:
      "A polished recycled laptop backpack in 2 colors — a higher-end option for staff and leadership gifting. Priced at 12 units.",
    espPrice: 48.59,
    price: clientPrice(48.59),
    image: "/images/merch/fletcher-rpet-laptop-backpack.jpg",
    imageAlt: "Fletcher Recycled rPET Laptop Backpack",
    colors: ["Black Sand", "Navy Heather"],
  },
  {
    id: "non-woven-drawstring-backpack",
    name: "Non-Woven Drawstring Backpack",
    category: "Bags",
    description:
      "An inexpensive drawstring backpack in 10 colors — a lightweight option for field or event handouts. Priced at 150 units.",
    espPrice: 1.79,
    price: clientPrice(1.79),
    image: "/images/merch/non-woven-drawstring-backpack.jpg",
    imageAlt: "Non-Woven Drawstring Backpack",
    colors: [
      "Black", "Hunter Green", "Lime", "Orange", "Pink", "Purple",
      "Royal Blue", "White", "Yellow", "Red",
    ],
  },
  {
    id: "samsonite-weekender-duffel",
    name: "Samsonite Better Than Basic Weekender",
    category: "Bags",
    description:
      "A premium Samsonite weekender duffel in 2 colors — a higher-end gift for leadership, major donors, or top staff. Priced at 6 units.",
    espPrice: 165.5,
    price: clientPrice(165.5),
    image: "/images/merch/samsonite-weekender-duffel.jpg",
    imageAlt: "Samsonite Better Than Basic Weekender",
    colors: ["Black", "Limestone"],
  },
  {
    id: "wireless-charging-pad",
    name: "Wireless Phone Charging Pad",
    category: "Tech Accessories",
    description:
      "A best-selling wireless charging pad — practical desk swag that keeps your brand in daily view. Priced at 50 units.",
    espPrice: 18.27,
    price: clientPrice(18.27),
    image: "/images/merch/wireless-charging-pad.jpg",
    imageAlt: "Wireless Phone Charging Pad",
    colors: ["Red"],
  },
  {
    id: "neoprene-laptop-sleeve",
    name: "Slim Reversible Neoprene Laptop Sleeve",
    category: "Tech Accessories",
    description:
      "A budget-friendly 14\" reversible laptop sleeve in 6 colors — a practical, low-cost tech giveaway. Priced at 100 units.",
    espPrice: 3.917,
    price: clientPrice(3.917),
    image: "/images/merch/neoprene-laptop-sleeve.jpg",
    imageAlt: "Slim Reversible Neoprene Laptop Sleeve",
    colors: [
      "Bright Black", "Bright Blue", "Camouflage White", "Camouflage Yellow",
      "Metallic Pink", "Medium Gray",
    ],
  },
  {
    id: "magsafe-power-bank-10000mah",
    name: "10,000mAh MagSafe Power Bank",
    category: "Tech Accessories",
    description:
      "Wired and wireless MagSafe-compatible power bank in 4 colors — a high-value tech giveaway. Priced at 100 units.",
    espPrice: 22.13,
    price: clientPrice(22.13),
    image: "/images/merch/magsafe-power-bank.jpg",
    imageAlt: "10,000mAh MagSafe Power Bank",
    colors: ["Black", "White", "Blue", "Pink"],
  },
  {
    id: "micro-mag-bluetooth-speaker",
    name: "Micro Mag Magnetic Bluetooth Speaker",
    category: "Tech Accessories",
    description:
      "A compact magnetic Bluetooth speaker that clips to any metal surface — a distinctive, higher-end tech giveaway. Priced at 25 units.",
    espPrice: 20.13,
    price: clientPrice(20.13),
    image: "/images/merch/micro-mag-bluetooth-speaker.jpg",
    imageAlt: "Micro Mag Magnetic Bluetooth Speaker",
    colors: ["Black"],
  },
  {
    id: "classic-swivel-usb-drive",
    name: "Classic Swivel USB Flash Drive",
    category: "Tech Accessories",
    description:
      "A dependable swivel USB drive in 22 colors — a practical giveaway for onboarding kits and conferences. Priced at 50 units.",
    espPrice: 5.7,
    price: clientPrice(5.7),
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
    id: "the-decision-maker-padfolio",
    name: "The Decision Maker Leather Padfolio",
    category: "Office & Writing",
    description:
      "A leather-look padfolio in 3 colors, sized for briefings and client meetings — a polished everyday-carry piece. Priced at 12 units.",
    espPrice: 49.95,
    price: clientPrice(49.95),
    image: "/images/merch/the-decision-maker-padfolio.jpg",
    imageAlt: "The Decision Maker Leather Padfolio",
    colors: ["Black", "Brown", "Navy"],
  },
  {
    id: "textured-linen-notebook",
    name: "Textured Linen Notebook",
    category: "Office & Writing",
    description:
      "Linen-textured journal in 6 colors — a refined giveaway for donors and VIP contacts. Priced at 100 units.",
    espPrice: 6.99,
    price: clientPrice(6.99),
    image: "/images/merch/textured-linen-notebook.jpg",
    imageAlt: "Textured Linen Notebook",
    colors: ["Black", "Green", "Gray", "Blue", "Orange", "Pink"],
  },
  {
    id: "classic-hardcover-notebook",
    name: "Classic Hard Cover Notebook",
    category: "Office & Writing",
    description:
      "A dependable hardcover notebook for everyday note-taking and briefings. Priced at 50 units.",
    espPrice: 13.32,
    price: clientPrice(13.32),
    image: "/images/merch/classic-hardcover-notebook.jpg",
    imageAlt: "Classic Hard Cover Notebook",
    colors: ["Black"],
  },
  {
    id: "silkscreen-lanyard",
    name: '3/4" Silkscreen Breakaway Lanyard',
    category: "Event & Signage",
    description:
      "Breakaway safety lanyard in 9 colors — a staple for staff and volunteer credentials at events. Priced at 150 units.",
    espPrice: 1.75,
    price: clientPrice(1.75),
    image: "/images/merch/silkscreen-lanyard.jpg",
    imageAlt: "3/4-inch Silkscreen Breakaway Lanyard",
    colors: [
      "Black", "White", "Navy", "Yellow", "Red", "Green", "Royal", "Orange",
      "Lime",
    ],
  },
  {
    id: "retractable-banner-stand",
    name: '32" x 79" Retractable Banner Stand',
    category: "Event & Signage",
    description:
      "Full-size retractable banner stand for tables, entrances, and step-and-repeat setups. Priced per unit.",
    espPrice: 354.9,
    price: clientPrice(354.9),
    image: "/images/merch/retractable-banner-stand.jpg",
    imageAlt: "32 by 79 inch Retractable Banner Stand",
    colors: ["Custom (full-color print)"],
  },
];
