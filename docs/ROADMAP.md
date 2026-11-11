# Roadmap & product direction

## What this is

A **modular study platform for the entire USCGA boards packet**. Its job is to help 4/c cadets
(1) pass final boards and (2) pass the section-by-section tests they get throughout the year.

Design principle (set by the owner): **keep it element-pick, not a heavy "course."** Cadets choose
exactly the sections they need and study or test them. Units are a light topical label for
organization only — not a path cadets must walk through, and no "weeks" scheduling.

## How testing is graded (owner's rules)

Configured in `curriculum.js`:

- **Whole test:** need **90%** correct overall to pass (`passOverall`).
- **Verbatim sections — exact wording:** General Orders, Academy Mission, Coast Guard Ethos.
  Marked `verbatim: true`. (Distress Signals were initially verbatim but are now image recognition —
  see below.)
- **Everything else — keywords, not structure:** a typed answer passes if it contains at least
  **70%** of the expected answer's key terms (`keywordThreshold`). Word order and phrasing don't matter.

The keyword grader (`keywordScore` in `app.js`) derives key terms from the answer automatically
(drops stopwords/short words, stems lightly, keeps numbers), so no per-item authoring is required.
A fact may override those with an explicit `keywords` list when the heuristic needs help. Verbatim
grading ignores punctuation/whitespace (still exact words, in order).

## Status

### ✅ Done
- Full content pipeline (flat flashcard model: JSON → `data.js` → `app.js`, 4 practice modes,
  per-item mastery in localStorage).
- Content added as **separate sets** (one packet section = one set): nautical dictionary;
  etiquette / colors / shipboard customs / saluting; radio procedures; damage control; fire classes;
  interactive Coast Guard districts map. (See `CONTENT-STATUS.md`.)
- **Phase 1 — graded Test mode.** "Test" mode: each selected section is scored by its own rule from
  `curriculum.js` (verbatim typed vs. recognition), with a pass/fail results screen showing per-section
  scores, pass marks, a verbatim badge, and a "to review" list of missed items. Verbatim questions also
  carry a "Verbatim · word-for-word" badge while answering.
- **Phase 2 — Smart Review.** "Review" mode drills your weakest items first (lowest mastery), across
  your selected sets or everything if none are selected.
- **Phase 3 — Keyword-recall grading.** Non-verbatim test answers are typed and graded on key terms
  (≥70%), not exact wording; whole-test pass is 90%. Feedback shows "key points · X of Y" and what was
  missed. (Assets stay recognition; verbatim stays exact.)
- **Modes simplified to four:** Study, Practice (mixed drilling), Test (graded), Review (weak-first).
  Matching/Recall/Exact folded into Practice (verbatim sections ask for full wording there).
- **Mastery section grouped** into collapsible per-category rows (mastered/total + bar) instead of a
  flat 268-item list.
- **Session length** control (All / 10 / 20 / 30).

- **Phase 4 — Content completion (all but grooming).** Ranks, Enlisted Ratings, Flags & Ensigns,
  Lights & Dayshapes (self-authored COLREGS SVGs in `images/lights/`), and Distress Signals
  (verbatim, transcribed from the packet page). Added a `recognition` section flag for
  identifier/visual content. Deck ≈ 348 items. Only **Chapter 2 grooming** remains, and it is
  deferred by the owner.

### ✅ Done (this round)
- **Keyword-list overrides + verbatim leniency** (test-trust hardening). A fact can pin explicit
  `keywords`; verbatim grading ignores punctuation/whitespace (exact words, order preserved).
- **Rank insignia — visual recognition.** The Ranks set now shows the insignia image and asks for
  the rank: CG/Navy officer shoulder boards (O-1→O-10), CG warrant officers (CWO2→4), joint
  Army/USMC/AF collar devices (O-1→O-10), and CG enlisted collar devices (E-4→E-9 + CPOCG). Images
  are public-domain U.S. Government works (`images/ranks/`, see `CREDITS.md`). Distractors stay
  within an `insigniaGroup`. E-1→E-3 remain text (no device in the packet).
- **Dead-JSON cleanup.** Removed the unused mangled/duplicate blocks from the packet JSON
  (~101 KB → ~80 KB); `data.js` reads only live paths.
- **Enlisted ratings — specialty-mark recognition.** The 23 ratings now show the specialty mark and
  ask you to identify the **name** and the **abbreviation** from it, plus a keyword-graded
  **definition** of the rating's duties. Marks are public-domain U.S. Government works
  (`images/ratings/`, see `CREDITS.md`). Replaces the old name↔abbreviation text pairs.
- **Practice start-button crash fixed.** A fill-in-the-blank (cloze) question crashed when a set's
  answers were short (e.g. rating abbreviations), aborting the whole session build so "Start" did
  nothing until the randomness happened to avoid it. Cloze now only fires when there's a long-enough
  word to blank, in the non-reversed direction.
- **Mastery model fixed.** Mastery (0–5) now climbs with each correct recall and dips on a miss, so
  **every** question type can reach "Mastered". The old breadth formula awarded points for
  front/back/verbatim answers, so recognition-only sets (ranks, ratings, assets) only ever had one
  direction and were permanently capped at 2/5 — the dashboard could never show them mastered and
  the "to review" count never dropped. Verbatim recall counts double. Also fixed `masteryFor` for
  assets, which averaged over a fixed 11-key list so assets missing fields (no hull number/range)
  could never average to 5.
- **Grouped practice-set picker.** The ~23 sets are now grouped by curriculum **unit** (topic) into
  cards, each with a one-click tri-state header that selects/clears the whole topic. Generated from
  the data + `curriculum.js` so it stays in sync. Easier to scan and select on desktop and phone.
- **Distress-signal visuals.** The 17 recognized distress signals now each show a self-authored SVG
  depiction (`images/distress/`, order matches the packet list), redrawn to match the packet p.33
  "Recognized Distress Signals" chart — the orange flag with black square & ball, red star shells,
  parachute red flare, N-over-C code flags, blue pistol, yellow air horn, wave-arms, etc. No captions
  or identifying text appear on any image, so the user is tested on visual recognition, not reading a
  label. Previously the set was text-only; the images simply didn't exist.
- **Distress is now true image recognition.** In Practice/Test the distress question shows only the
  image and asks "Which distress signal is this?" — the describing text is no longer printed as the
  prompt (it used to name the signal above its own picture, defeating recognition). The answer is the
  packet description, graded on key terms (≥70%), not verbatim. Facts carry an `imageRecognition` flag
  (`makeImageRecallQuestion` in app.js); `curriculum.js` marks distress `recognition: true`. Study mode
  still shows everything for browsing.
- **Mission scope trimmed.** The Academy Mission set drops the origin/composition card (who composed
  it, when) — only the mission statement itself is tested.
- **Missions → role + keywords.** Each of the 11 Coast Guard missions gets two questions
  (`makeMissionQuestions`, `roleChoice` flag; mastery averages both): a 3-choice "which maritime role?"
  (Safety / Security / Stewardship, packet pp. 31–33; e.g. Drug Interdiction → Maritime Security) and a
  typed keyword recall of its activities, so cadets still learn each mission's key terms.
- **Districts reworked.** District **numbers are no longer tested** — recall is name ↔ HQ (location) and
  name ↔ area (LANT/PAC), as a **mix of multiple-choice and typed** questions (`makeDistrictQuestion`,
  `districtQ` flag). The "what is the HQ?" typed question is **verbatim** — city *and* state abbreviation
  required (e.g., "Boston, MA"). In **study** mode the set is only the "Nine districts in two areas" map slide (every
  name/HQ/area is on its legend; the individual cards exist only to be quizzed). The map now **shades
  each district's coverage** with a name label (no numbers), from `DISTRICT_STATES` in app.js
  (state→district approximated from the packet p.30 map — verify).
- **Grading pass across the visual + command sets.** Nautical flags and Flags & Ensigns moved to
  **recognition** (multiple choice). Distress signals are now typed **verbatim** (the packet chart label,
  e.g. "Red star shells"), not keyword. Helm commands, line-handling commands, and prowords (`termSet`
  flag, `makeTermQuestions`) now get a keyword "what does it mean" question **plus** a verbatim "type the
  exact command/proword" question — the exact half is skipped for terms that can't be typed word-for-word
  (slashes/placeholders like "RIGHT/LEFT ### DEGREES RUDDER"). Mastery averages whichever halves exist.

### ▶ Next (in priority order)
1. **Progress export/import** — back up / move a browser's progress (JSON download + restore);
   progress is `localStorage`-only, so it's trapped per-browser/device today.
2. **Section-test tracking** — record per-section test history over time.
3. **Mobile polish** — picker is now grouped by topic (desktop + phone); continue refining mastery
   groups and the results screen on a phone as needed.
4. **Chapter 2 grooming** — when the owner un-defers it (large policy tables; extractable text).

### Deliberately NOT doing (for now)
- A unit/week "course" structure or guided curriculum path — the owner wants element-pick to stay
  the core interaction.
- **Time-based spaced repetition / due dates** — considered and set aside: the owner is wary of
  calendar scheduling given holiday breaks and exam-heavy weeks. Review stays weakness-first
  (lowest mastery), with no due-date pressure.

## Where things live

- `curriculum.js` — `window.CURRICULUM`: per-section `{ unit, test:{mode,pass}, verbatim }` + `for(category)`.
- `data.js` — flattens packet JSON into `facts`.
- `app.js` — engine; Test mode is `state.mode === 'test'`, graded via `CURRICULUM.for(...)`.
- See `DEVELOPMENT.md` for architecture and how to add a study set.
