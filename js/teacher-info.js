/* ---------------------------------------------------------
   js/teacher-info.js
   Вкладка «Информация» в кабинете репетитора.
   Чтобы добавить сообщение — допишите блок В НАЧАЛО списка
   TEACHER_INFO (новые сверху).
   tag: 'new' | 'important' | 'tip'
   В text можно использовать HTML: <b>жирный</b>, <a href="...">ссылка</a>
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

function renderTeacherInfo(){
  const wrap = document.getElementById('teacherInfoWrap');
  if(!wrap) return;

  if(!TEACHER_INFO.length){
    wrap.innerHTML = '<p class="hint">Пока сообщений нет.</p>';
    return;
  }

  wrap.innerHTML = TEACHER_INFO.map(item => {
    const d = new Date(item.date);
    const dateStr = isNaN(d) ? item.date
      : d.toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' });
    const tag = item.tag || 'new';
    return `
      <div class="info-card info-${tag}">
        <div class="info-card-head">
          <span class="info-badge info-badge-${tag}">${TEACHER_INFO_TAGS[tag] || ''}</span>
          <span class="info-date">${dateStr}</span>
        </div>
        <h3 class="info-title">${item.title}</h3>
        <p class="info-text">${item.text}</p>
      </div>`;
  }).join('');
}