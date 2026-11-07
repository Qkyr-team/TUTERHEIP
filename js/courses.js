/* ---------------------------------------------------------
   js/courses.js — КУРСЫ В СТИЛЕ DUOLINGO
   Админка: вкладка «🎓 Курсы» (разделы → уроки → упражнения).
   Ученик: кнопка «🎓 Курсы» → путь из уроков → прохождение.
   Хранение: Firestore, коллекции `courses` и `courseProgress`.
   Подключается в index.html ПОСЛЕ pages.js.
--------------------------------------------------------- */
(function(){
'use strict';

/* ---------- утилиты ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s==null?'':s)
  .replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const rid = () => Math.random().toString(36).slice(2,9);
const toast = (m,t) => (typeof showToast === 'function') ? showToast(m,t) : alert(m);
const shuffle = a => {
  a = a.slice();
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
};
// Сравнение ответов: без регистра, без знаков препинания, одинарные пробелы
const norm = s => String(s||'').toLowerCase()
  .replace(/[’‘`´]/g,"'").replace(/[.!?,;:"«»]+/g,' ').replace(/\s+/g,' ').trim();
const lines = t => String(t||'').split('\n').map(s=>s.trim()).filter(Boolean);

const EX_TYPES = {
  info:   '📖 Подсказка (теория)',
  choice: '🔘 Выбор варианта',
  type:   '⌨️ Ввести ответ',
  order:  '🧩 Собрать предложение',
  match:  '🔗 Соединить пары'
};
const COLORS = ['#58cc02','#1cb0f6','#ce82ff','#ff9600','#ff4b4b','#2b70c9'];
const OFFSETS = [0, 38, 64, 38, 0, -38, -64, -38];

function countLessons(c){ return (c.units||[]).reduce((n,u)=>n+(u.lessons||[]).length,0); }
function flatLessons(c){
  const out = [];
  (c.units||[]).forEach(u => (u.lessons||[]).forEach(l => out.push({unit:u, lesson:l})));
  return out;
}

/* =========================================================
   АДМИНКА
========================================================= */
const A = { list:[], edit:null, open:new Set() };

A.load = async function(){
  const wrap = $('courseAdminWrap');
  if(!wrap) return;
  A.edit = null;
  if(!FIREBASE_CONFIGURED){ wrap.innerHTML = '<p class="empty-note">База данных не подключена.</p>'; return; }
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  try{
    const snap = await db.collection('courses').get();
    A.list = snap.docs.map(d => ({id:d.id, ...d.data()}));
    A.list.sort((a,b)=>(a.order||0)-(b.order||0));
    renderList();
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить: ' + esc(err.message) +
      '. Проверьте правила Firestore для коллекции courses.</p>';
  }
};

function renderList(){
  $('courseAdminWrap').innerHTML = `
    <h3 class="crs-h">Курсы</h3>
    <p class="hint" style="margin-bottom:12px;">
      Курс состоит из разделов, раздел — из уроков, урок — из упражнений.
      Ученики видят только опубликованные курсы.
    </p>
    <button class="primary" style="margin-top:0;" onclick="CourseAdmin.create()">＋ Новый курс</button>
    <div style="margin-top:18px;">
      ${A.list.length ? A.list.map(c => `
        <div class="crs-admin-row">
          <div class="crs-admin-ico" style="background:${esc(c.color||COLORS[0])}">${esc(c.icon||'📘')}</div>
          <div class="crs-admin-info">
            <b>${esc(c.title)}</b>
            <span>${(c.units||[]).length} разд. · ${countLessons(c)} ур. · ${c.published ? '🟢 опубликован' : '⚪ черновик'}</span>
          </div>
          <div class="crs-admin-actions">
            <button class="secondary small" onclick="CourseAdmin.editCourse('${c.id}')">Редактировать</button>
            <button class="secondary small" onclick="CourseAdmin.preview('${c.id}')">👁 Открыть</button>
            <button class="secondary small" onclick="CourseAdmin.remove('${c.id}')">Удалить</button>
          </div>
        </div>`).join('') : '<p class="empty-note">Курсов пока нет.</p>'}
    </div>`;
}

A.create = function(){
  A.edit = {id:null, title:'', description:'', icon:'📘', color:COLORS[0], published:false, units:[]};
  A.open = new Set();
  renderEditor();
};
A.editCourse = function(id){
  const c = A.list.find(x=>x.id===id);
  if(!c) return;
  A.edit = JSON.parse(JSON.stringify(c));
  A.edit.units = A.edit.units || [];
  A.edit.units.forEach(u => { u.lessons = u.lessons || []; u.lessons.forEach(l => l.exercises = l.exercises || []); });
  A.open = new Set();
  renderEditor();
};
A.preview = function(id){ CourseStudent.openCourse(id); };
A.remove = async function(id){
  if(!confirm('Удалить курс целиком? Это действие нельзя отменить.')) return;
  try{
    await db.collection('courses').doc(id).delete();
    toast('Курс удалён');
    A.load();
  } catch(err){ alert('Не удалось удалить: ' + err.message); }
};

/* ---- поиск и изменение элементов по id ---- */
function locate(id){
  const c = A.edit;
  let i = c.units.findIndex(x=>x.id===id);
  if(i>=0) return {arr:c.units, i};
  for(const u of c.units){
    i = u.lessons.findIndex(x=>x.id===id);
    if(i>=0) return {arr:u.lessons, i};
    for(const l of u.lessons){
      i = l.exercises.findIndex(x=>x.id===id);
      if(i>=0) return {arr:l.exercises, i};
    }
  }
  return null;
}
function byId(id){ const loc = locate(id); return loc ? loc.arr[loc.i] : null; }

A.setC     = (key,val) => { A.edit[key] = val; };
A.setColor = col => { A.edit.color = col; renderEditor(); };
A.set      = (id,key,val) => { const o = byId(id); if(o) o[key] = val; };
A.setLines = (id,key,val) => { const o = byId(id); if(o) o[key] = lines(val); };
A.setCsv   = (id,key,val) => { const o = byId(id); if(o) o[key] = String(val).split(',').map(s=>s.trim()).filter(Boolean); };
A.setCorrect = (id,val) => { const o = byId(id); if(o) o.correct = Math.max(0,(parseInt(val,10)||1)-1); };
A.setPairs = (id,val) => {
  const o = byId(id); if(!o) return;
  o.pairs = lines(val).map(l => {
    const k = l.indexOf('=');
    return k<0 ? {a:l.trim(), b:''} : {a:l.slice(0,k).trim(), b:l.slice(k+1).trim()};
  });
};
A.tog = (id,isOpen) => { if(isOpen) A.open.add(id); else A.open.delete(id); };

A.move = function(id,dir){
  const loc = locate(id); if(!loc) return;
  const j = loc.i + dir;
  if(j<0 || j>=loc.arr.length) return;
  [loc.arr[loc.i], loc.arr[j]] = [loc.arr[j], loc.arr[loc.i]];
  renderEditor();
};
A.del = function(id){
  if(!confirm('Удалить этот элемент вместе со всем содержимым?')) return;
  const loc = locate(id); if(!loc) return;
  loc.arr.splice(loc.i,1);
  renderEditor();
};
A.dup = function(id){
  const loc = locate(id); if(!loc) return;
  const copy = JSON.parse(JSON.stringify(loc.arr[loc.i]));
  copy.id = rid();
  loc.arr.splice(loc.i+1,0,copy);
  renderEditor();
};
A.addUnit = function(){
  const u = {id:rid(), title:'', lessons:[]};
  A.edit.units.push(u);
  renderEditor();
};
A.addLesson = function(unitId){
  const u = byId(unitId); if(!u) return;
  const l = {id:rid(), title:'', exercises:[]};
  u.lessons.push(l);
  A.open.add(l.id);
  renderEditor();
};
function newEx(type){
  const b = {id:rid(), type};
  if(type==='info')   return {...b, title:'', text:''};
  if(type==='choice') return {...b, prompt:'', options:['',''], correct:0};
  if(type==='type')   return {...b, prompt:'', answers:[], hint:''};
  if(type==='order')  return {...b, prompt:'', sentence:'', extra:[]};
  return {...b, prompt:'Соедините пары', pairs:[{a:'',b:''},{a:'',b:''}]};
}
A.addEx = function(lessonId){
  const l = byId(lessonId); if(!l) return;
  const type = $('addEx-'+lessonId).value;
  const e = newEx(type);
  l.exercises.push(e);
  A.open.add(lessonId); A.open.add(e.id);
  renderEditor();
};

/* ---- отрисовка редактора ---- */
function renderEditor(){
  const c = A.edit;
  $('courseAdminWrap').innerHTML = `
    <button class="back-link" onclick="CourseAdmin.load()">← к списку курсов</button>
    <h3 class="crs-h">${c.id ? 'Редактирование курса' : 'Новый курс'}</h3>

    <label>Название курса</label>
    <input type="text" value="${esc(c.title)}" placeholder="Например: English for beginners"
      oninput="CourseAdmin.setC('title',this.value)">

    <label>Описание</label>
    <input type="text" value="${esc(c.description)}" placeholder="Коротко: о чём курс"
      oninput="CourseAdmin.setC('description',this.value)">

    <label>Иконка (эмодзи)</label>
    <input type="text" maxlength="4" value="${esc(c.icon)}" style="max-width:110px;"
      oninput="CourseAdmin.setC('icon',this.value)">

    <label>Цвет</label>
    <div class="crs-colors">
      ${COLORS.map(col => `<button type="button" class="crs-color ${c.color===col?'on':''}"
        style="background:${col}" onclick="CourseAdmin.setColor('${col}')"></button>`).join('')}
    </div>

    <label class="crs-check">
      <input type="checkbox" ${c.published?'checked':''} onchange="CourseAdmin.setC('published',this.checked)">
      Опубликован (виден ученикам)
    </label>

    <h4 class="crs-h" style="margin-top:24px;">Разделы и уроки</h4>
    ${c.units.map((u,ui)=>unitHtml(u,ui)).join('')}
    <button class="secondary" onclick="CourseAdmin.addUnit()">＋ Добавить раздел</button>

    <div style="margin-top:20px;">
      <button class="primary" style="margin-top:0;" onclick="CourseAdmin.save()">💾 Сохранить курс</button>
    </div>
    <p class="hint" id="courseAdminMsg"></p>`;
}

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

/* ---- проверка и сохранение ---- */
function validate(c){
  if(!c.title.trim()) return 'Введите название курса.';
  if(!c.units.length) return 'Добавьте хотя бы один раздел.';
  for(let ui=0; ui<c.units.length; ui++){
    const u = c.units[ui];
    if(!u.title.trim()) return `Раздел ${ui+1}: введите название.`;
    if(!u.lessons.length) return `Раздел ${ui+1}: добавьте хотя бы один урок.`;
    for(let li=0; li<u.lessons.length; li++){
      const l = u.lessons[li];
      const w = `Раздел ${ui+1}, урок ${li+1}`;
      if(!l.title.trim()) return `${w}: введите название урока.`;
      if(!l.exercises.length) return `${w}: добавьте хотя бы одно упражнение.`;
      for(let ei=0; ei<l.exercises.length; ei++){
        const e = l.exercises[ei], x = `${w}, упражнение ${ei+1}`;
        if(e.type==='info' && !(e.text||'').trim()) return `${x}: введите текст подсказки.`;
        if(e.type!=='info' && !(e.prompt||'').trim()) return `${x}: введите задание.`;
        if(e.type==='choice'){
          if((e.options||[]).length<2) return `${x}: нужно минимум 2 варианта.`;
          if(e.correct<0 || e.correct>=e.options.length) return `${x}: номер правильного варианта вне списка.`;
        }
        if(e.type==='type' && !(e.answers||[]).length) return `${x}: укажите хотя бы один правильный ответ.`;
        if(e.type==='order' && !(e.sentence||'').trim()) return `${x}: введите правильное предложение.`;
        if(e.type==='match'){
          if((e.pairs||[]).length<2) return `${x}: нужно минимум 2 пары.`;
          if(e.pairs.some(p=>!p.a || !p.b)) return `${x}: у каждой пары должно быть «слово = перевод».`;
        }
      }
    }
  }
  return '';
}

A.save = async function(){
  const c = A.edit, msg = $('courseAdminMsg');
  msg.textContent = '';
  const err = validate(c);
  if(err){ msg.textContent = '⚠ ' + err; return; }
  const now = new Date().toISOString();
  const data = JSON.parse(JSON.stringify({
    title: c.title.trim(),
    description: (c.description||'').trim(),
    icon: (c.icon||'').trim() || '📘',
    color: c.color || COLORS[0],
    published: !!c.published,
    units: c.units,
    updatedAt: now
  }));
  try{
    if(c.id){
      data.order = c.order || Date.now();
      data.createdAt = c.createdAt || now;
      await db.collection('courses').doc(c.id).set(data);
    } else {
      data.order = Date.now();
      data.createdAt = now;
      const ref = await db.collection('courses').add(data);
      c.id = ref.id; c.order = data.order; c.createdAt = now;
    }
    msg.textContent = '✓ Сохранено';
    toast('Курс сохранён');
  } catch(e2){
    msg.textContent = 'Не удалось сохранить: ' + e2.message;
  }
};

/* =========================================================
   УЧЕНИК
========================================================= */
const S = {
  screen:'list', courses:[], progs:{}, course:null, prog:null,
  lesson:null, queue:[], total:0, done:0, hearts:5, failed:new Set(), cur:null
};
const MAX_HEARTS = 5;
const root = () => $('crsRoot');

async function fetchProgress(courseId){
  const empty = {xp:0, completed:{}};
  try{
    const snap = await db.collection('courseProgress').doc(auth.currentUser.uid + '_' + courseId).get();
    if(!snap.exists) return empty;
    const d = snap.data();
    return {xp:d.xp||0, completed:d.completed||{}};
  } catch(e){ return empty; }
}

function setBack(label){
  const b = $('crsBack');
  if(!b) return;
  b.textContent = label || '';
  b.classList.toggle('hidden', !label);
}

S.openList = async function(){
  if(!FIREBASE_CONFIGURED || !auth.currentUser){
    toast('Войдите в аккаунт ученика, чтобы проходить курсы — прогресс сохраняется только у вошедших пользователей.', 'error');
    return;
  }
  show('view-course');
  S.screen = 'list';
  setBack('← на главную');
  root().innerHTML = '<p class="empty-note">Загрузка курсов…</p>';
  try{
    const snap = await db.collection('courses').where('published','==',true).get();
    S.courses = snap.docs.map(d => ({id:d.id, ...d.data()}));
    S.courses.sort((a,b)=>(a.order||0)-(b.order||0));
    const progs = await Promise.all(S.courses.map(c => fetchProgress(c.id)));
    S.progs = {};
    S.courses.forEach((c,i) => S.progs[c.id] = progs[i]);
    renderCourseList();
  } catch(err){
    root().innerHTML = '<p class="empty-note">Не удалось загрузить курсы: ' + esc(err.message) + '</p>';
  }
};

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

/* =========================================================
   ВСТРАИВАНИЕ В СТРАНИЦУ (ничего вручную в index.html не нужно)
========================================================= */
function mount(){
  // 1) вкладка в админке
  const tabs = $('admin-subtabs');
  if(tabs && !tabs.querySelector('[data-subtab="courses"]')){
    const b = document.createElement('button');
    b.className = 'tab-btn';
    b.dataset.subtab = 'courses';
    b.setAttribute('onclick', "setAdminSubTab('courses')");
    b.textContent = '🎓 Курсы';
    tabs.appendChild(b);
  }
  // 2) панель вкладки
  const platform = $('admin-platform');
  if(platform && !$('admin-courses')){
    const d = document.createElement('div');
    d.id = 'admin-courses';
    d.className = 'hidden';
    d.innerHTML = '<div id="courseAdminWrap"></div>';
    platform.parentNode.appendChild(d);
  }
  // 3) экран курсов для ученика
  const shell = document.querySelector('.shell');
  if(shell && !$('view-course')){
    const s = document.createElement('section');
    s.id = 'view-course';
    s.className = 'hidden';
    s.innerHTML = '<button class="back-link" id="crsBack" onclick="CourseStudent.back()">← на главную</button><div id="crsRoot"></div>';
    shell.appendChild(s);
  }
  // 4) кнопка «Курсы» в кабинете ученика
  const hist = $('studentHistoryWrap');
  if(hist && !$('crsOpenBtn')){
    const b = document.createElement('button');
    b.id = 'crsOpenBtn';
    b.className = 'secondary';
    b.style.cssText = 'width:100%;margin:0 0 12px;';
    b.setAttribute('onclick', 'CourseStudent.openList()');
    b.textContent = '🎓 Курсы';
    hist.parentNode.insertBefore(b, hist);
  }

  // Расширяем существующие функции навигации (их код менять не нужно)
  if(typeof window.show === 'function' && !window.show._crs){
    const origShow = window.show;
    window.show = function(id){
      origShow(id);
      const v = $('view-course');
      if(v) v.classList.toggle('hidden', id !== 'view-course');
    };
    window.show._crs = true;
  }
  if(typeof window.setAdminSubTab === 'function' && !window.setAdminSubTab._crs){
    const origSub = window.setAdminSubTab;
    window.setAdminSubTab = function(tab){
      origSub(tab);
      const p = $('admin-courses');
      if(p) p.classList.toggle('hidden', tab !== 'courses');
      if(tab === 'courses') A.load();
    };
    window.setAdminSubTab._crs = true;
  }
}

window.CourseAdmin = A;
window.CourseStudent = S;
mount();

})();