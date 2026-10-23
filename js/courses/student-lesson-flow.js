/* js/courses/student-lesson-flow.js — Курсы (ученик): проверка ответа, жизни, завершение урока */
'use strict';
function showFeedback(ok, correctText){
  S.cur.answered = true;
  updateHud();
  const foot = $('crsFoot');
  foot.className = 'crs-foot ' + (ok ? 'ok' : 'bad');
  $('crsFb').innerHTML = ok
    ? '<b>✅ Правильно!</b>'
    : `<b>❌ Неверно</b><span>Правильный ответ: <u>${esc(correctText)}</u></span>`;
  setBtn('Продолжить', true);
}

function advance(){
  S.queue.shift();
  if(S.hearts <= 0){ outOfHearts(); return; }
  if(!S.queue.length){ finishLesson(); return; }
  renderExercise();
}

function outOfHearts(){
  S.screen = 'lesson-fail';
  root().innerHTML = `
    <div class="panel crs-end">
      <div class="crs-big">💔</div>
      <h2>Жизни закончились</h2>
      <p class="hint">Не страшно — повторите урок ещё раз, получится лучше!</p>
      <button class="primary" onclick="CourseStudent.startLesson('${S.lesson.id}')">Попробовать снова</button>
      <button class="secondary" style="margin-left:8px;" onclick="CourseStudent.toPath()">К курсу</button>
    </div>`;
}

S.toPath = function(){ renderPath(); };

async function finishLesson(){
  const lesson = S.lesson;
  const graded = lesson.exercises.filter(e => e.type !== 'info').length;
  const acc = graded ? Math.round((graded - S.failed.size) / graded * 100) : 100;
  const prev = S.prog.completed[lesson.id];
  const gain = (prev ? 5 : 10) + (acc === 100 ? 5 : 0);
  const now = new Date().toISOString();
  const best = Math.max(acc, prev ? (prev.accuracy||0) : 0);

  S.screen = 'lesson-done';
  root().innerHTML = `
    <div class="panel crs-end">
      <div class="crs-big">🎉</div>
      <h2>Урок пройден!</h2>
      <p style="margin:4px 0 0;">${esc(lesson.title)}</p>
      <div class="crs-stats">
        <div><b>⭐ +${gain}</b><span>XP</span></div>
        <div><b>🎯 ${acc}%</b><span>точность</span></div>
        <div><b>❤️ ${Math.max(0,S.hearts)}</b><span>жизней</span></div>
      </div>
      <button class="primary" onclick="CourseStudent.toPath()">Продолжить</button>
    </div>`;

  S.prog.completed[lesson.id] = {accuracy:best, at:now};
  S.prog.xp = (S.prog.xp||0) + gain;
  try{
    await db.collection('courseProgress').doc(auth.currentUser.uid + '_' + S.course.id).set({
      uid: auth.currentUser.uid,
      courseId: S.course.id,
      xp: firebase.firestore.FieldValue.increment(gain),
      completed: { [lesson.id]: {accuracy:best, at:now} },
      updatedAt: now
    }, {merge:true});
  } catch(err){
    toast('Не удалось сохранить прогресс: ' + err.message, 'error');
  }
}
