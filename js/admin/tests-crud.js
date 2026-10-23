/* js/admin/tests-crud.js — Админ: сохранение, правка, импорт и список тестов */
let editingTestId = null;

async function saveAdminTest(){
  const title = document.getElementById('adminTestTitle').value.trim();
  const book = document.getElementById('adminTestBook').value;
  const level = document.getElementById('adminTestLevel').value;
  const topic = document.getElementById('adminTestTopic').value.trim();
  const errEl = document.getElementById('adminError');
  errEl.textContent = '';
  if(!title){ errEl.textContent = 'Введите название теста.'; return; }

  const sectionBlocks = document.querySelectorAll('#adminSectionsWrap .admin-section-block');
  if(!sectionBlocks.length){ errEl.textContent = 'Добавьте хотя бы одну секцию (Grammar, Vocabulary, Reading или Writing).'; return; }

  const sections = [];
  for(const sBlock of sectionBlocks){
    const type = sBlock.dataset.sectionType;
    const sTitle = sBlock.querySelector('.sectionTitleInput').value.trim() || sectionDefaultTitle(type);

    if(type === 'grammar' || type === 'vocabulary'){
      const qBlocks = sBlock.querySelectorAll('.q-block');
      if(!qBlocks.length){ errEl.textContent = `Секция «${sTitle}»: добавьте хотя бы один вопрос.`; return; }
      const questions = [];
      for(const qb of qBlocks){
        const qText = qb.querySelector('.adminQText').value.trim();
        const options = Array.from(qb.querySelectorAll('.adminOpt')).map(i=>i.value.trim());
        const correctRadio = qb.querySelector('input[type=radio]:checked');
        if(!qText || options.some(o=>!o) || !correctRadio){
          errEl.textContent = `Секция «${sTitle}»: заполните все вопросы и варианты, отметьте правильный ответ.`;
          return;
        }
        questions.push({q:qText, options, correct: parseInt(correctRadio.value,10)});
      }
      sections.push({type, title:sTitle, questions});

    } else if(type === 'reading'){
      const text = sBlock.querySelector('.readingTextInput').value.trim();
      const qBlocks = sBlock.querySelectorAll('.q-block');
      if(!text){ errEl.textContent = `Секция «${sTitle}»: добавьте текст для чтения.`; return; }
      if(!qBlocks.length){ errEl.textContent = `Секция «${sTitle}»: добавьте хотя бы один вопрос к тексту.`; return; }
      const questions = [];
      for(const qb of qBlocks){
        const qText = qb.querySelector('.adminQText').value.trim();
        const options = Array.from(qb.querySelectorAll('.adminOpt')).map(i=>i.value.trim());
        const correctRadio = qb.querySelector('input[type=radio]:checked');
        if(!qText || options.some(o=>!o) || !correctRadio){
          errEl.textContent = `Секция «${sTitle}»: заполните все вопросы и варианты, отметьте правильный ответ.`;
          return;
        }
        questions.push({q:qText, options, correct: parseInt(correctRadio.value,10)});
      }
      sections.push({type, title:sTitle, text, questions});

    } else if(type === 'writing'){
      const prompt = sBlock.querySelector('.writingPromptInput').value.trim();
      const minWords = parseInt(sBlock.querySelector('.writingMinWords').value,10) || 0;
      const maxWords = parseInt(sBlock.querySelector('.writingMaxWords').value,10) || 0;
      const criteriaRaw = sBlock.querySelector('.writingCriteria').value.trim();
      const criteria = criteriaRaw ? criteriaRaw.split(',').map(s=>s.trim()).filter(Boolean) : [];
      if(!prompt){ errEl.textContent = `Секция «${sTitle}»: добавьте текст задания.`; return; }
      if(!maxWords || maxWords < minWords){ errEl.textContent = `Секция «${sTitle}»: проверьте лимиты слов (макс. должен быть не меньше мин.).`; return; }
      sections.push({type, title:sTitle, prompt, minWords, maxWords, criteria});
    }
  }

  try{
    const payload = { title, book: book || null, level: level || null, topic: topic || null, sections };
    if(editingTestId){
      await db.collection('tests').doc(editingTestId).update(payload);
    } else {
      payload.createdAt = new Date().toISOString();
      await db.collection('tests').add(payload);
    }
    cancelEditTest();
    invalidateCustomTestsCache();
    loadAdminTestsList();
    populateTestSelect();
    showToast('Тест сохранён');
  } catch(err){
    errEl.textContent = 'Не удалось сохранить тест: ' + err.message;
  }
}

function editCustomTest(id){
  const test = adminAllCustomTests.find(t=>t.id===id);
  if(!test) return;
  editingTestId = id;
  document.getElementById('adminTestTitle').value = test.title || '';
  document.getElementById('adminTestBook').value = test.book || '';
  document.getElementById('adminTestLevel').value = test.level || '';
  document.getElementById('adminTestTopic').value = test.topic || '';
  document.getElementById('adminSectionsWrap').innerHTML = '';
  adminQCounter = 0; adminSectionCounter = 0;
  getTestSections(test).forEach(sec => addAdminSection(sec.type, sec));
  document.getElementById('adminFormTitle').textContent = 'Редактирование теста';
  document.getElementById('saveAdminTestBtn').textContent = 'Сохранить изменения';
  document.getElementById('cancelEditBtn').classList.remove('hidden');
  document.getElementById('adminError').textContent = '';
  document.getElementById('adminFormTitle').scrollIntoView({behavior:'smooth', block:'start'});
}

function cancelEditTest(){
  editingTestId = null;
  document.getElementById('adminTestTitle').value = '';
  document.getElementById('adminTestBook').value = '';
  document.getElementById('adminTestLevel').value = '';
  document.getElementById('adminTestTopic').value = '';
  document.getElementById('adminSectionsWrap').innerHTML = '';
  adminQCounter = 0; adminSectionCounter = 0;
  document.getElementById('adminFormTitle').textContent = 'Добавить новый тест';
  document.getElementById('saveAdminTestBtn').textContent = 'Сохранить тест';
  document.getElementById('cancelEditBtn').classList.add('hidden');
}

async function runBulkImport(){
  const textarea = document.getElementById('bulkImportJson');
  const statusEl = document.getElementById('bulkImportStatus');
  statusEl.textContent = '';
  let data;
  try{
    data = JSON.parse(textarea.value);
  } catch(err){
    statusEl.textContent = 'Не удалось прочитать JSON: ' + err.message;
    return;
  }
  if(!Array.isArray(data) || !data.length){
    statusEl.textContent = 'Ожидается непустой массив тестов в формате JSON.';
    return;
  }

  try{
    const booksSnap = await db.collection('books').get();
    const existingNames = new Set(booksSnap.docs.map(d=>d.data().name));
    const neededBooks = [...new Set(data.map(t=>t.book).filter(Boolean))];
    for(const name of neededBooks){
      if(!existingNames.has(name)){
        await db.collection('books').add({name, createdAt:new Date().toISOString()});
      }
    }
  } catch(err){ /* учебники можно будет добавить вручную, если это не удалось */ }

  let done = 0, failed = 0;
  for(const t of data){
    if(!t.title || !t.sections || !t.sections.length){ failed++; continue; }
    try{
      await db.collection('tests').add({
        title: t.title, book: t.book || null, level: t.level || null, topic: t.topic || null,
        sections: t.sections, createdAt: new Date().toISOString()
      });
      done++;
    } catch(err){
      failed++;
    }
    statusEl.textContent = `Импортирую ${done+failed} из ${data.length}…`;
  }

  statusEl.textContent = `Готово: добавлено ${done} из ${data.length}${failed?`, не удалось: ${failed}`:''}.`;
  textarea.value = '';
  invalidateCustomTestsCache();
  loadAdminTestsList();
  populateTestSelect();
  refreshBookSelectOptions();
  showToast(`Импортировано тестов: ${done}`);
}

async function loadAdminTestsList(){
  const wrap = document.getElementById('adminTestsListWrap');
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  try{
    const snap = await db.collection('tests').get();
    adminAllCustomTests = snap.docs.map(d=>({id:d.id, ...d.data()}));
    renderAdminTestsList();
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить тесты.</p>';
  }
}
function renderAdminTestsList(){
  const bookFilter = document.getElementById('adminFilterBook').value;
  const levelFilter = document.getElementById('adminFilterLevel').value;
  const topicFilter = (document.getElementById('adminFilterTopic').value || '').trim().toLowerCase();
  let filtered = adminAllCustomTests.filter(t=>{
    if(bookFilter && t.book !== bookFilter) return false;
    if(levelFilter && t.level !== levelFilter) return false;
    if(topicFilter && !(t.topic||'').toLowerCase().includes(topicFilter)) return false;
    return true;
  });
  filtered = sortTestsNaturally(filtered);
  const wrap = document.getElementById('adminTestsListWrap');
  if(!filtered.length){ wrap.innerHTML = '<p class="empty-note">Тесты не найдены.</p>'; return; }
  wrap.innerHTML = filtered.map(t=>{
    const secBadges = getTestSections(t).map(s=>sectionIcon(s.type)).join(' ');
    return `
    <div class="cert-test-row">
      <span>${secBadges} ${t.title} <span style="color:var(--ink-dim);font-size:12px;">${[t.book,t.level,t.topic].filter(Boolean).join(' · ')}</span></span>
      <span>
        <button class="secondary small" onclick="editCustomTest('${t.id}')">Редактировать</button>
        <button class="secondary small" onclick="deleteCustomTest('${t.id}')">Удалить</button>
      </span>
    </div>`;
  }).join('');
}
async function deleteCustomTest(id){
  if(!confirm('Удалить тест?')) return;
  await db.collection('tests').doc(id).delete();
  invalidateCustomTestsCache();
  loadAdminTestsList();
  populateTestSelect();
}
