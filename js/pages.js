

/* ---------------------------------------------------------
   НАВИГАЦИЯ
--------------------------------------------------------- */
function show(id){
  ['view-home','view-teacher','view-student','view-vocab'].forEach(v=>{
    document.getElementById(v).classList.toggle('hidden', v !== id);
  });
}
function goHome(){
  show('view-home');
  resetHomeUI();
}
function resetHomeUI(){
  document.getElementById('homeTeacherPanel').classList.remove('hidden');
  document.getElementById('homeStudentPanel').classList.add('hidden');
  document.getElementById('roleTabTeacher').classList.add('active');
  document.getElementById('roleTabStudent').classList.remove('active');
  renderTeacherHomePanel();
}
function renderTeacherHomePanel(){
  const loggedIn = FIREBASE_CONFIGURED && auth.currentUser;
  document.getElementById('teacherLoginForm').classList.toggle('hidden', loggedIn);
  document.getElementById('teacherAlreadyLoggedIn').classList.toggle('hidden', !loggedIn);
  if(loggedIn){
    document.getElementById('teacherAlreadyEmail').textContent = auth.currentUser.email || auth.currentUser.displayName || '';
  }
}
/* ---------------------------------------------------------
   ЛЕНДИНГ: скролл к разделам, CTA-кнопки, живой счётчик тестов
--------------------------------------------------------- */
function scrollToSection(id){
  const el = document.getElementById(id);
  if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
}
function ctaLogin(){
  selectRole('teacher');
  scrollToSection('authSection');
}
function ctaSelectRole(role){
  selectRole(role);
  scrollToSection('authSection');
}
async function loadPublicTestsCount(){
  let count = DEFAULT_TESTS.length;
  if(FIREBASE_CONFIGURED){
    try{
      await ensureCustomTestsLoaded();
      count = allTests().length;
    } catch(e){ /* оставляем количество базовых тестов */ }
  }
  const a = document.getElementById('statTestsCount');
  const b = document.getElementById('previewTestsCount');
  if(a) a.textContent = count + '+';
  if(b) b.textContent = count + '+';
}

function selectRole(role){
  if(role === 'teacher'){
    if(FIREBASE_CONFIGURED && auth.currentUser){
      // Уже вошли — сразу в кабинет, без формы входа
      goTeacher();
      return;
    }
    document.getElementById('homeTeacherPanel').classList.remove('hidden');
    document.getElementById('homeStudentPanel').classList.add('hidden');
    document.getElementById('roleTabTeacher').classList.add('active');
    document.getElementById('roleTabStudent').classList.remove('active');
  } else {
    document.getElementById('homeStudentPanel').classList.remove('hidden');
    document.getElementById('homeTeacherPanel').classList.add('hidden');
    document.getElementById('roleTabStudent').classList.add('active');
    document.getElementById('roleTabTeacher').classList.remove('active');
    document.getElementById('sCode').value = '';
    document.getElementById('sError').textContent = '';
    refreshStudentAuthUI();
  }
}
function goTeacher(){
  show('view-teacher');
  refreshTeacherView();
}
async function refreshTeacherView(){
  const isLoggedIn = FIREBASE_CONFIGURED && auth.currentUser;
  if(!isLoggedIn){
    // Подстраховка: без входа кабинет не открыть — возвращаем на главную с открытой формой входа
    show('view-home');
    selectRole('teacher');
    return;
  }
  document.getElementById('teacherEmailLabel').textContent = auth.currentUser.email || auth.currentUser.displayName || 'Вы вошли';

  const isAdmin = ADMIN_EMAIL !== "ВСТАВЬТЕ_ВАШ_EMAIL_СЮДА"
    && (auth.currentUser.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
  document.getElementById('adminTabBtn').classList.toggle('hidden', !isAdmin);

  // Проверка блокировки
  try{
    const snap = await db.collection('users').doc(auth.currentUser.uid).get();
    const profile = snap.exists ? snap.data() : null;
    const blocked = !!(profile && profile.blocked) && !isAdmin;
    document.getElementById('teacherBlockedNotice').classList.toggle('hidden', !blocked);
    document.getElementById('teacher-tabs-and-panels').classList.toggle('hidden', blocked);
    if(blocked) return;
  } catch(err){ /* если проверка не удалась — не блокируем доступ */ }

  setTeacherTab('create');
}

function setTeacherTab(tab){
  document.querySelectorAll('#teacher-tabs-and-panels .dash-nav-item').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  ['create','results','certs','students','vocab','account','admin'].forEach(t=>{
    const el = document.getElementById('teacher-'+t);
    if(el) el.classList.toggle('hidden', t!==tab);
  });
  const titles = {create:'Создать код', results:'Результаты', certs:'Выдать сертификат', students:'Мои ученики', vocab:'Лексика', account:'Аккаунт', admin:'Админ'};
  const bc = document.getElementById('dashBreadcrumbCurrent');
  if(bc) bc.textContent = titles[tab] || '';
  if(tab==='create') populateTestSelect();
  if(tab==='results') renderResultsTable();
  if(tab==='certs') renderCertificatesPanel();
  if(tab==='students') loadStudentCards();
  if(tab==='vocab') loadWordSetsList();
  if(tab==='account') loadAccountSettings();
  if(tab==='admin') setAdminSubTab('dashboard');
}

async function loadAccountSettings(){
  const lbl = document.getElementById('settingsEmailLabel');
  if(lbl) lbl.textContent = auth.currentUser ? (auth.currentUser.email || '') : '';
  if(!FIREBASE_CONFIGURED || !auth.currentUser) return;
  try{
    const snap = await db.collection('users').doc(auth.currentUser.uid).get();
    const profile = snap.exists ? snap.data() : {};
    document.getElementById('acctDisplayName').value = profile.displayName || '';
    document.getElementById('acctCertSignature').value = profile.certSignature || '';
  } catch(e){ /* оставляем поля пустыми */ }

  const isPasswordUser = auth.currentUser.providerData.some(p=>p.providerId==='password');
  document.getElementById('acctPasswordSection').classList.toggle('hidden', !isPasswordUser);
  document.getElementById('acctPasswordNote').textContent = isPasswordUser ? '' : 'Смена пароля недоступна для входа через Google — пароль управляется вашим Google-аккаунтом.';
}

async function saveAccountSettings(){
  const msgEl = document.getElementById('acctSaveMsg');
  msgEl.textContent = '';
  const displayName = document.getElementById('acctDisplayName').value.trim();
  const certSignature = document.getElementById('acctCertSignature').value.trim();
  try{
    await db.collection('users').doc(auth.currentUser.uid).set({displayName, certSignature}, {merge:true});
    msgEl.textContent = 'Сохранено.';
    const emailLbl = document.getElementById('teacherEmailLabel');
    if(emailLbl) emailLbl.textContent = displayName || auth.currentUser.email || '';
  } catch(err){
    msgEl.textContent = 'Не удалось сохранить: ' + err.message;
  }
}

async function changeAccountPassword(){
  const msgEl = document.getElementById('acctPasswordMsg');
  msgEl.textContent = '';
  const currentPassword = document.getElementById('acctCurrentPassword').value;
  const newPassword = document.getElementById('acctNewPassword').value;
  if(!currentPassword || !newPassword){ msgEl.textContent = 'Заполните оба поля.'; return; }
  if(newPassword.length < 6){ msgEl.textContent = 'Новый пароль должен быть не короче 6 символов.'; return; }
  try{
    const cred = firebase.auth.EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await auth.currentUser.reauthenticateWithCredential(cred);
    await auth.currentUser.updatePassword(newPassword);
    msgEl.textContent = 'Пароль изменён.';
    document.getElementById('acctCurrentPassword').value = '';
    document.getElementById('acctNewPassword').value = '';
  } catch(err){
    msgEl.textContent = authErrorText(err);
  }
}


let editingStudentId = null;
let cachedStudentCards = [];

function toggleStudentForm(){
  const wrap = document.getElementById('studentFormWrap');
  const wasHidden = wrap.classList.contains('hidden');
  if(wasHidden){
    clearStudentForm();
    wrap.classList.remove('hidden');
  } else {
    wrap.classList.add('hidden');
  }
}

function clearStudentForm(){
  editingStudentId = null;
  document.getElementById('studentFormTitle').textContent = 'Новый ученик';
  ['studentFirstName','studentLastName','studentGrade','studentNativeLang','studentPhone','studentEmail',
   'parentName','parentPhone','parentEmail','studentTextbook'].forEach(id=>{
    const el = document.getElementById(id);
    el.value = '';
    el.classList.remove('field-error');
  });
  document.getElementById('studentGoal').value = '';
  document.getElementById('studentLevel').value = '';
  document.getElementById('studentFrequency').value = '';
  document.getElementById('studentDuration').value = '';
  document.getElementById('studentNotes').value = '';
  document.getElementById('studentFormError').textContent = '';
}

function cancelStudentForm(){
  document.getElementById('studentFormWrap').classList.add('hidden');
  clearStudentForm();
}

async function saveStudentCard(){
  const firstNameEl = document.getElementById('studentFirstName');
  const lastNameEl = document.getElementById('studentLastName');
  const firstName = firstNameEl.value.trim();
  const lastName = lastNameEl.value.trim();
  const errEl = document.getElementById('studentFormError');
  errEl.textContent = '';
  firstNameEl.classList.remove('field-error');
  lastNameEl.classList.remove('field-error');

  if(!firstName || !lastName){
    if(!firstName) firstNameEl.classList.add('field-error');
    if(!lastName) lastNameEl.classList.add('field-error');
    errEl.textContent = 'Заполните обязательные поля.';
    return;
  }

  const data = {
    firstName, lastName,
    grade: document.getElementById('studentGrade').value.trim(),
    nativeLang: document.getElementById('studentNativeLang').value.trim(),
    goal: document.getElementById('studentGoal').value,
    studentPhone: document.getElementById('studentPhone').value.trim(),
    studentEmail: document.getElementById('studentEmail').value.trim(),
    parentName: document.getElementById('parentName').value.trim(),
    parentPhone: document.getElementById('parentPhone').value.trim(),
    parentEmail: document.getElementById('parentEmail').value.trim(),
    level: document.getElementById('studentLevel').value,
    textbook: document.getElementById('studentTextbook').value.trim(),
    frequency: document.getElementById('studentFrequency').value,
    duration: document.getElementById('studentDuration').value,
    notes: document.getElementById('studentNotes').value.trim(),
    teacherId: auth.currentUser.uid
  };

  try{
    if(editingStudentId){
      await db.collection('students').doc(editingStudentId).update(data);
    } else {
      data.createdAt = new Date().toISOString();
      await db.collection('students').add(data);
    }
    cancelStudentForm();
    await loadStudentCards();
    showToast('Ученик успешно добавлен');
  } catch(err){
    errEl.textContent = 'Не удалось сохранить: ' + err.message;
  }
}

async function loadStudentCards(){
  const wrap = document.getElementById('studentCardsWrap');
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  try{
    const snap = await db.collection('students').where('teacherId','==',auth.currentUser.uid).get();
    cachedStudentCards = snap.docs.map(d=>({id:d.id, ...d.data()}));
    renderStudentCards();
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить учеников.</p>';
  }
}

function renderStudentCards(){
  const wrap = document.getElementById('studentCardsWrap');
  if(!cachedStudentCards.length){
    wrap.innerHTML = '<p class="empty-note">Пока нет ни одной карточки ученика.</p>';
    return;
  }
  wrap.innerHTML = cachedStudentCards.map(s=>{
    const meta = [s.level, s.grade ? 'класс '+s.grade : ''].filter(Boolean).join(' · ') || '—';
    return `
    <div class="student-card">
      <div class="student-card-head">
        <div>
          <div class="student-card-name">${escapeHtmlAttr(s.firstName)} ${escapeHtmlAttr(s.lastName)}</div>
          <div class="student-card-meta">${meta} · Следующий урок: не назначен</div>
        </div>
      </div>
      <div class="student-card-tabs">
        <button class="secondary small" onclick="toggleStudentTab('${s.id}','lessons')">📅 История уроков</button>
        <button class="secondary small" onclick="toggleStudentTab('${s.id}','homework')">📚 Домашние задания</button>
        <button class="secondary small" onclick="toggleStudentTab('${s.id}','progress')">📊 Прогресс</button>
        <button class="secondary small" onclick="toggleStudentTab('${s.id}','notes')">📝 Заметки</button>
        <button class="secondary small" onclick="editStudentCard('${s.id}')">⚙️ Редактировать</button>
        <button class="secondary small" onclick="deleteStudentCard('${s.id}')">🗑 Удалить</button>
      </div>
      <div class="student-tab-content hidden" id="studentTab_${s.id}" data-open-tab=""></div>
    </div>`;
  }).join('');
}

function toggleStudentTab(id, tab){
  const el = document.getElementById('studentTab_'+id);
  const alreadyOpen = el.dataset.openTab === tab && !el.classList.contains('hidden');
  el.classList.add('hidden');
  el.innerHTML = '';
  el.dataset.openTab = '';
  if(alreadyOpen) return;

  el.dataset.openTab = tab;
  el.classList.remove('hidden');
  const student = cachedStudentCards.find(s=>s.id===id);
  if(!student) return;

  if(tab === 'notes'){
    el.innerHTML = `
      <textarea id="notesEdit_${id}" rows="4" style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--ink);border-radius:7px;padding:10px;">${escapeHtmlAttr(student.notes||'')}</textarea>
      <button class="secondary small" style="margin-top:8px;" onclick="saveStudentNotes('${id}')">Сохранить заметки</button>
    `;
    return;
  }
  if(tab === 'homework'){
    el.innerHTML = '<p class="hint">Отдельный трекер домашних заданий пока не реализован — используйте вкладку «Заметки», чтобы фиксировать, что задано.</p>';
    return;
  }

  el.innerHTML = '<p class="empty-note">Загрузка…</p>';
  fetchAllCodes().then(entries=>{
    const fullName = `${student.firstName} ${student.lastName}`.trim().toLowerCase();
    const matched = entries.filter(e=>(e.studentName||'').trim().toLowerCase() === fullName);
    if(tab === 'lessons'){
      if(!matched.length){
        el.innerHTML = '<p class="empty-note">Пока нет кодов с именем, точно совпадающим с этой карточкой.</p>';
        return;
      }
      el.innerHTML = matched.map(e=>`
        <div class="cert-test-row"><span>${e.testTitle}</span><span>${e.status==='done' ? (e.score+' / '+e.total) : 'ожидание'}</span></div>
      `).join('');
    } else if(tab === 'progress'){
      const done = matched.filter(e=>e.status==='done' && e.total>0);
      if(!done.length){
        el.innerHTML = '<p class="empty-note">Пока нет пройденных тестов с точным совпадением имени.</p>';
        return;
      }
      const avg = Math.round(done.reduce((sum,e)=>sum+(e.score/e.total),0)/done.length*100);
      el.innerHTML = `
        <div class="stat-grid">
          <div class="stat-card"><div class="stat-num">${done.length}</div><div class="stat-label">тестов пройдено</div></div>
          <div class="stat-card"><div class="stat-num">${avg}%</div><div class="stat-label">средний результат</div></div>
        </div>`;
    }
  }).catch(()=>{ el.innerHTML = '<p class="empty-note">Не удалось загрузить данные.</p>'; });
}

async function saveStudentNotes(id){
  const val = document.getElementById('notesEdit_'+id).value;
  try{
    await db.collection('students').doc(id).update({notes: val});
    const s = cachedStudentCards.find(x=>x.id===id);
    if(s) s.notes = val;
    showToast('Заметки сохранены');
  } catch(err){
    showToast('Не удалось сохранить заметки: ' + err.message, 'error');
  }
}

function editStudentCard(id){
  const s = cachedStudentCards.find(x=>x.id===id);
  if(!s) return;
  editingStudentId = id;
  document.getElementById('studentFormWrap').classList.remove('hidden');
  document.getElementById('studentFormTitle').textContent = 'Редактирование ученика';
  document.getElementById('studentFirstName').value = s.firstName || '';
  document.getElementById('studentLastName').value = s.lastName || '';
  document.getElementById('studentGrade').value = s.grade || '';
  document.getElementById('studentNativeLang').value = s.nativeLang || '';
  document.getElementById('studentGoal').value = s.goal || '';
  document.getElementById('studentPhone').value = s.studentPhone || '';
  document.getElementById('studentEmail').value = s.studentEmail || '';
  document.getElementById('parentName').value = s.parentName || '';
  document.getElementById('parentPhone').value = s.parentPhone || '';
  document.getElementById('parentEmail').value = s.parentEmail || '';
  document.getElementById('studentLevel').value = s.level || '';
  document.getElementById('studentTextbook').value = s.textbook || '';
  document.getElementById('studentFrequency').value = s.frequency || '';
  document.getElementById('studentDuration').value = s.duration || '';
  document.getElementById('studentNotes').value = s.notes || '';
  document.getElementById('studentFormWrap').scrollIntoView({behavior:'smooth', block:'start'});
}

async function deleteStudentCard(id){
  if(!confirm('Удалить карточку ученика? Это действие нельзя отменить.')) return;
  try{
    await db.collection('students').doc(id).delete();
    await loadStudentCards();
    showToast('Ученик удалён');
  } catch(err){
    showToast('Не удалось удалить: ' + err.message, 'error');
  }
}

/* ---------------------------------------------------------
   ЛЕКСИКА — админ: CRUD наборов слов
--------------------------------------------------------- */
let editingWordSetId = null;
let cachedWordSets = [];

function addWordRow(prefill){
  const wrap = document.getElementById('wsWordsWrap');
  const div = document.createElement('div');
  div.className = 'word-row';
  div.innerHTML = `
    <input type="text" class="wsWordEn" placeholder="Слово (en)" value="${prefill?escapeHtmlAttr(prefill.en):''}">
    <input type="text" class="wsWordTranslation" placeholder="Перевод" value="${prefill?escapeHtmlAttr(prefill.translation):''}">
    <input type="text" class="wsWordTranscription" placeholder="Транскрипция" value="${prefill?escapeHtmlAttr(prefill.transcription||''):''}">
    <input type="text" class="wsWordExample" placeholder="Пример предложения" value="${prefill?escapeHtmlAttr(prefill.example||''):''}">
    <button class="secondary small" onclick="this.closest('.word-row').remove()">✕</button>
  `;
  wrap.appendChild(div);
}

function toggleWordSetForm(){
  const wrap = document.getElementById('wordSetFormWrap');
  const wasHidden = wrap.classList.contains('hidden');
  if(wasHidden){ clearWordSetForm(); wrap.classList.remove('hidden'); }
  else wrap.classList.add('hidden');
}

function clearWordSetForm(){
  editingWordSetId = null;
  document.getElementById('wordSetFormTitle').textContent = 'Новый набор слов';
  document.getElementById('wsTitle').value = '';
  document.getElementById('wsLevel').value = '';
  document.getElementById('wsTopic').value = '';
  document.getElementById('wsDescription').value = '';
  document.getElementById('wsWordsWrap').innerHTML = '';
  document.getElementById('wsPublished').checked = true;
  document.getElementById('wordSetFormError').textContent = '';
  addWordRow();
}

function cancelWordSetForm(){
  document.getElementById('wordSetFormWrap').classList.add('hidden');
  clearWordSetForm();
}

async function saveWordSet(){
  const title = document.getElementById('wsTitle').value.trim();
  const level = document.getElementById('wsLevel').value;
  const topic = document.getElementById('wsTopic').value.trim();
  const description = document.getElementById('wsDescription').value.trim();
  const published = document.getElementById('wsPublished').checked;
  const errEl = document.getElementById('wordSetFormError');
  errEl.textContent = '';
  if(!title){ errEl.textContent = 'Введите название набора.'; return; }
  const rows = document.querySelectorAll('#wsWordsWrap .word-row');
  if(!rows.length){ errEl.textContent = 'Добавьте хотя бы одно слово.'; return; }
  const words = [];
  for(const row of rows){
    const en = row.querySelector('.wsWordEn').value.trim();
    const translation = row.querySelector('.wsWordTranslation').value.trim();
    const transcription = row.querySelector('.wsWordTranscription').value.trim();
    const example = row.querySelector('.wsWordExample').value.trim();
    if(!en || !translation){ errEl.textContent = 'У каждого слова должны быть заполнены английское слово и перевод.'; return; }
    words.push({en, translation, transcription, example});
  }
  try{
    const payload = {title, level: level || null, topic: topic || null, description: description || null, words, published};
    if(editingWordSetId){
      await db.collection('wordSets').doc(editingWordSetId).update(payload);
    } else {
      payload.createdAt = new Date().toISOString();
      await db.collection('wordSets').add(payload);
    }
    cancelWordSetForm();
    loadWordSetsList();
    showToast('Набор слов сохранён');
  } catch(err){
    errEl.textContent = 'Не удалось сохранить: ' + err.message;
  }
}

function editWordSet(id){
  const s = cachedWordSets.find(x=>x.id===id);
  if(!s) return;
  editingWordSetId = id;
  document.getElementById('wordSetFormWrap').classList.remove('hidden');
  document.getElementById('wordSetFormTitle').textContent = 'Редактирование набора';
  document.getElementById('wsTitle').value = s.title || '';
  document.getElementById('wsLevel').value = s.level || '';
  document.getElementById('wsTopic').value = s.topic || '';
  document.getElementById('wsDescription').value = s.description || '';
  document.getElementById('wsPublished').checked = s.published !== false;
  document.getElementById('wsWordsWrap').innerHTML = '';
  (s.words || []).forEach(w=>addWordRow(w));
  document.getElementById('wordSetFormWrap').scrollIntoView({behavior:'smooth', block:'start'});
}

async function deleteWordSet(id){
  if(!confirm('Удалить набор слов?')) return;
  try{
    await db.collection('wordSets').doc(id).delete();
    loadWordSetsList();
    showToast('Набор удалён');
  } catch(err){
    showToast('Не удалось удалить: ' + err.message, 'error');
  }
}

async function loadWordSetsList(){
  const wrap = document.getElementById('wordSetsListWrap');
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  const isAdminUser = ADMIN_EMAIL !== "ВСТАВЬТЕ_ВАШ_EMAIL_СЮДА"
    && auth.currentUser && (auth.currentUser.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const adminControls = document.getElementById('vocabAdminControls');
  if(adminControls) adminControls.classList.toggle('hidden', !isAdminUser);
  try{
    const snap = isAdminUser
      ? await db.collection('wordSets').get()
      : await db.collection('wordSets').where('published','==',true).get();
    cachedWordSets = snap.docs.map(d=>({id:d.id, ...d.data()}));
    if(!cachedWordSets.length){ wrap.innerHTML = '<p class="empty-note">Наборов слов пока нет.</p>'; return; }
    wrap.innerHTML = cachedWordSets.map(s=>`
      <div class="cert-test-row">
        <span>${escapeHtmlAttr(s.title)} <span style="color:var(--ink-dim);font-size:12px;">
          ${[s.level,s.topic].filter(Boolean).join(' · ')} · ${(s.words||[]).length} слов
          ${s.published===false ? ' · <span style="color:var(--red);">не опубликован</span>' : ''}
        </span></span>
        ${isAdminUser ? `<span>
          <button class="secondary small" onclick="editWordSet('${s.id}')">Редактировать</button>
          <button class="secondary small" onclick="deleteWordSet('${s.id}')">Удалить</button>
        </span>` : ''}
      </div>
    `).join('');
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить наборы.</p>';
  }
}
/* ---------------------------------------------------------
   ЛЕКСИКА — ученик: наборы, режимы игры, интервальное повторение
--------------------------------------------------------- */
const SRS_INTERVALS_DAYS = [1,3,7,14,30];

let cachedStudentWordSets = [];
let currentWordSet = null;
let currentWordQueue = [];
let currentWordPos = 0;
let currentVocabMode = null;
let currentWordProgress = null;
let vocabSessionStats = {correct:0, wrong:0};

function goVocabStudent(){
  if(!FIREBASE_CONFIGURED || !auth.currentUser){
    showToast('Войдите в аккаунт ученика, чтобы пользоваться разделом «Лексика» — прогресс сохраняется только у вошедших пользователей.', 'error');
    return;
  }
  show('view-vocab');
  document.getElementById('vocab-sets-list').classList.remove('hidden');
  document.getElementById('vocab-mode-select').classList.add('hidden');
  document.getElementById('vocab-play').classList.add('hidden');
  document.getElementById('vocab-result').classList.add('hidden');
  loadStudentWordSets();
}

async function fetchWordProgress(setId){
  const docId = auth.currentUser.uid + '_' + setId;
  try{
    const snap = await db.collection('wordProgress').doc(docId).get();
    return snap.exists ? snap.data() : {uid: auth.currentUser.uid, setId, words: {}};
  } catch(err){
    return {uid: auth.currentUser.uid, setId, words: {}};
  }
}

function countDueWords(set, prog){
  const now = new Date();
  let count = 0;
  (set.words || []).forEach((w,idx)=>{
    const p = prog.words[idx];
    if(!p || new Date(p.nextReview) <= now) count++;
  });
  return count;
}

async function loadStudentWordSets(){
  const wrap = document.getElementById('studentWordSetsWrap');
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  try{
    const snap = await db.collection('wordSets').where('published','==',true).get();
    cachedStudentWordSets = snap.docs.map(d=>({id:d.id, ...d.data()}));
    if(!cachedStudentWordSets.length){
      wrap.innerHTML = '<p class="empty-note">Пока нет опубликованных наборов слов.</p>';
      document.getElementById('vocabDueBanner').textContent = '';
      return;
    }
    let dueTotal = 0;
    for(const s of cachedStudentWordSets){
      const prog = await fetchWordProgress(s.id);
      dueTotal += countDueWords(s, prog);
    }
    document.getElementById('vocabDueBanner').textContent = dueTotal > 0
      ? `Сегодня нужно повторить слов: ${dueTotal}`
      : 'Повторений на сегодня нет — можно изучать новые слова.';

    wrap.innerHTML = cachedStudentWordSets.map(s=>`
      <div class="cert-test-row">
        <span>${escapeHtmlAttr(s.title)} <span style="color:var(--ink-dim);font-size:12px;">${[s.level,s.topic].filter(Boolean).join(' · ')} · ${(s.words||[]).length} слов</span></span>
        <button class="secondary small" onclick="openVocabSet('${s.id}')">Открыть</button>
      </div>
    `).join('');
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить наборы.</p>';
  }
}

function openVocabSet(id){
  currentWordSet = cachedStudentWordSets.find(s=>s.id===id);
  if(!currentWordSet) return;
  document.getElementById('vocab-sets-list').classList.add('hidden');
  document.getElementById('vocab-mode-select').classList.remove('hidden');
  document.getElementById('vocabSetTitle').textContent = currentWordSet.title;
}

function backToVocabList(){
  clearInterval(speedQuizTimer);
  document.getElementById('vocab-mode-select').classList.add('hidden');
  document.getElementById('vocab-play').classList.add('hidden');
  document.getElementById('vocab-result').classList.add('hidden');
  document.getElementById('vocab-sets-list').classList.remove('hidden');
  loadStudentWordSets();
}

function backToVocabModeSelect(){
  clearInterval(speedQuizTimer);
  document.getElementById('vocab-play').classList.add('hidden');
  document.getElementById('vocab-result').classList.add('hidden');
  document.getElementById('vocab-mode-select').classList.remove('hidden');
}

function wordHasBlankableExample(w){
  if(!w.example || !w.en) return false;
  const re = new RegExp('\\b' + w.en.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\b', 'i');
  return re.test(w.example);
}

async function startVocabMode(mode){
  if(mode === 'choice' && (!currentWordSet.words || currentWordSet.words.length < 4)){
    showToast('Для этого режима в наборе должно быть минимум 4 слова.', 'error');
    return;
  }
  if(mode === 'fillblank' && !currentWordSet.words.some(wordHasBlankableExample)){
    showToast('В этом наборе нет слов с примером предложения, где встречается само слово — режим недоступен.', 'error');
    return;
  }
  if(mode === 'oddoneout' && cachedStudentWordSets.filter(s=>s.id!==currentWordSet.id).length === 0){
    showToast('Для режима «Найди лишнее» нужен ещё хотя бы один опубликованный набор.', 'error');
    return;
  }
  if(mode === 'memory' && (!currentWordSet.words || currentWordSet.words.length < 3)){
    showToast('Для Memory в наборе должно быть минимум 3 слова.', 'error');
    return;
  }

  currentVocabMode = mode;
  currentWordProgress = await fetchWordProgress(currentWordSet.id);

  if(mode === 'memory'){
    document.getElementById('vocab-mode-select').classList.add('hidden');
    document.getElementById('vocab-play').classList.remove('hidden');
    document.getElementById('vocab-result').classList.add('hidden');
    startMemoryGame();
    return;
  }
  if(mode === 'speedquiz'){
    if(!currentWordSet.words || currentWordSet.words.length < 4){
      showToast('Для «Быстрого теста» в наборе должно быть минимум 4 слова.', 'error');
      currentVocabMode = null;
      return;
    }
    document.getElementById('vocab-mode-select').classList.add('hidden');
    document.getElementById('vocab-play').classList.remove('hidden');
    document.getElementById('vocab-result').classList.add('hidden');
    startSpeedQuiz();
    return;
  }

  const now = new Date();
  let indices = [];
  currentWordSet.words.forEach((w,idx)=>{
    const p = currentWordProgress.words[idx];
    if(!p || new Date(p.nextReview) <= now) indices.push(idx);
  });
  if(!indices.length){
    indices = currentWordSet.words.map((_,idx)=>idx);
  }
  if(mode === 'fillblank'){
    indices = indices.filter(idx=>wordHasBlankableExample(currentWordSet.words[idx]));
    if(!indices.length) indices = currentWordSet.words.map((_,idx)=>idx).filter(idx=>wordHasBlankableExample(currentWordSet.words[idx]));
  }
  indices.sort(()=>Math.random()-0.5);
  currentWordQueue = indices;
  currentWordPos = 0;
  vocabSessionStats = {correct:0, wrong:0};

  document.getElementById('vocab-mode-select').classList.add('hidden');
  document.getElementById('vocab-play').classList.remove('hidden');
  document.getElementById('vocab-result').classList.add('hidden');
  renderVocabStep();
}

function speakWord(text){
  try{
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    speechSynthesis.speak(u);
  } catch(err){ /* Web Speech API недоступен в этом браузере — тихо игнорируем */ }
}

function speakCurrentWord(){
  const wordIdx = currentWordQueue[currentWordPos];
  const w = currentWordSet.words[wordIdx];
  if(w) speakWord(w.en);
}

let currentChoiceOptions = [];

function renderVocabStep(){
  if(currentWordPos >= currentWordQueue.length){
    finishVocabSession();
    return;
  }
  document.getElementById('vocabProgressLine').textContent = `Слово ${currentWordPos+1} из ${currentWordQueue.length}`;
  const wordIdx = currentWordQueue[currentWordPos];
  const w = currentWordSet.words[wordIdx];
  const area = document.getElementById('vocabPlayArea');

  if(currentVocabMode === 'flashcards'){
    area.innerHTML = `
      <div class="q-block" style="text-align:center;">
        <div style="font-family:var(--serif);font-size:26px;margin-bottom:6px;">${escapeHtmlAttr(w.en)}</div>
        ${w.transcription ? `<div style="color:var(--ink-dim);margin-bottom:10px;">[${escapeHtmlAttr(w.transcription)}]</div>` : ''}
        <button class="secondary small" onclick="speakCurrentWord()">🔊 Озвучить</button>
        <div id="flipArea" style="margin-top:18px;">
          <button class="primary" onclick="revealFlashcard()">Показать перевод</button>
        </div>
      </div>
    `;
  } else if(currentVocabMode === 'choice'){
    const options = buildChoiceOptions(wordIdx);
    currentChoiceOptions = options;
    area.innerHTML = `
      <div class="q-block" style="text-align:center;">
        <div style="font-family:var(--serif);font-size:24px;margin-bottom:14px;">${escapeHtmlAttr(w.en)}</div>
        ${options.map((opt,oi)=>`<button class="secondary" style="width:100%;margin-bottom:8px;"
          onclick="answerVocabChoice(${wordIdx}, ${oi})">${escapeHtmlAttr(opt)}</button>`).join('')}
      </div>
    `;

  } else if(currentVocabMode === 'learn'){
    area.innerHTML = `
      <div class="q-block" style="text-align:center;">
        <div style="font-family:var(--serif);font-size:24px;margin-bottom:14px;">${escapeHtmlAttr(w.en)}</div>
        <input type="text" id="learnAnswerInput" placeholder="Введите перевод" style="text-align:center;" autocomplete="off">
        <button class="primary" style="margin-top:12px;" onclick="answerVocabLearn(${wordIdx})">Проверить</button>
        <div id="learnFeedback" style="margin-top:10px;"></div>
      </div>
    `;
    setTimeout(()=>{ const inp = document.getElementById('learnAnswerInput'); if(inp) inp.focus(); }, 50);

  } else if(currentVocabMode === 'truefalse'){
    const tf = buildTrueFalseData(wordIdx);
    currentTrueFalseAnswer = tf.isTrue;
    area.innerHTML = `
      <div class="q-block" style="text-align:center;">
        <div style="font-family:var(--serif);font-size:24px;margin-bottom:6px;">${escapeHtmlAttr(w.en)}</div>
        <div style="font-size:18px;color:var(--accent);margin-bottom:16px;">${escapeHtmlAttr(tf.shownTranslation)}</div>
        <button class="secondary" style="width:48%;margin-right:4%;" onclick="answerVocabTrueFalse(${wordIdx}, true)">✅ Правда</button>
        <button class="secondary" style="width:48%;" onclick="answerVocabTrueFalse(${wordIdx}, false)">❌ Ложь</button>
      </div>
    `;

  } else if(currentVocabMode === 'fillblank'){
    const fb = buildFillBlankData(wordIdx);
    currentChoiceOptions = fb.options;
    area.innerHTML = `
      <div class="q-block" style="text-align:center;">
        <div style="font-size:16px;line-height:1.6;margin-bottom:14px;">${fb.blankedHtml}</div>
        ${fb.options.map((opt,oi)=>`<button class="secondary" style="width:100%;margin-bottom:8px;"
          onclick="answerVocabFillBlank(${wordIdx}, ${oi})">${escapeHtmlAttr(opt)}</button>`).join('')}
      </div>
    `;

  } else if(currentVocabMode === 'typeword'){
    area.innerHTML = `
      <div class="q-block" style="text-align:center;">
        <div style="font-size:20px;color:var(--accent);margin-bottom:14px;">${escapeHtmlAttr(w.translation)}</div>
        <input type="text" id="typeWordInput" placeholder="Напишите слово на английском" style="text-align:center;" autocomplete="off">
        <button class="primary" style="margin-top:12px;" onclick="answerVocabTypeWord(${wordIdx})">Проверить</button>
        <div id="typeWordFeedback" style="margin-top:10px;"></div>
      </div>
    `;
    setTimeout(()=>{ const inp = document.getElementById('typeWordInput'); if(inp) inp.focus(); }, 50);

  } else if(currentVocabMode === 'oddoneout'){
    const ood = buildOddOneOutData(wordIdx);
    currentOddOneOutData = ood;
    area.innerHTML = `
      <div class="q-block" style="text-align:center;">
        <p class="hint" style="margin-bottom:12px;">Найдите слово, которое не относится к теме «${escapeHtmlAttr(currentWordSet.topic || currentWordSet.title)}»</p>
        ${ood.words.map((word,oi)=>`<button class="secondary" style="width:100%;margin-bottom:8px;"
          onclick="answerVocabOddOneOut(${wordIdx}, ${oi})">${escapeHtmlAttr(word)}</button>`).join('')}
      </div>
    `;

  } else if(currentVocabMode === 'scramble'){
    initScrambleStep(wordIdx);

  } else if(currentVocabMode === 'listen'){
    const options = buildChoiceOptions(wordIdx);
    currentChoiceOptions = options;
    area.innerHTML = `
      <div class="q-block" style="text-align:center;">
        <button class="primary" onclick="speakCurrentWord()">🔊 Прослушать слово</button>
        <div style="margin-top:16px;">
          ${options.map((opt,oi)=>`<button class="secondary" style="width:100%;margin-bottom:8px;"
            onclick="answerVocabChoice(${wordIdx}, ${oi})">${escapeHtmlAttr(opt)}</button>`).join('')}
        </div>
      </div>
    `;
    setTimeout(speakCurrentWord, 300);
  }
}

function buildChoiceOptions(correctIdx){
  const correct = currentWordSet.words[correctIdx].translation;
  const others = currentWordSet.words.filter((_,i)=>i!==correctIdx).map(w=>w.translation);
  others.sort(()=>Math.random()-0.5);
  const opts = [correct, ...others.slice(0,3)];
  opts.sort(()=>Math.random()-0.5);
  return opts;
}

/* --- 4.2 Заучивание (ввод перевода) --- */
function answerVocabLearn(wordIdx){
  const input = document.getElementById('learnAnswerInput');
  const feedback = document.getElementById('learnFeedback');
  const w = currentWordSet.words[wordIdx];
  const given = (input.value || '').trim().toLowerCase();
  const correct = w.translation.trim().toLowerCase();
  const knew = given.length > 0 && given === correct;
  feedback.innerHTML = knew
    ? `<span style="color:var(--green);">Верно!</span>`
    : `<span style="color:var(--red);">Правильный перевод: ${escapeHtmlAttr(w.translation)}</span>`;
  input.disabled = true;
  registerWordResult(wordIdx, knew);
  currentWordPos++;
  setTimeout(renderVocabStep, knew ? 400 : 1400);
}

/* --- 4.8 Правда или ложь --- */
let currentTrueFalseAnswer = true;
function buildTrueFalseData(wordIdx){
  const w = currentWordSet.words[wordIdx];
  const isTrue = Math.random() < 0.5;
  if(isTrue) return {isTrue:true, shownTranslation: w.translation};
  const others = currentWordSet.words.filter((_,i)=>i!==wordIdx).map(x=>x.translation);
  const fake = others.length ? others[Math.floor(Math.random()*others.length)] : w.translation;
  return {isTrue: fake === w.translation, shownTranslation: fake};
}
function answerVocabTrueFalse(wordIdx, choseTrue){
  const knew = choseTrue === currentTrueFalseAnswer;
  if(!knew) showToast(`Неверно. Правильный перевод: ${currentWordSet.words[wordIdx].translation}`, 'error');
  registerWordResult(wordIdx, knew);
  currentWordPos++;
  setTimeout(renderVocabStep, knew ? 250 : 1100);
}

/* --- 4.9 Заполни пропуск --- */
function buildFillBlankData(wordIdx){
  const w = currentWordSet.words[wordIdx];
  const re = new RegExp('\\b' + w.en.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\b', 'i');
  const blankedHtml = escapeHtmlAttr(w.example).replace(re, '<b style="color:var(--accent);">____</b>');
  const others = currentWordSet.words.filter((_,i)=>i!==wordIdx).map(x=>x.en);
  others.sort(()=>Math.random()-0.5);
  const options = [w.en, ...others.slice(0,3)];
  options.sort(()=>Math.random()-0.5);
  return {blankedHtml, options};
}
function answerVocabFillBlank(wordIdx, optionIdx){
  const chosen = currentChoiceOptions[optionIdx];
  const correct = currentWordSet.words[wordIdx].en;
  const knew = chosen.toLowerCase() === correct.toLowerCase();
  if(!knew) showToast(`Неверно. Правильное слово: ${correct}`, 'error');
  registerWordResult(wordIdx, knew);
  currentWordPos++;
  setTimeout(renderVocabStep, knew ? 250 : 1100);
}

/* --- 4.11 Напечатай слово --- */
function answerVocabTypeWord(wordIdx){
  const input = document.getElementById('typeWordInput');
  const feedback = document.getElementById('typeWordFeedback');
  const w = currentWordSet.words[wordIdx];
  const given = (input.value || '').trim().toLowerCase();
  const correct = w.en.trim().toLowerCase();
  const knew = given.length > 0 && given === correct;
  feedback.innerHTML = knew
    ? `<span style="color:var(--green);">Верно!</span>`
    : `<span style="color:var(--red);">Правильное слово: ${escapeHtmlAttr(w.en)}</span>`;
  input.disabled = true;
  registerWordResult(wordIdx, knew);
  currentWordPos++;
  setTimeout(renderVocabStep, knew ? 400 : 1400);
}

/* --- 4.12 Найди лишнее --- */
let currentOddOneOutData = null;
function buildOddOneOutData(wordIdx){
  const w = currentWordSet.words[wordIdx];
  const sameSetOthers = currentWordSet.words.filter((_,i)=>i!==wordIdx).map(x=>x.en);
  sameSetOthers.sort(()=>Math.random()-0.5);
  const sameThree = [w.en, ...sameSetOthers.slice(0,2)];

  const otherSets = cachedStudentWordSets.filter(s=>s.id !== currentWordSet.id && s.words && s.words.length);
  const donorSet = otherSets[Math.floor(Math.random()*otherSets.length)];
  const oddWord = donorSet.words[Math.floor(Math.random()*donorSet.words.length)].en;

  const words = [...sameThree, oddWord];
  words.sort(()=>Math.random()-0.5);
  return {words, oddWord};
}
function answerVocabOddOneOut(wordIdx, optionIdx){
  const chosen = currentOddOneOutData.words[optionIdx];
  const knew = chosen === currentOddOneOutData.oddWord;
  if(!knew) showToast(`Не совсем. Лишнее слово было: ${currentOddOneOutData.oddWord}`, 'error');
  registerWordResult(wordIdx, knew);
  currentWordPos++;
  setTimeout(renderVocabStep, knew ? 250 : 1100);
}

/* --- 4.6 Собери слово --- */
let scrambleLetters = [];
let scrambleUsed = [];
let scrambleAnswer = '';

function initScrambleStep(wordIdx){
  const w = currentWordSet.words[wordIdx];
  const letters = w.en.split('');
  do { letters.sort(()=>Math.random()-0.5); } while(letters.join('') === w.en && letters.length > 1);
  scrambleLetters = letters;
  scrambleUsed = new Array(letters.length).fill(false);
  scrambleAnswer = '';
  renderScrambleArea(wordIdx);
}

function renderScrambleArea(wordIdx){
  const w = currentWordSet.words[wordIdx];
  const area = document.getElementById('vocabPlayArea');
  area.innerHTML = `
    <div class="q-block" style="text-align:center;">
      <div style="font-size:20px;color:var(--accent);margin-bottom:4px;">${escapeHtmlAttr(w.translation)}</div>
      <p class="hint" style="margin-bottom:10px;">Соберите слово из букв</p>
      <div class="scramble-answer" id="scrambleAnswerLine">${scrambleAnswer.split('').join(' ') || '&nbsp;'}</div>
      <div class="scramble-letters" id="scrambleLettersWrap">
        ${scrambleLetters.map((l,i)=>`<button class="scramble-letter" id="scrLetter_${i}" onclick="pickScrambleLetter(${wordIdx}, ${i})" ${scrambleUsed[i]?'disabled':''}>${escapeHtmlAttr(l)}</button>`).join('')}
      </div>
      <button class="secondary small" onclick="clearScrambleAnswer(${wordIdx})">Стереть</button>
      <button class="primary small" onclick="checkScrambleAnswer(${wordIdx})">Проверить</button>
    </div>
  `;
}

function pickScrambleLetter(wordIdx, letterIdx){
  if(scrambleUsed[letterIdx]) return;
  scrambleUsed[letterIdx] = true;
  scrambleAnswer += scrambleLetters[letterIdx];
  renderScrambleArea(wordIdx);
}

function clearScrambleAnswer(wordIdx){
  scrambleUsed = new Array(scrambleLetters.length).fill(false);
  scrambleAnswer = '';
  renderScrambleArea(wordIdx);
}

function checkScrambleAnswer(wordIdx){
  const w = currentWordSet.words[wordIdx];
  const knew = scrambleAnswer.toLowerCase() === w.en.toLowerCase();
  if(!knew) showToast(`Неверно. Правильное слово: ${w.en}`, 'error');
  registerWordResult(wordIdx, knew);
  currentWordPos++;
  setTimeout(renderVocabStep, knew ? 350 : 1300);
}

/* --- 4.4 Memory --- */
let memoryTiles = [];
let memoryFlipped = [];
let memoryMatchedCount = 0;
let memoryAttempts = 0;
let memoryStartTime = 0;
let memoryWordIndices = [];

function startMemoryGame(){
  const allIdx = currentWordSet.words.map((_,idx)=>idx);
  allIdx.sort(()=>Math.random()-0.5);
  memoryWordIndices = allIdx.slice(0, Math.min(8, allIdx.length));

  const tiles = [];
  memoryWordIndices.forEach(idx=>{
    tiles.push({pairId: idx, text: currentWordSet.words[idx].en, matched:false});
    tiles.push({pairId: idx, text: currentWordSet.words[idx].translation, matched:false});
  });
  tiles.sort(()=>Math.random()-0.5);
  memoryTiles = tiles;
  memoryFlipped = [];
  memoryMatchedCount = 0;
  memoryAttempts = 0;
  memoryStartTime = Date.now();

  document.getElementById('vocabProgressLine').textContent = 'Memory — найдите все пары';
  renderMemoryBoard();
}

function renderMemoryBoard(){
  const area = document.getElementById('vocabPlayArea');
  area.innerHTML = `
    <div class="memory-grid">
      ${memoryTiles.map((t,i)=>{
        const isFlipped = memoryFlipped.includes(i) || t.matched;
        const cls = t.matched ? 'memory-tile matched' : (isFlipped ? 'memory-tile flipped' : 'memory-tile hidden-tile');
        return `<div class="${cls}" onclick="flipMemoryTile(${i})">${isFlipped ? escapeHtmlAttr(t.text) : '?'}</div>`;
      }).join('')}
    </div>
    <p class="hint" style="margin-top:12px;">Попыток: ${memoryAttempts}</p>
  `;
}

function flipMemoryTile(i){
  const tile = memoryTiles[i];
  if(tile.matched || memoryFlipped.includes(i) || memoryFlipped.length >= 2) return;
  memoryFlipped.push(i);
  renderMemoryBoard();
  if(memoryFlipped.length === 2){
    memoryAttempts++;
    const [a,b] = memoryFlipped;
    if(memoryTiles[a].pairId === memoryTiles[b].pairId){
      memoryTiles[a].matched = true;
      memoryTiles[b].matched = true;
      memoryMatchedCount++;
      memoryFlipped = [];
      renderMemoryBoard();
      if(memoryMatchedCount === memoryWordIndices.length){
        setTimeout(finishMemoryGame, 400);
      }
    } else {
      setTimeout(()=>{ memoryFlipped = []; renderMemoryBoard(); }, 800);
    }
  }
}

async function finishMemoryGame(){
  const seconds = Math.round((Date.now() - memoryStartTime)/1000);
  memoryWordIndices.forEach(idx=>registerWordResult(idx, true));
  document.getElementById('vocab-play').classList.add('hidden');
  const resPanel = document.getElementById('vocab-result');
  resPanel.classList.remove('hidden');
  resPanel.innerHTML = `
    <div class="result-banner good">
      <div>Все пары найдены!</div>
      <div class="big">${seconds} сек</div>
      <div>Попыток: ${memoryAttempts}</div>
    </div>
    <button class="secondary" onclick="backToVocabModeSelect()">Ещё раз</button>
    <button class="primary" onclick="backToVocabList()">К наборам</button>
  `;
  try{
    const docId = auth.currentUser.uid + '_' + currentWordSet.id;
    await db.collection('wordProgress').doc(docId).set({
      uid: auth.currentUser.uid, setId: currentWordSet.id,
      words: currentWordProgress.words, updatedAt: new Date().toISOString()
    });
  } catch(err){ showToast('Не удалось сохранить прогресс: ' + err.message, 'error'); }
}

/* --- 4.7 Быстрый тест --- */
let speedQuizTimeLeft = 60;
let speedQuizTimer = null;
let speedQuizAnswered = 0;
let speedQuizCorrect = 0;
let speedQuizCurrentIdx = null;
let speedQuizOptions = [];

function startSpeedQuiz(){
  speedQuizTimeLeft = 60;
  speedQuizAnswered = 0;
  speedQuizCorrect = 0;
  document.getElementById('vocabProgressLine').innerHTML = `
    <div class="speed-timer-bar"><div class="speed-timer-fill" id="speedTimerFill" style="width:100%;"></div></div>
    <span id="speedTimerText">Осталось: 60 сек</span> · Правильно: <span id="speedCorrectText">0</span>
  `;
  clearInterval(speedQuizTimer);
  speedQuizTimer = setInterval(()=>{
    speedQuizTimeLeft--;
    const fill = document.getElementById('speedTimerFill');
    const text = document.getElementById('speedTimerText');
    if(fill) fill.style.width = Math.max(0, speedQuizTimeLeft/60*100) + '%';
    if(text) text.textContent = `Осталось: ${speedQuizTimeLeft} сек`;
    if(speedQuizTimeLeft <= 0){
      clearInterval(speedQuizTimer);
      finishSpeedQuiz();
    }
  }, 1000);
  renderSpeedQuizQuestion();
}

function renderSpeedQuizQuestion(){
  const idx = Math.floor(Math.random()*currentWordSet.words.length);
  speedQuizCurrentIdx = idx;
  speedQuizOptions = buildChoiceOptions(idx);
  const w = currentWordSet.words[idx];
  const area = document.getElementById('vocabPlayArea');
  area.innerHTML = `
    <div class="q-block" style="text-align:center;">
      <div style="font-family:var(--serif);font-size:22px;margin-bottom:12px;">${escapeHtmlAttr(w.en)}</div>
      ${speedQuizOptions.map((opt,oi)=>`<button class="secondary" style="width:100%;margin-bottom:8px;"
        onclick="answerSpeedQuiz(${oi})">${escapeHtmlAttr(opt)}</button>`).join('')}
    </div>
  `;
}

function answerSpeedQuiz(optionIdx){
  if(speedQuizTimeLeft <= 0) return;
  const chosen = speedQuizOptions[optionIdx];
  const correct = currentWordSet.words[speedQuizCurrentIdx].translation;
  const knew = chosen === correct;
  speedQuizAnswered++;
  if(knew) speedQuizCorrect++;
  registerWordResult(speedQuizCurrentIdx, knew);
  const correctText = document.getElementById('speedCorrectText');
  if(correctText) correctText.textContent = speedQuizCorrect;
  renderSpeedQuizQuestion();
}

async function finishSpeedQuiz(){
  document.getElementById('vocab-play').classList.add('hidden');
  const resPanel = document.getElementById('vocab-result');
  resPanel.classList.remove('hidden');
  const pct = speedQuizAnswered ? Math.round(speedQuizCorrect/speedQuizAnswered*100) : 0;
  resPanel.innerHTML = `
    <div class="result-banner ${pct>=60?'good':'bad'}">
      <div>Время вышло!</div>
      <div class="big">${speedQuizCorrect} / ${speedQuizAnswered}</div>
      <div>${pct}% правильных · скорость: ${(speedQuizAnswered/60*60).toFixed(1)} ответов/мин</div>
    </div>
    <button class="secondary" onclick="backToVocabModeSelect()">Ещё раз</button>
    <button class="primary" onclick="backToVocabList()">К наборам</button>
  `;
  try{
    const docId = auth.currentUser.uid + '_' + currentWordSet.id;
    await db.collection('wordProgress').doc(docId).set({
      uid: auth.currentUser.uid, setId: currentWordSet.id,
      words: currentWordProgress.words, updatedAt: new Date().toISOString()
    });
  } catch(err){ showToast('Не удалось сохранить прогресс: ' + err.message, 'error'); }
}

function revealFlashcard(){
  const wordIdx = currentWordQueue[currentWordPos];
  const w = currentWordSet.words[wordIdx];
  document.getElementById('flipArea').innerHTML = `
    <div style="font-size:20px;color:var(--accent);margin-bottom:6px;">${escapeHtmlAttr(w.translation)}</div>
    ${w.example ? `<div style="color:var(--ink-dim);font-size:13px;margin-bottom:14px;">${escapeHtmlAttr(w.example)}</div>` : ''}
    <button class="secondary" onclick="answerVocabFlashcard(${wordIdx}, false)">Повторить</button>
    <button class="primary" onclick="answerVocabFlashcard(${wordIdx}, true)">Знаю</button>
  `;
}

function answerVocabFlashcard(wordIdx, knew){
  registerWordResult(wordIdx, knew);
  currentWordPos++;
  renderVocabStep();
}

function answerVocabChoice(wordIdx, optionIdx){
  const chosen = currentChoiceOptions[optionIdx];
  const correct = currentWordSet.words[wordIdx].translation;
  const knew = chosen === correct;
  if(!knew) showToast(`Неверно. Правильный перевод: ${correct}`, 'error');
  registerWordResult(wordIdx, knew);
  currentWordPos++;
  setTimeout(renderVocabStep, knew ? 250 : 1100);
}

function registerWordResult(wordIdx, knew){
  if(knew) vocabSessionStats.correct++; else vocabSessionStats.wrong++;
  const existing = currentWordProgress.words[wordIdx] || {stage:0, correct:0, wrong:0};
  let stage = existing.stage || 0;
  stage = knew ? Math.min(stage+1, SRS_INTERVALS_DAYS.length-1) : Math.max(stage-1, 0);
  const days = SRS_INTERVALS_DAYS[stage];
  currentWordProgress.words[wordIdx] = {
    stage,
    nextReview: new Date(Date.now() + days*24*60*60*1000).toISOString(),
    correct: (existing.correct||0) + (knew?1:0),
    wrong: (existing.wrong||0) + (knew?0:1)
  };
}

async function finishVocabSession(){
  document.getElementById('vocab-play').classList.add('hidden');
  const resPanel = document.getElementById('vocab-result');
  resPanel.classList.remove('hidden');
  const total = vocabSessionStats.correct + vocabSessionStats.wrong;
  const pct = total ? Math.round(vocabSessionStats.correct/total*100) : 0;
  resPanel.innerHTML = `
    <div class="result-banner ${pct>=60?'good':'bad'}">
      <div>Сессия завершена</div>
      <div class="big">${vocabSessionStats.correct} / ${total}</div>
      <div>${pct}% правильных ответов</div>
    </div>
    <button class="secondary" onclick="backToVocabModeSelect()">Ещё раз</button>
    <button class="primary" onclick="backToVocabList()">К наборам</button>
  `;
  try{
    const docId = auth.currentUser.uid + '_' + currentWordSet.id;
    await db.collection('wordProgress').doc(docId).set({
      uid: auth.currentUser.uid, setId: currentWordSet.id,
      words: currentWordProgress.words, updatedAt: new Date().toISOString()
    });
  } catch(err){
    showToast('Не удалось сохранить прогресс: ' + err.message, 'error');
  }
}
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


/* ---------------------------------------------------------
   АДМИН-ПАНЕЛЬ
--------------------------------------------------------- */
function setAdminSubTab(tab){
  document.querySelectorAll('#admin-subtabs .tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.subtab===tab));
  ['dashboard','tests','books','teachers','students','certificate','platform'].forEach(t=>{
    document.getElementById('admin-'+t).classList.toggle('hidden', t!==tab);
  });
  if(tab==='dashboard') loadAdminDashboard();
  if(tab==='tests'){ refreshBookSelectOptions(); populateLevelSelects(); loadAdminTestsList(); }
  if(tab==='books') loadAdminBooks();
  if(tab==='teachers') loadAdminTeachers();
  if(tab==='students') loadAdminStudents();
  if(tab==='certificate') loadCertificateTemplatePanel();
  if(tab==='platform') loadPlatformSettingsForm(platformSettings);
}

async function loadAdminDashboard(){
  const wrap = document.getElementById('adminDashboardWrap');
  wrap.innerHTML = '<p class="empty-note">Загрузка статистики…</p>';
  try{
    const [usersSnap, testsSnap, codesSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('tests').get(),
      db.collection('codes').get()
    ]);
    const users = usersSnap.docs.map(d=>d.data());
    const teachersCount = users.filter(u=>u.role==='teacher').length;
    const studentsCount = users.filter(u=>u.role==='student').length;
    const testsCount = testsSnap.size + DEFAULT_TESTS.length;
    const codes = codesSnap.docs.map(d=>d.data());
    const doneCount = codes.filter(c=>c.status==='done').length;
    const certsCount = codes.filter(c=>c.certificateIssued).length;

    wrap.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-num">${teachersCount}</div><div class="stat-label">Репетиторов</div></div>
        <div class="stat-card"><div class="stat-num">${studentsCount}</div><div class="stat-label">Учеников с аккаунтом</div></div>
        <div class="stat-card"><div class="stat-num">${testsCount}</div><div class="stat-label">Тестов в базе</div></div>
        <div class="stat-card"><div class="stat-num">${doneCount}</div><div class="stat-label">Пройдено проверок</div></div>
        <div class="stat-card"><div class="stat-num">${certsCount}</div><div class="stat-label">Выдано сертификатов</div></div>
      </div>`;
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить статистику.</p>';
  }
}

/* --- Учебники --- */
let cachedBooks = [];
async function refreshBookSelectOptions(){
  try{
    const snap = await db.collection('books').get();
    cachedBooks = snap.docs.map(d=>({id:d.id, name:d.data().name}));
  } catch(err){ cachedBooks = []; }
  const createSel = document.getElementById('adminTestBook');
  const filterSel = document.getElementById('adminFilterBook');
  const optsPlain = cachedBooks.map(b=>`<option value="${b.name}">${b.name}</option>`).join('');
  if(createSel) createSel.innerHTML = '<option value="">—</option>' + optsPlain;
  if(filterSel) filterSel.innerHTML = '<option value="">Все учебники</option>' + optsPlain;
}
function populateLevelSelects(){
  const optsPlain = LEVELS.map(l=>`<option value="${l}">${l}</option>`).join('');
  const createSel = document.getElementById('adminTestLevel');
  const filterSel = document.getElementById('adminFilterLevel');
  if(createSel) createSel.innerHTML = '<option value="">—</option>' + optsPlain;
  if(filterSel) filterSel.innerHTML = '<option value="">Все уровни</option>' + optsPlain;
}
async function loadAdminBooks(){
  const wrap = document.getElementById('adminBooksWrap');
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  try{
    const snap = await db.collection('books').get();
    const books = snap.docs.map(d=>({id:d.id, ...d.data()}));
    wrap.innerHTML = books.length ? books.map(b=>`
      <div class="cert-test-row">
        <span>${b.name}</span>
        <button class="secondary small" onclick="deleteBook('${b.id}')">Удалить</button>
      </div>`).join('') : '<p class="empty-note">Учебников пока нет.</p>';
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить учебники.</p>';
  }
}
async function addBook(){
  const input = document.getElementById('newBookName');
  const name = input.value.trim();
  if(!name) return;
  try{
    await db.collection('books').add({name, createdAt:new Date().toISOString()});
    input.value = '';
    loadAdminBooks();
    refreshBookSelectOptions();
  } catch(err){ alert('Не удалось добавить учебник: ' + err.message); }
}
async function deleteBook(id){
  if(!confirm('Удалить учебник? Тесты, где он указан, не удалятся, просто останутся без учебника в фильтре.')) return;
  await db.collection('books').doc(id).delete();
  loadAdminBooks();
  refreshBookSelectOptions();
}

/* --- Дизайн сертификата --- */
let certTemplateImage = null;
let certTemplatePromise = null;

function ensureCertTemplateLoaded(){
  if(!FIREBASE_CONFIGURED) return Promise.resolve(null);
  if(!certTemplatePromise){
    certTemplatePromise = db.collection('settings').doc('certificate').get().then(snap=>{
      certTemplateImage = snap.exists ? (snap.data().templateImage || null) : null;
      return certTemplateImage;
    }).catch(()=>{ certTemplatePromise = null; return null; });
  }
  return certTemplatePromise;
}

async function loadCertificateTemplatePanel(){
  certTemplatePromise = null; // всегда перечитываем при открытии вкладки
  await ensureCertTemplateLoaded();
  renderCertTemplatePreview();
}

function renderCertTemplatePreview(){
  const wrap = document.getElementById('certTemplatePreviewWrap');
  if(!wrap) return;
  wrap.innerHTML = certTemplateImage
    ? `<img src="${certTemplateImage}" style="max-width:100%;border-radius:8px;border:1px solid var(--border);display:block;">`
    : '<p class="empty-note">Сейчас используется стандартный дизайн сертификата.</p>';
}

function resizeImageForCertificate(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onerror = ()=>reject(new Error('Не удалось прочитать файл'));
    reader.onload = ()=>{
      const img = new Image();
      img.onload = ()=>{
        const canvas = document.createElement('canvas');
        canvas.width = 1000; canvas.height = 700;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0,0,1000,700);
        ctx.drawImage(img, 0, 0, 1000, 700);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = ()=>reject(new Error('Не удалось загрузить изображение'));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadCertificateTemplate(){
  const fileInput = document.getElementById('certTemplateFile');
  const errEl = document.getElementById('certTemplateError');
  errEl.textContent = '';
  const file = fileInput.files[0];
  if(!file){ errEl.textContent = 'Выберите файл изображения.'; return; }
  if(!file.type.startsWith('image/')){ errEl.textContent = 'Нужен файл изображения (PNG или JPEG).'; return; }
  try{
    const dataUrl = await resizeImageForCertificate(file);
    await db.collection('settings').doc('certificate').set({
      templateImage: dataUrl, updatedAt: new Date().toISOString()
    });
    certTemplateImage = dataUrl;
    certTemplatePromise = Promise.resolve(dataUrl);
    renderCertTemplatePreview();
    fileInput.value = '';
    errEl.textContent = 'Готово — новый дизайн сохранён.';
  } catch(err){
    errEl.textContent = 'Не удалось загрузить: ' + err.message;
  }
}

async function resetCertificateTemplate(){
  if(!confirm('Вернуть стандартный дизайн сертификата?')) return;
  try{
    await db.collection('settings').doc('certificate').delete();
    certTemplateImage = null;
    certTemplatePromise = Promise.resolve(null);
    renderCertTemplatePreview();
  } catch(err){
    alert('Не удалось сбросить дизайн: ' + err.message);
  }
}

/* --- Банк тестов --- */
let adminAllCustomTests = [];
let adminQCounter = 0;

function escapeHtmlAttr(str){
  return String(str==null?'':str)
    .replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function addAdminQuestionBlockTo(containerEl, prefill){
  adminQCounter++;
  const qid = 'q'+adminQCounter+'_'+Date.now();
  const div = document.createElement('div');
  div.className = 'q-block';
  div.dataset.qid = qid;
  const qVal = prefill ? escapeHtmlAttr(prefill.q) : '';
  const opts = prefill && prefill.options ? prefill.options : ['','','',''];
  const correctIdx = prefill && Number.isInteger(prefill.correct) ? prefill.correct : 0;
  div.innerHTML = `
    <label>Вопрос</label>
    <input type="text" class="adminQText" placeholder="Текст вопроса" value="${qVal}">
    <label>Варианты ответа (отметьте правильный)</label>
    ${[0,1,2,3].map(i=>`
      <div class="opt">
        <input type="radio" name="correct-${qid}" value="${i}" ${i===correctIdx?'checked':''}>
        <input type="text" class="adminOpt" placeholder="Вариант ${i+1}" style="flex:1;" value="${escapeHtmlAttr(opts[i])}">
      </div>
    `).join('')}
    <button class="secondary small" style="margin-top:8px;" onclick="this.closest('.q-block').remove()">Удалить вопрос</button>
  `;
  containerEl.appendChild(div);
  return div;
}

/* ---------------------------------------------------------
   СЕКЦИИ ТЕСТА (админ-конструктор)
   addAdminSection() создаёт блок нужного типа, при желании
   сразу заполненный (prefillSection) — используется и при
   "+ Grammar/Vocabulary/Reading/Writing", и при редактировании.
--------------------------------------------------------- */
let adminSectionCounter = 0;

function addAdminSection(type, prefillSection){
  adminSectionCounter++;
  const sid = 'sec'+adminSectionCounter+'_'+Date.now();
  const wrap = document.getElementById('adminSectionsWrap');
  const div = document.createElement('div');
  div.className = 'admin-section-block';
  div.dataset.sectionId = sid;
  div.dataset.sectionType = type;

  const titleVal = prefillSection ? escapeHtmlAttr(prefillSection.title || sectionDefaultTitle(type)) : sectionDefaultTitle(type);
  let bodyHtml = '';

  if(type === 'grammar' || type === 'vocabulary'){
    bodyHtml = `
      <div class="q-block-container"></div>
      <button class="secondary small" onclick="addAdminQuestionBlockTo(this.previousElementSibling)">+ Добавить вопрос</button>
      <button class="secondary small" onclick="toggleSectionImport('${sid}')">📥 Импорт вопросов</button>
      ${sectionImportPanelHtml(sid)}
    `;
  } else if(type === 'reading'){
    bodyHtml = `
      <label>Текст для чтения</label>
      <textarea class="readingTextInput" rows="6" placeholder="Вставьте текст, который будут читать ученики"></textarea>
      <label style="margin-top:10px;">Вопросы к тексту</label>
      <div class="q-block-container"></div>
      <button class="secondary small" onclick="addAdminQuestionBlockTo(this.previousElementSibling)">+ Добавить вопрос</button>
      <button class="secondary small" onclick="toggleSectionImport('${sid}')">📥 Импорт вопросов</button>
      ${sectionImportPanelHtml(sid)}
    `;
  } else if(type === 'writing'){
    bodyHtml = `
      <label>Задание</label>
      <textarea class="writingPromptInput" rows="4" placeholder="Write an email to your friend. Include: greeting, what you did, where you are, goodbye."></textarea>
      <div style="display:flex;gap:10px;">
        <div style="flex:1;"><label>Мин. слов</label><input type="number" class="writingMinWords" value="40"></div>
        <div style="flex:1;"><label>Макс. слов</label><input type="number" class="writingMaxWords" value="60"></div>
      </div>
      <label>Критерии проверки (через запятую)</label>
      <input type="text" class="writingCriteria" placeholder="Grammar, Vocabulary, Task Completion, Spelling, Punctuation">
      <p class="hint">Письменные ответы не проверяются автоматически (для настоящей проверки грамматики/лексики нейросетью нужен отдельный сервер с ИИ, которого пока нет) — репетитор читает ответ и сам выставляет оценку во вкладке «Результаты».</p>
    `;
  }

  div.innerHTML = `
    <div class="section-block-head">
      <span class="section-type-badge">${sectionIcon(type)} ${type.toUpperCase()}</span>
      <input type="text" class="sectionTitleInput" placeholder="Название секции" value="${titleVal}">
      <button class="secondary small" onclick="this.closest('.admin-section-block').remove()">✕ Удалить секцию</button>
    </div>
    ${bodyHtml}
  `;
  wrap.appendChild(div);

  if(prefillSection){
    if(type === 'grammar' || type === 'vocabulary' || type === 'reading'){
      const container = div.querySelector('.q-block-container');
      (prefillSection.questions || []).forEach(q => addAdminQuestionBlockTo(container, q));
      if(type === 'reading') div.querySelector('.readingTextInput').value = prefillSection.text || '';
    } else if(type === 'writing'){
      div.querySelector('.writingPromptInput').value = prefillSection.prompt || '';
      div.querySelector('.writingMinWords').value = prefillSection.minWords || 40;
      div.querySelector('.writingMaxWords').value = prefillSection.maxWords || 60;
      div.querySelector('.writingCriteria').value = (prefillSection.criteria || []).join(', ');
    }
  }
  return div;
}

function sectionImportPanelHtml(sid){
  return `
    <div class="section-import-panel hidden" data-import-for="${sid}" style="margin-top:10px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;">
      <p class="hint" style="margin:0 0 8px;">
        Формат: <code>QUESTION:</code> текст, затем <code>A:</code> <code>B:</code> <code>C:</code> <code>D:</code> варианты, затем <code>ANSWER:</code> буква. Между вопросами — пустая строка.
      </p>
      <textarea class="sectionImportText" rows="8" placeholder="QUESTION:&#10;She ___ to school every day.&#10;&#10;A:&#10;go&#10;&#10;B:&#10;goes&#10;&#10;C:&#10;going&#10;&#10;D:&#10;gone&#10;&#10;ANSWER:&#10;B"
        style="width:100%;background:var(--bg-panel);border:1px solid var(--border);color:var(--ink);border-radius:7px;padding:8px;font-family:var(--mono);font-size:12px;"></textarea>
      <div style="margin-top:8px;">
        <button class="primary small" onclick="runSectionImport('${sid}')">Разобрать и добавить</button>
        <button class="secondary small" onclick="toggleSectionImport('${sid}')">Отмена</button>
      </div>
      <p class="hint section-import-error"></p>
    </div>`;
}

function toggleSectionImport(sid){
  const panel = document.querySelector(`.section-import-panel[data-import-for="${sid}"]`);
  if(panel) panel.classList.toggle('hidden');
}

/* ---------------------------------------------------------
   ИМПОРТ ВОПРОСОВ
   parseQuestionsText() разбирает конкретно текстовый формат
   QUESTION/A/B/C/D/ANSWER и не привязан к конкретной секции —
   на эту же функцию в будущем можно завести парсеры Excel/Word/ИИ,
   результат у них у всех один и тот же: {q, options[4], correct}.
--------------------------------------------------------- */
function parseQuestionsText(raw){
  const questions = [];
  const errors = [];
  const blocks = raw.split(/\n?QUESTION:\s*\n?/i).map(b=>b.trim()).filter(Boolean);
  const letterMap = {A:0,B:1,C:2,D:3};

  blocks.forEach((block, idx)=>{
    const qNum = idx+1;
    const m = block.match(/^([\s\S]*?)\n?A:\s*\n?([\s\S]*?)\n?B:\s*\n?([\s\S]*?)\n?C:\s*\n?([\s\S]*?)\n?D:\s*\n?([\s\S]*?)\n?ANSWER:\s*\n?([\s\S]*)$/i);
    if(!m){
      errors.push(`Вопрос ${qNum}: не распознан формат (нужны A:, B:, C:, D:, ANSWER:).`);
      return;
    }
    const qText = m[1].trim();
    const options = [m[2].trim(), m[3].trim(), m[4].trim(), m[5].trim()];
    const answerLetter = m[6].trim().split('\n')[0].trim().toUpperCase();

    if(!qText){ errors.push(`Вопрос ${qNum}: пустой текст вопроса.`); return; }
    if(options.some(o=>!o)){ errors.push(`Вопрос ${qNum}: заполнены не все варианты ответа.`); return; }
    if(!(answerLetter in letterMap)){ errors.push(`Вопрос ${qNum}: не найден корректный ответ (ожидается A, B, C или D).`); return; }

    questions.push({ q: qText, options, correct: letterMap[answerLetter] });
  });

  return { questions, errors };
}

function runSectionImport(sid){
  const sectionBlock = document.querySelector(`.admin-section-block[data-section-id="${sid}"]`);
  if(!sectionBlock) return;
  const panel = sectionBlock.querySelector('.section-import-panel');
  const textarea = panel.querySelector('.sectionImportText');
  const errEl = panel.querySelector('.section-import-error');
  errEl.textContent = '';
  const raw = textarea.value;
  if(!raw.trim()){ errEl.textContent = 'Вставьте текст с вопросами.'; return; }

  const { questions, errors } = parseQuestionsText(raw);
  if(!questions.length){
    errEl.textContent = 'Не удалось распознать ни одного вопроса. ' + (errors[0] || '');
    return;
  }
  const container = sectionBlock.querySelector('.q-block-container');
  questions.forEach(q => addAdminQuestionBlockTo(container, q));

  errEl.textContent = errors.length
    ? `Добавлено ${questions.length} вопрос(ов). Пропущено с ошибками (${errors.length}).`
    : `Добавлено ${questions.length} вопрос(ов).`;
  textarea.value = '';
}

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

/* --- Репетиторы / Ученики --- */
async function loadAdminTeachers(){
  const wrap = document.getElementById('adminTeachersWrap');
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  try{
    const [usersSnap, codesSnap] = await Promise.all([
      db.collection('users').where('role','==','teacher').get(),
      db.collection('codes').get()
    ]);
    const codes = codesSnap.docs.map(d=>d.data());
    const rows = usersSnap.docs.map(d=>{
      const u = d.data(); const uid = d.id;
      const own = codes.filter(c=>c.teacherId===uid);
      const studentsCount = new Set(own.map(c=>c.studentName)).size;
      return {uid, ...u, codesCount: own.length, studentsCount};
    });
    if(!rows.length){ wrap.innerHTML = '<p class="empty-note">Пока нет ни одного репетитора.</p>'; return; }
    wrap.innerHTML = `<table><thead><tr><th>Email</th><th>Регистрация</th><th>Кодов создано</th><th>Учеников</th><th>Статус</th><th></th></tr></thead><tbody>` +
      rows.map(r=>`
        <tr>
          <td>${r.email}</td>
          <td>${new Date(r.createdAt).toLocaleDateString('ru-RU')}</td>
          <td>${r.codesCount}</td>
          <td>${r.studentsCount}</td>
          <td>${r.blocked ? '<span class="status-pill status-pending">заблокирован</span>' : '<span class="status-pill status-done">активен</span>'}</td>
          <td><button class="secondary small" onclick="toggleUserBlock('${r.uid}', ${!!r.blocked}, 'teachers')">${r.blocked?'Разблокировать':'Заблокировать'}</button></td>
        </tr>`).join('') + '</tbody></table>';
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить список.</p>';
  }
}

async function loadAdminStudents(){
  const wrap = document.getElementById('adminStudentsWrap');
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  try{
    const [usersSnap, codesSnap] = await Promise.all([
      db.collection('users').where('role','==','student').get(),
      db.collection('codes').get()
    ]);
    const codes = codesSnap.docs.map(d=>d.data());
    const rows = usersSnap.docs.map(d=>{
      const u = d.data(); const uid = d.id;
      const own = codes.filter(c=>c.studentUid===uid && c.status==='done');
      const avg = own.length ? Math.round(own.reduce((s,c)=>s+(c.score/c.total),0)/own.length*100) : null;
      return {uid, ...u, testsCount: own.length, avgPercent: avg};
    });
    if(!rows.length){ wrap.innerHTML = '<p class="empty-note">Пока нет учеников с аккаунтом.</p>'; return; }
    wrap.innerHTML = `<table><thead><tr><th>Email</th><th>Пройдено тестов</th><th>Средний балл</th><th>Статус</th><th></th></tr></thead><tbody>` +
      rows.map(r=>`
        <tr>
          <td>${r.email}</td>
          <td>${r.testsCount}</td>
          <td>${r.avgPercent!=null ? r.avgPercent+'%' : '—'}</td>
          <td>${r.blocked ? '<span class="status-pill status-pending">заблокирован</span>' : '<span class="status-pill status-done">активен</span>'}</td>
          <td><button class="secondary small" onclick="toggleUserBlock('${r.uid}', ${!!r.blocked}, 'students')">${r.blocked?'Разблокировать':'Заблокировать'}</button></td>
        </tr>`).join('') + '</tbody></table>';
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить список.</p>';
  }
}

async function toggleUserBlock(uid, currentlyBlocked, listType){
  if(!confirm(currentlyBlocked ? 'Разблокировать пользователя?' : 'Заблокировать пользователя? Он не сможет создавать коды/сохранять результаты под своим аккаунтом.')) return;
  try{
    await db.collection('users').doc(uid).update({blocked: !currentlyBlocked});
    if(listType === 'teachers') loadAdminTeachers();
    if(listType === 'students') loadAdminStudents();
  } catch(err){
    alert('Не удалось изменить статус: ' + err.message);
  }
}

async function generateUniqueCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code, exists = true;
  while(exists){
    code = Array.from({length:6}, ()=>chars[Math.floor(Math.random()*chars.length)]).join('');
    const snap = await db.collection('codes').doc(code).get();
    exists = snap.exists;
  }
  return code;
}

async function createCode(){
  if(!FIREBASE_CONFIGURED){ alert('Сначала подключите базу данных Firebase (см. инструкцию в чате).'); return; }
  if(!auth.currentUser){ alert('Сначала войдите в свой кабинет.'); return; }
  const testId = document.getElementById('tCourse').value;
  const name = document.getElementById('tName').value.trim();
  if(!testId){ alert('Выберите тест — сейчас нет подходящего теста под выбранные учебник/уровень.'); return; }
  if(!name){ alert('Введите фамилию и имя ученика'); return; }
  const btn = event.target;
  btn.disabled = true; btn.textContent = 'Создаю…';
  try{
    const test = findTest(testId);
    const sections = getTestSections(test);
    const selectedSections = getSelectedTeacherSections(test);
    const total = countAutoGradedQuestions(selectedSections.map(idx=>sections[idx]));
    const code = await generateUniqueCode();
    await saveCode(code, {
      code, studentName: name, testId, testTitle: test.title,
      testBook: test.book || null, testLevel: test.level || null, testTopic: test.topic || null,
      teacherId: auth.currentUser.uid, selectedSections,
      status: 'pending', answers: null, score: null, total,
      createdAt: new Date().toISOString(), completedAt: null
    });
    document.getElementById('codeValue').textContent = code;
    document.getElementById('codeMeta').textContent = `${name} · ${test.title}`;
    document.getElementById('codeResult').classList.remove('hidden');
    document.getElementById('tName').value = '';
  } catch(err){
    alert('Не удалось создать код. Проверьте настройки Firebase и подключение к интернету.\n' + err.message);
  } finally{
    btn.disabled = false; btn.textContent = '🔗 Сгенерировать код';
  }
}

/* ---------------------------------------------------------
   ТЕАЧЕР: таблица результатов
--------------------------------------------------------- */
let cachedEntries = [];

async function renderResultsTable(){
  const wrap = document.getElementById('resultsTableWrap');
  if(!FIREBASE_CONFIGURED){
    wrap.innerHTML = '<p class="empty-note">Подключите базу данных Firebase, чтобы видеть результаты.</p>';
    return;
  }
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  let entries;
  try{
    entries = await fetchAllCodes();
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить данные. Проверьте интернет и настройки Firebase.</p>';
    return;
  }
  cachedEntries = entries;
  if(!entries.length){
    wrap.innerHTML = '<p class="empty-note">Пока нет ни одного созданного кода.</p>';
    return;
  }
  let rows = entries.map((e,i)=>{
    const statusHtml = e.status==='done'
      ? `<span class="status-pill status-done">пройден</span>`
      : `<span class="status-pill status-pending">ожидание</span>`;
    const scoreHtml = e.status==='done'
      ? `<span class="${e.score===e.total?'score-good':(e.score/e.total<0.5?'score-bad':'')}">${e.score} / ${e.total}</span>`
      : '—';
    return `
      <tr class="row-toggle" onclick="toggleDetail(${i})">
        <td>${e.studentName}</td>
        <td>${e.testTitle}</td>
        <td><span style="font-family:var(--mono)">${e.code}</span></td>
        <td>${statusHtml}</td>
        <td>${scoreHtml}</td>
        <td>${new Date(e.createdAt).toLocaleDateString('ru-RU')}</td>
      </tr>
      <tr class="expand-row hidden" id="detail-${i}"><td colspan="6">${renderDetail(e)}</td></tr>
    `;
  }).join('');
  wrap.innerHTML = `
    <table>
      <thead><tr><th>Ученик</th><th>Тест</th><th>Код</th><th>Статус</th><th>Результат</th><th>Дата</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}
function toggleDetail(i){
  document.getElementById('detail-'+i).classList.toggle('hidden');
}
function renderDetail(e){
  if(e.status!=='done') return '<p class="empty-note">Ученик ещё не прошёл тест.</p>';
  const test = findTest(e.testId);

  if(e.sectionAnswers && e.sectionAnswers.length){
    return e.sectionAnswers.map((rec, pos)=>{
      const section = test ? getTestSections(test)[rec.sectionIndex] : null;
      if(rec.type === 'writing'){
        return renderWritingReviewBlock(e, rec, pos, section);
      }
      if(!section){
        return `<p class="empty-note">${rec.title || rec.type}: исходный тест изменён, детали недоступны.</p>`;
      }
      const qHtml = section.questions.map((q,i)=>{
        const ans = rec.answers[i];
        const ok = ans === q.correct;
        return `<div class="detail-q ${ok?'detail-ok':'detail-bad'}">
          <b>${i+1}. ${q.q}</b><br>
          Ответ ученика: ${ans!=null?q.options[ans]:'нет ответа'} ${ok?'✓':'✗'}
          ${!ok?`<br>Правильный ответ: ${q.options[q.correct]}`:''}
        </div>`;
      }).join('');
      return `<h4 style="font-family:var(--serif);margin:14px 0 8px;">${sectionIcon(rec.type)} ${rec.title || sectionDefaultTitle(rec.type)} — ${rec.score}/${rec.total}</h4>${qHtml}`;
    }).join('');
  }

  // Старый формат (плоский список вопросов) — для результатов, сохранённых до появления секций
  if(!test || !test.questions) return '<p class="empty-note">Исходный тест недоступен.</p>';
  return test.questions.map((q,i)=>{
    const ans = e.answers[i];
    const ok = ans===q.correct;
    return `<div class="detail-q ${ok?'detail-ok':'detail-bad'}">
      <b>${i+1}. ${q.q}</b><br>
      Ответ ученика: ${ans!=null?q.options[ans]:'нет ответа'} ${ok?'✓':'✗'}
      ${!ok?`<br>Правильный ответ: ${q.options[q.correct]}`:''}
    </div>`;
  }).join('');
}

function renderWritingReviewBlock(e, rec, pos, section){
  const review = (e.writingReviews && e.writingReviews[pos]) || null;
  const criteria = section && section.criteria && section.criteria.length ? section.criteria.join(', ') : '';
  return `
    <div class="q-block" style="margin-top:14px;">
      <div class="q-title">✍️ ${rec.title || 'Writing'} ${rec.wordCount!=null ? `— ${rec.wordCount} слов` : ''}
        ${rec.withinLimits===false ? '<span style="color:var(--red);"> (вне лимита слов)</span>' : ''}
      </div>
      ${section ? `<p class="hint" style="margin-bottom:8px;">Задание: ${escapeHtmlAttr(section.prompt)}${criteria?` · Критерии: ${escapeHtmlAttr(criteria)}`:''}</p>` : ''}
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;white-space:pre-wrap;font-size:13.5px;margin-bottom:10px;">${escapeHtmlAttr(rec.text || '(пусто)')}</div>
      <label>Оценка (0–100)</label>
      <input type="number" min="0" max="100" id="wrScore_${e.code}_${pos}" value="${review && review.score!=null ? review.score : ''}">
      <label>Комментарий</label>
      <input type="text" id="wrComment_${e.code}_${pos}" value="${review ? escapeHtmlAttr(review.comment) : ''}" placeholder="Комментарий для ученика">
      <button class="secondary small" style="margin-top:8px;" onclick="saveWritingReview('${e.code}', ${pos})">Сохранить оценку</button>
      ${review ? `<p class="hint">Проверено ${new Date(review.reviewedAt).toLocaleString('ru-RU')}</p>` : '<p class="hint">Ещё не проверено репетитором</p>'}
    </div>
  `;
}

async function saveWritingReview(code, pos){
  const scoreInput = document.getElementById(`wrScore_${code}_${pos}`);
  const commentInput = document.getElementById(`wrComment_${code}_${pos}`);
  const score = scoreInput.value === '' ? null : Math.max(0, Math.min(100, parseInt(scoreInput.value,10)));
  const comment = commentInput.value.trim();
  try{
    const snap = await db.collection('codes').doc(code).get();
    const data = snap.data();
    const writingReviews = data.writingReviews || {};
    writingReviews[pos] = { score, comment, reviewedAt: new Date().toISOString() };
    await db.collection('codes').doc(code).update({ writingReviews });
    showToast('Оценка сохранена');
  } catch(err){
    showToast('Не удалось сохранить оценку: ' + err.message, 'error');
  }
}



/* ---------------------------------------------------------
   ТЕАЧЕР: сертификаты
--------------------------------------------------------- */
async function renderCertificatesPanel(){
  const wrap = document.getElementById('certsWrap');
  if(!FIREBASE_CONFIGURED){
    wrap.innerHTML = '<p class="empty-note">Подключите базу данных Firebase, чтобы выдавать сертификаты.</p>';
    return;
  }
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  let entries;
  try{
    entries = await fetchAllCodes();
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить данные. Проверьте интернет и настройки Firebase.</p>';
    return;
  }
  cachedEntries = entries;
  const done = entries.filter(e=>e.status==='done');
  if(!done.length){
    wrap.innerHTML = '<p class="empty-note">Пока нет учеников, завершивших тест.</p>';
    return;
  }
  const byStudent = {};
  done.forEach(e=>{
    (byStudent[e.studentName] = byStudent[e.studentName] || []).push(e);
  });
  wrap.innerHTML = Object.keys(byStudent).map(name=>{
    const tests = byStudent[name].map(e=>`
      <div class="cert-test-row">
        <span>${e.testTitle} — ${e.score}/${e.total}</span>
        <button class="secondary small" onclick="downloadCertificate('${e.code}')">Выдать сертификат</button>
      </div>
    `).join('');
    return `<div class="cert-student-card"><h4>${name}</h4>${tests}</div>`;
  }).join('');
}

async function downloadCertificate(code){
  const e = cachedEntries.find(x=>x.code===code) || cachedStudentEntries.find(x=>x.code===code);
  if(!e) return;
  const canvas = document.getElementById('certCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  await ensureCertTemplateLoaded();

  let teacherSignature = '';
  if(FIREBASE_CONFIGURED && e.teacherId){
    try{
      const tSnap = await db.collection('users').doc(e.teacherId).get();
      if(tSnap.exists){
        const tData = tSnap.data();
        teacherSignature = tData.certSignature || tData.displayName || '';
      }
    } catch(err){ /* оставляем пустой строку — напечатаем линию для подписи от руки */ }
  }

  if(certTemplateImage){
    const img = new Image();
    await new Promise(resolve=>{ img.onload = resolve; img.onerror = resolve; img.src = certTemplateImage; });
    ctx.clearRect(0,0,W,H);
    ctx.drawImage(img, 0, 0, W, H);
  } else {
    // тёмно-синий фон
    ctx.fillStyle = '#0f1638';
    ctx.fillRect(0,0,W,H);
    // едва заметная тонкая рамка
    ctx.strokeStyle = 'rgba(45,212,191,0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(30,30,W-60,H-60);
  }

  const ORANGE = '#ff6a3d';
  const TEAL = '#2dd4bf';
  const WHITE = '#f3f6f8';

  ctx.textAlign = 'center';

  ctx.fillStyle = ORANGE;
  ctx.font = 'bold 34px Georgia';
  ctx.fillText(platformSettings.certTitle1, W/2, 110);
  ctx.fillText(platformSettings.certTitle2, W/2, 154);

  // тонкая бирюзовая линия под заголовком
  ctx.strokeStyle = TEAL;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W/2-190, 178);
  ctx.lineTo(W/2+190, 178);
  ctx.stroke();

  ctx.fillStyle = TEAL;
  ctx.font = '20px Georgia';
  ctx.fillText(platformSettings.certSubtitle, W/2, 230);

  ctx.fillStyle = WHITE;
  ctx.font = 'bold 44px Georgia';
  ctx.fillText(e.studentName, W/2, 320);

  ctx.fillStyle = TEAL;
  ctx.font = '17px Georgia';
  ctx.fillText(platformSettings.certCompletionText, W/2, 370);

  ctx.fillStyle = WHITE;
  ctx.font = 'bold 26px Georgia';
  ctx.fillText(e.testTitle, W/2, 408);

  ctx.fillStyle = TEAL;
  ctx.font = '18px Georgia';
  ctx.fillText(`Результат: ${e.score} из ${e.total}`, W/2, 452);

  const dateStr = new Date(e.completedAt || Date.now()).toLocaleDateString('ru-RU');
  ctx.font = '14px Georgia';
  ctx.fillStyle = 'rgba(243,246,248,0.6)';
  ctx.fillText('Дата: ' + dateStr, W/2, 484);

  // подпись репетитора внизу слева (в стиле "имя + должность")
  ctx.textAlign = 'left';
  ctx.strokeStyle = TEAL;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(90, H-140);
  ctx.lineTo(330, H-140);
  ctx.stroke();

  ctx.fillStyle = ORANGE;
  ctx.font = 'bold 18px Georgia';
  ctx.fillText(teacherSignature || 'Репетитор TutorHelp', 90, H-112);

  ctx.fillStyle = TEAL;
  ctx.font = '13px Georgia';
  ctx.fillText(platformSettings.certRoleLabel, 90, H-92);

  if(!certTemplateImage){
    // печать-плейсхолдер (пустой круг, как в референсе)
    ctx.strokeStyle = TEAL;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W-160, H-118, 55, 0, Math.PI*2);
    ctx.stroke();
  }

  const link = document.createElement('a');
  link.download = `Сертификат_${e.studentName.replace(/\s+/g,'_')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();

  if(FIREBASE_CONFIGURED){
    db.collection('codes').doc(code).update({certificateIssued:true}).catch(()=>{});
  }
}

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

function renderCurrentSection(){
  const sIdx = currentSectionQueue[currentSectionPos];
  const section = currentSections[sIdx];
  const isLast = currentSectionPos === currentSectionQueue.length - 1;

  document.getElementById('testHeader').textContent = `${currentTest.title} — ${currentEntry.studentName}`;
  document.getElementById('sectionProgress').textContent =
    `${sectionIcon(section.type)} ${section.title || sectionDefaultTitle(section.type)} · раздел ${currentSectionPos+1} из ${currentSectionQueue.length}`;

  const qWrap = document.getElementById('testQuestions');
  const nextBtn = document.getElementById('sectionNextBtn');
  nextBtn.disabled = false;
  nextBtn.textContent = isLast ? 'Завершить тест' : 'Далее';
  window.onbeforeunload = null;

  if(section.type === 'grammar' || section.type === 'vocabulary'){
    const localAnswers = new Array(section.questions.length).fill(null);
    qWrap.innerHTML = section.questions.map((q,qi)=>`
      <div class="q-block">
        <div class="q-title">${qi+1}. ${q.q}</div>
        ${q.options.map((opt,oi)=>`
          <label class="opt">
            <input type="radio" name="sq${qi}" value="${oi}" onchange="__sectionLocalAnswers[${qi}]=${oi}">
            ${opt}
          </label>
        `).join('')}
      </div>
    `).join('');
    window.__sectionLocalAnswers = localAnswers;
    nextBtn.onclick = ()=>advanceSection({ type: section.type, answers: window.__sectionLocalAnswers });

  } else if(section.type === 'reading'){
    const localAnswers = new Array(section.questions.length).fill(null);
    qWrap.innerHTML = `
      <div class="reading-layout">
        <div class="reading-text-panel">${escapeHtmlAttr(section.text)}</div>
        <div>
          ${section.questions.map((q,qi)=>`
            <div class="q-block">
              <div class="q-title">${qi+1}. ${q.q}</div>
              ${q.options.map((opt,oi)=>`
                <label class="opt">
                  <input type="radio" name="rq${qi}" value="${oi}" onchange="__sectionLocalAnswers[${qi}]=${oi}">
                  ${opt}
                </label>
              `).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    `;
    window.__sectionLocalAnswers = localAnswers;
    nextBtn.onclick = ()=>advanceSection({ type: section.type, answers: window.__sectionLocalAnswers });

  } else if(section.type === 'writing'){
    const draftKey = 'writingDraft_'+currentCode+'_'+sIdx;
    let savedDraft = '';
    try{ savedDraft = sessionStorage.getItem(draftKey) || ''; }catch(err){}
    qWrap.innerHTML = `
      <div class="q-block">
        <div class="q-title" style="white-space:pre-wrap;">${escapeHtmlAttr(section.prompt)}</div>
        <textarea id="writingAnswerInput" class="writing-textarea" placeholder="Введите ответ здесь…">${escapeHtmlAttr(savedDraft)}</textarea>
        <div id="writingWordCountBadge" class="word-count-badge">0 слов</div>
      </div>
    `;
    const textarea = document.getElementById('writingAnswerInput');
    const badge = document.getElementById('writingWordCountBadge');
    const updateCount = ()=>{
      const words = textarea.value.trim().split(/\s+/).filter(Boolean);
      const count = words.length;
      const within = count >= section.minWords && count <= section.maxWords;
      badge.textContent = `${count} слов (нужно ${section.minWords}–${section.maxWords})`;
      badge.className = 'word-count-badge ' + (count===0 ? '' : (within ? 'ok' : 'bad'));
      try{ sessionStorage.setItem(draftKey, textarea.value); }catch(err){}
      return {count, within};
    };
    textarea.addEventListener('input', updateCount);
    updateCount();
    window.onbeforeunload = function(){ return 'У вас есть незавершённое письменное задание. Точно уйти со страницы?'; };

    nextBtn.onclick = ()=>{
      const {count, within} = updateCount();
      if(count === 0){
        if(!confirm('Вы ничего не написали. Продолжить без ответа?')) return;
      } else if(!within){
        if(!confirm(`Количество слов вне лимита (${section.minWords}–${section.maxWords}). Продолжить всё равно?`)) return;
      }
      try{ sessionStorage.removeItem(draftKey); }catch(err){}
      window.onbeforeunload = null;
      advanceSection({ type:'writing', text: textarea.value.trim(), wordCount: count, withinLimits: within });
    };
  }
}

function advanceSection(answerRecord){
  sectionAnswers[currentSectionPos] = answerRecord;
  if(currentSectionPos < currentSectionQueue.length - 1){
    currentSectionPos++;
    renderCurrentSection();
    window.scrollTo({top:0, behavior:'smooth'});
  } else {
    finishTest();
  }
}

async function finishTest(){
  const nextBtn = document.getElementById('sectionNextBtn');
  nextBtn.disabled = true; nextBtn.textContent = 'Отправляю…';
  try{
    let score = 0, total = 0;
    const richSections = currentSectionQueue.map((sIdx, pos)=>{
      const section = currentSections[sIdx];
      const record = sectionAnswers[pos];
      if(section.type === 'writing'){
        return { sectionIndex: sIdx, type:'writing', title: section.title,
          text: record.text, wordCount: record.wordCount, withinLimits: record.withinLimits };
      }
      const answers = record.answers;
      let sectionScore = 0;
      section.questions.forEach((q,qi)=>{ if(answers[qi]===q.correct) sectionScore++; });
      score += sectionScore; total += section.questions.length;
      return { sectionIndex: sIdx, type: section.type, title: section.title, answers, score: sectionScore, total: section.questions.length };
    });

    const hasWriting = richSections.some(s=>s.type==='writing');
    const updateData = {
      status: 'done',
      sectionAnswers: richSections,
      score, total,
      needsReview: hasWriting,
      completedAt: new Date().toISOString()
    };
    if(FIREBASE_CONFIGURED && auth.currentUser){
      updateData.studentUid = auth.currentUser.uid;
    }
    await updateCode(currentCode, updateData);

    document.getElementById('student-test').classList.add('hidden');
    const resPanel = document.getElementById('student-result');
    resPanel.classList.remove('hidden');
    const hasAutoGraded = total > 0;
    const good = hasAutoGraded ? (score/total >= 0.6) : true;
    resPanel.innerHTML = `
      <div class="result-banner ${good?'good':'bad'}">
        <div>${currentEntry.studentName}, тест завершён</div>
        ${hasAutoGraded ? `<div class="big">${score} / ${total}</div>` : `<div class="big">Готово</div>`}
        ${hasWriting ? `<div>Письменная часть будет проверена репетитором.</div>` : ''}
        <div>Результаты отправлены вашему репетитору.</div>
      </div>
      <button class="secondary" onclick="goHome()">Готово</button>
    `;
    showToast('Тест отправлен репетитору');
  } catch(e3){
    showToast('Не удалось отправить результат. Проверьте интернет-соединение.', 'error');
    nextBtn.disabled = false; nextBtn.textContent = 'Завершить тест';
  }
}
function openMaterials() {
    window.location.href = 'materials/materials.html';
}