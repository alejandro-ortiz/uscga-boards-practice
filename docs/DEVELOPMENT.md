# Development guide

How this study site is built, and how to add more of the boards packet to it.

## Architecture (no build step)

Plain static files served by GitHub Pages. No framework, no bundler, no server code.

```
boards_packet_2026_2027_clean_v2.json   Structured packet content (the source of truth for the app)
curriculum.js       window.CURRICULUM — per-section test rules (verbatim vs. recognition, pass marks) + unit labels
usmap.js            window.US_MAP — CC0/public-domain US state outlines for the districts map
data.js             window.loadStudyData() — flattens the JSON into a flat `facts` array
app.js              The study engine (modes, rendering, mastery tracking in localStorage)
index.html          Markup: practice-set checkboxes, mode select, panels
styles.css          All styling + light/dark themes
images/             Flag and asset images
```

### Data flow

1. `app.js` calls `window.loadStudyData()` (in `data.js`).
2. `data.js` fetches the JSON and **flattens every section into one flat list of `facts`**.
3. Each fact is `{ id, category, section, front, back, image?, asset?, districtsMap? }`.
   - `category` — matches a checkbox `value` in `index.html`. This is what the user selects.
   - `section` — the packet heading shown as the card kicker (e.g. "Saluting").
   - `front` / `back` — the two sides of a flashcard. Everything is driven by this pair.
   - `image` — optional image path (flags).
   - `asset` — optional `{ fields, image }` for ships/boats/aircraft (multi-attribute drills).
   - `districtsMap` — optional; marks the single interactive map card (districts set).
4. `app.js` filters `facts` by the selected categories and runs the chosen mode.

### Modes — four (all derived from `front`/`back`)

- **Study** — browse cards with the answer visible.
- **Practice** — mixed drilling, not graded. Per fact: verbatim sections ask for the full wording;
  the rest mix recognition (multiple choice) and typed recall.
- **Test (graded)** — verbatim sections are typed word-for-word (exact match); non-verbatim prose is
  typed and graded on **≥70% of key terms** (order/structure ignored, via `keywordScore`); assets are
  recognition. You need **90% overall** to pass (`CURRICULUM.passOverall`). Results show the overall %,
  PASS / NOT YET, per-section scores, and a "to review" list. Grading is driven entirely by
  `curriculum.js` (`verbatim` flag + `passOverall` + `keywordThreshold`) — no engine change to retune.
  `CURRICULUM.for(category)` resolves a category (incl. `asset_*`) to its config.
- **Review** — drills the weakest items first (`masteryFor` ascending), across the selected sets or
  everything if none are selected. Mixed question types like Practice.

Mode is chosen from the radio **rail** (`input[name="mode"]`), not a dropdown. A **session length**
select (`#lengthSelect`, All / 10 / 20 / 30) caps the number of questions. Nothing is selected by default.

Mastery (0–5) and stats are stored per-fact in `localStorage`; the mastery panel groups items into
collapsible per-category rows. Nothing is uploaded.
See `ROADMAP.md` for product direction and what's next.

## How to add a new study set

A "study set" = one `category` = one checkbox. Adding one touches **four** places:

1. **JSON** — add the content. For authored Q&A, use the `study_additions.curated` shape:
   ```json
   "my_bundle": {
     "category": "myset",
     "label": "My set",
     "groups": [
       { "section": "Packet Heading", "page": 00, "category": "myset",
         "items": [ { "front": "Question?", "back": "Answer." } ] }
     ]
   }
   ```
   **One packet section = one study set = one checkbox.** Each `group` becomes its own set via its
   own `category`; if a group omits `category` it falls back to the bundle's `category`. (That is how
   the customs pages became four separate sets — `etiquette`, `colors`, `shipboard`, `saluting` — and
   damage control split into `damage` + `fires`, all from one curated bundle.) Keep sections separate;
   don't merge several packet headings under one category.
   (For data already in the JSON — like `term_definitions.nautical_dictionary` — skip this step and
   wire it straight from its existing path.)
2. **`data.js`** — push facts for the new category. Curated sets under `study_additions.curated`
   are already looped automatically, so new groups there need **no** `data.js` change. For a set
   somewhere else in the JSON, add an `add(category, section, items, frontKey, backKey)` call.
3. **`index.html`** — add a checkbox inside `<fieldset class="practice-sets">`:
   ```html
   <label><input type="checkbox" name="practiceSet" value="myset"> My set</label>
   ```
4. **`app.js`** — add a label to the `categoryLabels` map: `myset: 'My set'`.

Then bump the cache-busting version (below) and reload.

### Content that is already in the JSON but not yet surfaced

These are extracted and ready to wire with the steps above when you want them:

- `term_definitions.enlisted_ratings` (23) — enlisted ratings + abbreviations
- `visual_and_identification.ranks` — officer/enlisted/warrant/other-service rank tables
- `visual_and_identification.lights_and_dayshapes`, `ceremonies`
- `facts_and_reference.flags_and_ensigns`, `distress_signals`
- `rules_and_procedures.*` raw text (etiquette, colors, shipboard, saluting, radio) — note the
  **authored Q&A versions** of these now live in `study_additions.curated` and are what the app uses.

See `CONTENT-STATUS.md` for the full packet page map and what is / isn't live.

## The Coast Guard Districts map

- Base map: `usmap.js` sets `window.US_MAP = { viewBox, states: [{id, d}] }`.
  Source: `@svg-maps/usa.states-territories` (Unlicense / public domain, Albers USA composite,
  viewBox `8 6 920 585`). Territories were dropped; AK and HI are in the composite as insets.
- District records live in `study_additions.districts` in the JSON: each has
  `{ num, name, hq, area, x, y }` where `x,y` are marker coordinates **in the map viewBox**.
  Markers are placed at (or nudged toward) each district's headquarters city.
- `data.js` emits one `districtsMap` card (the map) plus recall cards for each
  number↔name↔HQ↔area and the two Area Commands + Headquarters.
- `app.js` → `renderDistrictMap()` draws the SVG + legend and wires marker/legend highlighting.
  The map card is excluded from quiz modes and from the mastery count.
- This packet uses the **2026–27 Force Design districts** (Northeast, East, Southeast, Heartland,
  Great Lakes, Southwest, Northwest, Arctic, Oceania) — **not** the old numbered districts.
  To move a marker, edit its `x`/`y` in the JSON and reload.

## Cache-busting (do this before every deploy)

GitHub Pages caches static assets. Every `?v=...` on the CSS/JS/JSON/favicon URLs in
`index.html` (and the JSON URL inside `data.js`) must be bumped so browsers refetch.
The convention is to use the new commit's short hash. One-liner from repo root:

```bash
NEW=$(git rev-parse --short HEAD)   # or the hash you are about to push
sed -i "s/v=[0-9a-f]\{6,\}/v=$NEW/g; s/v=20[0-9]\{6\}[a-z]*/v=$NEW/g" index.html data.js
```

Check with: `grep -o 'v=[^"&]*' index.html data.js | sort -u` (all should match).

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000/index.html  (don't open the file directly — fetch() needs http)
```

## Source packet

The original PDF (`boardspacket-original`) is **git-ignored** and must not be committed/published.
It is the reference for verifying wording and page numbers only.
