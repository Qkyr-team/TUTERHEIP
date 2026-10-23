/* js/courses/student-exercise.js — Курсы (ученик): упражнение */
'use strict';
function updateHud(){
  const pct = S.total ? Math.round(S.done / S.total * 100) : 0;
  const bar = $('crsProg'); if(bar) bar.style.width = pct + '%';
  const h = $('crsHearts'); if(h) h.textContent = '❤️ ' + Math.max(0,S.hearts);
}

function setBtn(text, enabled, hidden){
  const b = $('crsBtn');
  b.textContent = text;
  b.disabled = !enabled;
  b.classList.toggle('hidden', !!hidden);
}

function renderExercise(){
  const e = S.queue[0];
  S.cur = {ex:e, answered:false, sel:null, picked:[], text:'', matched:new Set(), selLeft:null, mistakes:0};
  updateHud();
  const foot = $('crsFoot'); foot.className = 'crs-foot';
  $('crsFb').innerHTML = '';
  const body = $('crsBody');

  if(e.type === 'info'){
    body.innerHTML = `<div class="crs-info"><h3>${esc(e.title||'Подсказка')}</h3>
      <p>${esc(e.text).replace(/\n/g,'<br>')}</p></div>`;
    setBtn('Понятно', true);
    return;
  }

  if(e.type === 'choice'){
    S.cur.opts = shuffle(e.options.map((t,i) => ({t,i})));
    body.innerHTML = `<h3 class="crs-q">${esc(e.prompt)}</h3>
      <div class="crs-opts">${S.cur.opts.map((o,k) =>
        `<button class="crs-opt" onclick="CourseStudent.pick(${k})">${esc(o.t)}</button>`).join('')}</div>`;
    setBtn('Проверить', false);
    return;
  }

  if(e.type === 'type'){
    body.innerHTML = `<h3 class="crs-q">${esc(e.prompt)}</h3>
      ${e.hint ? `<p class="hint">💡 ${esc(e.hint)}</p>` : ''}
      <input type="text" id="crsInp" class="crs-inp" placeholder="Введите ответ…"
        autocomplete="off" autocapitalize="off" spellcheck="false"
        oninput="CourseStudent.typed(this.value)"
        onkeydown="if(event.key==='Enter'){CourseStudent.check();}">`;
    setBtn('Проверить', false);
    const inp = $('crsInp'); if(inp) inp.focus();
    return;
  }

  if(e.type === 'order'){
    const words = e.sentence.split(/\s+/).filter(Boolean).concat(e.extra||[]);
    S.cur.bank = shuffle(words.map((w,i) => ({w, id:i})));
    body.innerHTML = `<h3 class="crs-q">${esc(e.prompt)}</h3>
      <div class="crs-answer" id="crsAnswer"></div>
      <div class="crs-bank" id="crsBank"></div>`;
    renderOrder();
    setBtn('Проверить', false);
    return;
  }

  if(e.type === 'match'){
    S.cur.left  = shuffle(e.pairs.map((p,i) => ({t:p.a, i})));
    S.cur.right = shuffle(e.pairs.map((p,i) => ({t:p.b, i})));
    body.innerHTML = `<h3 class="crs-q">${esc(e.prompt||'Соедините пары')}</h3>
      <div class="crs-match"><div id="crsLeft"></div><div id="crsRight"></div></div>`;
    renderMatch();
    setBtn('', false, true);
  }
}

/* ---- выбор ---- */
S.pick = function(k){
  if(S.cur.answered) return;
  S.cur.sel = k;
  document.querySelectorAll('.crs-opt').forEach((b,i) => b.classList.toggle('sel', i===k));
  setBtn('Проверить', true);
};

/* ---- ввод ---- */
S.typed = function(v){
  S.cur.text = v;
  setBtn('Проверить', v.trim().length > 0);
};
