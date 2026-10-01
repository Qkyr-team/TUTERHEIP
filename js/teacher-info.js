/* ---------------------------------------------------------
   js/teacher-info.js
   Вкладка «Информация» в кабинете репетитора.
   Основной источник — коллекция Firestore «teacherNews»
   (публикуется в Админ → Новости). Список TEACHER_INFO ниже —
   запасной вариант, пока в базе нет публикаций.
   tag: 'new' | 'important' | 'tip'
--------------------------------------------------------- */

const TEACHER_INFO_TAGS = {
  new: 'Новое',
  important: 'Важно',
  tip: 'Совет'
};

const TEACHER_INFO = [
  {
    date: '2026-10-01',
    tag: 'new',
    title: 'Появилась вкладка «Информация»',
    text: 'Здесь я буду сообщать о новых тестах, обновлениях платформы и важных изменениях.'
  },
  {
    date: '2026-09-30',
    tag: 'tip',
    title: 'Как быстро отправить тест ученику',
    text: 'Откройте «Создать код», выберите тест, укажите имя ученика и отправьте ему сгенерированный код.'
  }
];

function infoEscape(str){
  return String(str == null ? '' : str)
    .replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function infoCardHTML(item){
  const d = new Date(item.date);
  const dateStr = isNaN(d) ? infoEscape(item.date || '')
    : d.toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' });
  const tag = TEACHER_INFO_TAGS[item.tag] ? item.tag : 'new';
  return `
    <div class="info-card info-${tag}">
      <div class="info-card-head">
        <span class="info-badge info-badge-${tag}">${TEACHER_INFO_TAGS[tag]}</span>
        <span class="info-date">${dateStr}</span>
      </div>
      <h3 class="info-title">${infoEscape(item.title)}</h3>
      <p class="info-text">${item.text || ''}</p>
    </div>`;
}

async function renderTeacherInfo(){
  const wrap = document.getElementById('teacherInfoWrap');
  if(!wrap) return;

  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';

  let items = [];
  try{
    if(FIREBASE_CONFIGURED && auth.currentUser){
      const snap = await db.collection('teacherNews').get();
      items = snap.docs.map(d => d.data());
      items.sort((a,b) =>
        (b.date||'').localeCompare(a.date||'') ||
        (b.createdAt||'').localeCompare(a.createdAt||'')
      );
    }
  } catch(err){
    items = [];
  }

  if(!items.length) items = TEACHER_INFO;

  wrap.innerHTML = items.length
    ? items.map(infoCardHTML).join('')
    : '<p class="hint">Пока сообщений нет.</p>';
}