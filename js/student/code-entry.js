/* js/student/code-entry.js — Ученик: ввод кода и выбор разделов */
/* ---------------------------------------------------------
   УЧЕНИК: вход по коду и прохождение теста (по секциям)
--------------------------------------------------------- */
let currentCode = null;
let currentEntry = null;
let currentTest = null;
let currentSections = [];
let currentSectionQueue = [];
let currentSectionPos = 0;
let sectionAnswers = [];

async function startTestByCode(){
  const err = document.getElementById('sError');
  if(!FIREBASE_CONFIGURED){ err.textContent = 'Сайт ещё не подключён к базе данных — обратитесь к репетитору.'; return; }
  const code = document.getElementById('sCode').value.trim().toUpperCase();
  if(!code){ err.textContent = 'Введите код.'; return; }
  const btn = event.target;
  btn.disabled = true; btn.textContent = 'Проверяю…';
  err.textContent = '';
  try{
    const entry = await fetchCode(code);
    if(!entry){ err.textContent = 'Код не найден. Проверьте правильность ввода.'; return; }
    if(entry.status === 'done'){ err.textContent = 'Этот тест уже был пройден по данному коду.'; return; }

    await ensureCustomTestsLoaded();
    const test = findTest(entry.testId);
    if(!test){ err.textContent = 'Тест не найден (возможно, был удалён).'; return; }

    currentCode = code;
    currentEntry = entry;
    currentTest = test;
    currentSections = getTestSections(test);

    const indices = Array.isArray(entry.selectedSections) && entry.selectedSections.length
      ? entry.selectedSections
      : currentSections.map((_,idx)=>idx);
    beginSectionFlow(indices);
  } catch(e2){
    err.textContent = 'Не удалось проверить код. Проверьте интернет-соединение и попробуйте снова.';
  } finally{
    btn.disabled = false; btn.textContent = 'Начать тест';
  }
}

function renderSectionPicker(){
  show('view-student');
  document.getElementById('student-sections-picker').classList.remove('hidden');
  document.getElementById('student-test').classList.add('hidden');
  document.getElementById('student-result').classList.add('hidden');
  document.getElementById('pickerTestHeader').textContent = `${currentTest.title} — ${currentEntry.studentName}`;
  document.getElementById('pickerAllSections').checked = true;
  document.getElementById('pickerError').textContent = '';

  document.getElementById('sectionCardsWrap').innerHTML = currentSections.map((s,idx)=>{
    const qCount = sectionQuestionCount(s);
    const desc = s.type === 'writing' ? `${s.minWords}–${s.maxWords} слов` : `${qCount} вопрос(ов)`;
    return `
      <div class="section-card selected" data-section-idx="${idx}" onclick="toggleSectionCard(${idx})">
        <div class="sc-icon">${sectionIcon(s.type)}</div>
        <div class="sc-title">${escapeHtmlAttr(s.title || sectionDefaultTitle(s.type))}</div>
        <div class="sc-desc">${desc}</div>
      </div>`;
  }).join('');
}

function toggleSectionCard(idx){
  const card = document.querySelector(`.section-card[data-section-idx="${idx}"]`);
  if(card) card.classList.toggle('selected');
  const cards = document.querySelectorAll('.section-card');
  document.getElementById('pickerAllSections').checked = Array.from(cards).every(c=>c.classList.contains('selected'));
}
function toggleAllSectionCards(){
  const checked = document.getElementById('pickerAllSections').checked;
  document.querySelectorAll('.section-card').forEach(c=>c.classList.toggle('selected', checked));
}
function confirmSectionSelection(){
  const selected = Array.from(document.querySelectorAll('.section-card.selected')).map(c=>parseInt(c.dataset.sectionIdx,10));
  const errEl = document.getElementById('pickerError');
  if(!selected.length){ errEl.textContent = 'Выберите хотя бы один раздел.'; return; }
  errEl.textContent = '';
  beginSectionFlow(selected);
}

function beginSectionFlow(indices){
  currentSectionQueue = indices;
  currentSectionPos = 0;
  sectionAnswers = [];
  show('view-student');
  document.getElementById('student-sections-picker').classList.add('hidden');
  document.getElementById('student-test').classList.remove('hidden');
  document.getElementById('student-result').classList.add('hidden');
  renderCurrentSection();
}
