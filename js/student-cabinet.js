/* ---------------------------------------------------------
   js/student-cabinet.js
   КАБИНЕТ УЧЕНИКА: отдельная страница (как кабинет репетитора).
   Данные берутся из тех же коллекций Firebase, что и раньше:
   codes (результаты), wordSets / wordProgress (лексика),
   courses (курсы), users (профиль). Новых коллекций нет.
--------------------------------------------------------- */

/* ===== НАСТРОЙКИ — их можно менять ===== */

// true  — в разборе теста ученик видит правильные ответы на свои ошибки
// false — ученик видит только, где ошибся (без правильных ответов)
const SDASH_SHOW_CORRECT_ANSWERS = true;

// сколько последних результатов показывать на «Главной»
const SDASH_RECENT_LIMIT = 5;

// максимальная длина имени в профиле
const SDASH_NAME_MAX = 60;

/* ===== ВНУТРЕННЕЕ СОСТОЯНИЕ ===== */

const SDASH_TABS = ['dashboard', 'test', 'results', 'vocab', 'courses', 'account'];
const SDASH_TITLES = {
  dashboard: 'Главная',
  test: 'Пройти тест',
  results: 'Мои результаты',
  vocab: 'Лексика',
  courses: 'Курсы',
  account: 'Аккаунт'
};

let sdashCurrentTab = 'dashboard';
let sdashEntries = [];
let sdashProfile = null;
let sdashProfileUid = null;
let sdashPendingOpen = null;
let sdashPassBusy = false;
const sdashReq = { dashboard: 0, results: 0, vocab: 0, courses: 0, account: 0 };

/* ===== МЕЛКИЕ ПОМОЩНИКИ ===== */

function sdashEl(id){ return document.getElementById(id); }
function sdashEsc(value){ return escapeHtmlAttr(value); }

function sdashIsLoggedIn(){
  return !!(FIREBASE_CONFIGURED && auth && auth.currentUser);
}

function sdashDate(iso){
  const d = new Date(iso);
  if(isNaN(d)) return '';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function sdashScoreHtml(e){
  if(e.status !== 'done') return '<span class="status-pill status-pending">в процессе</span>';
  if(!(e.total > 0)) return '<span class="hint">письменная работа</span>';
  const cls = e.score === e.total ? 'score-good' : (e.score / e.total < 0.5 ? 'score-bad' : '');
  return `<span class="${cls}">${sdashEsc(e.score)} / ${sdashEsc(e.total)}</span>`;
}

/* ===== НАВИГАЦИЯ ===== */

function goStudentCabinet(tab){
  if(!sdashIsLoggedIn()){
    goHome();
    selectRole('student');
    return;
  }
  show('view-sdash');
  sdashEl('sdashEmailLabel').textContent =
    auth.currentUser.email || auth.currentUser.displayName || 'Вы вошли';
  setStudentTab(tab || 'dashboard');
  window.scrollTo({ top: 0 });
}

// Кнопка «назад» на экранах теста, лексики и курсов:
// вошедший ученик возвращается в кабинет, остальные — на главную
function backFromStudentScreen(tab){
  if(sdashIsLoggedIn()) goStudentCabinet(tab || sdashCurrentTab);
  else goHome();
}

function signOutStudentCabinet(){
  auth.signOut().then(() => goHome());
}

function setStudentTab(tab){
  if(!SDASH_TABS.includes(tab)) tab = 'dashboard';
  sdashCurrentTab = tab;

  document.querySelectorAll('#sdashSidebar .dash-nav-item')
    .forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  sdashSyncMobileNav(tab);

  SDASH_TABS.forEach(t => {
    const el = sdashEl('sdash-' + t);
    if(el) el.classList.toggle('hidden', t !== tab);
  });

  const bc = sdashEl('sdashBreadcrumbCurrent');
  if(bc) bc.textContent = SDASH_TITLES[tab] || '';

  if(tab === 'dashboard') loadStudentDashboard();
  if(tab === 'test') sdashPrepareTest();
  if(tab === 'results') loadStudentResults();
  if(tab === 'vocab') loadStudentVocabTab();
  if(tab === 'courses') loadStudentCoursesTab();
  if(tab === 'account') loadStudentAccount();
}

/* ===== МОБИЛЬНАЯ НИЖНЯЯ ПАНЕЛЬ ===== */

function sdashOpenMore(){
  const sidebar = sdashEl('sdashSidebar');
  const btn = sdashEl('sdashMoreBtn');
  const scrim = sdashEl('sdashMoreScrim');
  if(!sidebar || !btn || !MOBILE_NAV_MQ.matches) return;
  sidebar.classList.add('more-open');
  btn.setAttribute('aria-expanded', 'true');
  if(scrim) scrim.classList.add('is-open');
}

function sdashCloseMore(){
  const sidebar = sdashEl('sdashSidebar');
  const btn = sdashEl('sdashMoreBtn');
  const scrim = sdashEl('sdashMoreScrim');
  if(sidebar) sidebar.classList.remove('more-open');
  if(btn) btn.setAttribute('aria-expanded', 'false');
  if(scrim) scrim.classList.remove('is-open');
}

function sdashToggleMore(){
  const sidebar = sdashEl('sdashSidebar');
  if(sidebar && sidebar.classList.contains('more-open')) sdashCloseMore();
  else sdashOpenMore();
}

function sdashSyncMobileNav(tab){
  sdashCloseMore();
  const btn = sdashEl('sdashMoreBtn');
  if(!btn) return;
  const item = document.querySelector('#sdashSidebar .dash-nav-item[data-tab="' + tab + '"]');
  btn.classList.toggle('has-active', !!item && item.classList.contains('nav-more'));
}

document.addEventListener('keydown', e => {
  if(e.key === 'Escape') sdashCloseMore();
});
MOBILE_NAV_MQ.addEventListener('change', sdashCloseMore);

// пока вводится текст, нижнюю панель прячем (иначе она прыгает вместе с клавиатурой)
document.addEventListener('focusin', e => {
  const sidebar = sdashEl('sdashSidebar');
  if(!sidebar || !MOBILE_NAV_MQ.matches) return;
  if(e.target.matches && e.target.matches(NAV_TEXT_INPUT_SELECTOR)){
    sdashCloseMore();
    sidebar.classList.add('kbd-open');
  }
});
document.addEventListener('focusout', () => {
  setTimeout(() => {
    const sidebar = sdashEl('sdashSidebar');
    if(!sidebar) return;
    const a = document.activeElement;
    if(!(a && a.matches && a.matches(NAV_TEXT_INPUT_SELECTOR))) sidebar.classList.remove('kbd-open');
  }, 120);
});

/* ===== ДАННЫЕ ===== */

async function sdashGetProfile(){
  const user = auth.currentUser;
  if(!user) return {};
  if(sdashProfile && sdashProfileUid === user.uid) return sdashProfile;
  try{
    const snap = await db.collection('users').doc(user.uid).get();
    if(snap.exists){
      sdashProfile = snap.data();
      sdashProfileUid = user.uid;
      return sdashProfile;
    }
  } catch(err){ /* оставим пустой профиль */ }
  return {};
}

function sdashDisplayName(profile){
  const user = auth.currentUser;
  if(profile && profile.displayName) return profile.displayName;
  if(user && user.displayName) return user.displayName;
  if(user && user.email) return user.email.split('@')[0];
  return '';
}

// все результаты вошедшего ученика (тот же запрос, что и в истории на главной)
async function sdashFetchEntries(){
  const uid = auth.currentUser.uid;
  const snap = await db.collection('codes').where('studentUid', '==', uid).get();
  const rows = snap.docs.map(d => d.data());
  rows.sort((a, b) =>
    new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
  sdashEntries = rows;
  cachedStudentEntries = rows; // нужно для downloadCertificate()
  return rows;
}

function sdashStats(rows){
  const done = rows.filter(e => e.status === 'done');
  const graded = done.filter(e => e.total > 0);
  const avg = graded.length
    ? Math.round(graded.reduce((s, e) => s + e.score / e.total, 0) / graded.length * 100)
    : null;
  const perfect = done.filter(e => e.total > 0 && e.score === e.total).length;
  return { done: done.length, avg, perfect };
}

// опубликованные наборы слов + сколько слов пора повторить
async function sdashLoadWordSets(){
  const snap = await db.collection('wordSets').where('published', '==', true).get();
  const sets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const progs = await Promise.all(sets.map(s => fetchWordProgress(s.id)));
  sets.forEach((s, i) => { s._due = countDueWords(s, progs[i]); });
  return sets;
}

/* ===== ГЛАВНАЯ ===== */

async function loadStudentDashboard(){
  const reqId = ++sdashReq.dashboard;
  const setText = (id, v) => { sdashEl(id).textContent = v; };
  sdashEl('sdashError').classList.add('hidden');

  sdashGetProfile().then(p => {
    if(reqId !== sdashReq.dashboard) return;
    const name = sdashDisplayName(p);
    setText('sdashGreeting', name ? 'Привет, ' + name + '!' : 'Привет!');
  });

  try{
    const [rows, sets] = await Promise.all([
      sdashFetchEntries(),
      sdashLoadWordSets().catch(() => [])
    ]);
    if(reqId !== sdashReq.dashboard) return;
    cachedStudentWordSets = sets;

    const st = sdashStats(rows);
    const due = sets.reduce((n, s) => n + (s._due || 0), 0);
    setText('sdashKpiDone', st.done);
    setText('sdashKpiAvg', st.avg === null ? '—' : st.avg + '%');
    setText('sdashKpiDue', due);
    setText('sdashKpiCerts', st.perfect);

    const duePanel = sdashEl('sdashDuePanel');
    duePanel.classList.toggle('hidden', due <= 0);
    setText('sdashDueText', '📚 Сегодня нужно повторить слов: ' + due);

    const isEmpty = rows.length === 0;
    sdashEl('sdashWelcome').classList.toggle('hidden', !isEmpty);
    sdashEl('sdashRecentPanel').classList.toggle('hidden', isEmpty);
    if(isEmpty) return;

    sdashEl('sdashRecent').innerHTML = rows.slice(0, SDASH_RECENT_LIMIT).map(e => `
      <div class="dash-item">
        <div class="dash-item-main">
          <div class="dash-item-title">${sdashEsc(e.testTitle || 'Тест')}</div>
          <div class="dash-item-sub">${sdashEsc(dashAgoText(e.completedAt || e.createdAt))}</div>
        </div>
        <div class="dash-item-side">
          ${sdashScoreHtml(e)}
          <button type="button" class="secondary small" data-sdash-open="${sdashEsc(e.code)}">Открыть</button>
        </div>
      </div>`).join('');
  } catch(err){
    if(reqId !== sdashReq.dashboard) return;
    sdashEl('sdashError').classList.remove('hidden');
  }
}

/* ===== ПРОЙТИ ТЕСТ ===== */

function sdashPrepareTest(){
  const input = sdashEl('cabCode');
  sdashEl('cabError').textContent = '';
  if(input){
    input.value = '';
    if(!MOBILE_NAV_MQ.matches) input.focus();
  }
}

/* ===== МОИ РЕЗУЛЬТАТЫ ===== */

async function loadStudentResults(){
  const reqId = ++sdashReq.results;
  const wrap = sdashEl('sdashResultsWrap');
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  try{
    await ensureCustomTestsLoaded(); // нужны тексты тестов для разбора
    const rows = await sdashFetchEntries();
    if(reqId !== sdashReq.results) return;
    renderStudentResults(rows);
  } catch(err){
    if(reqId !== sdashReq.results) return;
    wrap.innerHTML = `<p class="empty-note">Не удалось загрузить результаты. Проверьте интернет-соединение.
      <br><button type="button" class="secondary small" style="margin-top:10px;" onclick="loadStudentResults()">Повторить</button></p>`;
  }
}

function renderStudentResults(rows){
  const wrap = sdashEl('sdashResultsWrap');
  if(!rows.length){
    wrap.innerHTML = `<p class="empty-note">Здесь пока пусто. Пройдите первый тест по коду от репетитора —
      и результат появится в этом списке.</p>`;
    return;
  }

  wrap.innerHTML = rows.map(e => {
    const perfect = e.status === 'done' && e.total > 0 && e.score === e.total;
    const meta = [sdashDate(e.completedAt || e.createdAt), e.testLevel].filter(Boolean).join(' · ');
    return `
      <div class="sdash-result">
        <div class="dash-item">
          <div class="dash-item-main">
            <div class="dash-item-title">${sdashEsc(e.testTitle || 'Тест')}</div>
            <div class="dash-item-sub">${sdashEsc(meta)}</div>
          </div>
          <div class="dash-item-side">
            ${sdashScoreHtml(e)}
            ${e.status === 'done'
              ? `<button type="button" class="secondary small" data-sdash-detail="${sdashEsc(e.code)}">Подробнее</button>`
              : ''}
            ${perfect
              ? `<button type="button" class="secondary small" data-sdash-cert="${sdashEsc(e.code)}">🏆 Сертификат</button>`
              : ''}
          </div>
        </div>
        <div class="sdash-detail hidden" id="sdashDetail_${sdashEsc(e.code)}"></div>
      </div>`;
  }).join('');

  if(sdashPendingOpen){
    const code = sdashPendingOpen;
    sdashPendingOpen = null;
    const btn = wrap.querySelector('[data-sdash-detail="' + CSS.escape(code) + '"]');
    if(btn){
      sdashToggleDetail(code, btn);
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

function sdashOpenResult(code){
  sdashPendingOpen = code;
  setStudentTab('results');
}

function sdashToggleDetail(code, btn){
  const box = sdashEl('sdashDetail_' + code);
  const e = sdashEntries.find(x => x.code === code);
  if(!box || !e) return;
  const willOpen = box.classList.contains('hidden');
  if(willOpen && !box.dataset.ready){
    box.innerHTML = sdashDetailHtml(e);
    box.dataset.ready = '1';
  }
  box.classList.toggle('hidden', !willOpen);
  if(btn) btn.textContent = willOpen ? 'Скрыть' : 'Подробнее';
}

function sdashQuestionsHtml(questions, answers){
  return questions.map((q, i) => {
    const ans = answers ? answers[i] : null;
    const ok = ans === q.correct;
    const given = (ans != null && q.options && q.options[ans] != null)
      ? sdashEsc(q.options[ans]) : 'нет ответа';
    const right = (!ok && SDASH_SHOW_CORRECT_ANSWERS && q.options && q.options[q.correct] != null)
      ? `<br>Правильный ответ: ${sdashEsc(q.options[q.correct])}` : '';
    return `<div class="detail-q ${ok ? 'detail-ok' : 'detail-bad'}">
      <b>${i + 1}. ${sdashEsc(q.q)}</b><br>
      Ваш ответ: ${given} ${ok ? '✓' : '✗'}${right}
    </div>`;
  }).join('');
}

function sdashWritingHtml(e, rec, pos, section){
  const review = (e.writingReviews && e.writingReviews[pos]) || null;
  const reviewHtml = review
    ? `<div class="sdash-review">
         <b>Оценка репетитора: ${review.score != null ? sdashEsc(review.score) + ' / 100' : '—'}</b>
         ${review.comment ? `<p>${sdashEsc(review.comment)}</p>` : ''}
         <span class="hint">Проверено ${sdashEsc(sdashDate(review.reviewedAt))}</span>
       </div>`
    : '<p class="hint">⏳ Работа ждёт проверки репетитором.</p>';
  return `
    <h4 class="sdash-detail-h">✍️ ${sdashEsc(rec.title || 'Writing')}${rec.wordCount != null ? ' — ' + sdashEsc(rec.wordCount) + ' слов' : ''}</h4>
    ${section && section.prompt ? `<p class="hint">Задание: ${sdashEsc(section.prompt)}</p>` : ''}
    <div class="sdash-writing-text">${sdashEsc(rec.text || '(пусто)')}</div>
    ${reviewHtml}`;
}

function sdashDetailHtml(e){
  if(e.status !== 'done') return '<p class="empty-note">Тест ещё не завершён.</p>';
  const test = findTest(e.testId);

  if(Array.isArray(e.sectionAnswers) && e.sectionAnswers.length){
    return e.sectionAnswers.map((rec, pos) => {
      const section = test ? getTestSections(test)[rec.sectionIndex] : null;
      if(rec.type === 'writing') return sdashWritingHtml(e, rec, pos, section);
      const head = `<h4 class="sdash-detail-h">${sectionIcon(rec.type)} ${sdashEsc(rec.title || sectionDefaultTitle(rec.type))} — ${sdashEsc(rec.score)}/${sdashEsc(rec.total)}</h4>`;
      if(!section || !Array.isArray(section.questions)){
        return head + '<p class="empty-note">Подробности недоступны: тест был изменён.</p>';
      }
      return head + sdashQuestionsHtml(section.questions, rec.answers);
    }).join('');
  }

  // старый формат: плоский список вопросов
  if(test && Array.isArray(test.questions) && e.answers){
    return sdashQuestionsHtml(test.questions, e.answers);
  }
  return '<p class="empty-note">Подробности недоступны.</p>';
}

/* ===== ЛЕКСИКА ===== */

async function loadStudentVocabTab(){
  const reqId = ++sdashReq.vocab;
  const wrap = sdashEl('sdashVocabWrap');
  const sub = sdashEl('sdashVocabSubtitle');
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  try{
    const sets = await sdashLoadWordSets();
    if(reqId !== sdashReq.vocab) return;
    cachedStudentWordSets = sets;

    if(!sets.length){
      sub.textContent = 'Наборы слов для изучения и повторения';
      wrap.innerHTML = '<p class="empty-note">Пока нет опубликованных наборов слов.</p>';
      return;
    }
    const due = sets.reduce((n, s) => n + (s._due || 0), 0);
    sub.textContent = due > 0
      ? 'Сегодня нужно повторить слов: ' + due
      : 'Повторений на сегодня нет — можно учить новые слова';

    wrap.innerHTML = sets.map(s => `
      <div class="cert-test-row">
        <span>${sdashEsc(s.title)}
          <span style="color:var(--ink-dim);font-size:12px;">
            ${sdashEsc([s.level, s.topic].filter(Boolean).join(' · '))} · ${(s.words || []).length} слов${s._due > 0 ? ' · к повторению: ' + s._due : ''}
          </span>
        </span>
        <button type="button" class="secondary small" data-sdash-vocab="${sdashEsc(s.id)}">Открыть</button>
      </div>`).join('');
  } catch(err){
    if(reqId !== sdashReq.vocab) return;
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить наборы слов.</p>';
  }
}

function sdashOpenVocab(id){
  goVocabStudent();
  openVocabSet(id);
}

/* ===== КУРСЫ ===== */

async function loadStudentCoursesTab(){
  const reqId = ++sdashReq.courses;
  const wrap = sdashEl('sdashCoursesWrap');
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  try{
    const snap = await db.collection('courses').where('published', '==', true).get();
    if(reqId !== sdashReq.courses) return;
    if(snap.size === 0){
      wrap.innerHTML = '<p class="empty-note">Пока нет опубликованных курсов.</p>';
      return;
    }
    wrap.innerHTML = `
      <p style="margin:0 0 4px;">Доступно курсов: <b>${snap.size}</b></p>
      <p class="hint" style="margin:0 0 4px;">Проходите уроки по шагам, зарабатывайте XP и следите за прогрессом.</p>
      <button type="button" class="primary" onclick="sdashOpenCourses()">🎓 Открыть курсы</button>`;
  } catch(err){
    if(reqId !== sdashReq.courses) return;
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить курсы.</p>';
  }
}

function sdashOpenCourses(){
  if(window.CourseStudent && typeof window.CourseStudent.openList === 'function'){
    window.CourseStudent.openList();
  } else {
    showToast('Раздел «Курсы» сейчас недоступен.', 'error');
  }
}

/* ===== АККАУНТ ===== */

async function loadStudentAccount(){
  const reqId = ++sdashReq.account;
  const user = auth.currentUser;
  if(!user) return;

  sdashEl('saccEmail').value = user.email || '';
  sdashEl('saccMsg').textContent = '';
  sdashEl('saccPassMsg').textContent = '';

  const hasPassword = (user.providerData || []).some(p => p.providerId === 'password');
  sdashEl('saccPassPanel').classList.toggle('hidden', !hasPassword);
  sdashEl('saccGoogleNote').classList.toggle('hidden', hasPassword);

  const profile = await sdashGetProfile();
  if(reqId !== sdashReq.account) return;
  sdashEl('saccName').value = (profile && profile.displayName) || user.displayName || '';

  try{
    const rows = await sdashFetchEntries();
    if(reqId !== sdashReq.account) return;
    const st = sdashStats(rows);
    sdashEl('saccStatDone').textContent = st.done;
    sdashEl('saccStatAvg').textContent = st.avg === null ? '—' : st.avg + '%';
    sdashEl('saccStatCerts').textContent = st.perfect;
  } catch(err){ /* статистика необязательна */ }
}

async function saveStudentName(){
  const user = auth.currentUser;
  if(!user) return;
  const btn = sdashEl('saccSaveBtn');
  const msg = sdashEl('saccMsg');
  const name = sdashEl('saccName').value.trim().slice(0, SDASH_NAME_MAX);
  msg.textContent = '';
  if(!name){ msg.textContent = 'Введите имя.'; return; }

  btn.disabled = true;
  try{
    await db.collection('users').doc(user.uid).update({ displayName: name });
    sdashProfile = { ...(sdashProfile || {}), displayName: name };
    sdashProfileUid = user.uid;
    showToast('Имя сохранено');
  } catch(err){
    msg.textContent = 'Не удалось сохранить: ' + err.message;
  } finally {
    btn.disabled = false;
  }
}

async function changeStudentPassword(){
  if(sdashPassBusy || !auth.currentUser) return;
  const msg = sdashEl('saccPassMsg');
  const btn = sdashEl('saccPassBtn');
  msg.textContent = '';

  const current = sdashEl('saccCurPass').value;
  const next = sdashEl('saccNewPass').value;
  const again = sdashEl('saccConfPass').value;

  if(!current || !next || !again){ msg.textContent = 'Заполните все три поля.'; return; }
  if(next.length < 6){ msg.textContent = 'Новый пароль должен быть не короче 6 символов.'; return; }
  if(next !== again){ msg.textContent = 'Новый пароль и повтор не совпадают.'; return; }
  if(next === current){ msg.textContent = 'Новый пароль должен отличаться от текущего.'; return; }

  sdashPassBusy = true;
  btn.disabled = true;
  btn.textContent = 'Меняю…';
  try{
    const cred = firebase.auth.EmailAuthProvider.credential(auth.currentUser.email, current);
    await auth.currentUser.reauthenticateWithCredential(cred);
    await auth.currentUser.updatePassword(next);
    ['saccCurPass', 'saccNewPass', 'saccConfPass'].forEach(id => { sdashEl(id).value = ''; });
    showToast('Пароль изменён');
  } catch(err){
    msg.textContent = acctAuthError(err);
  } finally {
    sdashPassBusy = false;
    btn.disabled = false;
    btn.textContent = 'Сменить пароль';
  }
}

/* ===== ОБРАБОТКА НАЖАТИЙ (одна точка вместо кучи onclick) ===== */

document.addEventListener('click', e => {
  const root = sdashEl('view-sdash');
  if(!root || !e.target.closest) return;
  const t = e.target.closest('[data-sdash-detail],[data-sdash-cert],[data-sdash-open],[data-sdash-vocab]');
  if(!t || !root.contains(t)) return;

  if(t.dataset.sdashDetail) sdashToggleDetail(t.dataset.sdashDetail, t);
  else if(t.dataset.sdashCert) downloadCertificate(t.dataset.sdashCert);
  else if(t.dataset.sdashOpen) sdashOpenResult(t.dataset.sdashOpen);
  else if(t.dataset.sdashVocab) sdashOpenVocab(t.dataset.sdashVocab);
});

// Enter в поле кода = «Начать тест»
(function(){
  const input = sdashEl('cabCode');
  if(!input) return;
  input.addEventListener('keydown', ev => {
    if(ev.key === 'Enter'){
      ev.preventDefault();
      sdashEl('cabStartBtn').click();
    }
  });
})();