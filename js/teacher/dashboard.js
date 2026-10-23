/* js/teacher/dashboard.js — Dashboard репетитора */
/* ---------------------------------------------------------
   DASHBOARD РЕПЕТИТОРА
   Данные: тот же запрос, что у вкладки «Результаты»
   (codes, teacherId == uid). Новых полей и коллекций нет.
--------------------------------------------------------- */
const DASH_STALE_DAYS = 7;
const DASH_RECENT_LIMIT = 5;
const DASH_ATTENTION_LIMIT = 6;
let dashRequestId = 0;
let dashPendingOpen = null;

// есть ли письменная работа, которую репетитор ещё не оценил
// (флаг needsReview после проверки не сбрасывается, поэтому смотрим на сами оценки)
function dashHasUnreviewedWriting(e){
  if(e.status !== 'done' || !Array.isArray(e.sectionAnswers)) return false;
  return e.sectionAnswers.some((rec, pos) =>
    rec && rec.type === 'writing' && !(e.writingReviews && e.writingReviews[pos]));
}

function dashDaysAgo(iso){
  const t = new Date(iso).getTime();
  if(isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

function dashAgoText(iso){
  const d = dashDaysAgo(iso);
  if(d === null) return '';
  if(d <= 0) return 'сегодня';
  if(d === 1) return 'вчера';
  return d + ' дн. назад';
}

function dashRow(e, rightHtml, subText){
  return `
    <div class="dash-item">
      <div class="dash-item-main">
        <div class="dash-item-title">${escapeHtmlAttr(e.studentName || 'Без имени')}</div>
        <div class="dash-item-sub">${escapeHtmlAttr(e.testTitle || '')}${subText ? ' · ' + escapeHtmlAttr(subText) : ''}</div>
      </div>
      <div class="dash-item-side">${rightHtml}</div>
    </div>`;
}

function dashOpenButton(code, label){
  return `<button type="button" class="secondary small" data-open-result="${escapeHtmlAttr(code)}">${label}</button>`;
}

function renderDashboard(rows){
  const set = (id, v) => { document.getElementById(id).textContent = v; };
  const done = rows.filter(e => e.status === 'done');
  const waitingReview = rows.filter(dashHasUnreviewedWriting);
  const noResult = rows.filter(e => e.status !== 'done');
  const weekAgo = Date.now() - 7 * 86400000;
  const doneWeek = done.filter(e => new Date(e.completedAt || e.createdAt).getTime() >= weekAgo);
  const graded = done.filter(e => e.total > 0);
  const avg = graded.length
    ? Math.round(graded.reduce((s, e) => s + e.score / e.total, 0) / graded.length * 100) + '%'
    : '—';

  set('dashKpiWaiting', waitingReview.length);
  set('dashKpiActive', noResult.length);
  set('dashKpiWeek', doneWeek.length);
  set('dashKpiAvg', avg);

  // пустой аккаунт: показываем приветствие вместо пустых списков
  const isEmpty = rows.length === 0;
  document.getElementById('dashWelcome').classList.toggle('hidden', !isEmpty);
  document.getElementById('dashAttentionPanel').classList.toggle('hidden', isEmpty);
  document.getElementById('dashRecentPanel').classList.toggle('hidden', isEmpty);
  if(isEmpty) return;

  // --- требует внимания ---
  const stale = noResult
    .filter(e => (dashDaysAgo(e.createdAt) || 0) >= DASH_STALE_DAYS)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const review = waitingReview
    .sort((a, b) => new Date(a.completedAt || a.createdAt) - new Date(b.completedAt || b.createdAt));

  let attention = '';
  if(review.length){
    attention += `<h4 class="dash-sub">✍️ Письменные работы без проверки (${review.length})</h4>`;
    attention += review.slice(0, DASH_ATTENTION_LIMIT).map(e =>
      dashRow(e, dashOpenButton(e.code, 'Проверить'), 'сдано ' + dashAgoText(e.completedAt || e.createdAt))).join('');
  }
  if(stale.length){
    attention += `<h4 class="dash-sub">⏳ Код выдан больше ${DASH_STALE_DAYS} дней назад, результата нет (${stale.length})</h4>`;
    attention += stale.slice(0, DASH_ATTENTION_LIMIT).map(e =>
      dashRow(e, `<span class="status-pill status-pending">ожидание</span>`,
        'код создан ' + dashAgoText(e.createdAt))).join('');
  }
  document.getElementById('dashAttention').innerHTML = attention ||
    '<p class="empty-note">Всё под контролем: нет работ на проверку и забытых кодов.</p>';

  // --- последние результаты ---
  const recent = done
    .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
    .slice(0, DASH_RECENT_LIMIT);
  document.getElementById('dashRecent').innerHTML = recent.length
    ? recent.map(e => {
        const scoreHtml = e.total > 0
          ? `<span class="${e.score === e.total ? 'score-good' : (e.score / e.total < 0.5 ? 'score-bad' : '')}">${e.score} / ${e.total}</span>`
          : '<span class="hint">письменная работа</span>';
        return dashRow(e, scoreHtml + dashOpenButton(e.code, 'Открыть'),
          dashAgoText(e.completedAt || e.createdAt));
      }).join('')
    : '<p class="empty-note">Пока никто не завершил тест. Как только это произойдёт, результат появится здесь.</p>';
}

async function loadTeacherDashboard(){
  const requestId = ++dashRequestId;
  const ids = ['dashKpiWaiting', 'dashKpiActive', 'dashKpiWeek', 'dashKpiAvg'];
  document.getElementById('dashError').classList.add('hidden');

  if(!FIREBASE_CONFIGURED || !auth.currentUser){
    ids.forEach(id => { document.getElementById(id).textContent = '—'; });
    document.getElementById('dashAttention').innerHTML =
      '<p class="empty-note">Подключите базу данных Firebase, чтобы видеть обзор.</p>';
    document.getElementById('dashRecent').innerHTML = '';
    return;
  }
  ids.forEach(id => { document.getElementById(id).textContent = '…'; });
  try{
    const rows = await fetchAllCodes();
    if(requestId !== dashRequestId) return; // пришёл более новый запрос
    renderDashboard(rows);
  } catch(err){
    if(requestId !== dashRequestId) return;
    console.error('Не удалось загрузить Dashboard:', err);
    ids.forEach(id => { document.getElementById(id).textContent = '—'; });
    document.getElementById('dashError').classList.remove('hidden');
    document.getElementById('dashAttention').innerHTML = '';
    document.getElementById('dashRecent').innerHTML = '';
  }
}

// кнопки «Проверить» / «Открыть»: переходим в «Результаты» и раскрываем нужную строку
document.addEventListener('click', ev => {
  const btn = ev.target.closest && ev.target.closest('[data-open-result]');
  if(!btn) return;
  dashPendingOpen = { code: btn.getAttribute('data-open-result'), t: Date.now() };
  setTeacherTab('results');
});

// вызывается в конце renderResultsTable()
function focusPendingResult(){
  if(!dashPendingOpen) return;
  const { code, t } = dashPendingOpen;
  dashPendingOpen = null;
  if(Date.now() - t > 10000) return;
  const i = cachedEntries.findIndex(e => e.code === code);
  if(i < 0) return;
  const row = document.getElementById('detail-' + i);
  if(!row) return;
  row.classList.remove('hidden');
  row.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
