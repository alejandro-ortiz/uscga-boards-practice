const data = window.STUDY_DATA;
const state = { questions: [], current: 0, score: 0, answered: false, category: 'all', level: 1, mode: 'practice' };
const $ = (id) => document.getElementById(id);
const now = () => Date.now();
const defaultProgress = () => ({ seen: 0, correct: 0, incorrect: 0, mastery: 0, due: 0 });
const progress = JSON.parse(localStorage.getItem('boards-command-progress') || '{}');
const stats = JSON.parse(localStorage.getItem('boards-practice-stats') || '{"answered":0,"correct":0,"missed":0}');
stats.answered ||= 0; stats.correct ||= 0; stats.missed ||= 0;
const modeHints = {
  practice: 'A balanced mix of recognition, recall, cloze, and true/false questions.',
  learn: 'Study each command, say the meaning aloud, then mark whether you knew it.',
  review: 'Practice commands whose next review is due, with weak commands prioritized.',
  exact: 'Type the complete packet meaning and compare your wording with the source.',
  contrast: 'Separate commands that are easy to confuse by testing them side by side.'
};

function factsFor(category) {
  const facts = category === 'helm' ? data.helm : category === 'lines' ? data.lines : [...data.helm, ...data.lines];
  return facts.map((fact) => ({ ...fact, type: fact.id.startsWith('helm') ? 'helm' : 'lines' }));
}
function shuffle(items) { return [...items].sort(() => Math.random() - .5); }
function getProgress(fact) { progress[fact.id] ||= defaultProgress(); return progress[fact.id]; }
function saveProgress() { localStorage.setItem('boards-command-progress', JSON.stringify(progress)); }
function normalize(value) { return value.toLowerCase().replace(/\s+/g, ' ').trim(); }
function categoryName(category) { return category === 'all' ? 'Both command sets' : category === 'helm' ? 'Helm commands' : 'Line handling commands'; }
const confusionGroups = [
  ['helm-0', 'helm-1', 'helm-2', 'helm-3', 'helm-4', 'helm-5'],
  ['helm-6', 'helm-7', 'helm-8', 'helm-9', 'helm-10'],
  ['helm-11', 'helm-12', 'helm-13', 'helm-14', 'helm-15'],
  ['lines-0', 'lines-1', 'lines-2', 'lines-3', 'lines-4', 'lines-5', 'lines-6'],
  ['lines-7', 'lines-8', 'lines-9', 'lines-10', 'lines-11', 'lines-12', 'lines-13', 'lines-14']
];

function dueFacts(pool) {
  const due = pool.filter((fact) => getProgress(fact).due <= now());
  return due.length ? due : [...pool].sort((a, b) => getProgress(a).mastery - getProgress(b).mastery).slice(0, Math.min(8, pool.length));
}

function makeQuestion(fact, pool, forcedMode = state.mode) {
  const level = state.level;
  const other = shuffle(pool.filter((item) => item.id !== fact.id));
  if (forcedMode === 'learn') return { ...fact, format: 'learn', prompt: fact.command, answer: fact.meaning };
  if (forcedMode === 'exact' || level === 3) return { ...fact, format: 'fill', exact: true, prompt: fact.command, answer: fact.meaning };
  if (forcedMode === 'contrast') {
    const group = confusionGroups.find((ids) => ids.includes(fact.id));
    const related = group ? pool.filter((item) => group.includes(item.id) && item.id !== fact.id) : other.slice(0, 3);
    const choices = shuffle([fact.command, ...related.map((item) => item.command)].slice(0, 4));
    return { ...fact, format: 'choice', contrast: true, prompt: `Which command matches this meaning?\n${fact.meaning}`, answer: fact.command, choices };
  }
  const reverse = Math.random() > .5;
  const formatRoll = Math.random();
  if (level === 2 && formatRoll < .5 || level === 1 && formatRoll < .2) {
    const candidates = fact.meaning.split(' ').filter((word) => word.replace(/[^a-z]/gi, '').length > 4);
    const blankTarget = candidates[Math.floor(Math.random() * Math.min(5, candidates.length))] || fact.meaning.split(' ')[0];
    return { ...fact, format: 'cloze', prompt: fact.meaning.replace(blankTarget, '_____'), answer: blankTarget.replace(/[^a-z0-9-]/gi, '') };
  }
  if (formatRoll < .45) {
    const isTrue = Math.random() > .35;
    const related = isTrue ? fact : other[0];
    return { ...fact, format: 'true-false', prompt: `${fact.command} means: ${related.meaning}`, answer: isTrue ? 'true' : 'false' };
  }
  const prompt = reverse ? fact.meaning : fact.command;
  const answer = reverse ? fact.command : fact.meaning;
  const choices = shuffle([answer, ...other.slice(0, 3).map((item) => reverse ? item.command : item.meaning)]);
  return { ...fact, format: 'choice', prompt, answer, choices, reverse };
}

function startPractice() {
  state.category = $('categorySelect').value; state.level = Number($('levelSelect').value); state.mode = $('modeSelect').value;
  const length = Number($('lengthSelect').value); let pool = factsFor(state.category);
  if (state.mode === 'review') pool = dueFacts(pool);
  pool = shuffle(pool).sort((a, b) => getProgress(a).mastery - getProgress(b).mastery);
  state.questions = Array.from({ length }, (_, index) => makeQuestion(pool[index % pool.length], pool));
  state.current = 0; state.score = 0; state.answered = false; state.learnRevealed = false;
  $('setupPanel').classList.add('hidden'); $('resultsPanel').classList.add('hidden'); $('commandProgress').classList.add('hidden'); $('quizPanel').classList.remove('hidden');
  renderQuestion();
}

function renderQuestion() {
  const question = state.questions[state.current]; state.answered = false; state.learnRevealed = false;
  $('progressLabel').textContent = `Question ${state.current + 1} of ${state.questions.length}`;
  $('categoryLabel').textContent = `${categoryName(state.category)} · ${state.mode === 'exact' ? 'Exact recall' : `Level ${state.level}`}`;
  $('progressBar').style.width = `${(state.current / state.questions.length) * 100}%`; $('feedback').className = 'feedback hidden'; $('nextButton').classList.add('hidden');
  let response;
  if (question.format === 'learn') response = '<div class="learn-prompt"><p>Say the meaning aloud before revealing it.</p><button class="primary-button reveal-button" id="revealButton" type="button">Reveal packet meaning</button></div>';
  else if (question.format === 'fill' || question.format === 'cloze') response = `<div class="fill-row"><input class="fill-input" id="fillInput" autocomplete="off" placeholder="${question.exact ? 'Type the complete packet wording' : 'Fill in the missing word'}"><button class="submit-button" id="submitAnswer" type="button">Check</button></div>`;
  else if (question.format === 'true-false') response = '<div class="answer-grid binary-grid"><button class="answer" data-value="true" type="button">True</button><button class="answer" data-value="false" type="button">False</button></div>';
  else response = `<div class="answer-grid">${question.choices.map((choice) => `<button class="answer" type="button">${choice}</button>`).join('')}</div>`;
  const [title, detail] = question.prompt.split('\n');
  $('questionArea').innerHTML = `<p class="question-kicker">${question.format === 'learn' ? 'Study this command' : question.exact ? 'Type the packet wording exactly' : question.format === 'cloze' ? 'Complete the sentence' : question.format === 'true-false' ? 'Check the statement' : question.contrast ? 'Contrast drill' : 'Active recall'}</p><h2 class="question-title">${title}</h2>${detail ? `<p class="question-detail">${detail}</p>` : ''}${response}`;
  document.querySelectorAll('.answer').forEach((button) => button.addEventListener('click', () => answerQuestion(button, question)));
  if (question.format === 'learn') $('revealButton').addEventListener('click', () => revealLearning(question));
  if (question.format === 'fill' || question.format === 'cloze') {
    $('submitAnswer').addEventListener('click', () => answerQuestion($('fillInput'), question));
    $('fillInput').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        answerQuestion($('fillInput'), question);
      }
    });
    $('fillInput').focus();
  }
}

function revealLearning(question) {
  state.learnRevealed = true; $('questionArea').insertAdjacentHTML('beforeend', `<div class="learn-card"><span class="question-kicker">Packet meaning</span><p>${question.answer}</p><div class="learn-actions"><button class="answer correct" id="learnKnown" type="button">I knew this</button><button class="answer incorrect" id="learnReview" type="button">Needs review</button></div></div>`);
  $('revealButton').classList.add('hidden'); $('learnKnown').addEventListener('click', () => recordAnswer(question, true)); $('learnReview').addEventListener('click', () => recordAnswer(question, false));
}

function compareText(submitted, expected) {
  const given = submitted.trim().split(/\s+/); const target = expected.trim().split(/\s+/);
  const expectedMarkup = target.map((word, index) => normalize(given[index] || '') === normalize(word) ? `<span class="match">${word}</span>` : `<mark>${word}</mark>`);
  const extra = given.slice(target.length).map((word) => `<mark class="extra">${escapeHtml(word)}</mark>`);
  return [...expectedMarkup, ...extra].join(' ');
}
function escapeHtml(value) { return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }

function answerQuestion(button, question) {
  if (state.answered) return;
  const submitted = question.format === 'fill' || question.format === 'cloze' ? button.value : question.format === 'true-false' ? button.dataset.value : button.textContent;
  const isCorrect = normalize(submitted) === normalize(question.answer); recordAnswer(question, isCorrect, submitted);
}

function recordAnswer(question, isCorrect, submitted = '') {
  state.answered = true; if (isCorrect) state.score += 1;
  const masteryGain = question.format === 'learn' ? 0 : question.exact ? 2 : 1;
  const item = getProgress(question); item.seen += 1; item[isCorrect ? 'correct' : 'incorrect'] += 1; item.mastery = Math.max(0, Math.min(5, item.mastery + (isCorrect ? masteryGain : -1))); item.due = now() + (isCorrect ? [0, 1, 2, 4, 7, 14][item.mastery] : 0) * 86400000; saveProgress();
  stats.answered += 1; stats[isCorrect ? 'correct' : 'missed'] += 1; localStorage.setItem('boards-practice-stats', JSON.stringify(stats)); updateStats();
  document.querySelectorAll('.answer').forEach((option) => { option.disabled = true; if (normalize(option.dataset.value || option.textContent) === normalize(question.answer)) option.classList.add('correct'); });
  if (!isCorrect && question.format !== 'learn' && question.format !== 'fill' && question.format !== 'cloze') document.querySelectorAll('.answer').forEach((option) => { if (option.textContent === submitted) option.classList.add('incorrect'); });
  if (question.format === 'fill' || question.format === 'cloze') $('fillInput').disabled = true;
  const comparison = question.exact ? `<div class="comparison"><span>Your answer</span><p>${escapeHtml(submitted)}</p><span>Packet wording</span><p>${compareText(submitted, question.answer)}</p></div>` : question.answer;
  $('feedback').className = 'feedback'; $('feedback').innerHTML = `<strong>${isCorrect ? 'Correct.' : 'Keep this command in review.'}</strong>${comparison}`; $('nextButton').classList.remove('hidden');
}

function finishPractice() { $('quizPanel').classList.add('hidden'); $('resultsPanel').classList.remove('hidden'); const percent = Math.round((state.score / state.questions.length) * 100); $('resultsPanel').innerHTML = `<p class="eyebrow">SESSION COMPLETE</p><div class="results-score">${percent}%</div><p>${state.score} of ${state.questions.length} correct. Your command mastery has been updated.</p><button class="primary-button" id="againButton" type="button">Practice again <span aria-hidden="true">↻</span></button><button class="secondary-button" id="resultsMenuButton" type="button">Practice sets</button>`; $('againButton').addEventListener('click', startPractice); $('resultsMenuButton').addEventListener('click', showMenu); }
function showMenu() { $('quizPanel').classList.add('hidden'); $('resultsPanel').classList.add('hidden'); $('commandProgress').classList.remove('hidden'); $('setupPanel').classList.remove('hidden'); renderMastery(); }
function renderMastery() {
  const facts = factsFor('all');
  const filter = $('masteryFilter').value;
  const visible = facts.filter((fact) => {
    const item = getProgress(fact);
    if (filter === 'mastered') return item.mastery >= 5;
    if (filter === 'learning') return item.mastery > 0 && item.mastery < 5;
    if (filter === 'needs') return item.mastery < 5;
    return true;
  });
  $('masteredCount').textContent = facts.filter((fact) => getProgress(fact).mastery >= 5).length;
  $('learningCount').textContent = facts.filter((fact) => getProgress(fact).mastery > 0 && getProgress(fact).mastery < 5).length;
  $('dueCount').textContent = facts.filter((fact) => getProgress(fact).seen && getProgress(fact).due <= now()).length;
  $('masteryList').innerHTML = visible.length ? visible.map((fact) => { const item = getProgress(fact); const status = item.mastery >= 5 ? 'Mastered' : item.mastery ? `${item.mastery}/5` : 'New'; return `<div class="mastery-item"><div><strong>${fact.command}</strong><small>${fact.type === 'helm' ? 'Helm' : 'Lines'} · ${status}</small></div><div class="mastery-bar" role="progressbar" aria-label="${fact.command} mastery" aria-valuenow="${item.mastery}" aria-valuemin="0" aria-valuemax="5"><span style="width:${item.mastery * 20}%"></span></div></div>`; }).join('') : '<p class="empty-mastery">No commands match this filter yet.</p>';
}
function updateStats() { $('answeredStat').textContent = stats.answered; $('accuracyStat').textContent = `${stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0}%`; $('missedStat').textContent = factsFor('all').filter((fact) => getProgress(fact).due <= now() && getProgress(fact).seen).length; renderMastery(); }

$('modeSelect').addEventListener('change', () => { $('modeHint').textContent = modeHints[$('modeSelect').value]; });
$('masteryFilter').addEventListener('change', renderMastery);
$('startButton').addEventListener('click', startPractice); $('menuButton').addEventListener('click', showMenu); $('nextButton').addEventListener('click', () => state.current + 1 < state.questions.length ? (state.current += 1, renderQuestion()) : finishPractice());
$('themeButton').addEventListener('click', () => { document.body.classList.toggle('dark-mode'); localStorage.setItem('boards-practice-theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light'); $('themeButton').textContent = document.body.classList.contains('dark-mode') ? 'Light mode' : 'Dark mode'; });
$('focusButton').addEventListener('click', () => { document.body.classList.toggle('focus-mode'); localStorage.setItem('boards-practice-focus', document.body.classList.contains('focus-mode') ? 'focus' : 'full'); $('focusButton').textContent = document.body.classList.contains('focus-mode') ? 'Exit focus' : 'Focus mode'; });
$('resetButton').addEventListener('click', () => { if (!window.confirm('Reset all mastery, review dates, and statistics? This cannot be undone.')) return; localStorage.removeItem('boards-command-progress'); localStorage.removeItem('boards-practice-stats'); window.location.reload(); });
document.addEventListener('keydown', (event) => {
  if (event.target.matches('input, textarea, select')) return;
  if (event.key === 'Escape' && !$('quizPanel').classList.contains('hidden')) showMenu();
  if (event.key.toLowerCase() === 'n' && state.answered && !$('quizPanel').classList.contains('hidden')) $('nextButton').click();
  if (/^[1-4]$/.test(event.key) && !state.answered && !$('quizPanel').classList.contains('hidden') && document.activeElement.tagName !== 'INPUT') {
    document.querySelectorAll('.answer')[Number(event.key) - 1]?.click();
  }
  if (event.key === 'Enter' && !$('quizPanel').classList.contains('hidden') && state.answered) $('nextButton').click();
});
if (localStorage.getItem('boards-practice-theme') === 'dark') { document.body.classList.add('dark-mode'); $('themeButton').textContent = 'Light mode'; }
if (localStorage.getItem('boards-practice-focus') === 'focus') { document.body.classList.add('focus-mode'); $('focusButton').textContent = 'Exit focus'; }
updateStats();
