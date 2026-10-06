/**
 * ============================================================================
 * PRODUCT TYPES — "Polos", "Tumblers", "Pens"... inside each category
 * ============================================================================
 * Every live product belongs to exactly one type of its own category. The
 * storefront groups a category by type (in `order`, most commonly bought
 * first), then by brand block, so shoppers see like things together.
 *
 * Classification is deterministic and driven only by the product's public
 * name and description (no supplier, ESP or cost data):
 *
 *  1. The rules of the product's category are tried in listed order against
 *     the name's "head": the name up to the first " with ", " w/ " or " for "
 *     ("Bamboo Desk Organizer with Stylus Pen" is an organizer, not a pen).
 *  2. If no rule matched the head, the same rules are tried against the whole
 *     name.
 *  3. Only then are the rules' weak description patterns tried, in the same
 *     order.
 *  4. Anything left is "Other", always the last type.
 *
 * The first matching rule wins, so a more specific rule goes above a broader
 * one ("Youth" above "Polos", "Safety vest" above "Vests"). The same type may
 * appear in more than one rule. `order` is the display order and is separate
 * from rule precedence.
 *
 * Pure and framework-free; imports nothing from the product config.
 * ============================================================================
 */

import type { TypeSummary } from "@/lib/merchCatalog";

export type { TypeSummary };

export const OTHER_TYPE = "Other";

interface Rule {
  type: string;
  /** Tested against the product name (see above). */
  name?: RegExp;
  /** Weak fallback, tested against the description only when no name rule matched. */
  description?: RegExp;
  /** Test the whole name in the first pass, not just its head ("Tin with Popcorn" is popcorn). */
  full?: boolean;
}

interface Taxonomy {
  /** Display order, without "Other" (always last). */
  order: readonly string[];
  /** Match precedence. */
  rules: readonly Rule[];
}

const r = (type: string, name?: RegExp, description?: RegExp): Rule => ({
  type,
  name,
  description,
});
/** A rule that looks at the whole name even before the head-only pass. */
const rf = (type: string, name: RegExp): Rule => ({ type, name, full: true });

export const PRODUCT_TYPES: Record<string, Taxonomy> = {
  Apparel: {
    order: [
      "Polos",
      "T-Shirts",
      "Hoodies & Sweatshirts",
      "Quarter-Zips & Pullovers",
      "Jackets & Outerwear",
      "Vests",
      "Long Sleeve & Dress Shirts",
      "Workwear & Safety",
      "Youth",
      "Aprons",
      "Gloves, Scarves & Socks",
      "Bandanas & Cooling Gear",
    ],
    rules: [
      r("Workwear & Safety", /hi[- ]?vis|high[- ]vis|safety|reflective|\bansi\b/),
      r("Youth", /\byouth\b|\bkids?\b(?!')/),
      r("Aprons", /\bapron/),
      r("Gloves, Scarves & Socks", /\b(gloves?|scarf|scarves|socks?|mittens?|cold weather set)\b/),
      r("Bandanas & Cooling Gear", /bandana|gaiter|cooling towel|neck warmer/),
      r("Polos", /\bpolos?\b|\bsport shirt\b/),
      r("Vests", /\bvests?\b/),
      r("Jackets & Outerwear", /jacket|\bcoat\b|parka|poncho|slicker|raincoat/),
      r("Hoodies & Sweatshirts", /\bhood(ie|ies|ed|y)?\b|sweatshirt/),
      r(
        "Quarter-Zips & Pullovers",
        /quarter[- ]?zip|1\/4[- ]?zip|half[- ]?zip|pullover|fleece|midlayer|sweater/
      ),
      r(
        "Long Sleeve & Dress Shirts",
        /long[- ]sleeve|3\/4[- ]sleeve|henley|dress shirt|\bwoven\b|button[- ]?(up|down)|easy care shirt/
      ),
      r("T-Shirts", /\bt[- ]?shirts?\b|\btees?\b|\bjersey\b|\btank\b/),
    ],
  },

  Headwear: {
    order: ["Baseball Caps", "Trucker Caps", "Beanies", "Bucket & Brimmed Hats", "Visors"],
    rules: [
      r("Visors", /\bvisor/),
      r("Beanies", /beanie|knit cap|\bpom/),
      r(
        "Bucket & Brimmed Hats",
        /bucket|boonie|safari|cowboy|straw hat|sun hat|wide brim|lifeguard|foldable hat/
      ),
      r("Trucker Caps", /trucker|snapback|mesh back/),
      r("Baseball Caps", /\b(caps?|hats?)\b/),
    ],
  },

  Drinkware: {
    order: [
      "Tumblers",
      "Water Bottles",
      "Travel Mugs",
      "Coffee Mugs",
      "Can Coolers",
      "Wine & Glassware",
      "Stadium Cups",
    ],
    rules: [
      r("Stadium Cups", /stadium cup|party cup/),
      r(
        "Can Coolers",
        /cooler|coolie|can sleeve|can holder|beverage holder|kan-tastic|bottle grip/
      ),
      r("Wine & Glassware", /\bwine\b|stemless|beer mug|\bglass(es|ware)?\b/),
      r(
        "Coffee Mugs",
        /ceramic(?! lined)|\bc-handle\b|bistro|barista|campfire|stack-n-sip|two-tone/
      ),
      r(
        "Travel Mugs",
        /travel mug|tumbler mug|coffee cup|\bss mug|stainless.*\bmug|insulated.*\bmug|\bmug\b.*(straw|lid)|hydrapeak/
      ),
      r("Coffee Mugs", /\bmugs?\b/),
      r("Tumblers", /tumbler/),
      r("Water Bottles", /bottle|shaker|growler|owala/),
      r("Tumblers", undefined, /tumbler/),
      r("Water Bottles", undefined, /bottle/),
      r("Coffee Mugs", undefined, /\bmug\b/),
    ],
  },

  Bags: {
    order: [
      "Tote Bags",
      "Backpacks",
      "Drawstring Bags",
      "Duffels & Sports Bags",
      "Cooler & Lunch Bags",
      "Laptop Bags & Briefcases",
      "Fanny Packs & Belt Bags",
      "Tool & Utility Bags",
    ],
    rules: [
      r("Cooler & Lunch Bags", /cooler|lunch|chiller|bento|insulated/),
      r("Drawstring Bags", /drawstring|cinch/),
      r("Fanny Packs & Belt Bags", /fanny|belt bag|waist bag|sling bag|running belt/),
      r("Backpacks", /backpack|rucksack|\bpack\b/),
      r("Tool & Utility Bags", /\btool\b|utility/),
      r("Laptop Bags & Briefcases", /laptop|briefcase|messenger|document bag|computer/),
      r(
        "Duffels & Sports Bags",
        /duffel|duffle|weekender|overnight|sports? .*bag|soccer bag|gym bag|\btravel\b/
      ),
      r("Tote Bags", /\btotes?\b|shopper|shopping bag|euro/),
    ],
  },

  "Tech Accessories": {
    order: [
      "Power Banks",
      "Wireless Chargers",
      "Speakers",
      "Earbuds & Headphones",
      "Charging Cables & Hubs",
      "USB Flash Drives",
      "Phone Stands & Holders",
      "Mouse Pads",
      "Fans & Lanterns",
      "Laptop & Webcam Accessories",
    ],
    rules: [
      r("Power Banks", /power ?bank|powerstick|powerlink|power trip/),
      r("Earbuds & Headphones", /earbuds?|headphones?|airpods|\bbuds\b|\bbeats\b/),
      r("Speakers", /speaker|megaphone|loudspeaker/),
      r("USB Flash Drives", /flash drive|usb drive|card usb|\busb flash/),
      r(
        "Charging Cables & Hubs",
        /cable|\bhub\b|docking|adapter|car charger|cigarette lighter|usb dual port|power strip|surge|wall outlet|charging buddy|portable mobile phone charger/
      ),
      r(
        "Wireless Chargers",
        /wireless charg|charging pad|charging station|charger stand|\bqi\b|chargepad|multi-charger|magsafe.*charg/
      ),
      r("Mouse Pads", /mouse ?(pad|mat)|desk mat/),
      r("Laptop & Webcam Accessories", /laptop|webcam/),
      r("Phone Stands & Holders", /phone|\bcell\b|\bstand\b|\bgrip\b|wallet|\bmount\b|holder/),
      r("Fans & Lanterns", /\bfans?\b|lantern|lamp|light/),
    ],
  },

  "Office & Writing": {
    order: [
      "Pens",
      "Notebooks & Journals",
      "Padfolios & Binders",
      "Planners & Calendars",
      "Sticky Notes",
      "Desk Accessories",
      "Clipboards & Whiteboards",
      "Mouse Pads & Wrist Rests",
    ],
    rules: [
      r("Sticky Notes", /sticky|adhesive|reminder notes|post-it/),
      r(
        "Padfolios & Binders",
        /padfolio|portfolio|binder|folder|document (holder|sleeve)|page protector/
      ),
      r("Planners & Calendars", /planner|calendar/),
      r("Mouse Pads & Wrist Rests", /mouse ?(pad|mat)|wrist rest|desk mat/),
      r("Clipboards & Whiteboards", /clipboard|whiteboard|write-on|dry[- ]erase/),
      r(
        "Desk Accessories",
        /desk|organizer|stamp|ruler|card (case|holder)|charging|power bank|calculator/
      ),
      r("Pens", /\bpens?\b|ball-?point|stylus|highlighter|sharpie/),
      r("Notebooks & Journals", /note ?books?|journal|\bpad\b|notepad/),
    ],
    // weak fallback: the description says what it is when the name does not
  },

  "Event & Signage": {
    order: [
      "Banners & Displays",
      "Flags & Pennants",
      "Tents & Canopies",
      "Table Covers & Throws",
      "Yard & A-Frame Signs",
      "Inflatables & Megaphones",
    ],
    rules: [
      r("Tents & Canopies", /\btent\b|canopy|weight bag|sandbag|starter package/),
      r("Table Covers & Throws", /\btable (cover|throw|runner|banner)|tablecloth/),
      r("Flags & Pennants", /\bflags?\b|pennant|teardrop|sunblade|bunting/),
      r("Yard & A-Frame Signs", /yard sign|real estate|a-frame|spider stake|\bsign\b/),
      r("Inflatables & Megaphones", /inflatable|megaphone/),
      r(
        "Banners & Displays",
        /banner|backdrop|retractor|stanchion|donation box|trade show|display/
      ),
    ],
  },

  "Lanyards & Badges": {
    order: [
      "Name Badges",
      "Lanyard & Badge Combos",
      "Breakaway Lanyards",
      "Sublimated Lanyards",
      "Standard Lanyards",
    ],
    rules: [
      r("Name Badges", /name badge/),
      rf("Lanyard & Badge Combos", /combo|badge holder|badge reel/),
      rf("Breakaway Lanyards", /breakaway/),
      r("Sublimated Lanyards", /sublimat|full[- ]color/),
      r("Standard Lanyards", /lanyard/),
    ],
  },

  "Knives & Tools": {
    order: [
      "Pocket Knives",
      "Multi-Tools",
      "Flashlights & Lanterns",
      "Tape Measures & Levels",
      "Screwdrivers & Tool Sets",
      "Carabiners",
    ],
    rules: [
      r("Multi-Tools", /multi[- ]?tool|leatherman|handyman/),
      r(
        "Flashlights & Lanterns",
        /flashlight|torch|headlamp|keylight|maglite|neck light|work light|lantern/
      ),
      r("Pocket Knives", /knife|knives|opinel|kershaw|\bbuck\b|victorinox/),
      r(
        "Tape Measures & Levels",
        /tape measure|laser measure|\blevel\b|\bruler\b|speed square|measure/
      ),
      r(
        "Screwdrivers & Tool Sets",
        /screwdriver|driver set|tool set|tool kit|wrench|hammer|\btools\b|pliers/
      ),
      r("Carabiners", /carabiner/),
    ],
  },

  "Gifts & Entertaining": {
    order: [
      "Gift Sets & Kits",
      "Cutting Boards & Kitchen",
      "Candles & Coasters",
      "Keychains & Key Tags",
      "Bottle Openers",
      "Journals & Stationery",
      "Outdoor & Golf",
    ],
    rules: [
      r("Bottle Openers", /bottle opener|\bopener\b/),
      r("Keychains & Key Tags", /key ?chain|key tag|key holder/),
      r(
        "Cutting Boards & Kitchen",
        /cutting board|cheese board|charcuterie|serving|kitchen|bbq|grill/
      ),
      r("Candles & Coasters", /candle|coaster/),
      r("Gift Sets & Kits", /gift set|\bkit\b|\bset\b/),
      r("Journals & Stationery", /journal|notebook|stationery/),
      r("Outdoor & Golf", /picnic|blanket|rain gauge|divot|\bgolf\b/),
    ],
  },

  "Outdoor & Sports": {
    order: [
      "Umbrellas",
      "Golf Gear",
      "Coolers & Cooler Bags",
      "Camping & Picnic Gear",
      "Blankets & Throws",
      "Sunglasses",
      "Towels & Sun Care",
      "Rainwear",
      "Hand Warmers & Fans",
      "Sports & Games",
      "Water Bottles",
    ],
    rules: [
      r(OTHER_TYPE, /pleated full fan|bunting|flagpole/),
      r("Umbrellas", /umbrella/),
      r("Golf Gear", /\bgolf\b|titleist|pro v1|twin golf/),
      r("Rainwear", /raincoat|parka|poncho|rain jacket/),
      r("Coolers & Cooler Bags", /cooler|chiller|lunch bag/),
      r(
        "Camping & Picnic Gear",
        /camping|picnic|\bchair\b|\bstool\b|folding table|beach table|seat cushion|\bbbq\b/
      ),
      r("Blankets & Throws", /blanket|\bthrow\b/),
      r("Sunglasses", /sunglasses/),
      r("Hand Warmers & Fans", /hand warmer|\bfans?\b/),
      r("Sports & Games", /pickleball|flyer|flying|\bdisc\b/),
      r("Towels & Sun Care", /towel|sunscreen|insect|\bspf\b|sun hat|lifeguard hat/),
      r("Water Bottles", /bottle/),
    ],
  },

  "Health & Wellness": {
    order: [
      "First Aid Kits",
      "Hand Sanitizer",
      "Lip Balm",
      "Sunscreen",
      "Cooling & Hot/Cold Packs",
      "Yoga & Fitness",
      "Sleep & Relaxation",
      "Skin Care & Spa",
      "Water Bottles & Pill Boxes",
    ],
    rules: [
      r("Hand Sanitizer", /sanitizer/),
      r("First Aid Kits", /first aid|bandage|medical kit/),
      r("Lip Balm", /lip (balm|moisturizer)/),
      r("Sunscreen", /sunscreen|sunstick|\bspf\b/),
      r("Cooling & Hot/Cold Packs", /cooling|gel pack|ice pack|hot\/cold/),
      r("Yoga & Fitness", /yoga|exercise|massage|roller/),
      r("Skin Care & Spa", /lotion|skincare|\bspa\b/),
      r("Sleep & Relaxation", /sleep|eye mask|earplug|relax/),
      r("Water Bottles & Pill Boxes", /bottle|pill box|med minder/),
    ],
  },

  "Home & Decor": {
    order: [
      "Doormats",
      "Logo & Floor Mats",
      "Rugs & Carpets",
      "Blankets & Pillows",
      "Candles & Coasters",
      "Clocks & Lamps",
      "Baskets, Trays & Frames",
    ],
    rules: [
      r("Rugs & Carpets", /\brugs?\b/),
      r("Doormats", /door ?mats?|\bcoir\b|welcome|entrance/),
      r("Logo & Floor Mats", /\bmats?\b|floor impressions|waterhog|runner/),
      r("Rugs & Carpets", /carpet|flooring/),
      r("Blankets & Pillows", /blanket|pillow|cushion|\bthrow\b(?! \()/),
      r("Candles & Coasters", /candle|coaster/),
      r("Clocks & Lamps", /clock|lamp|\blight\b/),
      r("Baskets, Trays & Frames", /basket|tray|frame/),
    ],
  },

  "Food & Treats": {
    order: [
      "Mints & Tins",
      "Candy & Chocolate",
      "Popcorn",
      "Cookies & Baked Goods",
      "Snacks & Sauces",
      "Coffee",
      "Gift Sets & Boards",
    ],
    rules: [
      rf("Popcorn", /popcorn|popclusions|popper|pop'?n/),
      rf("Cookies & Baked Goods", /cookie/),
      r("Coffee", /coffee|\bbrew\b/),
      r("Mints & Tins", /\bmints?\b|micromint|\btins?\b/),
      r(
        "Candy & Chocolate",
        /candy|chocolate|m&m|hershey|snickers|payday|mike and ike|wrapper bars|mini tube/
      ),
      r("Snacks & Sauces", /snack|peanut|sauce|\bjar\b/),
      r("Gift Sets & Boards", /gift|\bkit\b|charcuterie|\btub\b|tray/),
    ],
  },

  Automotive: {
    order: [
      "Sun Shades",
      "License Plate Frames",
      "Car Magnets",
      "Bumper Stickers",
      "Ice Scrapers & Snow Brushes",
      "Air Fresheners",
      "Floor Mats & Covers",
      "Phone Holders",
      "Emergency & Roadside",
      "Organizers & Accessories",
    ],
    rules: [
      r(
        "Emergency & Roadside",
        /jump starter|tire pressure|pressure gauge|first aid|survival|disaster|escape|rescue|air pump|dry ?bag/
      ),
      r("Sun Shades", /sun ?shade|window shade|windshield/),
      r("License Plate Frames", /license plate/),
      r("Bumper Stickers", /bumper sticker/),
      r("Phone Holders", /phone holder/),
      r("Car Magnets", /magnet/),
      r("Ice Scrapers & Snow Brushes", /ice scraper|snow/),
      r("Air Fresheners", /air freshener/),
      r("Floor Mats & Covers", /floor mat|tire cover|wheel cover|steering wheel cover/),
      r(
        "Organizers & Accessories",
        /organizer|trash can|coaster|key ?chain|key finder|tracker|vent|storage/
      ),
    ],
  },

  "Seasonal & Holiday": {
    order: [
      "Ornaments",
      "Christmas & Holiday Decor",
      "Halloween",
      "Flags & Patriotic",
      "Cards & Calendars",
      "Blankets",
    ],
    rules: [
      r("Halloween", /halloween|pumpkin/),
      r("Ornaments", /ornament/),
      r("Cards & Calendars", /\bcards?\b|calendar/),
      r("Blankets", /blanket/),
      r("Flags & Patriotic", /\bflags?\b|\busa\b|patriotic|veterans|july 4th|250th|\bus \d/),
      r("Christmas & Holiday Decor", /christmas|holiday|\btree\b|stocking|santa/),
    ],
  },

  "Kids & Toys": {
    order: [
      "Coloring & Activity Books",
      "Crayons & Chalk",
      "Balloons & Bubbles",
      "Stress Relievers & Fidgets",
      "Flying Discs",
      "Plush Toys",
      "Stickers & Tattoos",
      "Puzzles & Toys",
    ],
    rules: [
      r("Coloring & Activity Books", /coloring|activity book|word search|\bbooks?\b/),
      r("Stress Relievers & Fidgets", /stress|fidget|putty/),
      r("Crayons & Chalk", /crayon|chalk|colored pencil/),
      r("Balloons & Bubbles", /balloon|bubble/),
      r("Flying Discs", /flying disc|\bflyer\b|\bdisk\b/),
      r("Plush Toys", /\b(bear|dog|moose|plush|stuffed)\b/),
      r("Stickers & Tattoos", /tattoo|sticker/),
      r("Puzzles & Toys", /puzzle|playing cards|yo-?yo|\btoy\b|jump rope|spring thing|bracelet/),
    ],
  },

  "Awards & Recognition": {
    order: [
      "Plaques",
      "Glass & Acrylic Awards",
      "Trophies",
      "Medals & Ribbons",
      "Challenge Coins",
      "Lapel Pins & Buttons",
      "Certificate Holders",
    ],
    rules: [
      r("Challenge Coins", /challenge coin/),
      r("Medals & Ribbons", /medal|medallion|ribbon|rosette/),
      r("Plaques", /plaque|name plate/),
      r("Certificate Holders", /certificate/),
      r("Lapel Pins & Buttons", /\bpins?\b|button/),
      r("Trophies", /trophy/),
      r("Glass & Acrylic Awards", /award|glass|crystal|acrylic/),
    ],
  },

  "Print & Collateral": {
    order: [
      "Magnets",
      "Stickers & Labels",
      "Door Hangers",
      "Business Cards & Holders",
      "Folders & Envelopes",
      "Sticky Notes & Pads",
      "Calendars",
      "Postcards & Mailers",
      "Buttons",
      "Organizers & Luggage Tags",
    ],
    rules: [
      r(OTHER_TYPE, /bookmark|playing cards/),
      r("Door Hangers", /door hanger/),
      r("Sticky Notes & Pads", /sticky|add-a-pad|jotter/),
      r("Calendars", /calendar/),
      r("Magnets", /magnet/),
      r("Stickers & Labels", /sticker|label|window cling|decal/),
      r("Buttons", /\bbuttons?\b/),
      r("Business Cards & Holders", /business card|card holder|nfc|plastic card|memo case/),
      r("Folders & Envelopes", /folder|envelope/),
      r("Postcards & Mailers", /postcard|pamphlet|table tent|brochure/),
      r("Organizers & Luggage Tags", /luggage tag|trunk organizer/),
    ],
  },

  "Promo Giveaways": {
    order: [
      "Buttons",
      "Hand Fans",
      "Stress Balls & Relievers",
      "Wristbands",
      "Noisemakers & Spirit Gear",
    ],
    rules: [
      r("Buttons", /button|badge/),
      r("Stress Balls & Relievers", /stress|push pop|pop ball|fidget/),
      r("Hand Fans", /\bfans?\b/),
      r("Wristbands", /wristband|\bbands?\b|bracelet/),
      r("Noisemakers & Spirit Gear", /clapper|noise ?maker|banger|foam finger/),
    ],
  },
};

/** Cleans a name for matching: lower case, no trademark marks, straight quotes. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[®™©]/g, "").replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
}

/** The name up to the first "with", "w/", "for" or "including": what the product is, not what it comes with. */
const HEAD_END = /\s+(?:with|w\/|for|featuring|includes|including)\s*/;

function headOf(name: string): string {
  const cut = name.search(HEAD_END);
  return cut > 0 ? name.slice(0, cut) : name;
}

/**
 * Big single-piece items ("sell one and done") sit in their own last group so the page leads with
 * products that campaigns actually buy in volume. Clothing is exempt: a $150 vest is normal there.
 */
export const BIG_TICKET_TYPE = "Large & Custom Orders";
export const BIG_TICKET_MIN_PRICE = 100;
export const BIG_TICKET_MAX_FIRST_QUANTITY = 10;
/** Also big-ticket: the first tier asks for this much money up front (quantity x price). */
export const BIG_MINIMUM_ORDER_VALUE = 1500;
/** Also big-ticket: one to three pieces at this price or more each. */
export const SINGLE_PIECE_MIN_PRICE = 50;
export const SINGLE_PIECE_MAX_QUANTITY = 3;
const BIG_TICKET_EXEMPT_CATEGORIES = new Set(["Apparel", "Headwear"]);

/** True for a non-clothing product sold in single high-price pieces or with a large minimum order (see the thresholds above). */
export function isBigTicket(product: {
  category: string;
  priceTiers?: readonly { quantity: number; price: number }[];
}): boolean {
  if (BIG_TICKET_EXEMPT_CATEGORIES.has(product.category)) return false;
  const tiers = product.priceTiers;
  if (!tiers || tiers.length === 0) return false;
  const first = tiers.reduce((a, b) => (b.quantity < a.quantity ? b : a));
  return (
    (first.price >= BIG_TICKET_MIN_PRICE && first.quantity <= BIG_TICKET_MAX_FIRST_QUANTITY) ||
    (first.price >= SINGLE_PIECE_MIN_PRICE && first.quantity <= SINGLE_PIECE_MAX_QUANTITY) ||
    first.price * first.quantity >= BIG_MINIMUM_ORDER_VALUE
  );
}

/** Display order of a category's types, then big-ticket items, "Other" last; empty for an unknown category. */
export function typesForCategory(category: string): string[] {
  const taxonomy = PRODUCT_TYPES[category];
  if (!taxonomy) return [];
  return BIG_TICKET_EXEMPT_CATEGORIES.has(category)
    ? [...taxonomy.order, OTHER_TYPE]
    : [...taxonomy.order, BIG_TICKET_TYPE, OTHER_TYPE];
}

/**
 * The type of a product within its own category. Never throws: an unknown
 * category, or a product no rule recognises, is "Other".
 */
export function classifyProduct(product: {
  name: string;
  category: string;
  description?: string;
}): string {
  const taxonomy = PRODUCT_TYPES[product.category];
  if (!taxonomy) return OTHER_TYPE;
  const name = normalize(product.name);
  const head = headOf(name);
  const byName = (text: string) => taxonomy.rules.find((rule) => rule.name?.test(text))?.type;
  // first pass: each rule looks at the head, or at the whole name when it says so
  const byHead = () =>
    taxonomy.rules.find((rule) => rule.name?.test(rule.full ? name : head))?.type;
  const found =
    byHead() ??
    (head === name ? undefined : byName(name)) ??
    (product.description
      ? taxonomy.rules.find((rule) => rule.description?.test(normalize(product.description!)))?.type
      : undefined);
  return found ?? OTHER_TYPE;
}

const cache = new WeakMap<object, string>();

/** classifyProduct, remembered per product object (the catalog classifies it several times per build). */
export function productTypeOf(product: {
  name: string;
  category: string;
  description?: string;
  priceTiers?: readonly { quantity: number; price: number }[];
}): string {
  let type = cache.get(product);
  if (type === undefined) {
    type = isBigTicket(product) ? BIG_TICKET_TYPE : classifyProduct(product);
    cache.set(product, type);
  }
  return type;
}

// ---------------------------------------------------------------------------
// Ordering: type, then brand block, then the product
// ---------------------------------------------------------------------------

/** The label of the unbranded block, always last in its type. */
export const ESSENTIALS_BRAND = "Essentials";

export interface OrderableProduct {
  type: string;
  brand: string;
  /** True when at least one color has its own photo. */
  hasColorPhotos: boolean;
  /** Lowest-quantity tier's customer price. */
  price: number;
  name: string;
}

const byName = (a: string, b: string) =>
  a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });

/**
 * Orders one category's products the way a catalog merchandises them:
 *   1. type, in the taxonomy's display order;
 *   2. inside a type, one block per brand: the brand with the most products
 *      in the type first (ties A to Z), "Essentials" always the last block;
 *   3. inside a block: products with per-color photos first, then the lowest
 *      starting price, then name A to Z.
 * Stable and deterministic; returns a new array.
 */
export function orderByTypeAndBrand<T extends OrderableProduct>(
  items: readonly T[],
  category: string
): T[] {
  const typeRank = new Map(typesForCategory(category).map((label, index) => [label, index]));
  const blockSize = new Map<string, number>();
  const key = (p: OrderableProduct) => `${p.type}\u001f${p.brand}`;
  for (const item of items) blockSize.set(key(item), (blockSize.get(key(item)) ?? 0) + 1);

  return [...items].sort((a, b) => {
    const typeDelta = (typeRank.get(a.type) ?? 999) - (typeRank.get(b.type) ?? 999);
    if (typeDelta !== 0) return typeDelta;
    if (a.brand !== b.brand) {
      const aLast = a.brand === ESSENTIALS_BRAND;
      const bLast = b.brand === ESSENTIALS_BRAND;
      if (aLast !== bLast) return aLast ? 1 : -1;
      const sizeDelta = blockSize.get(key(b))! - blockSize.get(key(a))!;
      return sizeDelta || byName(a.brand, b.brand);
    }
    if (a.hasColorPhotos !== b.hasColorPhotos) return a.hasColorPhotos ? -1 : 1;
    return a.price - b.price || byName(a.name, b.name);
  });
}

/** Type and brand-block counts of an already ordered list, in the list's order. */
export function summarizeTypes(
  items: readonly { type?: string; brand: string }[],
  category: string
): TypeSummary[] {
  const counts = new Map<string, { count: number; brands: Set<string> }>();
  for (const item of items) {
    const type = item.type ?? OTHER_TYPE;
    const entry = counts.get(type) ?? { count: 0, brands: new Set<string>() };
    entry.count += 1;
    entry.brands.add(item.brand);
    counts.set(type, entry);
  }
  return typesForCategory(category)
    .filter((label) => counts.has(label))
    .map((label) => ({
      label,
      count: counts.get(label)!.count,
      blocks: counts.get(label)!.brands.size,
    }));
}
