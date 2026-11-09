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
const categoryLabels = { all: 'Everything', mission: 'Academy mission', ethos: 'Coast Guard ethos', sentry: 'General orders', helm: 'Helm commands', lines: 'Line handling', radio: 'Radio prowords', radio_proc: 'Radio procedures', missions: 'Coast Guard missions', districts: 'Coast Guard districts', etiquette: 'Etiquette', colors: 'Colors indoctrination', shipboard: 'Shipboard customs', saluting: 'Saluting', damage: 'Damage control', fires: 'Fire classes', nautical: 'Nautical dictionary', flags: 'Nautical flags', assets: 'Coast Guard assets' };

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
function keywordScore(submitted, expected) {
  const terms = keyTerms(expected);
  if (!terms.length) return { matched: 0, total: 0, ratio: 1, missed: [] };
  const givenStems = new Set(keyTerms(submitted));
  const givenFlat = normalize(submitted).replace(/[^a-z0-9]/g, '');
  const hit = (term) => givenStems.has(term) || (term.length >= 4 && givenFlat.includes(term));
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
  if (state.mode === 'study') questions = pool;
  else if (state.mode === 'test') questions = pool.flatMap((fact) => makeTestQuestions(fact, pool));
  else questions = pool.flatMap((fact) => fact.districtsMap ? [] : fact.asset ? makeAssetQuestions(fact, pool, practiceMode(fact)) : [makeQuestion(fact, pool, practiceMode(fact))]);
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
  if (Math.random() < 0.35) {
    const words = fact.back.split(' ').filter((word) => word.replace(/[^a-z]/gi, '').length > 4);
    const blank = words[Math.floor(Math.random() * Math.min(words.length, 5))] || words[0];
    return { ...fact, format: 'fill', prompt: reverse ? fact.front : fact.back.replace(blank, '_____'), answer: reverse ? fact.back : blank.replace(/[^a-z0-9-]/gi, ''), exact: reverse, direction: reverse ? 'meaning' : 'cloze' };
  }
  return { ...fact, format: 'fill', prompt: reverse ? fact.back : fact.front, answer: reverse ? fact.front : fact.back, exact: false, direction: reverse ? 'name' : 'meaning' };
}

// Graded test questions: verbatim sections are typed word-for-word; assets are recognition;
// everything else is a typed answer graded on key terms (see keywordScore / answerQuestion).
function makeTestQuestions(fact, pool) {
  if (fact.districtsMap) return [];
  const cfg = CURRICULUM.for(fact.category);
  if (fact.asset) return makeAssetQuestions(fact, pool, 'matching');
  if (cfg.verbatim) return [{ ...fact, format: 'fill', prompt: fact.front, answer: fact.back, exact: true, direction: 'exact' }];
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

function renderDistrictMap(map) {
  const base = window.US_MAP || { viewBox: '8 6 920 585', states: [] };
  const states = base.states.map((state) => `<path class="map-state" d="${state.d}"></path>`).join('');
  const markers = map.items.map((dist) => `<g class="map-marker map-marker--${dist.area.toLowerCase()}" data-num="${dist.num}" tabindex="0" role="button" aria-label="District ${dist.num}, ${escapeHtml(dist.name)}, headquarters ${escapeHtml(dist.hq)}"><circle cx="${dist.x}" cy="${dist.y}" r="15"></circle><text x="${dist.x}" y="${dist.y}" dy="0.35em" text-anchor="middle">${dist.num}</text><title>${escapeHtml(dist.name)} (${escapeHtml(dist.hq)})</title></g>`).join('');
  const legendRows = (area) => map.items.filter((dist) => dist.area === area).map((dist) => `<button class="district-legend__row" type="button" data-num="${dist.num}"><span class="district-chip district-chip--${area.toLowerCase()}">${dist.num}</span><span class="district-legend__text"><strong>${escapeHtml(dist.name)}</strong><small>${escapeHtml(dist.hq)}</small></span></button>`).join('');
  $('questionArea').innerHTML = `<p class="question-kicker">${escapeHtml(map.section)}</p><h2 class="question-title">Nine districts in two areas</h2>
    <div class="district-map">
      <div class="district-map__figure"><svg viewBox="${base.viewBox}" role="img" aria-label="Map of the nine U.S. Coast Guard districts"><g class="map-states">${states}</g><g class="map-markers">${markers}</g></svg></div>
      <div class="district-legend">
        <div class="district-legend__group"><h3>${escapeHtml(map.areas.LANT.name)}</h3>${legendRows('LANT')}<p class="district-legend__cmd">Area Command: ${escapeHtml(map.areas.LANT.command_hq)}</p></div>
        <div class="district-legend__group"><h3>${escapeHtml(map.areas.PAC.name)}</h3>${legendRows('PAC')}<p class="district-legend__cmd">Area Command: ${escapeHtml(map.areas.PAC.command_hq)}</p></div>
        <p class="district-legend__hq">${escapeHtml(map.headquarters)}</p>
      </div>
    </div>
    <p class="district-readout" id="districtReadout" aria-live="polite">Tap a number or a district name to highlight it.</p>`;
  const highlight = (num) => {
    const dist = map.items.find((item) => String(item.num) === String(num));
    document.querySelectorAll('.map-marker, .district-legend__row').forEach((node) => node.classList.toggle('is-active', node.dataset.num === String(num)));
    if (dist) $('districtReadout').innerHTML = `<strong>District ${dist.num} · ${escapeHtml(dist.name)}</strong> — HQ ${escapeHtml(dist.hq)} · ${escapeHtml(dist.area)} Area`;
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
  const image = fact.image ? `<img class="study-image" src="${escapeHtml(fact.image)}" alt="${escapeHtml(fact.front)} flag">` : '';
  $('questionArea').innerHTML = `<p class="question-kicker">${escapeHtml(fact.section)}</p><h2 class="question-title">${escapeHtml(fact.front)}</h2>${image}<div class="study-answer"><span>Packet answer</span><p>${escapeHtml(fact.back)}</p></div><p class="study-prompt">Read the answer aloud, then continue when ready.</p>`;
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
  return [...target.map((word, index) => normalize(given[index] || '') === normalize(word) ? `<span class="match">${escapeHtml(word)}</span>` : `<mark>${escapeHtml(word)}</mark>`), ...given.slice(target.length).map((word) => `<mark class="extra">${escapeHtml(word)}</mark>`)].join(' ');
}

function answerQuestion(button, question) {
  if (state.answered) return;
  const submitted = question.format === 'choice' ? button.textContent : button.value;
  let keywords = null, isCorrect;
  if (question.keywordGrade) { keywords = keywordScore(submitted, question.answer); isCorrect = keywords.ratio >= CURRICULUM.keywordThreshold; }
  else { isCorrect = normalize(submitted) === normalize(question.answer); }
  state.answered = true; if (isCorrect) state.score += 1;
  state.results.push({ category: question.category, correct: isCorrect });
  if (!isCorrect) state.missed.push({ section: question.section, prompt: question.prompt, answer: question.answer });
  const item = getProgress(question); item.seen += 1; item[isCorrect ? 'correct' : 'incorrect'] += 1; if (isCorrect && question.direction === 'front') item.frontCorrect += 1; if (isCorrect && question.direction === 'back') item.backCorrect += 1; if (isCorrect && question.direction === 'exact') item.exactCorrect += 1; item.mastery = Math.min(5, (item.frontCorrect > 0 ? 1 : 0) + (item.backCorrect > 0 ? 1 : 0) + (item.exactCorrect > 0 ? 2 : 0) + (item.correct >= 3 ? 1 : 0)); if (!isCorrect) item.mastery = Math.max(0, item.mastery - 1); saveProgress();
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
  if (!fact.asset) return getProgress(fact).mastery;
  const keys = ['callSign-forward', 'callSign-reverse', 'class-forward', 'class-reverse', 'length-forward', 'length-reverse', 'hullNumber-forward', 'hullNumber-reverse', 'range-forward', 'range-reverse', 'image']; const scores = keys.map((key) => getProgress({ id: `${fact.id}-${key}` }).mastery);
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
function initialize(data) { state.data = data; data.facts.forEach(getProgress); $('packetTitle').textContent = data.title; $('loadingMessage').textContent = `${data.facts.length} packet items ready.`; $('startButton').disabled = false; renderMastery(); updateStats(); }

$('modeRail').addEventListener('change', () => { $('modeHint').textContent = modeInfo[document.querySelector('input[name="mode"]:checked').value].hint; });
$('selectAllBtn').addEventListener('click', () => document.querySelectorAll('input[name="practiceSet"]').forEach((input) => { input.checked = true; }));
$('clearAllBtn').addEventListener('click', () => document.querySelectorAll('input[name="practiceSet"]').forEach((input) => { input.checked = false; }));
$('startButton').addEventListener('click', startSession); $('menuButton').addEventListener('click', showMenu); $('nextButton').addEventListener('click', () => state.current + 1 < state.questions.length ? (state.current += 1, renderQuestion()) : finishSession());
$('backButton').addEventListener('click', () => { if (state.mode === 'study' && state.current > 0) { state.current -= 1; renderQuestion(); } });
$('masteryFilter').addEventListener('change', renderMastery);
$('resetButton').addEventListener('click', () => { if (window.confirm('Reset all mastery and statistics? This cannot be undone.')) { localStorage.removeItem('boards-command-progress'); localStorage.removeItem('boards-practice-stats'); window.location.reload(); } });
$('themeButton').addEventListener('click', () => { document.body.classList.toggle('dark-mode'); localStorage.setItem('boards-practice-theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light'); $('themeButton').textContent = document.body.classList.contains('dark-mode') ? 'Light mode' : 'Dark mode'; });
$('focusButton').addEventListener('click', () => { document.body.classList.toggle('focus-mode'); localStorage.setItem('boards-practice-focus', document.body.classList.contains('focus-mode') ? 'focus' : 'full'); $('focusButton').textContent = document.body.classList.contains('focus-mode') ? 'Exit focus' : 'Focus mode'; });
document.addEventListener('keydown', (event) => { if (event.target.matches('input, textarea, select')) return; if (event.key === 'Escape' && !$('quizPanel').classList.contains('hidden')) showMenu(); if (event.key.toLowerCase() === 'n' && state.answered && !$('quizPanel').classList.contains('hidden')) $('nextButton').click(); if (/^[1-4]$/.test(event.key) && !state.answered && !$('quizPanel').classList.contains('hidden')) document.querySelectorAll('.answer')[Number(event.key) - 1]?.click(); if (event.key === 'Enter' && !$('quizPanel').classList.contains('hidden') && state.answered) $('nextButton').click(); });
if (localStorage.getItem('boards-practice-theme') === 'dark') { document.body.classList.add('dark-mode'); $('themeButton').textContent = 'Light mode'; }
if (localStorage.getItem('boards-practice-focus') === 'focus') { document.body.classList.add('focus-mode'); $('focusButton').textContent = 'Exit focus'; }
window.loadStudyData().then(initialize).catch((error) => { $('loadingMessage').textContent = `Packet data could not load. ${error.message}`; $('loadingMessage').classList.add('error-message'); });
