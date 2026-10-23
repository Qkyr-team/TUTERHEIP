/* js/courses/admin-editor.js — Курсы (админ): создание упражнения и редактор */
'use strict';
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
