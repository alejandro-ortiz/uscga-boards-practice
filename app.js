const $ = (id) => document.getElementById(id);
const state = { data: null, questions: [], current: 0, score: 0, answered: false, mode: 'study', categories: ['helm', 'lines'] };
const progress = JSON.parse(localStorage.getItem('boards-command-progress') || '{}');
const stats = JSON.parse(localStorage.getItem('boards-practice-stats') || '{"answered":0,"correct":0,"missed":0}');
stats.answered ||= 0; stats.correct ||= 0; stats.missed ||= 0;
const modeInfo = {
  study: { label: 'Study', hint: 'Browse every packet item with the answer visible. Say it aloud before revealing the next card.' },
  matching: { label: 'Matching', hint: 'Match commands, orders, prowords, and topics with their meanings. The direction reverses automatically.' },
  recall: { label: 'Recall', hint: 'Type definitions, reverse prompts, and complete missing words from packet sentences.' },
  exact: { label: 'Exact', hint: 'Type the complete packet wording. Spelling, order, and wording matter.' }
};
const categoryLabels = { all: 'Everything', mission: 'Academy mission', ethos: 'Coast Guard ethos', sentry: 'General orders', helm: 'Helm commands', lines: 'Line handling', radio: 'Radio prowords', missions: 'Coast Guard missions', flags: 'Nautical flags' };

function facts() { return state.data.facts.filter((fact) => state.categories.includes(fact.category)); }
function shuffle(items) { return [...items].sort(() => Math.random() - 0.5); }
function getProgress(fact) {
  progress[fact.id] ||= { seen: 0, correct: 0, incorrect: 0, frontCorrect: 0, backCorrect: 0, exactCorrect: 0, mastery: 0 };
  const item = progress[fact.id];
  if (!Number.isFinite(item.frontCorrect) || !Number.isFinite(item.backCorrect) || !Number.isFinite(item.exactCorrect)) {
    item.seen = 0; item.correct = 0; item.incorrect = 0; item.frontCorrect = 0; item.backCorrect = 0; item.exactCorrect = 0; item.mastery = 0;
  }
  return item;
}
function saveProgress() { localStorage.setItem('boards-command-progress', JSON.stringify(progress)); }
function normalize(value) { return value.toLowerCase().replace(/\s+/g, ' ').trim(); }
function escapeHtml(value) { return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }

function startSession() {
  state.mode = $('modeSelect').value;
  state.categories = [...document.querySelectorAll('input[name="practiceSet"]:checked')].map((input) => input.value);
  if (!state.categories.length) { $('modeHint').textContent = 'Choose at least one practice set to begin.'; return; }
  const pool = shuffle(facts());
  state.questions = state.mode === 'study' ? pool : pool.map((fact) => makeQuestion(fact, pool));
  state.current = 0; state.score = 0; state.answered = false;
  $('setupPanel').classList.add('hidden'); $('commandProgress').classList.add('hidden'); $('resultsPanel').classList.add('hidden'); $('quizPanel').classList.remove('hidden');
  renderQuestion();
}

function makeQuestion(fact, pool) {
  if (state.mode === 'matching') {
    const reverse = Math.random() > 0.5; const answer = reverse ? fact.front : fact.back; const choices = shuffle([answer, ...shuffle(pool.filter((item) => item.id !== fact.id)).slice(0, 3).map((item) => reverse ? item.front : item.back)]);
    return { ...fact, format: 'choice', prompt: reverse ? fact.back : fact.front, answer, choices, direction: reverse ? 'name' : 'meaning' };
  }
  if (state.mode === 'exact') return { ...fact, format: 'fill', prompt: fact.front, answer: fact.back, exact: true, direction: 'exact' };
  const reverse = Math.random() > 0.5;
  if (Math.random() < 0.35) {
    const words = fact.back.split(' ').filter((word) => word.replace(/[^a-z]/gi, '').length > 4);
    const blank = words[Math.floor(Math.random() * Math.min(words.length, 5))] || words[0];
    return { ...fact, format: 'fill', prompt: reverse ? fact.front : fact.back.replace(blank, '_____'), answer: reverse ? fact.back : blank.replace(/[^a-z0-9-]/gi, ''), exact: reverse, direction: reverse ? 'meaning' : 'cloze' };
  }
  return { ...fact, format: 'fill', prompt: reverse ? fact.back : fact.front, answer: reverse ? fact.front : fact.back, exact: false, direction: reverse ? 'name' : 'meaning' };
}

function renderQuestion() {
  const question = state.questions[state.current]; state.answered = false;
  $('progressLabel').textContent = state.mode === 'study' ? `Card ${state.current + 1} of ${state.questions.length}` : `Question ${state.current + 1} of ${state.questions.length}`;
  const setLabel = state.categories.length > 2 ? `${state.categories.length} practice sets` : state.categories.map((category) => categoryLabels[category]).join(' + ');
  $('categoryLabel').textContent = `${setLabel} · ${modeInfo[state.mode].label}`;
  $('progressBar').style.width = `${(state.current / state.questions.length) * 100}%`;
  $('feedback').className = 'feedback hidden'; $('nextButton').classList.add('hidden'); $('backButton').classList.toggle('hidden', state.mode !== 'study' || state.current === 0);
  if (state.mode === 'study') renderStudyCard(question); else renderTestQuestion(question);
}

function renderStudyCard(fact) {
  const image = fact.image ? `<img class="study-image" src="${escapeHtml(fact.image)}" alt="${escapeHtml(fact.front)} flag">` : '';
  $('questionArea').innerHTML = `<p class="question-kicker">${escapeHtml(fact.section)}</p><h2 class="question-title">${escapeHtml(fact.front)}</h2>${image}<div class="study-answer"><span>Packet answer</span><p>${escapeHtml(fact.back)}</p></div><p class="study-prompt">Read the answer aloud, then continue when ready.</p>`;
  $('nextButton').classList.remove('hidden'); $('nextButton').textContent = state.current + 1 < state.questions.length ? 'Next card →' : 'Finish study';
}

function renderTestQuestion(question) {
  const image = question.image ? `<img class="question-image" src="${escapeHtml(question.image)}" alt="${escapeHtml(question.front)} flag">` : '';
  const response = question.format === 'choice' ? `<div class="answer-grid">${question.choices.map((choice) => `<button class="answer" type="button">${escapeHtml(choice)}</button>`).join('')}</div>` : `<div class="fill-row"><input class="fill-input" id="fillInput" autocomplete="off" placeholder="${question.exact ? 'Type the complete packet wording' : 'Type your answer'}"><button class="submit-button" id="submitAnswer" type="button">Check</button></div>`;
  const promptLabel = question.format === 'choice' ? question.direction === 'name' ? 'Choose the flag name' : 'Choose the meaning' : question.exact ? 'Type the complete answer' : question.direction === 'name' ? 'Enter the name' : question.direction === 'meaning' ? 'Enter the meaning' : question.direction === 'cloze' ? 'Complete the sentence' : question.section;
  $('questionArea').innerHTML = `<p class="question-kicker">${escapeHtml(promptLabel)}</p><p class="question-section">${escapeHtml(question.section)}</p><h2 class="question-title">${escapeHtml(question.prompt)}</h2>${image}${response}`;
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
  const isCorrect = normalize(submitted) === normalize(question.answer); state.answered = true;
  const item = getProgress(question); item.seen += 1; item[isCorrect ? 'correct' : 'incorrect'] += 1; if (isCorrect && question.direction === 'front') item.frontCorrect += 1; if (isCorrect && question.direction === 'back') item.backCorrect += 1; if (isCorrect && question.direction === 'exact') item.exactCorrect += 1; item.mastery = Math.min(5, (item.frontCorrect > 0 ? 1 : 0) + (item.backCorrect > 0 ? 1 : 0) + (item.exactCorrect > 0 ? 2 : 0) + (item.correct >= 3 ? 1 : 0)); if (!isCorrect) item.mastery = Math.max(0, item.mastery - 1); saveProgress();
  stats.answered += 1; stats[isCorrect ? 'correct' : 'missed'] += 1; localStorage.setItem('boards-practice-stats', JSON.stringify(stats)); updateStats();
  document.querySelectorAll('.answer').forEach((option) => { option.disabled = true; if (normalize(option.textContent) === normalize(question.answer)) option.classList.add('correct'); });
  if (question.format === 'fill') $('fillInput').disabled = true;
  const answer = question.exact ? `<div class="comparison"><span>Your answer</span><p>${escapeHtml(submitted)}</p><span>Packet wording</span><p>${compareText(submitted, question.answer)}</p></div>` : escapeHtml(question.answer);
  $('feedback').className = 'feedback'; $('feedback').innerHTML = `<strong>${isCorrect ? 'Correct.' : 'Keep this for review.'}</strong>${answer}`; $('nextButton').classList.remove('hidden');
}

function finishSession() { $('quizPanel').classList.add('hidden'); $('resultsPanel').classList.remove('hidden'); $('resultsPanel').innerHTML = `<p class="eyebrow">SESSION COMPLETE</p><div class="results-score">${state.mode === 'study' ? 'Study' : `${Math.round((state.score / state.questions.length) * 100)}%`}</div><p>${state.mode === 'study' ? 'You reviewed the selected packet material.' : `${state.score} of ${state.questions.length} correct.`}</p><button class="primary-button" id="againButton" type="button">Start again</button><button class="secondary-button" id="resultsMenuButton" type="button">Practice sets</button>`; $('againButton').addEventListener('click', startSession); $('resultsMenuButton').addEventListener('click', showMenu); }
function showMenu() { $('quizPanel').classList.add('hidden'); $('resultsPanel').classList.add('hidden'); $('commandProgress').classList.remove('hidden'); $('setupPanel').classList.remove('hidden'); renderMastery(); }
function renderMastery() {
  if (!state.data) return;
  const all = state.data.facts; const mastered = all.filter((fact) => getProgress(fact).mastery >= 5).length; const learning = all.filter((fact) => getProgress(fact).mastery > 0 && getProgress(fact).mastery < 5).length;
  const filter = $('masteryFilter').value; const visible = all.filter((fact) => { const mastery = getProgress(fact).mastery; return filter === 'mastered' ? mastery >= 5 : filter === 'learning' ? mastery > 0 && mastery < 5 : filter === 'needs' ? mastery < 5 : true; });
  $('masteredCount').textContent = mastered; $('learningCount').textContent = learning; $('dueCount').textContent = all.length - mastered;
  $('masteryList').innerHTML = visible.map((fact) => { const item = getProgress(fact); return `<div class="mastery-item"><div><strong>${escapeHtml(fact.front)}</strong><small>${escapeHtml(fact.section)} · ${item.mastery >= 5 ? 'Mastered' : item.mastery ? `${item.mastery}/5` : 'New'}</small></div><div class="mastery-bar" role="progressbar" aria-label="${escapeHtml(fact.front)} mastery" aria-valuenow="${item.mastery}" aria-valuemin="0" aria-valuemax="5"><span style="width:${item.mastery * 20}%"></span></div></div>`; }).join('');
}
function updateStats() { $('answeredStat').textContent = stats.answered; $('accuracyStat').textContent = `${stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0}%`; $('missedStat').textContent = state.data ? state.data.facts.filter((fact) => getProgress(fact).mastery < 5).length : 0; renderMastery(); }
function initialize(data) { state.data = data; data.facts.forEach(getProgress); $('packetTitle').textContent = data.title; $('loadingMessage').textContent = `${data.facts.length} packet items ready.`; $('startButton').disabled = false; renderMastery(); updateStats(); }

$('modeSelect').addEventListener('change', () => { $('modeHint').textContent = modeInfo[$('modeSelect').value].hint; });
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
