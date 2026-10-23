/* js/teacher/create-code-form.js — «Создать код»: выбор учебника, уровня, теста */
/* ---------------------------------------------------------
   ТЕАЧЕР: создание кода
--------------------------------------------------------- */
async function populateTestSelect(){
  await ensureCustomTestsLoaded();
  await populateTeacherBookSelect();
  populateTeacherLevelSelect();
  filterTeacherTestOptions();
}

async function populateTeacherBookSelect(){
  try{
    const snap = await db.collection('books').get();
    cachedBooks = snap.docs.map(d=>({id:d.id, name:d.data().name}));
  } catch(e){ cachedBooks = []; }
  const sel = document.getElementById('tBook');
  if(!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="">Все учебники</option>' + cachedBooks.map(b=>`<option value="${b.name}">${b.name}</option>`).join('');
  if(prev && cachedBooks.some(b=>b.name===prev)) sel.value = prev;
}
function populateTeacherLevelSelect(){
  const sel = document.getElementById('tLevel');
  if(!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="">Все уровни</option>' + LEVELS.map(l=>`<option value="${l}">${l}</option>`).join('');
  if(prev && LEVELS.includes(prev)) sel.value = prev;
}
function onTeacherBookChange(){ filterTeacherTestOptions(); }
function onTeacherLevelChange(){ filterTeacherTestOptions(); }
function onTeacherTestChange(){ updateTeacherTestInfo(); }

function filterTeacherTestOptions(){
  const book = document.getElementById('tBook').value;
  const level = document.getElementById('tLevel').value;
  let filtered = allTests().filter(t=>{
    if(book && t.book !== book) return false;
    if(level && t.level !== level) return false;
    return true;
  });
  filtered = sortTestsNaturally(filtered);
  const sel = document.getElementById('tCourse');
  sel.innerHTML = filtered.length
    ? filtered.map(t=>`<option value="${t.id}">${t.title}</option>`).join('')
    : '<option value="">Нет подходящих тестов</option>';
  updateTeacherTestInfo();
}

async function updateTeacherTestInfo(){
  const testId = document.getElementById('tCourse').value;
  const test = testId ? findTest(testId) : null;
  const topicInput = document.getElementById('tTopic');
  const infoRow = document.getElementById('testInfoRow');
  if(topicInput) topicInput.value = test && test.topic ? test.topic : '';
  if(!test){
    if(infoRow) infoRow.innerHTML = '';
    renderTeacherSectionPicker(null);
    updateTeacherSummary();
    return;
  }
  const qCount = countAutoGradedQuestions(getTestSections(test));
  const estMinutes = Math.max(5, Math.round(qCount * 1.5));
  let avgText = '—';
  if(FIREBASE_CONFIGURED){
    try{
      const snap = await db.collection('codes').where('testId','==',testId).where('status','==','done').get();
      const scores = snap.docs.map(d=>d.data()).filter(c=>c.total>0);
      if(scores.length){
        avgText = Math.round(scores.reduce((s,c)=>s+(c.score/c.total),0)/scores.length*100) + '%';
      }
    } catch(e){ /* оставляем "—" */ }
  }
  if(infoRow){
    infoRow.innerHTML = `
      <div class="info-item"><b>${qCount}</b><span>вопросов</span></div>
      <div class="info-item"><b>${estMinutes} мин</b><span>время на тест</span></div>
      <div class="info-item"><b>${test.level || '—'}</b><span>уровень</span></div>
      <div class="info-item"><b>${avgText}</b><span>средний результат</span></div>
    `;
  }
  renderTeacherSectionPicker(test);
  updateTeacherSummary();
}

function renderTeacherSectionPicker(test){
  const wrap = document.getElementById('teacherSectionPickerWrap');
  const cardsWrap = document.getElementById('teacherSectionCardsWrap');
  if(!test){
    wrap.classList.add('hidden');
    cardsWrap.innerHTML = '';
    return;
  }
  const sections = getTestSections(test);
  if(sections.length <= 1){
    wrap.classList.add('hidden');
    cardsWrap.innerHTML = '';
    return;
  }
  wrap.classList.remove('hidden');
  document.getElementById('tAllSections').checked = true;
  cardsWrap.innerHTML = sections.map((s,idx)=>{
    const qCount = sectionQuestionCount(s);
    const desc = s.type === 'writing' ? `${s.minWords}–${s.maxWords} слов` : `${qCount} вопрос(ов)`;
    return `
      <div class="section-card selected" data-section-idx="${idx}" onclick="toggleTeacherSectionCard(${idx})">
        <div class="sc-icon">${sectionIcon(s.type)}</div>
        <div class="sc-title">${escapeHtmlAttr(s.title || sectionDefaultTitle(s.type))}</div>
        <div class="sc-desc">${desc}</div>
      </div>`;
  }).join('');
}

function toggleTeacherSectionCard(idx){
  const card = document.querySelector(`#teacherSectionCardsWrap .section-card[data-section-idx="${idx}"]`);
  if(card) card.classList.toggle('selected');
  const cards = document.querySelectorAll('#teacherSectionCardsWrap .section-card');
  document.getElementById('tAllSections').checked = Array.from(cards).every(c=>c.classList.contains('selected'));
  updateTeacherSummary();
}
function toggleAllTeacherSectionCards(){
  const checked = document.getElementById('tAllSections').checked;
  document.querySelectorAll('#teacherSectionCardsWrap .section-card').forEach(c=>c.classList.toggle('selected', checked));
  updateTeacherSummary();
}
function getSelectedTeacherSections(test){
  const sections = getTestSections(test);
  if(sections.length <= 1) return sections.map((_,idx)=>idx);
  const selected = Array.from(document.querySelectorAll('#teacherSectionCardsWrap .section-card.selected'))
    .map(c=>parseInt(c.dataset.sectionIdx,10));
  return selected.length ? selected : sections.map((_,idx)=>idx);
}

function updateTeacherSummary(){
  const wrap = document.getElementById('createSummaryWrap');
  if(!wrap) return;
  const book = document.getElementById('tBook').value || '—';
  const level = document.getElementById('tLevel').value || '—';
  const testId = document.getElementById('tCourse').value;
  const test = testId ? findTest(testId) : null;
  let qCount = '—';
  if(test){
    const sections = getTestSections(test);
    const selectedIdx = getSelectedTeacherSections(test);
    qCount = countAutoGradedQuestions(selectedIdx.map(i=>sections[i]));
  }
  wrap.innerHTML = `
    <div class="summary-row"><span class="si">📘</span><div><span class="sl">Учебник</span><span class="sv">${book}</span></div></div>
    <div class="summary-row"><span class="si">📶</span><div><span class="sl">Уровень</span><span class="sv">${level}</span></div></div>
    <div class="summary-row"><span class="si">📄</span><div><span class="sl">Тест</span><span class="sv">${test ? test.title : '—'}</span></div></div>
    <div class="summary-row"><span class="si">🎯</span><div><span class="sl">Тема</span><span class="sv">${test && test.topic ? test.topic : '—'}</span></div></div>
    <div class="summary-row"><span class="si">❓</span><div><span class="sl">Количество вопросов</span><span class="sv">${qCount}</span></div></div>
  `;
}
