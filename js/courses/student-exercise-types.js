/* js/courses/student-exercise-types.js — Курсы (ученик): упражнения «порядок» и «пары» */
'use strict';
/* ---- собрать предложение ---- */
function renderOrder(){
  const c = S.cur;
  $('crsAnswer').innerHTML = c.picked.map(id => {
    const t = c.bank.find(x => x.id === id);
    return `<button class="crs-chip" onclick="CourseStudent.unpickWord(${id})">${esc(t.w)}</button>`;
  }).join('');
  $('crsBank').innerHTML = c.bank.map(t => c.picked.includes(t.id)
    ? `<span class="crs-chip ghost">${esc(t.w)}</span>`
    : `<button class="crs-chip" onclick="CourseStudent.pickWord(${t.id})">${esc(t.w)}</button>`).join('');
}
S.pickWord = function(id){
  if(S.cur.answered) return;
  S.cur.picked.push(id);
  renderOrder();
  setBtn('Проверить', true);
};
S.unpickWord = function(id){
  if(S.cur.answered) return;
  S.cur.picked = S.cur.picked.filter(x => x !== id);
  renderOrder();
  setBtn('Проверить', S.cur.picked.length > 0);
};

/* ---- соединить пары ---- */
function renderMatch(){
  const c = S.cur;
  $('crsLeft').innerHTML = c.left.map(o => {
    const m = c.matched.has(o.i);
    return `<button class="crs-opt ${m?'ok':''} ${c.selLeft===o.i?'sel':''}" ${m?'disabled':''}
      onclick="CourseStudent.matchLeft(${o.i})">${esc(o.t)}</button>`;
  }).join('');
  $('crsRight').innerHTML = c.right.map(o => {
    const m = c.matched.has(o.i);
    return `<button class="crs-opt ${m?'ok':''}" ${m?'disabled':''}
      onclick="CourseStudent.matchRight(${o.i}, this)">${esc(o.t)}</button>`;
  }).join('');
}
S.matchLeft = function(i){
  if(S.cur.answered) return;
  S.cur.selLeft = i;
  renderMatch();
};
S.matchRight = function(i, el){
  const c = S.cur;
  if(c.answered || c.selLeft === null) return;
  if(c.selLeft === i){
    c.matched.add(i);
    c.selLeft = null;
    renderMatch();
    if(c.matched.size === c.ex.pairs.length){
      // все пары найдены
      S.done++;
      showFeedback(true, '');
    }
  } else {
    c.mistakes++;
    S.hearts--;
    S.failed.add(c.ex.id);
    c.selLeft = null;
    updateHud();
    el.classList.add('bad');
    setTimeout(renderMatch, 450);
    if(S.hearts <= 0){ setTimeout(outOfHearts, 500); }
  }
};

/* ---- проверка ответа ---- */
S.check = function(){
  const c = S.cur, e = c.ex;
  if(c.answered){ advance(); return; }

  if(e.type === 'info'){ S.done++; advance(); return; }

  let ok = false, correctText = '';
  if(e.type === 'choice'){
    if(c.sel === null) return;
    ok = c.opts[c.sel].i === e.correct;
    correctText = e.options[e.correct];
    document.querySelectorAll('.crs-opt').forEach((b,i) => {
      if(c.opts[i].i === e.correct) b.classList.add('ok');
      else if(i === c.sel && !ok) b.classList.add('bad');
    });
  } else if(e.type === 'type'){
    ok = e.answers.some(a => norm(a) === norm(c.text));
    correctText = e.answers[0];
    const inp = $('crsInp'); if(inp) inp.disabled = true;
  } else if(e.type === 'order'){
    const built = c.picked.map(id => c.bank.find(x => x.id === id).w).join(' ');
    ok = norm(built) === norm(e.sentence);
    correctText = e.sentence;
  }

  if(ok){ S.done++; }
  else {
    S.hearts--;
    S.failed.add(e.id);
    S.queue.push(JSON.parse(JSON.stringify(e)));   // повторим в конце урока
  }
  updateHud();
  showFeedback(ok, correctText);
};
