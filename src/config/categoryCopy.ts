/**
 * Landing-page copy for each merchandise category: an intro, a data-driven
 * "Good to know" list, a title, a meta description and three FAQ items.
 *
 * Rules for everything written here:
 *  - No numbers are typed into prose. Counts, prices and quantities come from
 *    computeCategoryFacts(), which reads the live products of the category.
 *  - FAQ answers only describe how the store works today, in the owner's
 *    order: the client sends a request from the cart (optionally attaching
 *    their logo there, or replying to the confirmation email with it), we put
 *    the logo on the items, we finalize the quote with shipping, setup and
 *    other costs and send it with a Square payment link, and we place the order
 *    once the client has paid. Nothing is charged before that. Turnaround,
 *    shipping cost, mockups, proofs, guarantees and returns are not defined
 *    anywhere, so they are never promised here.
 *
 * This file is customer-safe: it works from the slim CatalogProduct model
 * (customer prices) and never touches supplier data.
 */

import { isRealBrand, type CatalogProduct } from "@/lib/merchCatalog";

export interface CategoryFaq {
  question: string;
  answer: string;
}

/** Which data-driven fact the third "Good to know" bullet should lead with. */
export type HighlightKind = "usa" | "colors" | "brands";

export interface CategoryCopy {
  /** Page title without the site name; the page appends " | Magnolia Grove Consultants". */
  title: string;
  /** Meta description, 155 characters or fewer. */
  description: string;
  /** Two or three sentences for buyers, with no figures in them. */
  intro: string;
  /** Order in which the third bullet tries facts; the first one with a non-zero count wins. */
  highlights: readonly HighlightKind[];
  faqs: readonly [CategoryFaq, CategoryFaq, CategoryFaq];
}

// ---------------------------------------------------------------------------
// Shared statements, each one matching how the order flow actually works.
// ---------------------------------------------------------------------------

const NO_CHARGE =
  "Sending a request does not charge you; nothing is charged until you approve the quote and pay.";
const QUOTE_STEP =
  "We place your logo on your items and send you a final quote with shipping, setup and any other costs.";
const PAY_STEP =
  "The quote comes with a secure Square link to pay, and we place the order after payment clears.";
const LOGO_FILES =
  "Attach your logo to your request on the cart page, or reply to the confirmation email with it (vector PDF, AI, EPS or PNG).";
const PREVIEW =
  "To see a rough preview first, upload your logo on the main merchandise page; previews appear on product photos where one is available.";
const TIERS =
  "Each product lists its own minimum order and a per-unit price at each quantity tier it offers.";
const BELOW_MINIMUM =
  "If a quantity is below a product's minimum, the request page asks you to raise it before you send.";
const NOT_LISTED =
  "If you do not see the item you need, use the request form on the main merchandise page: describe the product, quantity, budget and deadline, and we source it and send back a quote.";
const IMPRINT_NOTES =
  "Each line in your request has an optional Imprint notes box for where the logo goes and the ink color.";
const SIZE_NOTE =
  "Some products are priced for a standard size, and the product page says so; other sizes are quoted on request.";
const COLOR_RULE =
  "Each product lists the colors it comes in, and a product's unit price follows its quantity tier across all of its colors.";
const CHECK_START =
  "Starting quantities differ from item to item, so check the product before you add it.";

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

export const categoryCopy: Record<string, CategoryCopy> = {
  Apparel: {
    title: "Custom Apparel for Campaigns and Teams",
    description:
      "Branded polos, quarter-zips, fleece, jackets, vests and shirts for campaign staff, volunteers and offices. Preview your logo, then request a quote.",
    intro:
      "Apparel is how a team gets recognized: polos, quarter-zip pullovers, fleece, jackets, vests, hoodies and shirts for staff, volunteers and candidates. Campaigns outfit canvassers and event crews with it, offices wear it at community events, and nonprofits use it for volunteer days. Styles and brands vary by product, and each product page lists its own colors and quantity tiers.",
    highlights: ["colors", "usa", "brands"],
    faqs: [
      {
        question: "Can I order several sizes and colors together?",
        answer: `Yes. Apparel lines in your request have a Sizes and quantities box, where you can list how many of each size you need, for example 24 M, 60 L. ${COLOR_RULE}`,
      },
      {
        question: "How do I get my logo onto a shirt?",
        answer: `${LOGO_FILES} ${IMPRINT_NOTES} ${QUOTE_STEP}`,
      },
      {
        question: "When do I pay for an apparel order?",
        answer: `${NO_CHARGE} ${PAY_STEP}`,
      },
    ],
  },

  Headwear: {
    title: "Custom Caps, Hats and Beanies",
    description:
      "Branded caps, trucker hats, beanies, visors and bucket hats for canvassers, volunteers and event crews. Preview your logo and request a quote.",
    intro:
      "Headwear covers baseball caps, trucker hats, beanies, visors and brimmed hats that volunteers can wear for long hours outdoors. It suits canvassing in warm weather, outdoor rallies, cleanup days and cold-weather events. Each product lists its own colors and quantity tiers.",
    highlights: ["colors", "usa", "brands"],
    faqs: [
      {
        question: "Can I mix colors in one order?",
        answer: `Yes, you can add more than one color of a product to your request. ${COLOR_RULE}`,
      },
      {
        question: "What file should I send for a cap or hat?",
        answer: `${LOGO_FILES} ${IMPRINT_NOTES} ${QUOTE_STEP}`,
      },
      {
        question: "Is anything charged when I send my headwear request?",
        answer: `${NO_CHARGE} We place your logo on your items and email a final quote. ${PAY_STEP}`,
      },
    ],
  },

  Drinkware: {
    title: "Custom Tumblers, Bottles and Mugs",
    description:
      "Branded stainless tumblers, water bottles, travel mugs and ceramic mugs for volunteers, staff and donors. Preview your logo and request a quote.",
    intro:
      "Drinkware includes insulated tumblers, water bottles, travel mugs, ceramic mugs, stadium cups and can coolers. It gets used at outdoor rallies, volunteer days, town halls and office kitchens, and it is a common thank-you for staff and donors. Materials, sizes and colors differ by product.",
    highlights: ["usa", "colors", "brands"],
    faqs: [
      {
        question: "Do prices drop when I order more?",
        answer: `On products that list more than one quantity tier, the per-unit price at the higher tiers is lower. ${TIERS} The final price is confirmed in your quote.`,
      },
      {
        question: "Where does my logo go on a tumbler or bottle?",
        answer: `${LOGO_FILES} ${IMPRINT_NOTES} ${PREVIEW}`,
      },
      {
        question: "How does ordering drinkware work?",
        answer: `Add products to your request and send it. ${NO_CHARGE} ${QUOTE_STEP} ${PAY_STEP}`,
      },
    ],
  },

  Bags: {
    title: "Custom Tote Bags and Backpacks",
    description:
      "Branded totes, backpacks, drawstring bags, coolers and duffels for volunteers, staff and events. Preview your logo and request a quote.",
    intro:
      "Bags range from cotton and non-woven totes to drawstring packs, backpacks, coolers, duffels and laptop bags. Campaigns hand them out at volunteer check-in and town halls, and offices and nonprofits use them to carry literature and supplies. Colors and materials vary by product.",
    highlights: ["colors", "brands", "usa"],
    faqs: [
      {
        question: "Can I choose the color of a bag?",
        answer: `Yes. ${COLOR_RULE} Choose the color when you add the product to your request.`,
      },
      {
        question: "What is the minimum order for a bag?",
        answer: `${TIERS} ${BELOW_MINIMUM}`,
      },
      {
        question: "How do I send my logo for a tote or backpack?",
        answer: `${LOGO_FILES} ${QUOTE_STEP}`,
      },
    ],
  },

  "Tech Accessories": {
    title: "Custom Power Banks, Speakers and Tech",
    description:
      "Branded power banks, wireless chargers, speakers, cables, flash drives and phone accessories for staff and volunteers. Request a quote.",
    intro:
      "Tech accessories include power banks, wireless chargers, Bluetooth speakers, cables, USB drives, phone stands and laptop sleeves. Field staff and volunteers use them on long days of canvassing, and offices give them to new hires, event speakers and partners. Specifications are listed on each product page.",
    highlights: ["usa", "colors", "brands"],
    faqs: [
      {
        question: "Is there a minimum quantity for tech items?",
        answer: `${TIERS} ${BELOW_MINIMUM}`,
      },
      {
        question: "Can my logo go on a power bank or speaker?",
        answer: `${LOGO_FILES} ${IMPRINT_NOTES} ${QUOTE_STEP}`,
      },
      {
        question: "What does the price on a product page include?",
        answer: `It is a per-unit price at the quantity shown. It does not yet include setup, shipping or other costs; those are in your final quote. ${PAY_STEP}`,
      },
    ],
  },

  "Office & Writing": {
    title: "Custom Pens, Notebooks and Office Items",
    description:
      "Branded pens, notebooks, journals, padfolios, sticky notes and desk items for offices, campaigns and nonprofits. Preview your logo and request a quote.",
    intro:
      "Office and writing items include pens, notebooks, journals, padfolios, sticky notes, clipboards and desk organizers. They are handed out at sign-in tables, town halls and public meetings, and used day to day in campaign and government offices. Each product lists its own quantity tiers.",
    highlights: ["usa", "colors", "brands"],
    faqs: [
      {
        question: "Can I order several different items in one request?",
        answer: `Yes. You can add more than one product to the same request, and each product is priced at its own quantity tier. ${TIERS}`,
      },
      {
        question: "Which logo files work for pens and notebooks?",
        answer: `${LOGO_FILES} ${QUOTE_STEP}`,
      },
      {
        question: "How is payment handled?",
        answer: `${NO_CHARGE} ${PAY_STEP}`,
      },
    ],
  },

  "Event & Signage": {
    title: "Custom Yard Signs, Banners and Flags",
    description:
      "Branded yard signs, banner stands, flags, table covers and canopies for rallies, canvassing launches and town halls. Request a quote.",
    intro:
      "Event and signage products include yard signs, retractable banners, flags, table covers, canopies and tents. They are used to mark a rally, a canvassing launch, a town hall or a booth at a festival. Sizes and set contents vary a great deal, so check each product page.",
    highlights: ["usa", "colors", "brands"],
    faqs: [
      {
        question: "Are signs priced by size?",
        answer: `${SIZE_NOTE} ${TIERS}`,
      },
      {
        question: "What artwork should I send for signs and banners?",
        answer: `${LOGO_FILES} ${QUOTE_STEP}`,
      },
      {
        question: "Can I request a sign or display that is not listed?",
        answer: NOT_LISTED,
      },
    ],
  },

  "Knives & Tools": {
    title: "Custom Pocket Knives, Flashlights and Tools",
    description:
      "Branded pocket knives, multi-tools, flashlights, tape measures and keychain lights for staff and volunteers. Preview your logo and request a quote.",
    intro:
      "Knives and tools include pocket knives, multi-tools, flashlights, keychain lights, tape measures and utility kits. They are practical gifts for staff and volunteers, and useful for crews doing field and cleanup work. Each product page lists its own details and quantity tiers.",
    highlights: ["brands", "usa", "colors"],
    faqs: [
      {
        question: "How do I find the price for the quantity I need?",
        answer: `${TIERS} The final price is in your quote, once shipping, setup and any other costs are known.`,
      },
      {
        question: "How is a logo added to a knife or flashlight?",
        answer: `${LOGO_FILES} ${IMPRINT_NOTES} ${QUOTE_STEP}`,
      },
      {
        question: "What happens after I send my request?",
        answer: `${NO_CHARGE} We place your logo on your items and finalize the quote. ${PAY_STEP}`,
      },
    ],
  },

  "Gifts & Entertaining": {
    title: "Custom Gifts for Staff and Donors",
    description:
      "Branded cutting boards, candles, bottle openers, journals and gift sets for staff, donors and partners. Preview your logo and request a quote.",
    intro:
      "Gifts and entertaining items include bamboo boards, candles, bottle openers, journals, coasters, kitchen sets and travel kits. Offices and nonprofits give them to donors, board members and retiring staff, and campaigns use them to thank volunteers and hosts. Each product page lists its own quantity tiers.",
    highlights: ["brands", "usa", "colors"],
    faqs: [
      {
        question: "Can I order a gift item in a small quantity?",
        answer: `${TIERS} Check the minimum on the product you want before you add it to your request.`,
      },
      {
        question: "Can my logo or a message go on a gift?",
        answer: `${LOGO_FILES} ${IMPRINT_NOTES} Use the notes field on your request for anything else we should know.`,
      },
      {
        question: "Can I ask for a gift that is not listed?",
        answer: NOT_LISTED,
      },
    ],
  },

  "Outdoor & Sports": {
    title: "Custom Umbrellas, Coolers and Outdoor Gear",
    description:
      "Branded umbrellas, coolers, folding chairs, blankets, towels and sports items for outdoor rallies and volunteer days. Request a quote.",
    intro:
      "Outdoor and sports products include umbrellas, coolers, folding chairs, blankets, towels, sunglasses and golf and pickleball items. They fit outdoor rallies, fundraiser golf days, festival booths and volunteer events held in the open. Each product page lists its own quantity tiers.",
    highlights: ["usa", "colors", "brands"],
    faqs: [
      {
        question: "Can I get the same item in more than one color?",
        answer: `Where a product lists several colors, you can add more than one to your request. ${COLOR_RULE}`,
      },
      {
        question: "How do I send my logo for outdoor gear?",
        answer: `${LOGO_FILES} ${PREVIEW}`,
      },
      {
        question: "How and when do I pay?",
        answer: `${NO_CHARGE} ${QUOTE_STEP} ${PAY_STEP}`,
      },
    ],
  },

  "Health & Wellness": {
    title: "Custom First Aid Kits and Wellness Items",
    description:
      "Branded first aid kits, hand sanitizer, lip balm, sunscreen and wellness items for volunteers, staff and events. Request a quote.",
    intro:
      "Health and wellness products include first aid kits, hand sanitizer, lip balm, sunscreen, cooling towels and yoga mats. Campaigns and nonprofits hand them out at outdoor events, health fairs and volunteer shifts, and offices stock them for staff. Each product page lists its own details and quantity tiers.",
    highlights: ["usa", "colors", "brands"],
    faqs: [
      {
        question: "What are the minimum orders for these items?",
        answer: `${TIERS} ${CHECK_START}`,
      },
      {
        question: "Can a logo be added to a first aid kit or tube?",
        answer: `${LOGO_FILES} ${IMPRINT_NOTES} ${QUOTE_STEP}`,
      },
      {
        question: "How does the quote and payment process work?",
        answer: `${NO_CHARGE} ${PAY_STEP}`,
      },
    ],
  },

  "Home & Decor": {
    title: "Custom Floor Mats, Rugs and Home Decor",
    description:
      "Branded floor mats, rugs, event carpet, throw blankets, clocks and decor for offices, lobbies and events. Preview your logo and request a quote.",
    intro:
      "Home and decor products include logo floor mats and rugs, event carpet, throw blankets, clocks and framed or wall items. Offices and campaign headquarters use mats at entrances, and event teams use flooring to set up a booth or stage. Sizes differ by product, so check each product page.",
    highlights: ["colors", "usa", "brands"],
    faqs: [
      {
        question: "Are mats and rugs priced by size?",
        answer: `${SIZE_NOTE} ${TIERS}`,
      },
      {
        question: "What file should I send for a logo mat?",
        answer: `${LOGO_FILES} ${QUOTE_STEP}`,
      },
      {
        question: "How do I pay for a mat or rug order?",
        answer: `${NO_CHARGE} ${PAY_STEP}`,
      },
    ],
  },

  "Food & Treats": {
    title: "Custom Mints, Popcorn Tins and Snack Gifts",
    description:
      "Branded mint tins, popcorn, cookies, chocolate and snack gifts for volunteer thank-yous, events and offices. Preview your logo and request a quote.",
    intro:
      "Food and treats include mint tins, popcorn, cookies, chocolate, coffee and snack gift sets. They are handed out at events and volunteer shifts, set out at office front desks and sent as thank-yous to donors and hosts. Each product page lists its own description and quantity tiers.",
    highlights: ["usa", "brands", "colors"],
    faqs: [
      {
        question: "What is the minimum quantity for treats?",
        answer: `${TIERS} ${CHECK_START}`,
      },
      {
        question: "Can my logo go on a tin or a package?",
        answer: `${LOGO_FILES} ${IMPRINT_NOTES} ${QUOTE_STEP}`,
      },
      {
        question: "How does the order process work?",
        answer: `Add items to your request and send it. ${NO_CHARGE} ${PAY_STEP}`,
      },
    ],
  },

  Automotive: {
    title: "Custom Bumper Stickers and Car Accessories",
    description:
      "Branded bumper stickers, car magnets, license plate frames, sun shades and windshield tools for campaigns and offices. Request a quote.",
    intro:
      "Automotive products include bumper stickers, car magnets, license plate frames, sun shades, ice scrapers and floor mats. Campaigns use stickers and magnets to put a name on vehicles around town, and offices give practical items like scrapers and sun shades to staff. Each product page lists its own quantity tiers.",
    highlights: ["usa", "colors", "brands"],
    faqs: [
      {
        question: "Are bumper stickers priced per piece?",
        answer: `${TIERS} The price on each page is a per-unit price at the quantity shown, before setup, decoration, shipping and tax.`,
      },
      {
        question: "What artwork do I send for a sticker or magnet?",
        answer: `${LOGO_FILES} ${QUOTE_STEP}`,
      },
      {
        question: "Can I request a car item that is not listed?",
        answer: NOT_LISTED,
      },
    ],
  },

  "Seasonal & Holiday": {
    title: "Custom Holiday and Seasonal Items",
    description:
      "Branded ornaments, candy bags, greeting cards, calendars and patriotic items for staff, donors and community events. Request a quote.",
    intro:
      "Seasonal and holiday products include ornaments, candy and treat bags, greeting cards, calendars and patriotic items such as flags and blankets. Offices and nonprofits send them to donors and supporters at the end of the year, and campaigns use patriotic items at summer and fall events. Each product page lists its own quantity tiers.",
    highlights: ["usa", "brands", "colors"],
    faqs: [
      {
        question: "Can I send a request for a seasonal item early?",
        answer: `You can send a request whenever you are ready. ${NO_CHARGE} The final quote has the full cost of the order. ${PAY_STEP}`,
      },
      {
        question: "How do I add my logo or a message?",
        answer: `${LOGO_FILES} ${IMPRINT_NOTES}`,
      },
      {
        question: "What does the quote cover?",
        answer: `${QUOTE_STEP} ${PAY_STEP}`,
      },
    ],
  },

  "Kids & Toys": {
    title: "Custom Coloring Books, Crayons and Kids Items",
    description:
      "Branded coloring books, crayons, fidget toys, balloons and stickers for family events, schools and community days. Request a quote.",
    intro:
      "Kids and toys include coloring and activity books, crayons, fidget toys, balloons, temporary tattoos and stickers. They are common at family festivals, parades, school visits and community open houses where parents and children stop at a booth. Each product page lists its own quantity tiers.",
    highlights: ["usa", "colors", "brands"],
    faqs: [
      {
        question: "What are the minimum quantities for kids items?",
        answer: `${TIERS} ${CHECK_START}`,
      },
      {
        question: "How do I add my logo to a coloring book or toy?",
        answer: `${LOGO_FILES} ${IMPRINT_NOTES} ${QUOTE_STEP}`,
      },
      {
        question: "How does payment work?",
        answer: `${NO_CHARGE} ${PAY_STEP}`,
      },
    ],
  },

  "Awards & Recognition": {
    title: "Custom Awards, Plaques and Challenge Coins",
    description:
      "Custom plaques, acrylic and crystal awards, challenge coins, lapel pins and medals for staff, volunteers and members. Request a quote.",
    intro:
      "Awards and recognition products include plaques, acrylic and glass awards, challenge coins, lapel pins, medals and certificate holders. Offices and nonprofits use them for service recognition, volunteer appreciation and annual dinners, and campaigns use pins and coins as keepsakes for supporters. Each product page lists its own quantity tiers.",
    highlights: ["usa", "brands", "colors"],
    faqs: [
      {
        question: "How do I give names or wording for an award?",
        answer: `Use the notes field on your request, and the Imprint notes box on each line, to describe the names, wording and where they go. ${QUOTE_STEP}`,
      },
      {
        question: "Are awards priced by size?",
        answer: `${SIZE_NOTE} ${TIERS}`,
      },
      {
        question: "What artwork do I send for a coin or pin?",
        answer: `${LOGO_FILES} ${PAY_STEP}`,
      },
    ],
  },

  "Print & Collateral": {
    title: "Custom Door Hangers, Magnets and Print Pieces",
    description:
      "Door hangers, business card magnets, calendars, sticky notes and folders for canvassing, offices and community outreach. Request a quote.",
    intro:
      "Print and collateral products include door hangers, business card magnets, calendars, sticky notes, stickers and folders. Canvassers leave door hangers at homes, offices hand out magnets and calendars with a phone number on them, and nonprofits use folders and notes at events. Sizes and formats differ by product.",
    highlights: ["usa", "colors", "brands"],
    faqs: [
      {
        question: "What artwork should I send for door hangers and printed pieces?",
        answer: `${LOGO_FILES} ${QUOTE_STEP}`,
      },
      {
        question: "Are printed pieces priced by size?",
        answer: `${SIZE_NOTE} ${TIERS}`,
      },
      {
        question: "Can I ask for a printed item that is not listed?",
        answer: NOT_LISTED,
      },
    ],
  },

  "Promo Giveaways": {
    title: "Custom Buttons, Hand Fans and Giveaways",
    description:
      "Custom buttons, hand fans, stress balls, wristbands and low-cost giveaways for rallies, parades and booths. Request a quote.",
    intro:
      "Promo giveaways include campaign buttons, hand fans, stress balls, wristbands, foam items and noisemakers. They are made for crowds: rallies, parades, festivals and booths where supporters take something small and wear or carry it. Each product page lists its own quantity tiers.",
    highlights: ["colors", "usa", "brands"],
    faqs: [
      {
        question: "What is the minimum order for buttons and giveaways?",
        answer: `${TIERS} ${CHECK_START}`,
      },
      {
        question: "What file do I send for a button?",
        answer: `${LOGO_FILES} ${QUOTE_STEP}`,
      },
      {
        question: "How do I pay for a giveaway order?",
        answer: `${NO_CHARGE} ${PAY_STEP}`,
      },
    ],
  },

  "Lanyards & Badges": {
    title: "Custom Lanyards and Badge Holders",
    description:
      "Custom lanyards, name badges and badge holders for volunteer check-in, conferences and staff credentials. Preview your logo and request a quote.",
    intro:
      "Lanyards and badges include printed and sublimated lanyards, breakaway styles, name badges and badge holders. They identify volunteers at check-in, staff and speakers at conferences, and visitors at office events. Each product page lists its own quantity tiers.",
    highlights: ["colors", "usa", "brands"],
    faqs: [
      {
        question: "Can I get a lanyard in a specific color?",
        answer: `Each product lists its colors, and you choose when adding it to your request. ${COLOR_RULE}`,
      },
      {
        question: "What artwork should I send for a lanyard?",
        answer: `${LOGO_FILES} ${IMPRINT_NOTES} ${QUOTE_STEP}`,
      },
      {
        question: "What is the minimum order for lanyards?",
        answer: `${TIERS} ${NO_CHARGE}`,
      },
    ],
  },
};

export function getCategoryCopy(category: string): CategoryCopy | undefined {
  return categoryCopy[category];
}

// ---------------------------------------------------------------------------
// Facts computed from the live products of a category
// ---------------------------------------------------------------------------

export type FactProduct = Pick<CatalogProduct, "tiers" | "colors" | "brand" | "description">;

export interface CategoryFacts {
  count: number;
  /** Lowest customer price at any product's first (lowest-quantity) tier. */
  lowestFirstTierPrice: number;
  /** Highest customer price at any product's first tier. */
  highestFirstTierPrice: number;
  /** Median of the first-tier quantities (lower median when the count is even). */
  typicalMinimumQuantity: number;
  /** The smallest first-tier quantity among the products. */
  lowestMinimumQuantity: number;
  /** Products whose last tier is priced below their first tier. */
  quantityBreakCount: number;
  madeInUsaCount: number;
  /** Products offered in MANY_COLORS or more colors. */
  manyColorsCount: number;
  /** Distinct real (not "Essentials") brands. */
  namedBrandCount: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;
const MADE_IN_USA = /\bmade in (?:the )?(?:usa|u\.s\.a\.|united states)\b/i;
export const MANY_COLORS = 10;

export function computeCategoryFacts(items: readonly FactProduct[]): CategoryFacts {
  const firsts = items.map((item) => item.tiers[0]);
  const prices = firsts.map((tier) => tier.price);
  const quantities = firsts.map((tier) => tier.quantity).sort((a, b) => a - b);
  return {
    count: items.length,
    lowestFirstTierPrice: items.length ? round2(Math.min(...prices)) : 0,
    highestFirstTierPrice: items.length ? round2(Math.max(...prices)) : 0,
    typicalMinimumQuantity: items.length ? quantities[Math.floor((quantities.length - 1) / 2)] : 0,
    lowestMinimumQuantity: items.length ? quantities[0] : 0,
    quantityBreakCount: items.filter((item) => {
      const last = item.tiers[item.tiers.length - 1];
      return item.tiers.length > 1 && last.price < item.tiers[0].price;
    }).length,
    madeInUsaCount: items.filter((item) => MADE_IN_USA.test(item.description)).length,
    manyColorsCount: items.filter((item) => (item.colors?.length ?? 0) >= MANY_COLORS).length,
    namedBrandCount: new Set(
      items.filter((item) => isRealBrand(item.brand)).map((item) => item.brand)
    ).size,
  };
}

const num = (n: number) => n.toLocaleString("en-US");

export function formatPrice(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function highlightBullet(kind: HighlightKind, facts: CategoryFacts): string | undefined {
  const total = num(facts.count);
  switch (kind) {
    case "usa":
      return facts.madeInUsaCount > 0
        ? `${num(facts.madeInUsaCount)} of ${total} ${facts.count === 1 ? "product lists" : "products list"} Made in USA in the description.`
        : undefined;
    case "colors":
      return facts.manyColorsCount > 0
        ? `${num(facts.manyColorsCount)} of ${total} ${facts.count === 1 ? "product is" : "products are"} offered in ${MANY_COLORS} or more colors.`
        : undefined;
    case "brands":
      return facts.namedBrandCount > 0
        ? `${num(facts.namedBrandCount)} named ${facts.namedBrandCount === 1 ? "brand appears" : "brands appear"} here, alongside unbranded items.`
        : undefined;
  }
}

/** Exactly three "Good to know" bullets, every figure taken from `facts`. */
export function buildGoodToKnow(
  highlights: readonly HighlightKind[],
  facts: CategoryFacts
): string[] {
  const total = num(facts.count);
  const unit = (n: number) => `${num(n)} ${n === 1 ? "unit" : "units"}`;

  const first =
    facts.count === 1
      ? `1 product is listed, at ${formatPrice(facts.lowestFirstTierPrice)} per unit at its lowest quantity, before setup, decoration, shipping and tax.`
      : `${total} products are listed. At each product's lowest quantity, unit prices run from ${formatPrice(facts.lowestFirstTierPrice)} to ${formatPrice(facts.highestFirstTierPrice)}, before setup, decoration, shipping and tax.`;

  const second = `The typical minimum order is ${unit(facts.typicalMinimumQuantity)}. ${
    facts.quantityBreakCount > 0
      ? `${num(facts.quantityBreakCount)} of ${total} show a lower per-unit price at higher quantities.`
      : "Check each product for its own quantity tiers."
  }`;

  const third =
    highlights.map((kind) => highlightBullet(kind, facts)).find((text) => text !== undefined) ??
    `The lowest minimum order here is ${unit(facts.lowestMinimumQuantity)}.`;

  return [first, second, third];
}

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------

export function buildFaqJsonLd(faqs: readonly CategoryFaq[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}
