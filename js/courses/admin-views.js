/* js/courses/admin-views.js — Курсы (админ): отрисовка разделов, уроков, упражнений */
'use strict';
function unitHtml(u,ui){
  return `
    <div class="crs-unit-ed">
      <div class="crs-row">
        <span class="crs-badge">Раздел ${ui+1}</span>
        <input type="text" value="${esc(u.title)}" placeholder="Название раздела"
          oninput="CourseAdmin.set('${u.id}','title',this.value)">
        <button class="secondary small" onclick="CourseAdmin.move('${u.id}',-1)">↑</button>
        <button class="secondary small" onclick="CourseAdmin.move('${u.id}',1)">↓</button>
        <button class="secondary small" onclick="CourseAdmin.del('${u.id}')">✕</button>
      </div>
      ${u.lessons.map((l,li)=>lessonHtml(l,li)).join('')}
      <button class="secondary small" onclick="CourseAdmin.addLesson('${u.id}')">＋ Урок</button>
    </div>`;
}

function lessonHtml(l,li){
  const opts = Object.entries(EX_TYPES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
  return `
    <details class="crs-lesson-ed" ${A.open.has(l.id)?'open':''} ontoggle="CourseAdmin.tog('${l.id}',this.open)">
      <summary><span>Урок ${li+1}: ${esc(l.title||'без названия')}</span><em>${l.exercises.length} упр.</em></summary>
      <div class="crs-lesson-body">
        <div class="crs-row">
          <input type="text" value="${esc(l.title)}" placeholder="Название урока"
            oninput="CourseAdmin.set('${l.id}','title',this.value)">
          <button class="secondary small" onclick="CourseAdmin.move('${l.id}',-1)">↑</button>
          <button class="secondary small" onclick="CourseAdmin.move('${l.id}',1)">↓</button>
          <button class="secondary small" onclick="CourseAdmin.del('${l.id}')">✕</button>
        </div>
        ${l.exercises.map((e,ei)=>exHtml(e,ei)).join('')}
        <div class="crs-row" style="margin-top:10px;">
          <select id="addEx-${l.id}">${opts}</select>
          <button class="secondary small" style="white-space:nowrap;" onclick="CourseAdmin.addEx('${l.id}')">＋ Упражнение</button>
        </div>
      </div>
    </details>`;
}

function exPreview(e){
  const t = e.prompt || e.title || e.sentence || '';
  return t.length > 42 ? t.slice(0,42)+'…' : t;
}

function exHtml(e,ei){
  return `
    <details class="crs-ex-ed" ${A.open.has(e.id)?'open':''} ontoggle="CourseAdmin.tog('${e.id}',this.open)">
      <summary><span>${ei+1}. ${EX_TYPES[e.type]||e.type}</span><em>${esc(exPreview(e))}</em></summary>
      <div class="crs-ex-body">
        ${exFields(e)}
        <div class="crs-row" style="margin-top:12px;">
          <button class="secondary small" onclick="CourseAdmin.move('${e.id}',-1)">↑</button>
          <button class="secondary small" onclick="CourseAdmin.move('${e.id}',1)">↓</button>
          <button class="secondary small" onclick="CourseAdmin.dup('${e.id}')">⧉ Копия</button>
          <button class="secondary small" onclick="CourseAdmin.del('${e.id}')">✕ Удалить</button>
        </div>
      </div>
    </details>`;
}

function exFields(e){
  const inp = (key,label,ph) => `
    <label>${label}</label>
    <input type="text" value="${esc(e[key])}" placeholder="${esc(ph||'')}"
      oninput="CourseAdmin.set('${e.id}','${key}',this.value)">`;
  const area = (label,val,ph,handler,key) => `
    <label>${label}</label>
    <textarea class="crs-ta" rows="4" placeholder="${esc(ph||'')}"
      oninput="CourseAdmin.${handler}('${e.id}',${key?`'${key}',`:''}this.value)">${esc(val)}</textarea>`;

  if(e.type==='info') return inp('title','Заголовок','Например: Глагол to be') +
    area('Текст подсказки', e.text, 'Объясните правило простыми словами', 'set', 'text');

  if(e.type==='choice') return inp('prompt','Вопрос','She ___ a teacher.') +
    area('Варианты ответа (по одному в строке)', (e.options||[]).join('\n'), 'is\nare\nam', 'setLines', 'options') +
    `<label>Номер правильного варианта</label>
     <input type="text" inputmode="numeric" value="${(e.correct||0)+1}" style="max-width:110px;"
       oninput="CourseAdmin.setCorrect('${e.id}',this.value)">`;

  if(e.type==='type') return inp('prompt','Задание','Переведите: Я люблю кофе') +
    area('Допустимые ответы (по одному в строке)', (e.answers||[]).join('\n'), 'I love coffee\nI like coffee', 'setLines', 'answers') +
    inp('hint','Подсказка (необязательно)','');

  if(e.type==='order') return inp('prompt','Задание','Переведите: Я люблю кофе') +
    inp('sentence','Правильное предложение','I love coffee') +
    `<label>Лишние слова-«ловушки» (через запятую, необязательно)</label>
     <input type="text" value="${esc((e.extra||[]).join(', '))}" placeholder="likes, am"
       oninput="CourseAdmin.setCsv('${e.id}','extra',this.value)">`;

  // match
  return inp('prompt','Задание','Соедините пары') +
    area('Пары: слово = перевод (по одной в строке)',
      (e.pairs||[]).map(p=>p.a+' = '+p.b).join('\n'), 'cat = кошка\ndog = собака\nbird = птица', 'setPairs');
}
