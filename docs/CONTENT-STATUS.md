# Content status — packet page map

Source: `U.S. Coast Guard Academy Boards Packet 2026–2027` (65 pages). Printed page numbers
match physical PDF pages. "Set" = the checkbox `value` (category) in the app.

Status legend: ✅ **Live** (wired to a checkbox) · 🟡 **In JSON, not wired** · ⬜ **Not captured yet**

| Pages | Packet section | Status | Set / notes |
|------:|----------------|--------|-------------|
| 3 | Mission of the USCG Academy | ✅ | `mission` |
| 4 | The Coast Guard Ethos | ✅ | `ethos` |
| 5 | General Orders of the Sentry | ✅ | `sentry` |
| 6–8 | Commissioned Officer Ranks (CG/Navy + other services) | ✅ | `ranks` — recognition (name ↔ grade/abbrev) |
| 9 | Enlisted Ranks | ✅ | `ranks` — recognition |
| 10–12 | U.S. Coast Guard Enlisted Ratings | ✅ | `ratings` — recognition; duties shown in Study |
| 13–15 | Nautical Flags | ✅ | `flags` (with images) |
| 16–17 | Flags & Ensigns | ✅ | `ensigns` — Ensign, Standard, Jack, Commissioning Pennant |
| 18–19 | Common Lights and Dayshapes | 🟡 | JSON: `lights_and_dayshapes` (needs images) |
| 20–22 | Basic Nautical Dictionary | ✅ | `nautical` (88 terms) — **added** |
| 23–24 | Helm Commands | ✅ | `helm` |
| 25 | Line Handling Commands | ✅ | `lines` |
| 26 | Etiquette | ✅ | `etiquette` — **added** |
| 27 | Coast Guard Ceremonies / Colors Indoctrination | ✅ | `colors` — **added** |
| 28 | Shipboard Customs | ✅ | `shipboard` — **added** |
| 29 | Saluting | ✅ | `saluting` — **added** |
| 30 | Coast Guard Districts | ✅ | `districts` + interactive map — **added** |
| 31–33 | 11 Missions of the U.S. Coast Guard | ✅ | `missions` |
| 33 | Recognized Distress Signals | 🟡 | JSON: `facts_and_reference.distress_signals` (16, needs images) |
| 34 | Fundamentals of Damage Control | ✅ | `damage` — **added** |
| 35 | Four Classes of Fires | ✅ | `fires` — **added** |
| 36 | Radios and Messages — prowords | ✅ | `radio` |
| 36 | Radios and Messages — procedures | ✅ | `radio_proc` — **added** |
| 37–42 | Coast Guard Cutters | ✅ | `assets` (with images) |
| 43–46 | Coast Guard Small Boats | ✅ | `assets` (with images) |
| 47–49 | Coast Guard Aircraft | ✅ | `assets` (with images) |
| 50–64 | Chapter 2 — Appearance and Grooming | ⏸ | **Deferred by owner** — skip for now (large policy tables) |
| 65 | References | ⬜ | n/a |

## Added in this round (pages 20–22, 26–36, 30)

Each packet section is its own separate study set (one checkbox each):

- **Nautical dictionary** (`nautical`) — 88 term/definition pairs (was already in JSON; now wired).
- **Etiquette** (`etiquette`) — 8 cards.
- **Colors indoctrination** (`colors`) — 8 cards.
- **Shipboard customs** (`shipboard`) — 7 cards.
- **Saluting** (`saluting`) — 5 cards.
- **Radio procedures** (`radio_proc`) — 4 cards (parts of a message, circuit discipline,
  transmitting techniques, prowords definition). Prowords themselves remain the `radio` set.
- **Damage control** (`damage`) — 6 cards: material readiness conditions (X-Ray, Yoke, Zebra,
  Circle William, Dog Zebra) and the fire tetrahedron.
- **Fire classes** (`fires`) — 4 cards: the four classes of fires (A–D).
- **Coast Guard districts** (`districts`) — interactive US map (9 Force Design districts,
  LANT/PAC areas) plus number↔name↔HQ↔area recall cards and the two Area Commands + Headquarters.

## Known data-quality notes

- The pre-existing `facts_and_reference.districts` and `facts_and_reference.damage_control`
  arrays in the JSON were mangled during the original extraction (district numbers stripped;
  section headers stored as items). The app now uses the clean `study_additions.*` data instead.
  Those old arrays are left in place but unused; they can be deleted in a future cleanup.
- Mission names in `matching.coast_guard_missions` contain a line break in
  "Ports, Waterways, and Coastal\nSecurity" — cosmetic only.

## Remaining to reach "everything"

Text-based content is now complete. Only two sections remain, and **both are visual** — cadets
identify an image — so they need image assets before wiring (the signal/light pictures), the way
`flags` and `assets` already carry images:

- **Distress Signals (p. 33)** — 16 signals; owner wants these **verbatim**. Signal names are in
  `facts_and_reference.distress_signals`; needs the signal images.
- **Lights & Dayshapes (pp. 18–19)** — needs the light/dayshape images.

**Chapter 2 — Appearance & Grooming (pp. 50–64) is deferred by the owner** and intentionally skipped.

Follow "How to add a new study set" in `DEVELOPMENT.md` once images are available.
