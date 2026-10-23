/* js/courses/student-course-list.js — Курсы (ученик): список курсов */
'use strict';
function renderCourseList(){
  S.screen = 'list';
  setBack('← на главную');
  if(!S.courses.length){
    root().innerHTML = '<div class="panel"><h2>🎓 Курсы</h2><p class="empty-note">Опубликованных курсов пока нет.</p></div>';
    return;
  }
  root().innerHTML = `
    <div class="panel">
      <h2>🎓 Курсы</h2>
      <div class="crs-cards">
        ${S.courses.map(c => {
          const flat = flatLessons(c), prog = S.progs[c.id] || {completed:{}, xp:0};
          const done = flat.filter(x => prog.completed[x.lesson.id]).length;
          const pct = flat.length ? Math.round(done/flat.length*100) : 0;
          return `
            <button class="crs-card" onclick="CourseStudent.openCourse('${c.id}')">
              <div class="crs-card-ico" style="background:${esc(c.color||COLORS[0])}">${esc(c.icon||'📘')}</div>
              <div class="crs-card-info">
                <b>${esc(c.title)}</b>
                <span>${esc(c.description||'')}</span>
                <div class="crs-bar"><i style="width:${pct}%;background:${esc(c.color||COLORS[0])}"></i></div>
                <small>${done} из ${flat.length} уроков · ⭐ ${prog.xp||0} XP</small>
              </div>
            </button>`;
        }).join('')}
      </div>
    </div>`;
}

S.openCourse = async function(id){
  if(!FIREBASE_CONFIGURED || !auth.currentUser){
    toast('Войдите в аккаунт, чтобы открыть курс.', 'error');
    return;
  }
  show('view-course');
  setBack('');
  root().innerHTML = '<p class="empty-note">Загрузка…</p>';
  try{
    let c = S.courses.find(x => x.id === id);
    if(!c){
      const snap = await db.collection('courses').doc(id).get();
      if(!snap.exists){ root().innerHTML = '<p class="empty-note">Курс не найден.</p>'; setBack('← на главную'); return; }
      c = {id:snap.id, ...snap.data()};
    }
    c.units = c.units || [];
    S.course = c;
    S.prog = await fetchProgress(id);
    renderPath();
  } catch(err){
    root().innerHTML = '<p class="empty-note">Не удалось открыть курс: ' + esc(err.message) + '</p>';
    setBack('← на главную');
  }
};
