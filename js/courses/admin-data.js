/* js/courses/admin-data.js — Курсы (админ): данные, загрузка, список, сохранение */
'use strict';
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
