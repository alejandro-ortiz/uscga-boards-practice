# Content status — packet page map

Source: `U.S. Coast Guard Academy Boards Packet 2026–2027` (65 pages). Printed page numbers
match physical PDF pages. "Set" = the checkbox `value` (category) in the app.

Status legend: ✅ **Live** (wired to a checkbox) · 🟡 **In JSON, not wired** · ⬜ **Not captured yet**

| Pages | Packet section | Status | Set / notes |
|------:|----------------|--------|-------------|
| 3 | Mission of the USCG Academy | ✅ | `mission` — the mission statement (verbatim); origin/composition not tested |
| 4 | The Coast Guard Ethos | ✅ | `ethos` |
| 5 | General Orders of the Sentry | ✅ | `sentry` |
| 6–7 | Commissioned Officer Ranks (CG/Navy) + Warrant Officers | ✅ | `ranks` — **insignia recognition** (CG shoulder boards; identify the rank) |
| 8 | Commissioned Officer Ranks (Army/USMC/Air Force) | ✅ | `ranks` — insignia recognition (joint collar devices) |
| 9 | Enlisted Ranks (Coast Guard) | ✅ | `ranks` — insignia recognition (E-4→E-9 + CPOCG collar devices; E-1→E-3 text) |
| 10–12 | U.S. Coast Guard Enlisted Ratings | ✅ | `ratings` — **specialty-mark recognition**: identify name + abbreviation from the mark, plus a keyword-graded definition (23 marks) |
| 13–15 | Nautical Flags | ✅ | `flags` (with images) — **recognition** (multiple choice) |
| 16–17 | Flags & Ensigns | ✅ | `ensigns` — Ensign, Standard, Jack, Commissioning Pennant — **recognition** (multiple choice) |
| 18–19 | Common Lights and Dayshapes | ✅ | `lights` — recreated COLREGS SVG diagrams (6 vessels) |
| 20–22 | Basic Nautical Dictionary | ✅ | `nautical` (88 terms) — **added** |
| 23–24 | Helm Commands | ✅ | `helm` — keyword "what it means" + verbatim "type the exact command" (skipped for slash/placeholder commands) |
| 25 | Line Handling Commands | ✅ | `lines` — keyword "what it means" + verbatim "type the exact command" |
| 26 | Etiquette | ✅ | `etiquette` — **added** |
| 27 | Coast Guard Ceremonies / Colors Indoctrination | ✅ | `colors` — **added** |
| 28 | Shipboard Customs | ✅ | `shipboard` — **added** |
| 29 | Saluting | ✅ | `saluting` — **added** |
| 30 | Coast Guard Districts | ✅ | `districts` — coverage-shaded map is the only study card; recall name ↔ HQ/area (mixed MC + typed), **numbers not tested** |
| 31–33 | 11 Missions of the U.S. Coast Guard | ✅ | `missions` — role each falls under (Safety/Security/Stewardship, 3-choice) **plus** typed keyword recall of its activities |
| 33 | Recognized Distress Signals | ✅ | `distress` — image recognition (17, incl. inland flashing light); show the self-authored SVG (`images/distress/`), type the signal **verbatim** (packet chart label) |
| 34 | Fundamentals of Damage Control | ✅ | `damage` — **added** |
| 35 | Four Classes of Fires | ✅ | `fires` — **added** |
| 36 | Radios and Messages — prowords | ✅ | `radio` — keyword "what it means" + verbatim "type the exact proword" |
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

- **Resolved:** the mangled/duplicate extraction blocks (`facts_and_reference.*`,
  `rules_and_procedures.*`, `visual_and_identification.lights_and_dayshapes` / `ceremonies`) have
  been **removed** from the JSON now that the clean versions live in `study_additions.*`. The file
  dropped from ~101 KB to ~80 KB and `data.js` reads only live paths.
- Rank insignia images are public-domain U.S. Government works from Wikimedia Commons; see
  `images/ranks/CREDITS.md` for provenance. E-1/E-2/E-3 have no distinct device in the packet and
  are studied as text.
- Enlisted rating specialty marks (23) are public-domain U.S. Government works from Wikimedia
  Commons; see `images/ratings/CREDITS.md`. Each rating generates three questions (identify the
  name, identify the abbreviation, define the duties — keyword-graded).
- Mission names in `matching.coast_guard_missions` contain a line break in
  "Ports, Waterways, and Coastal\nSecurity" — cosmetic only.

## Remaining to reach "everything"

All packet content is now wired **except Chapter 2 — Appearance & Grooming (pp. 50–64)**,
which is **deferred by the owner**.

Notes:
- **Lights & Dayshapes** images are self-authored SVGs in `images/lights/` built to the COLREGS
  standard (the packet pages are images with no extractable text). Day panel = dayshapes, night
  panel = all-round lights + sidelights.
- **Distress Signals** were transcribed from the packet page (p. 33), not the old
  `facts_and_reference.distress_signals` array, whose captions were wrong (it listed
  "radio-telegraph/telephone alarm" where the packet shows Inmarsat / Digital Selective Calling).
  Graded verbatim per the owner; swap to recognition by removing `verbatim` in `curriculum.js`.
