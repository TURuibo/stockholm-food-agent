// One-shot enrichment: give every place in data/places.json a clear answer to
// three questions a human asks when they see it on the list —
//   why_listed  : WHY is this in my database?            (its role in the value brief)
//   highlights  : WHAT are the good parts?               (hand-distilled, per place)
//   added_via   : from WHICH WAY was it added?           (provenance / pathway)
//
// why_listed and added_via are derived deterministically from existing fields
// (michelin tier, value_tier, source) so they stay correct if those change and
// the script is re-run. highlights are authored per id below; a place missing
// from the table keeps its existing hand-distilled highlights (e.g. a fresh
// hunter find) and only falls back to a derivation when it has none yet — so
// re-running never clobbers curated highlights.
//
// Usage:  node scripts/annotate_provenance.mjs
// Idempotent — safe to re-run after the scraper/hunter adds places.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLACES = join(__dirname, "..", "data", "places.json");

// ---- WHY is it here? (role in the "Michelin-adjacent value" brief) ----
function whyListed(p) {
  const fromMichelin = (p.source || []).includes("michelin");
  switch (p.michelin) {
    case "three-star":
      return "Michelin 3-star — the benchmark for 'what good looks like'. Kept as a reference point for the fingerprint; ranks low by default because a 3-star palace is the opposite of the cheap-everyday brief.";
    case "two-star":
      return "Michelin 2-star — a top-end reference for the taste fingerprint. Aspirational, down-weighted for everyday picks because of the price.";
    case "one-star":
      return "Michelin 1-star — seeds the 'what good looks like' fingerprint. A splurge benchmark, down-weighted by default so it doesn't crowd out the value cousins.";
    case "bib":
      return "Bib Gourmand — Michelin's own good-value badge. This is the gold seed of the whole 'Michelin-adjacent value' idea: great cooking that won't break the bank.";
    default:
      if (fromMichelin) {
        return p.value_tier === "splurge"
          ? "On the Michelin Guide's Stockholm selection (listed, not starred) — inspector-vetted, but priced as a splurge; here as a 'what good looks like' reference more than an everyday pick."
          : "On the Michelin Guide's Stockholm selection (listed, not starred) — inspector-vetted cooking without the star-level price. Right in the value sweet spot.";
      }
      if ((p.source || []).includes("user-pick"))
        return "Neighbourhood keeper — a cozy everyday café near home, asked for by name. Here for proximity and sustained local love rather than craft pedigree (the second track in CLAUDE.md).";
      return "Michelin-adjacent value candidate — similar DNA to the starred spots, but cheaper and not yet famous. Auto-grown to widen your everyday options.";
  }
}

// ---- from WHICH WAY was it added? (provenance pathway) ----
function addedVia(p) {
  const s = p.source || [];
  if (s.includes("user-pick"))
    return "Added at the user's request after a why/why-not evaluation (neighbourhood-keeper track).";
  if (s.includes("michelin"))
    return "Imported from the Michelin Guide Stockholm selection by the scraper (scripts/michelin_scrape.mjs, via /refresh-michelin).";
  if (s.includes("web-search"))
    return "Surfaced by the gem-hunter agent through live web search (/hunt) and saved as a value candidate.";
  if (s.includes("web"))
    return "Hand-seeded from 'best of Stockholm' web guides during the initial list build.";
  return "Added manually.";
}

// ---- WHAT are the good parts? (authored per place) ----
const HIGHLIGHTS = {
  "kacks-bageri": ["Large, buttery pastries it's locally famous for", "A genuine Sundbyberg fika staple — ~100 m from home", "Quiet neighbourhood-bakery feel"],
  "restaurang-bazaar": ["Great-value lunch", "Highly rated local Indian — good in the evening too", "On your doorstep in Sundbyberg"],
  "bonab-persisk-kolgrill": ["Top-rated Persian charcoal grill in the area", "Smoky, properly grilled kebabs", "Everyday-priced, a short walk from home"],
  "ristorante-parma": ["Broad, crowd-pleasing Italian menu", "Attentive, family-friendly service", "Cosy neighbourhood spot close to home"],
  "essence-1203656": ["Communal counter — the whole room served in sync", "Chef Stefan Taylor cooking centre-stage", "Sociable, mingle-friendly fine dining"],
  "lillebrors-bageri": ["Rumoured best cardamom bun in Stockholm", "Decadent, high-quality pastries", "Destination-worthy neighbourhood bakery"],
  "etoile": ["Bold, surprising, well-travelled cooking", "Imaginative one-star tasting experience", "Personal, friends-run kitchen"],
  "ritorno-konditori": ["Quintessential old-school Swedish fika", "A café since the 1930s, by Vasaparken", "Classic, calm konditori atmosphere"],
  "wilmer-kaffebar": ["Well-loved café and bakery in one", "Calm room made for slow coffee", "Quiet Kungsholmen fika"],
  "minh-mat": ["Wonderfully personal, photo-filled room", "Relaxed, well-run Vietnamese", "On a budget — Michelin-listed value"],
  "lux-dag-for-dag": ["Bright brasserie in a 1916 red-brick factory", "Waterside setting", "Local, seasonal modern cooking"],
  "lilla-ego": ["One of the hottest tickets in town", "Buzzy, rustic exposed-brick room", "Grab a counter seat for the action", "Bib Gourmand value"],
  "cafe-pascal": ["Roasts its own beans", "Hand-brewed V60 pour-overs", "Serious-coffee destination for fika"],
  "bastardo": ["House-made pasta and charcuterie", "Playful, creative Italian", "Pasta around 195–205 SEK", "Inside the historic Clas på Hörnet"],
  "flor-matbar": ["Gratinéed oysters with XO sauce", "Fresh seafood small plates", "Curated natural-wine list", "Cosy all-wood counter"],
  "nisch": ["Accomplished modern cooking", "Relaxed, stylish monochrome room", "Neighbourhood scale and feel"],
  "juno": ["Charred pulpo and whipped ricotta", "Sharing-friendly Mediterranean", "~350–450 SEK per person", "Sunny southern-Med inspiration"],
  "sushi-sho": ["Classic sushi at the highest level", "Intimate tiled counter", "One-star benchmark for the fingerprint"],
  "bord": ["Warm, bohemian bistro welcome", "Communal table at its heart", "Relaxed counter seating"],
  "prospero": ["Characterful half-cellar dining room", "Budget-priced for a Michelin listing", "Small, personal bistro"],
  "rolfs-kok": ["A Stockholm staple for ~40 years", "Chef-owner Johan Jureskog at the helm", "Buzzy, industrial-design room", "Bib Gourmand value"],
  "babette": ["Lively, buzzing neighbourhood vibe", "Known for pizzas and small plates", "Budget-friendly Bib Gourmand", "No-fuss, dog-friendly"],
  "farang": ["Bold Southeast-Asian flavours", "Striking room in an old power-company building", "Lively bar-and-restaurant energy"],
  "allegrine": ["Classic French brasserie cooking", "18-stool counter onto the open kitchen", "Simple, great-value lunch", "Bib Gourmand"],
  "dashi": ["Japanese technique on prime Swedish produce", "Pared-back Nordic-Japanese room", "One-star tasting experience"],
  "ett-hem": ["Hidden, intimate hotel dining room", "Chic Lärkstaden setting", "Refined modern cooking (a splurge)"],
  "arla": ["Charming husband-and-wife local", "Farm-to-table focus", "Warm, regular's-welcome feel", "Bib Gourmand value"],
  "frantzen": ["Sweden's only 3-star — world-renowned", "Fully immersive multi-floor experience", "The fingerprint's top reference point"],
  "black-milk-gastro-bar": ["Moody, fun, music-led room", "Globe-spanning small plates", "Lively cocktail bar"],
  "forma-1210349": ["Bar-like vibe with serious small plates", "Nordic–French flavours, on-trend", "Budget-priced Söder spot"],
  "nour": ["Discreet, tranquil top-floor room", "Refined creative tasting menu", "One-star benchmark"],
  "sperling-co": ["Wood-fired-grill steakhouse", "Seductive cocktail bar", "Upscale US-style format"],
  "ekstedt": ["Everything cooked over open fire — no electricity", "One of the city's most unique experiences", "Opens with a kitchen tour"],
  "adam-albin": ["Chef-owners Adam & Albin's flagship", "Handsome building by the opera", "Inventive one-star tasting"],
  "hillenberg": ["Elegant take on a classic brasserie", "Hugely impressive wine cellar", "Well-executed Swedish classics"],
  "gaia-matbar": ["Natural wine at 110 SEK vs the usual ~160", "Inventive Nordic-meets-global plates", "Lively neighbourhood room", "Strong rotating wine list"],
  "brasserie-astoria": ["Glamorous restored 1870s cinema", "Bustling classic brasserie", "Counter seats onto the kitchen"],
  "operakallaren": ["Sweden's most opulent dining room", "Inside the Royal Opera House", "Celebration-grade one-star"],
  "petri": ["Cosy, intimate room (named after 'petrichor')", "Refined modern cooking", "Special-occasion feel without the star price"],
  "levi-bistro": ["Lobster rolls and steak tartare", "Burgers with café de Paris butter", "From the Bar Abrovinsch team", "Relaxed Söder wine-bar spirit"],
  "ergo": ["Elegant, discreet Östermalm room", "Calm open-kitchen precision", "One-star tasting"],
  "seafood-gastro": ["Impeccable Nordic seafood", "Decadent Grand Hôtel setting", "Roll-call tasting menu"],
  "leijontornet": ["Heaps of old-school charm", "Character-filled Gamla Stan room", "Returned to its classic guise"],
  "b-a-r": ["Pick your seafood from the fridge or tank", "Bright, buzzy fish-market look", "Steps from the waterfront"],
  "washoku-tomo": ["Omakase that doesn't break the bank", "Chef-owner Tomoko Hayashi", "Authentic washoku on Södermalm"],
  "celeste-1209889": ["8th-floor room with a terrace welcome drink", "Theatrical arrival sequence", "One-star with a view"],
  "matbaren": ["Well-priced modern dishes inside the Grand Hôtel", "Three plates make a meal — built for sharing", "Lively counter seating", "Bib Gourmand value"],
  "svedjan-bageri": ["Sourdough and legendary cinnamon & cardamom buns", "Ecological flour from a Swedish mill", "Koppi coffee", "Northern-Swedish baking tradition"],
  "framfickan": ["Kimchi toast and cornflake-crusted fried chicken", "Asian small plates with a Scandi touch", "From the Bistro Barbro team", "~360–460 SEK per person"],
  "drop-coffee-roasters": ["Renowned single-origin roaster", "Bright, cosy Scandinavian space", "Among Stockholm's best coffee"],
  "freyja": ["13th-floor roof terrace with 360° views", "Cocktails above the city", "Modern Swedish cooking"],
  "persona": ["Striking old-townhouse-meets-modern design", "Named after the Bergman film", "Elegant, theatrical dinner (a splurge)"],
  "woodstockholm": ["Menu theme changes every two months", "Run by a furniture-making collective", "Compact, characterful bistro"],
  "triton": ["Charming, unpretentious and homely", "Technically sharp, pared-back cooking", "Bohemian neighbourhood feel", "Bib Gourmand value"],
  "ulla-winbladh": ["Classic Swedish husmanskost", "Charming parkland setting by Skansen", "Lovely summer terrace", "Historic 1897 building"],
  "bar-agrikultur": ["Lively, natural-leaning wine bar", "Budget-friendly Bib Gourmand", "Counter and window stools", "Söder neighbourhood favourite"],
  "voisine": ["Homely, unpretentious French bistro", "Classic French desserts (e.g. blueberry clafoutis)", "Budget-priced Michelin listing"],
  "aira": ["Beautifully composed two-star cooking", "Striking design near Djurgården", "Tableside finishing from the open kitchen"],
  "solen": ["'Industrial elegance' in the old meat-packing district", "On-trend modern cooking", "Budget-priced for a Michelin listing"],
  "juniper-tree": ["From-scratch brunch — smoothie bowls, truffle scrambled eggs", "Family-run, living-room cozy", "4.4/5 over 446 Google reviews", "~1.7 km away in Råsunda"],
  "cafe-volta-sundbyberg": ["Bread baked in-house every morning", "Work-friendly living-room vibe", "4.4/5 over 764 Google reviews", "200 m from home in central Sundbyberg"],
  "vete-katten": ["Konditori institution since 1928", "White Guide top-patisserie recognition", "Warren of charming old-Stockholm rooms", "Classic prinsesstårta and semlor"],
  "park-bageri-konditori": ["White Guide cafe listing — Very Fine Level", "Heritage-grain sourdough; world-class mazariner", "Same owner pair for 10 years; wood-fired pizza Wednesdays", "Century-old fika spot in idyllic Äppelviken"],
  "brioche-bageri-bistro": ["Brunkebergs Bageri pedigree — craft since 2002", "Everything baked on site by hand, natural ingredients", "Bread rotates monthly with the seasons", "Weekend brunch on Alviks torg"],
  "nockeby-bageri": ["Founded by world-champion baker Håkan Johansson", "100% organic, visible stone oven", "White Guide cafe listing", "Bread sells out — queues into the street"],
  "kanaans-tradgardscafe": ["White Guide cafe listing", "Everything from scratch in own kitchen & kakeri", "Garden by Mälaren in Grimsta nature reserve", "~4.3 on Google across 6000+ reviews"],
  "rosendals-tradgardskafe": ["Wood-fired sourdough bakery", "Biodynamic garden — produce from its own beds", "Greenhouse and orchard seating on Djurgården", "White Guide winner"],
};

// Fallback if a place isn't in the authored table (e.g. a brand-new hunter find).
function deriveHighlights(p) {
  const out = [];
  if (p.inspector_note) {
    const first = String(p.inspector_note).split(/(?<=[.!?])\s/)[0].replace(/[.\s]+$/, "");
    if (first) out.push(first.length > 120 ? first.slice(0, 117) + "…" : first);
  }
  if (p.michelin === "bib") out.push("Bib Gourmand value");
  (p.vibe_tags || []).slice(0, 3).forEach((v) => out.push(v));
  if (!out.length && (p.cuisine || []).length) out.push((p.cuisine || []).join(" / "));
  return [...new Set(out)].slice(0, 4);
}

// Canonical key order, with the three new fields slotted in sensibly:
// why_listed + highlights right after inspector_note; added_via just before source.
const ORDER = [
  "id", "name", "type", "cuisine", "michelin", "green_star", "price", "value_tier",
  "lat", "lng", "address", "neighborhood", "distance_km", "vibe_tags",
  "michelin_dna_score", "confidence", "inspector_note",
  "why_listed", "highlights",
  "accepts_reservations", "added_via", "source", "source_url", "last_verified", "notes",
];

const places = JSON.parse(await readFile(PLACES, "utf8"));
let n = 0;
const annotated = places.map((p) => {
  const enriched = {
    ...p,
    why_listed: whyListed(p),
    highlights:
      HIGHLIGHTS[p.id] ||
      (Array.isArray(p.highlights) && p.highlights.length
        ? p.highlights
        : deriveHighlights(p)),
    added_via: addedVia(p),
  };
  n++;
  // re-emit in canonical order; keep any unexpected extra keys at the end
  const out = {};
  for (const k of ORDER) if (k in enriched) out[k] = enriched[k];
  for (const k of Object.keys(enriched)) if (!(k in out)) out[k] = enriched[k];
  return out;
});

await writeFile(PLACES, JSON.stringify(annotated, null, 2) + "\n", "utf8");
console.log(`Annotated ${n} places with why_listed / highlights / added_via.`);
