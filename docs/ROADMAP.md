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
- **Verbatim sections — exact wording:** General Orders, Academy Mission, Coast Guard Ethos, and the
  16 Distress Signals (when added). Marked `verbatim: true`.
- **Everything else — keywords, not structure:** a typed answer passes if it contains at least
  **70%** of the expected answer's key terms (`keywordThreshold`). Word order and phrasing don't matter.

The keyword grader (`keywordScore` in `app.js`) derives key terms from the answer automatically
(drops stopwords/short words, stems lightly, keeps numbers), so no per-item authoring is required.

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

### ▶ Next (in priority order)
1. **Content completion** — wire the remaining packet (enlisted ratings, ranks, flags & ensigns,
   distress signals [verbatim], lights & dayshapes, Chapter 2 grooming), with images where needed.
2. **Keyword-list overrides** — let a section or item specify explicit `keywords` in the JSON to
   override the auto-derived terms where the heuristic is too strict/loose.
3. **Exact-mode leniency** — ignore trivial punctuation/case so verbatim grading fails only on real
   wording errors.
4. **Progress export/import** — back up / move a browser's progress (JSON download + restore).
5. **Mobile polish pass** — the picker, mastery groups, and results on a phone.
6. **Due-based review scheduling** — spacing intervals on top of Smart Review.

### Deliberately NOT doing (for now)
- A unit/week "course" structure or guided curriculum path — the owner wants element-pick to stay
  the core interaction.

## Where things live

- `curriculum.js` — `window.CURRICULUM`: per-section `{ unit, test:{mode,pass}, verbatim }` + `for(category)`.
- `data.js` — flattens packet JSON into `facts`.
- `app.js` — engine; Test mode is `state.mode === 'test'`, graded via `CURRICULUM.for(...)`.
- See `DEVELOPMENT.md` for architecture and how to add a study set.
