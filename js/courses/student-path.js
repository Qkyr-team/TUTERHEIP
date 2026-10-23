/* js/courses/student-path.js — Курсы (ученик): путь из уроков */
'use strict';
function renderPath(){
  S.screen = 'path';
  setBack('← к курсам');
  const c = S.course, prog = S.prog, color = c.color || COLORS[0];
  const flat = flatLessons(c);
  const done = flat.filter(x => prog.completed[x.lesson.id]).length;
  const pct = flat.length ? Math.round(done/flat.length*100) : 0;

  let html = `
    <div class="panel crs-path-panel">
      <div class="crs-top">
        <div>
          <h2 style="margin-bottom:4px;">${esc(c.icon||'📘')} ${esc(c.title)}</h2>
          <p class="hint" style="margin:0;">${esc(c.description||'')}</p>
        </div>
        <div class="crs-xp">⭐ ${prog.xp||0} XP</div>
      </div>
      <div class="crs-bar" style="margin:14px 0 4px;"><i style="width:${pct}%;background:${esc(color)}"></i></div>
      <p class="hint" style="margin:0 0 6px;">Пройдено уроков: ${done} из ${flat.length}</p>`;

  let idx = 0;
  c.units.forEach((u,ui) => {
    html += `
      <div class="crs-unit-banner" style="background:${esc(color)}">
        <small>Раздел ${ui+1}</small><b>${esc(u.title)}</b>
      </div>
      <div class="crs-path">`;
    (u.lessons||[]).forEach((l,li) => {
      const isDone = !!prog.completed[l.id];
      const unlocked = idx === 0 || !!prog.completed[flat[idx-1].lesson.id];
      const state = isDone ? 'done' : (unlocked ? 'current' : 'locked');
      const off = OFFSETS[li % OFFSETS.length];
      html += `
        <div class="crs-node-wrap" style="transform:translateX(${off}px)">
          ${state==='current' ? '<div class="crs-start">НАЧАТЬ</div>' : ''}
          <button class="crs-node ${state}" style="--c:${esc(color)}"
            onclick="CourseStudent.startLesson('${l.id}')" title="${esc(l.title)}">
            ${state==='done' ? '✓' : (state==='locked' ? '🔒' : '★')}
          </button>
          <div class="crs-node-label">${esc(l.title)}</div>
        </div>`;
      idx++;
    });
    html += '</div>';
  });
  html += '</div>';
  root().innerHTML = html;
}

S.back = function(){
  if(S.screen === 'path'){
    if(S.course) S.progs[S.course.id] = S.prog;
    // если список ещё не загружался (открыли курс из админки) — загружаем заново
    if(!S.courses.length) { S.openList(); return; }
    renderCourseList();
  } else {
    goHome();
  }
};

/* ---------- прохождение урока ---------- */
S.startLesson = function(lessonId){
  const flat = flatLessons(S.course);
  const idx = flat.findIndex(x => x.lesson.id === lessonId);
  if(idx < 0) return;
  const unlocked = idx === 0 || !!S.prog.completed[flat[idx-1].lesson.id];
  if(!unlocked){ toast('Сначала пройдите предыдущий урок 🔒', 'error'); return; }
  const lesson = flat[idx].lesson;
  if(!(lesson.exercises||[]).length){ toast('В этом уроке пока нет упражнений.', 'error'); return; }

  S.lesson = lesson;
  S.queue = lesson.exercises.map(e => JSON.parse(JSON.stringify(e)));
  S.total = S.queue.length;
  S.done = 0;
  S.hearts = MAX_HEARTS;
  S.failed = new Set();
  S.screen = 'lesson';
  setBack('');
  root().innerHTML = `
    <div class="panel crs-lesson">
      <div class="crs-lhead">
        <button class="crs-x" onclick="CourseStudent.exitLesson()" title="Выйти">✕</button>
        <div class="crs-bar big"><i id="crsProg"></i></div>
        <div class="crs-hearts" id="crsHearts"></div>
      </div>
      <div class="crs-body" id="crsBody"></div>
      <div class="crs-foot" id="crsFoot">
        <div class="crs-fb" id="crsFb"></div>
        <button class="crs-btn" id="crsBtn" onclick="CourseStudent.check()"></button>
      </div>
    </div>`;
  renderExercise();
};

S.exitLesson = function(){
  if(!confirm('Выйти из урока? Прогресс этого урока не сохранится.')) return;
  renderPath();
};
