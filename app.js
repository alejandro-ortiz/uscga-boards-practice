const $ = (id) => document.getElementById(id);
const state = { data: null, questions: [], current: 0, score: 0, answered: false, mode: 'study', categories: ['helm', 'lines'] };
const progress = JSON.parse(localStorage.getItem('boards-command-progress') || '{}');
const stats = JSON.parse(localStorage.getItem('boards-practice-stats') || '{"answered":0,"correct":0,"missed":0}');
stats.answered ||= 0; stats.correct ||= 0; stats.missed ||= 0;
const modeInfo = {
  study: { label: 'Study', hint: 'Browse every packet item with the answer visible. Say it aloud before revealing the next card.' },
  practice: { label: 'Practice', hint: 'Mixed drilling — recognition and typing. Verbatim sections ask for the full wording. Not graded.' },
  test: { label: 'Test', hint: 'Graded test. Verbatim sections are typed word-for-word; the rest pass on ~70% of the key terms. Need 90% overall to pass.' },
  review: { label: 'Review', hint: 'Drills your weakest items first (across your selected sets, or everything if none are selected). Set a session length to keep it focused.' }
};
const categoryLabels = { all: 'Everything', mission: 'Academy mission', ethos: 'Coast Guard ethos', sentry: 'General orders', helm: 'Helm commands', lines: 'Line handling', radio: 'Radio prowords', radio_proc: 'Radio procedures', missions: 'Coast Guard missions', districts: 'Coast Guard districts', ratings: 'Enlisted ratings', ranks: 'Ranks', etiquette: 'Etiquette', colors: 'Colors indoctrination', shipboard: 'Shipboard customs', saluting: 'Saluting', damage: 'Damage control', fires: 'Fire classes', nautical: 'Nautical dictionary', flags: 'Nautical flags', ensigns: 'Flags & ensigns', lights: 'Lights & dayshapes', distress: 'Distress signals', assets: 'Coast Guard assets' };

function facts() { return state.data.facts.filter((fact) => state.categories.some((category) => category === fact.category || category === 'assets' && fact.category.startsWith('asset_'))); }
function shuffle(items) { return [...items].sort(() => Math.random() - 0.5); }
function getProgress(fact) {
  const progressId = fact.progressId || fact.id;
  progress[progressId] ||= { seen: 0, correct: 0, incorrect: 0, frontCorrect: 0, backCorrect: 0, exactCorrect: 0, mastery: 0 };
  const item = progress[progressId];
  if (!Number.isFinite(item.frontCorrect) || !Number.isFinite(item.backCorrect) || !Number.isFinite(item.exactCorrect)) {
    item.seen = 0; item.correct = 0; item.incorrect = 0; item.frontCorrect = 0; item.backCorrect = 0; item.exactCorrect = 0; item.mastery = 0;
  }
  return item;
}
function saveProgress() { localStorage.setItem('boards-command-progress', JSON.stringify(progress)); }
function normalize(value) { return value.toLowerCase().replace(/\s+/g, ' ').trim(); }
// Verbatim grading leniency: still requires the exact words in order, but ignores punctuation,
// apostrophes and stray whitespace so a right answer never fails on a trailing period or a comma.
function normalizeExact(value) { return normalize(value).replace(/[’']/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
function exactWord(value) { return normalize(value).replace(/[’']/g, '').replace(/[^a-z0-9]/g, ''); }
function escapeHtml(value) { return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }

// Keyword grading for non-verbatim test answers: pass on ~70% of the key terms, word order aside.
const STOPWORDS = new Set('a an the of to in on at and or but for with by from as is are was were be been being this that these those it its your you yours our their his her they them he she we me not no do does into out over under off up down than then so such also may can will shall should would could any all each both more most other some only own same few your when what which who whom whose how why where'.split(' '));
function stemWord(word) { return word.replace(/(ings|ing|edly|ied|ies|ed|es|s|ly)$/, ''); }
function keyTerms(text) {
  const seen = new Set(); const terms = [];
  normalize(text).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).forEach((word) => {
    if (!word) return;
    const isNumber = /\d/.test(word);
    if (!isNumber && (word.length < 3 || STOPWORDS.has(word))) return;
    const stem = isNumber ? word : stemWord(word);
    if (stem && !seen.has(stem)) { seen.add(stem); terms.push(stem); }
  });
  return terms;
}
function keywordScore(submitted, expected, explicit) {
  const givenStems = new Set(keyTerms(submitted));
  const givenFlat = normalize(submitted).replace(/[^a-z0-9]/g, '');
  const hit = (term) => givenStems.has(term) || (term.length >= 4 && givenFlat.includes(term));
  // Explicit keyword list (from a fact's `keywords`) overrides the auto-derived terms. Each entry
  // may be a phrase; it counts as matched only when every key word in it is present.
  if (Array.isArray(explicit) && explicit.length) {
    const missed = [];
    const matched = explicit.filter((kw) => { const parts = keyTerms(kw); const ok = parts.length > 0 && parts.every(hit); if (!ok) missed.push(kw); return ok; });
    return { matched: matched.length, total: explicit.length, ratio: matched.length / explicit.length, missed };
  }
  const terms = keyTerms(expected);
  if (!terms.length) return { matched: 0, total: 0, ratio: 1, missed: [] };
  const matched = terms.filter(hit);
  return { matched: matched.length, total: terms.length, ratio: matched.length / terms.length, missed: terms.filter((term) => !hit(term)) };
}

function startSession() {
  state.mode = document.querySelector('input[name="mode"]:checked').value;
  state.categories = [...document.querySelectorAll('input[name="practiceSet"]:checked')].map((input) => input.value);
  const reviewEverything = state.mode === 'review' && !state.categories.length;
  if (!state.categories.length && !reviewEverything) { $('modeHint').textContent = 'Choose at least one practice set to begin.'; return; }
  const sourceFacts = reviewEverything ? state.data.facts : facts();
  const pool = state.mode === 'review' ? sourceFacts.filter((fact) => !fact.districtsMap).sort((a, b) => masteryFor(a) - masteryFor(b) || Math.random() - 0.5) : shuffle(sourceFacts);
  // Practice / Review question type per fact: verbatim sections ask for full wording, others mix recognition + typing.
  const practiceMode = (fact) => CURRICULUM.for(fact.category).verbatim ? 'exact' : Math.random() < 0.5 ? 'matching' : 'recall';
  let questions;
  // In study mode the districts set is just the one map slide (every district's name, HQ, and area is
  // on its legend) — the individual district cards only exist to be quizzed, not browsed.
  if (state.mode === 'study') questions = pool.filter((fact) => fact.category !== 'districts' || fact.districtsMap);
  else if (state.mode === 'test') questions = pool.flatMap((fact) => makeTestQuestions(fact, pool));
  else questions = pool.flatMap((fact) => fact.districtsMap ? [] : fact.asset ? makeAssetQuestions(fact, pool, practiceMode(fact)) : fact.rating ? makeRatingQuestions(fact, pool) : fact.roleChoice ? makeMissionQuestions(fact) : fact.districtQ ? [makeDistrictQuestion(fact, pool)] : fact.termSet ? makeTermQuestions(fact) : fact.imageRecognition ? [makeImageRecallQuestion(fact)] : fact.insignia ? [makeInsigniaQuestion(fact, pool)] : [makeQuestion(fact, pool, practiceMode(fact))]);
  if (state.mode === 'test' || (state.mode !== 'study' && state.mode !== 'review')) questions = shuffle(questions);
  const cap = $('lengthSelect').value;
  if (cap !== 'all') questions = questions.slice(0, Number(cap));
  state.questions = questions;
  state.current = 0; state.score = 0; state.answered = false; state.results = []; state.missed = [];
  if (!state.questions.length) { $('modeHint').textContent = 'Nothing to practice with those options.'; return; }
  $('setupPanel').classList.add('hidden'); $('commandProgress').classList.add('hidden'); $('resultsPanel').classList.add('hidden'); $('quizPanel').classList.remove('hidden');
  renderQuestion();
}

function makeQuestion(fact, pool, mode = state.mode) {
  if (mode === 'matching') {
    const reverse = Math.random() > 0.5; const answer = reverse ? fact.front : fact.back; const choices = shuffle([answer, ...shuffle(pool.filter((item) => item.id !== fact.id)).slice(0, 3).map((item) => reverse ? item.front : item.back)]);
    return { ...fact, format: 'choice', prompt: reverse ? fact.back : fact.front, answer, choices, direction: reverse ? 'name' : 'meaning' };
  }
  if (mode === 'exact') return { ...fact, format: 'fill', prompt: fact.front, answer: fact.back, exact: true, direction: 'exact' };
  const reverse = Math.random() > 0.5;
  // Cloze (fill-the-blank) only works when the answer has a long-enough word to blank out, and only
  // in the non-reversed direction. Short answers (e.g. a rating abbreviation) skip to a plain prompt.
  const clozeWords = fact.back.split(' ').filter((word) => word.replace(/[^a-z]/gi, '').length > 4);
  if (!reverse && clozeWords.length && Math.random() < 0.35) {
    const blank = clozeWords[Math.floor(Math.random() * Math.min(clozeWords.length, 5))];
    return { ...fact, format: 'fill', prompt: fact.back.replace(blank, '_____'), answer: blank.replace(/[^a-z0-9-]/gi, ''), exact: false, direction: 'cloze' };
  }
  return { ...fact, format: 'fill', prompt: reverse ? fact.back : fact.front, answer: reverse ? fact.front : fact.back, exact: false, direction: reverse ? 'name' : 'meaning' };
}

// Insignia recognition: show the rank insignia image and pick the rank it belongs to.
// Distractors are drawn from the same insignia group (e.g. other Coast Guard officers) so the
// choices are plausible and the student is distinguishing devices, not service tables.
function makeInsigniaQuestion(fact, pool) {
  const pick = (list) => shuffle(list.filter((item) => item.insignia && item.front !== fact.front));
  const sameGroup = pick(pool.filter((item) => item.insigniaGroup === fact.insigniaGroup));
  const otherGroups = pick(pool.filter((item) => item.insigniaGroup !== fact.insigniaGroup));
  const distractors = []; // prefer same-group ranks, then top up from the rest
  for (const item of [...sameGroup, ...otherGroups]) { if (distractors.length >= 3) break; if (!distractors.includes(item.front)) distractors.push(item.front); }
  const choices = shuffle([...new Set([fact.front, ...distractors])]);
  return { ...fact, format: 'choice', prompt: 'Which rank wears this insignia?', promptLabel: 'Identify the rank', answer: fact.front, choices, direction: 'front', insigniaPrompt: true };
}

// Enlisted ratings: identify the rating name AND abbreviation from its specialty mark, then recall
// what the rating does (keyword-graded). Three questions per rating; distractors are other ratings.
function makeRatingQuestions(fact, pool) {
  const others = pool.filter((item) => item.rating && item.front !== fact.front);
  const nameChoices = shuffle([...new Set([fact.front, ...shuffle(others).slice(0, 3).map((item) => item.front)])]);
  const abbrChoices = shuffle([...new Set([fact.back, ...shuffle(others).slice(0, 3).map((item) => item.back)])]);
  return [
    { ...fact, id: `${fact.id}-name`, progressId: `${fact.id}-name`, format: 'choice', prompt: 'Which rating wears this specialty mark?', promptLabel: 'Identify the rating', answer: fact.front, choices: nameChoices, direction: 'front', insigniaPrompt: true },
    { ...fact, id: `${fact.id}-abbr`, progressId: `${fact.id}-abbr`, format: 'choice', prompt: 'Which abbreviation goes with this specialty mark?', promptLabel: 'Identify the abbreviation', answer: fact.back, choices: abbrChoices, direction: 'back', insigniaPrompt: true },
    { ...fact, id: `${fact.id}-def`, progressId: `${fact.id}-def`, format: 'fill', prompt: `What does a ${fact.front} (${fact.back}) do?`, promptLabel: 'Answer in your own words (key points count)', answer: fact.detail, keywordGrade: true, direction: 'meaning' }
  ];
}

// Coast Guard missions: each of the 11 (1) falls under one of three maritime roles and (2) has its own
// key activities. Two questions per mission — a role multiple-choice and a typed keyword recall of the
// activities — so cadets still learn the keywords, not just the category. Mastery averages the two.
const MARITIME_ROLES = ['Maritime Safety', 'Maritime Security', 'Maritime Stewardship'];
function makeMissionQuestions(fact) {
  return [
    { ...fact, id: `${fact.id}-role`, progressId: `${fact.id}-role`, format: 'choice', prompt: `Which maritime role does "${fact.front}" fall under?`, promptLabel: 'Choose the role', answer: fact.back, choices: shuffle([...MARITIME_ROLES]), direction: 'meaning' },
    { ...fact, id: `${fact.id}-act`, progressId: `${fact.id}-act`, format: 'fill', prompt: `What are the key activities and functions of ${fact.front}?`, promptLabel: 'Answer in your own words (key points count)', answer: fact.detail, keywordGrade: true, direction: 'meaning' }
  ];
}

// Coast Guard districts: numbers are not tested. Each district is quizzed on its HQ (location) and its
// area (LANT/PAC), as a mix of multiple-choice and typed questions picked at random. Nothing here is
// keyword-graded — typed answers are verbatim (city + state abbreviation, or the district name), since
// cadets need those exactly. Area Command / HQ facts (no `hq` field) are a multiple-choice city pick.
const AREA_NAMES = { LANT: 'Atlantic Area (LANT)', PAC: 'Pacific Area (PAC)' };
function makeDistrictQuestion(fact, pool) {
  if (!fact.hq) {
    const others = shuffle(pool.filter((item) => item.category === 'districts' && !item.districtsMap && !item.hq && item.id !== fact.id)).slice(0, 3).map((item) => item.back);
    return { ...fact, format: 'choice', prompt: `What is the ${fact.front}?`, promptLabel: 'Choose the city', answer: fact.back, choices: shuffle([...new Set([fact.back, ...others])]), direction: 'meaning' };
  }
  const otherHqs = () => shuffle(pool.filter((item) => item.hq && item.id !== fact.id)).slice(0, 3).map((item) => item.hq);
  const variants = [
    () => ({ ...fact, format: 'choice', prompt: `Where is the ${fact.front} headquartered?`, promptLabel: 'Choose the headquarters', answer: fact.hq, choices: shuffle([...new Set([fact.hq, ...otherHqs()])]), direction: 'meaning' }),
    () => ({ ...fact, format: 'fill', prompt: `What is the ${fact.front}'s headquarters?`, promptLabel: 'Type the city and state abbreviation (e.g., Boston, MA)', answer: fact.hq, exact: true, direction: 'exact' }),
    () => ({ ...fact, format: 'choice', prompt: `Which area is the ${fact.front} in?`, promptLabel: 'Choose the area', answer: AREA_NAMES[fact.area], choices: shuffle(Object.values(AREA_NAMES)), direction: 'meaning' }),
    () => ({ ...fact, format: 'fill', prompt: `Which district is headquartered in ${fact.hq}?`, promptLabel: 'Type the district name (e.g., Northeast District)', answer: fact.front, exact: true, direction: 'exact' })
  ];
  return variants[Math.floor(Math.random() * variants.length)]();
}

// Image-only recognition (distress signals): show the depiction and have the user name the signal,
// typed word-for-word (the `back` is the packet chart label, e.g. "Red star shells"). The describing
// text is deliberately NOT shown — that would give the answer away.
function makeImageRecallQuestion(fact) {
  return { ...fact, format: 'fill', prompt: 'Which distress signal is this?', promptLabel: 'Type the signal, word-for-word', answer: fact.back, exact: true, direction: 'exact' };
}

// Helm/line commands and prowords. Every item gets a keyword "what does it mean" question; terms that
// can be typed verbatim (no slash/placeholder/line break) also get an exact "type the exact term"
// question. Mastery averages whichever sub-questions exist.
const termIsExact = (front) => !/[/#]|\n/.test(front);
const termNoun = (category) => category === 'radio' ? 'proword' : category === 'lines' ? 'line-handling command' : 'helm command';
function makeTermQuestions(fact) {
  const questions = [{ ...fact, id: `${fact.id}-mean`, progressId: `${fact.id}-mean`, format: 'fill', prompt: fact.front, promptLabel: 'Answer in your own words (key points count)', answer: fact.back, keywordGrade: true, direction: 'meaning' }];
  if (termIsExact(fact.front)) questions.push({ ...fact, id: `${fact.id}-term`, progressId: `${fact.id}-term`, format: 'fill', prompt: fact.back, promptLabel: `Type the exact ${termNoun(fact.category)}`, answer: fact.front, exact: true, direction: 'exact' });
  return questions;
}

// Graded test questions: verbatim sections are typed word-for-word; assets are recognition;
// everything else is a typed answer graded on key terms (see keywordScore / answerQuestion).
function makeTestQuestions(fact, pool) {
  if (fact.districtsMap) return [];
  if (fact.roleChoice) return makeMissionQuestions(fact);
  if (fact.districtQ) return [makeDistrictQuestion(fact, pool)];
  if (fact.termSet) return makeTermQuestions(fact);
  if (fact.imageRecognition) return [makeImageRecallQuestion(fact)];
  const cfg = CURRICULUM.for(fact.category);
  if (fact.asset) return makeAssetQuestions(fact, pool, 'matching');
  if (fact.rating) return makeRatingQuestions(fact, pool);
  if (fact.insignia) return [makeInsigniaQuestion(fact, pool)];
  if (cfg.verbatim) return [{ ...fact, format: 'fill', prompt: fact.front, answer: fact.back, exact: true, direction: 'exact' }];
  if (cfg.recognition) return [makeQuestion(fact, pool, 'matching')];
  return [{ ...fact, format: 'fill', prompt: fact.front, answer: fact.back, exact: false, keywordGrade: true, direction: 'meaning', promptLabel: 'Answer in your own words (key points count)' }];
}

function makeAssetQuestions(fact, pool, mode = state.mode) {
  const fields = fact.asset.fields; const relations = [
    ['callSign', 'call sign'], ['class', 'class'], ['length', 'length'], ['hullNumber', 'hull number'], ['range', 'range']
  ].filter(([key]) => fields[key]);
  const questions = [];
  relations.forEach(([key, label]) => {
    questions.push({ ...fact, id: `${fact.id}-${key}-forward`, progressId: `${fact.id}-${key}-forward`, format: mode === 'matching' ? 'choice' : 'fill', assetRelation: true, assetTargetKey: key, sourceLabel: 'name', sourceValue: fields.name, targetLabel: label, targetValue: fields[key], prompt: `What is the ${label} for ${fields.name}?`, promptLabel: mode === 'matching' ? `Choose the ${label}` : `Enter the ${label}`, answer: fields[key], direction: 'front', exact: mode === 'exact' });
    questions.push({ ...fact, id: `${fact.id}-${key}-reverse`, progressId: `${fact.id}-${key}-reverse`, format: mode === 'matching' ? 'choice' : 'fill', assetRelation: true, assetTargetKey: 'name', sourceLabel: label, sourceValue: fields[key], targetLabel: 'name', targetValue: fields.name, prompt: `Which asset has the ${label} ${fields[key]}?`, promptLabel: mode === 'matching' ? 'Choose the asset name' : 'Enter the asset name', answer: fields.name, direction: 'back', exact: mode === 'exact' });
  });
  questions.push({ ...fact, id: `${fact.id}-image`, progressId: `${fact.id}-image`, format: mode === 'matching' ? 'choice' : 'fill', assetRelation: true, assetImagePrompt: true, assetTargetKey: 'name', sourceLabel: 'image', sourceValue: '', targetLabel: 'name', targetValue: fields.name, prompt: 'Which asset is shown?', promptLabel: mode === 'matching' ? 'Choose the asset name' : 'Enter the asset name', answer: fields.name, direction: 'front', exact: mode === 'exact' });
  return questions.map((question) => {
    if (question.format === 'choice') {
      const alternatives = shuffle(pool.filter((item) => item.asset && item.id !== fact.id && item.asset.fields[question.assetTargetKey])).slice(0, 3).map((item) => item.asset.fields[question.assetTargetKey]);
      question.choices = shuffle([...new Set([question.answer, ...alternatives.filter(Boolean)])]);
    }
    return question;
  });
}

function renderQuestion() {
  const question = state.questions[state.current]; state.answered = false;
  $('progressLabel').textContent = state.mode === 'study' ? `Card ${state.current + 1} of ${state.questions.length}` : `Question ${state.current + 1} of ${state.questions.length}`;
  const setLabel = !state.categories.length ? 'Everything' : state.categories.length > 2 ? `${state.categories.length} practice sets` : state.categories.map((category) => categoryLabels[category]).join(' + ');
  $('categoryLabel').textContent = `${setLabel} · ${modeInfo[state.mode].label}`;
  $('progressBar').style.width = `${(state.current / state.questions.length) * 100}%`;
  $('feedback').className = 'feedback hidden'; $('nextButton').classList.add('hidden'); $('backButton').classList.toggle('hidden', state.mode !== 'study' || state.current === 0);
  if (state.mode === 'study') renderStudyCard(question); else renderTestQuestion(question);
}

// States that make up each district's coverage area, approximated from the packet's district map
// (p. 30). Used only to shade the map so the learner can see where each district reaches.
const DISTRICT_STATES = {
  1: ['me', 'nh', 'vt', 'ma', 'ri', 'ct', 'ny'],
  2: ['nj', 'pa', 'de', 'md', 'dc', 'va', 'wv', 'nc', 'sc'],
  3: ['ga', 'fl'],
  4: ['nd', 'sd', 'ne', 'ks', 'ok', 'tx', 'ia', 'mo', 'ar', 'la', 'ms', 'al', 'tn', 'ky', 'co', 'nm'],
  5: ['mn', 'wi', 'il', 'in', 'mi', 'oh'],
  6: ['ca', 'nv', 'az', 'ut'],
  7: ['wa', 'or', 'id', 'mt', 'wy'],
  8: ['ak'],
  9: ['hi']
};
const DISTRICT_COLORS = { 1: '#e06666', 2: '#f6b26b', 3: '#93c47d', 4: '#c27ba0', 5: '#ffd966', 6: '#76a5af', 7: '#b4a7d6', 8: '#6fa8dc', 9: '#a2a2a2' };

function renderDistrictMap(map) {
  const base = window.US_MAP || { viewBox: '8 6 920 585', states: [] };
  const stateDist = {};
  Object.entries(DISTRICT_STATES).forEach(([num, ids]) => ids.forEach((id) => { stateDist[id] = num; }));
  const states = base.states.map((state) => { const num = stateDist[state.id]; return `<path class="map-state" data-dist="${num || ''}" style="fill:${num ? DISTRICT_COLORS[num] : '#e7eaf3'}" d="${state.d}"></path>`; }).join('');
  // No numbers on the map — a small HQ dot plus the district's name. Names are tested, numbers are not.
  const markers = map.items.map((dist) => { const label = dist.name.replace(/\s*District$/, ''); return `<g class="map-marker map-marker--${dist.area.toLowerCase()}" data-num="${dist.num}" tabindex="0" role="button" aria-label="${escapeHtml(dist.name)}, headquarters ${escapeHtml(dist.hq)}, ${dist.area} Area"><text class="map-label" x="${dist.x}" y="${dist.y - 12}" text-anchor="middle">${escapeHtml(label)}</text><circle cx="${dist.x}" cy="${dist.y}" r="6"></circle><title>${escapeHtml(dist.name)} (${escapeHtml(dist.hq)})</title></g>`; }).join('');
  const legendRows = (area) => map.items.filter((dist) => dist.area === area).map((dist) => `<button class="district-legend__row" type="button" data-num="${dist.num}"><span class="district-swatch" style="background:${DISTRICT_COLORS[dist.num]}"></span><span class="district-legend__text"><strong>${escapeHtml(dist.name)}</strong><small>${escapeHtml(dist.hq)}</small></span></button>`).join('');
  $('questionArea').innerHTML = `<p class="question-kicker">${escapeHtml(map.section)}</p><h2 class="question-title">Nine districts in two areas</h2>
    <div class="district-map">
      <div class="district-map__figure"><svg viewBox="${base.viewBox}" role="img" aria-label="Map of the U.S. Coast Guard districts, shaded by coverage area"><g class="map-states">${states}</g><g class="map-markers">${markers}</g></svg></div>
      <div class="district-legend">
        <div class="district-legend__group"><h3>${escapeHtml(map.areas.LANT.name)}</h3>${legendRows('LANT')}<p class="district-legend__cmd">Area Command: ${escapeHtml(map.areas.LANT.command_hq)}</p></div>
        <div class="district-legend__group"><h3>${escapeHtml(map.areas.PAC.name)}</h3>${legendRows('PAC')}<p class="district-legend__cmd">Area Command: ${escapeHtml(map.areas.PAC.command_hq)}</p></div>
        <p class="district-legend__hq">${escapeHtml(map.headquarters)}</p>
      </div>
    </div>
    <p class="district-readout" id="districtReadout" aria-live="polite">Tap a district name or its spot on the map to highlight it.</p>`;
  const highlight = (num) => {
    const dist = map.items.find((item) => String(item.num) === String(num));
    document.querySelectorAll('.map-marker, .district-legend__row').forEach((node) => node.classList.toggle('is-active', node.dataset.num === String(num)));
    document.querySelectorAll('.map-state').forEach((node) => node.classList.toggle('is-active', node.dataset.dist === String(num)));
    if (dist) $('districtReadout').innerHTML = `<strong>${escapeHtml(dist.name)}</strong> — HQ ${escapeHtml(dist.hq)} · ${escapeHtml(dist.area)} Area`;
  };
  document.querySelectorAll('.map-marker').forEach((node) => { node.addEventListener('click', () => highlight(node.dataset.num)); node.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); highlight(node.dataset.num); } }); });
  document.querySelectorAll('.district-legend__row').forEach((node) => node.addEventListener('click', () => highlight(node.dataset.num)));
}

function renderStudyCard(fact) {
  if (fact.districtsMap) {
    renderDistrictMap(fact.districtsMap);
    $('nextButton').classList.remove('hidden'); $('nextButton').textContent = state.current + 1 < state.questions.length ? 'Next card →' : 'Finish study'; return;
  }
  if (fact.asset) {
    const fields = fact.asset.fields; const image = fact.asset.image ? `<img class="study-image" src="${escapeHtml(fact.asset.image)}" alt="${escapeHtml(fields.name)}">` : '';
    $('questionArea').innerHTML = `<p class="question-kicker">${escapeHtml(fact.section)}</p><h2 class="question-title">${escapeHtml(fields.name)}</h2>${image}<div class="study-answer asset-details"><span>Asset details</span><p><strong>Call sign:</strong> ${escapeHtml(fields.callSign || '')}<br><strong>Class:</strong> ${escapeHtml(fields.class || '')}<br><strong>Length:</strong> ${escapeHtml(fields.length || '')}<br><strong>Hull number:</strong> ${escapeHtml(fields.hullNumber || '')}<br><strong>Range:</strong> ${escapeHtml(fields.range || '')}</p></div><p class="study-prompt">Read each identifier aloud before continuing.</p>`;
    $('nextButton').classList.remove('hidden'); $('nextButton').textContent = state.current + 1 < state.questions.length ? 'Next card →' : 'Finish study'; return;
  }
  const image = fact.image ? `<img class="study-image" src="${escapeHtml(fact.image)}" alt="${escapeHtml(fact.front)}">` : '';
  const detail = fact.detail ? `<div class="study-detail"><span>Details</span><p>${escapeHtml(fact.detail)}</p></div>` : '';
  $('questionArea').innerHTML = `<p class="question-kicker">${escapeHtml(fact.section)}</p><h2 class="question-title">${escapeHtml(fact.front)}</h2>${image}<div class="study-answer"><span>Packet answer</span><p>${escapeHtml(fact.back)}</p></div>${detail}<p class="study-prompt">Read the answer aloud, then continue when ready.</p>`;
  $('nextButton').classList.remove('hidden'); $('nextButton').textContent = state.current + 1 < state.questions.length ? 'Next card →' : 'Finish study';
}

function renderTestQuestion(question) {
  const imagePath = question.assetRelation ? question.asset.image : question.image; const image = imagePath ? `<img class="question-image" src="${escapeHtml(imagePath)}" alt="${escapeHtml(question.front || question.answer)}">` : '';
  const response = question.format === 'choice' ? `<div class="answer-grid">${question.choices.map((choice) => `<button class="answer" type="button">${escapeHtml(choice)}</button>`).join('')}</div>` : `<div class="fill-row"><input class="fill-input" id="fillInput" autocomplete="off" placeholder="${question.exact ? 'Type the complete packet wording' : 'Type your answer'}"><button class="submit-button" id="submitAnswer" type="button">Check</button></div>`;
  const promptLabel = question.promptLabel || (question.format === 'choice' ? question.direction === 'name' ? 'Choose the name' : 'Choose the meaning' : question.exact ? 'Type the complete answer' : question.direction === 'name' ? 'Enter the name' : question.direction === 'meaning' ? 'Enter the meaning' : question.direction === 'cloze' ? 'Complete the sentence' : question.section);
  const verbatim = question.exact && CURRICULUM.for(question.category).verbatim;
  const verbatimBadge = verbatim ? '<span class="verbatim-badge">Verbatim · word-for-word</span>' : '';
  $('questionArea').innerHTML = `<div class="question-head"><p class="question-kicker">${escapeHtml(promptLabel)}</p>${verbatimBadge}</div><p class="question-section">${escapeHtml(question.section)}</p><h2 class="question-title">${escapeHtml(question.prompt)}</h2>${image}${response}`;
  document.querySelectorAll('.answer').forEach((button) => button.addEventListener('click', () => answerQuestion(button, question)));
  if (question.format === 'fill') {
    $('submitAnswer').addEventListener('click', () => answerQuestion($('fillInput'), question));
    $('fillInput').addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); answerQuestion($('fillInput'), question); } });
    $('fillInput').focus();
  }
}

function compareText(submitted, expected) {
  const given = submitted.trim().split(/\s+/); const target = expected.trim().split(/\s+/);
  return [...target.map((word, index) => exactWord(given[index] || '') === exactWord(word) ? `<span class="match">${escapeHtml(word)}</span>` : `<mark>${escapeHtml(word)}</mark>`), ...given.slice(target.length).map((word) => `<mark class="extra">${escapeHtml(word)}</mark>`)].join(' ');
}

function answerQuestion(button, question) {
  if (state.answered) return;
  const submitted = question.format === 'choice' ? button.textContent : button.value;
  let keywords = null, isCorrect;
  if (question.keywordGrade) { keywords = keywordScore(submitted, question.answer, question.keywords); isCorrect = keywords.ratio >= CURRICULUM.keywordThreshold; }
  else if (question.exact) { isCorrect = normalizeExact(submitted) === normalizeExact(question.answer); }
  else { isCorrect = normalize(submitted) === normalize(question.answer); }
  state.answered = true; if (isCorrect) state.score += 1;
  state.results.push({ category: question.category, correct: isCorrect });
  if (!isCorrect) state.missed.push({ section: question.section, prompt: question.prompt, answer: question.answer });
  const item = getProgress(question); item.seen += 1; item[isCorrect ? 'correct' : 'incorrect'] += 1; if (isCorrect && question.direction === 'front') item.frontCorrect += 1; if (isCorrect && question.direction === 'back') item.backCorrect += 1; if (isCorrect && question.direction === 'exact') item.exactCorrect += 1;
  // Mastery (0-5) climbs with each correct recall and dips on a miss, so every question type can reach
  // "Mastered". (The old breadth formula awarded points for answering front/back/verbatim, so
  // recognition-only items — ranks, ratings, assets — had just one direction and were capped at 2/5,
  // never counting as mastered.) Verbatim recall, the hardest demonstration, counts double.
  const verbatimHit = isCorrect && question.exact && CURRICULUM.for(question.category).verbatim;
  item.mastery = Math.max(0, Math.min(5, (item.mastery || 0) + (isCorrect ? (verbatimHit ? 2 : 1) : -1))); saveProgress();
  stats.answered += 1; stats[isCorrect ? 'correct' : 'missed'] += 1; localStorage.setItem('boards-practice-stats', JSON.stringify(stats)); updateStats();
  document.querySelectorAll('.answer').forEach((option) => { option.disabled = true; if (normalize(option.textContent) === normalize(question.answer)) option.classList.add('correct'); });
  if (question.format === 'fill') $('fillInput').disabled = true;
  let answer;
  if (question.exact) answer = `<div class="comparison"><span>Your answer</span><p>${escapeHtml(submitted)}</p><span>Packet wording</span><p>${compareText(submitted, question.answer)}</p></div>`;
  else if (question.keywordGrade) answer = `<div class="keyword-feedback"><span>Key points · ${keywords.matched} of ${keywords.total} (need ${Math.round(CURRICULUM.keywordThreshold * 100)}%)${keywords.missed.length ? ` · missed: ${escapeHtml(keywords.missed.join(', '))}` : ''}</span><p>${escapeHtml(question.answer)}</p></div>`;
  else answer = escapeHtml(question.answer);
  const headline = isCorrect ? 'Correct.' : question.keywordGrade ? 'Not enough key points.' : 'Keep this for review.';
  $('feedback').className = 'feedback'; $('feedback').innerHTML = `<strong>${headline}</strong>${answer}`; $('nextButton').classList.remove('hidden');
}

function testResultsHtml() {
  const byCat = {};
  state.results.forEach((result) => { const key = result.category && result.category.startsWith('asset_') ? 'assets' : result.category; (byCat[key] ||= { correct: 0, total: 0 }); byCat[key].total += 1; if (result.correct) byCat[key].correct += 1; });
  const pass = CURRICULUM.passOverall;
  const overallPct = Math.round((state.score / state.questions.length) * 100);
  const overallPass = overallPct >= pass;
  const rows = Object.entries(byCat).map(([key, score]) => { const cfg = CURRICULUM.for(key); const pct = Math.round((score.correct / score.total) * 100); return { key, pct, correct: score.correct, total: score.total, verbatim: cfg.verbatim, pass: pct >= pass }; });
  const rowsHtml = rows.map((row) => `<div class="test-row ${row.pass ? 'is-pass' : 'is-fail'}"><span class="test-row__name">${escapeHtml(categoryLabels[row.key] || row.key)}${row.verbatim ? ' <em>verbatim</em>' : ''}</span><span class="test-row__score">${row.correct}/${row.total} · ${row.pct}%</span></div>`).join('');
  const missedHtml = state.missed.length ? `<details class="test-missed" open><summary>${state.missed.length} to review</summary>${state.missed.map((miss) => `<div class="test-missed__item"><strong>${escapeHtml(miss.section)}</strong><span>${escapeHtml(miss.prompt)}</span><em>${escapeHtml(miss.answer)}</em></div>`).join('')}</details>` : '<p class="test-clean">Perfect — nothing missed.</p>';
  return `<p class="eyebrow">TEST COMPLETE</p><div class="results-score ${overallPass ? 'is-pass' : 'is-fail'}">${overallPct}%</div><p><strong class="${overallPass ? 'verdict-pass' : 'verdict-fail'}">${overallPass ? 'PASS' : 'NOT YET'}</strong> · ${state.score} of ${state.questions.length} correct · need ${pass}% to pass</p><div class="test-rows">${rowsHtml}</div>${missedHtml}<button class="primary-button" id="againButton" type="button">Retake test</button><button class="secondary-button" id="resultsMenuButton" type="button">Practice sets</button>`;
}
function finishSession() {
  $('quizPanel').classList.add('hidden'); $('resultsPanel').classList.remove('hidden');
  if (state.mode === 'test') { $('resultsPanel').innerHTML = testResultsHtml(); }
  else { $('resultsPanel').innerHTML = `<p class="eyebrow">SESSION COMPLETE</p><div class="results-score">${state.mode === 'study' ? 'Study' : `${Math.round((state.score / state.questions.length) * 100)}%`}</div><p>${state.mode === 'study' ? 'You reviewed the selected packet material.' : `${state.score} of ${state.questions.length} correct.`}</p><button class="primary-button" id="againButton" type="button">Start again</button><button class="secondary-button" id="resultsMenuButton" type="button">Practice sets</button>`; }
  $('againButton').addEventListener('click', startSession); $('resultsMenuButton').addEventListener('click', showMenu);
}
function showMenu() { $('quizPanel').classList.add('hidden'); $('resultsPanel').classList.add('hidden'); $('commandProgress').classList.remove('hidden'); $('setupPanel').classList.remove('hidden'); renderMastery(); }
function masteryFor(fact) {
  if (fact.rating) { const scores = ['name', 'abbr', 'def'].map((key) => getProgress({ id: `${fact.id}-${key}` }).mastery); return Math.round(scores.reduce((total, score) => total + score, 0) / scores.length); }
  if (fact.roleChoice) { const scores = ['role', 'act'].map((key) => getProgress({ id: `${fact.id}-${key}` }).mastery); return Math.round(scores.reduce((total, score) => total + score, 0) / scores.length); }
  if (fact.termSet) { const keys = termIsExact(fact.front) ? ['mean', 'term'] : ['mean']; const scores = keys.map((key) => getProgress({ id: `${fact.id}-${key}` }).mastery); return Math.round(scores.reduce((total, score) => total + score, 0) / scores.length); }
  if (!fact.asset) return getProgress(fact).mastery;
  // Average only the sub-questions this asset actually has. makeAssetQuestions only emits a relation
  // when the field is present, so averaging over a fixed key list left absent fields stuck at 0 and
  // an asset could never reach "Mastered". Keys here must match the progressIds there.
  const fields = fact.asset.fields; const keys = ['image'];
  ['callSign', 'class', 'length', 'hullNumber', 'range'].forEach((key) => { if (fields[key]) keys.push(`${key}-forward`, `${key}-reverse`); });
  const scores = keys.map((key) => getProgress({ id: `${fact.id}-${key}` }).mastery);
  return Math.round(scores.reduce((total, score) => total + score, 0) / scores.length);
}
function renderMastery() {
  if (!state.data) return;
  const all = state.data.facts.filter((fact) => !fact.districtsMap);
  const mastered = all.filter((fact) => masteryFor(fact) >= 5).length; const learning = all.filter((fact) => masteryFor(fact) > 0 && masteryFor(fact) < 5).length;
  $('masteredCount').textContent = mastered; $('learningCount').textContent = learning; $('dueCount').textContent = all.length - mastered;
  const filter = $('masteryFilter').value;
  const matchesFilter = (mastery) => filter === 'mastered' ? mastery >= 5 : filter === 'learning' ? mastery > 0 && mastery < 5 : filter === 'needs' ? mastery < 5 : true;
  const order = []; const groups = {};
  all.forEach((fact) => { const key = fact.category && fact.category.startsWith('asset_') ? 'assets' : fact.category; if (!groups[key]) { groups[key] = []; order.push(key); } groups[key].push(fact); });
  const openCats = new Set([...document.querySelectorAll('.mastery-group[open]')].map((node) => node.dataset.cat));
  const html = order.map((key) => {
    const items = groups[key]; const visible = items.filter((fact) => matchesFilter(masteryFor(fact)));
    if (!visible.length) return '';
    const groupMastered = items.filter((fact) => masteryFor(fact) >= 5).length; const pct = Math.round((groupMastered / items.length) * 100);
    const open = (filter !== 'all' || openCats.has(key)) ? ' open' : '';
    const rows = visible.map((fact) => { const mastery = masteryFor(fact); return `<div class="mastery-item"><div><strong>${escapeHtml(fact.front)}</strong><small>${escapeHtml(fact.section)} · ${mastery >= 5 ? 'Mastered' : mastery ? `${mastery}/5` : 'New'}</small></div><div class="mastery-bar" role="progressbar" aria-label="${escapeHtml(fact.front)} mastery" aria-valuenow="${mastery}" aria-valuemin="0" aria-valuemax="5"><span style="width:${mastery * 20}%"></span></div></div>`; }).join('');
    return `<details class="mastery-group" data-cat="${escapeHtml(key)}"${open}><summary><span class="mastery-group__name">${escapeHtml(categoryLabels[key] || key)}</span><span class="mastery-group__meter"><span class="mastery-group__count">${groupMastered}/${items.length}</span><span class="mastery-group__bar"><span style="width:${pct}%"></span></span></span></summary><div class="mastery-group__items">${rows}</div></details>`;
  }).join('');
  $('masteryList').innerHTML = html || '<p class="muted">No items match this filter.</p>';
}
function updateStats() { $('answeredStat').textContent = stats.answered; $('accuracyStat').textContent = `${stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0}%`; $('missedStat').textContent = state.data ? state.data.facts.filter((fact) => !fact.districtsMap && masteryFor(fact) < 5).length : 0; renderMastery(); }
// Build the practice-set picker grouped by curriculum unit (topic). With ~23 sets a flat list is hard
// to scan; grouping them and giving each topic header a one-click select toggle makes picking faster.
function buildPicker() {
  const seen = new Set(); const cats = [];
  state.data.facts.forEach((fact) => { const cat = fact.category.startsWith('asset_') ? 'assets' : fact.category; if (!seen.has(cat)) { seen.add(cat); cats.push(cat); } });
  const byUnit = {};
  cats.forEach((cat) => { const unit = CURRICULUM.for(cat).unit || 'Reference'; (byUnit[unit] ||= []).push(cat); });
  const order = [...(CURRICULUM.units || []), 'Reference'].filter((unit) => byUnit[unit]);
  $('practiceSetGroups').innerHTML = order.map((unit) => {
    const items = byUnit[unit];
    const boxes = items.map((cat) => `<label><input type="checkbox" name="practiceSet" value="${escapeHtml(cat)}"> ${escapeHtml(categoryLabels[cat] || cat)}</label>`).join('');
    return `<div class="set-group"><button type="button" class="set-group__head" aria-pressed="false"><span class="set-group__box" aria-hidden="true"></span><span class="set-group__name">${escapeHtml(unit)}</span><span class="set-group__count">${items.length}</span></button><div class="set-group__items">${boxes}</div></div>`;
  }).join('');
  syncPickerGroups();
}
// Reflect each group header's state: filled check when all of its sets are on, a dash when some are.
function syncPickerGroups() {
  document.querySelectorAll('.set-group').forEach((group) => {
    const boxes = [...group.querySelectorAll('input[name="practiceSet"]')]; const on = boxes.filter((box) => box.checked).length;
    group.classList.toggle('is-all', on > 0 && on === boxes.length); group.classList.toggle('is-some', on > 0 && on < boxes.length);
    group.querySelector('.set-group__head').setAttribute('aria-pressed', on > 0 && on === boxes.length ? 'true' : 'false');
  });
}
// Remember whether the "How it works" intro is collapsed, so returning users see it folded away.
function setupHowTo() {
  const howTo = $('howTo');
  if (!howTo) return;
  try { if (localStorage.getItem('boards-howto-collapsed') === '1') howTo.open = false; } catch (error) { /* storage blocked */ }
  howTo.addEventListener('toggle', () => { try { localStorage.setItem('boards-howto-collapsed', howTo.open ? '0' : '1'); } catch (error) { /* storage blocked */ } });
}

function initialize(data) { state.data = data; buildPicker(); setupHowTo(); data.facts.forEach(getProgress); $('packetTitle').textContent = data.title; $('loadingMessage').textContent = `${data.facts.length} packet items ready.`; $('startButton').disabled = false; renderMastery(); updateStats(); }

$('modeRail').addEventListener('change', () => { $('modeHint').textContent = modeInfo[document.querySelector('input[name="mode"]:checked').value].hint; });
$('selectAllBtn').addEventListener('click', () => { document.querySelectorAll('input[name="practiceSet"]').forEach((input) => { input.checked = true; }); syncPickerGroups(); });
$('clearAllBtn').addEventListener('click', () => { document.querySelectorAll('input[name="practiceSet"]').forEach((input) => { input.checked = false; }); syncPickerGroups(); });
// One click on a topic header selects or clears that whole group; box changes refresh the header state.
$('practiceSetGroups').addEventListener('change', syncPickerGroups);
$('practiceSetGroups').addEventListener('click', (event) => {
  const head = event.target.closest('.set-group__head'); if (!head) return;
  const boxes = [...head.closest('.set-group').querySelectorAll('input[name="practiceSet"]')]; const allOn = boxes.every((box) => box.checked);
  boxes.forEach((box) => { box.checked = !allOn; }); syncPickerGroups();
});
$('startButton').addEventListener('click', startSession); $('menuButton').addEventListener('click', showMenu); $('nextButton').addEventListener('click', () => state.current + 1 < state.questions.length ? (state.current += 1, renderQuestion()) : finishSession());
$('backButton').addEventListener('click', () => { if (state.mode === 'study' && state.current > 0) { state.current -= 1; renderQuestion(); } });
$('masteryFilter').addEventListener('change', renderMastery);
$('resetButton').addEventListener('click', () => { if (window.confirm('Reset all mastery and statistics? This cannot be undone.')) { localStorage.removeItem('boards-command-progress'); localStorage.removeItem('boards-practice-stats'); window.location.reload(); } });
$('themeButton').addEventListener('click', () => { document.body.classList.toggle('dark-mode'); localStorage.setItem('boards-practice-theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light'); $('themeButton').textContent = document.body.classList.contains('dark-mode') ? 'Light mode' : 'Dark mode'; });
$('creditsButton').addEventListener('click', () => $('creditsDialog').showModal());
$('creditsClose').addEventListener('click', () => $('creditsDialog').close());
$('creditsDialog').addEventListener('click', (event) => { if (event.target === $('creditsDialog')) $('creditsDialog').close(); });
document.addEventListener('keydown', (event) => { if (event.target.matches('input, textarea, select')) return; if (event.key === 'Escape' && !$('quizPanel').classList.contains('hidden')) showMenu(); if (event.key.toLowerCase() === 'n' && state.answered && !$('quizPanel').classList.contains('hidden')) $('nextButton').click(); if (/^[1-4]$/.test(event.key) && !state.answered && !$('quizPanel').classList.contains('hidden')) document.querySelectorAll('.answer')[Number(event.key) - 1]?.click(); if (event.key === 'Enter' && !$('quizPanel').classList.contains('hidden') && state.answered) $('nextButton').click(); });
if (localStorage.getItem('boards-practice-theme') === 'dark') { document.body.classList.add('dark-mode'); $('themeButton').textContent = 'Light mode'; }
window.loadStudyData().then(initialize).catch((error) => { $('loadingMessage').textContent = `Packet data could not load. ${error.message}`; $('loadingMessage').classList.add('error-message'); });
