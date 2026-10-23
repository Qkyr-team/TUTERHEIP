/* js/courses/admin-validate.js — Курсы (админ): проверка курса перед сохранением */
'use strict';
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
