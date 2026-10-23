/* js/admin/users.js — Админ: репетиторы и ученики, блокировка */
/* --- Репетиторы / Ученики --- */
async function loadAdminTeachers(){
  const wrap = document.getElementById('adminTeachersWrap');
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  try{
    const [usersSnap, codesSnap] = await Promise.all([
      db.collection('users').where('role','==','teacher').get(),
      db.collection('codes').get()
    ]);
    const codes = codesSnap.docs.map(d=>d.data());
    const rows = usersSnap.docs.map(d=>{
      const u = d.data(); const uid = d.id;
      const own = codes.filter(c=>c.teacherId===uid);
      const studentsCount = new Set(own.map(c=>c.studentName)).size;
      return {uid, ...u, codesCount: own.length, studentsCount};
    });
    if(!rows.length){ wrap.innerHTML = '<p class="empty-note">Пока нет ни одного репетитора.</p>'; return; }
    wrap.innerHTML = `<table><thead><tr><th>Email</th><th>Регистрация</th><th>Кодов создано</th><th>Учеников</th><th>Статус</th><th></th></tr></thead><tbody>` +
      rows.map(r=>`
        <tr>
          <td>${r.email}</td>
          <td>${new Date(r.createdAt).toLocaleDateString('ru-RU')}</td>
          <td>${r.codesCount}</td>
          <td>${r.studentsCount}</td>
          <td>${r.blocked ? '<span class="status-pill status-pending">заблокирован</span>' : '<span class="status-pill status-done">активен</span>'}</td>
          <td><button class="secondary small" onclick="toggleUserBlock('${r.uid}', ${!!r.blocked}, 'teachers')">${r.blocked?'Разблокировать':'Заблокировать'}</button></td>
        </tr>`).join('') + '</tbody></table>';
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить список.</p>';
  }
}

async function loadAdminStudents(){
  const wrap = document.getElementById('adminStudentsWrap');
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  try{
    const [usersSnap, codesSnap] = await Promise.all([
      db.collection('users').where('role','==','student').get(),
      db.collection('codes').get()
    ]);
    const codes = codesSnap.docs.map(d=>d.data());
    const rows = usersSnap.docs.map(d=>{
      const u = d.data(); const uid = d.id;
      const own = codes.filter(c=>c.studentUid===uid && c.status==='done');
      const avg = own.length ? Math.round(own.reduce((s,c)=>s+(c.score/c.total),0)/own.length*100) : null;
      return {uid, ...u, testsCount: own.length, avgPercent: avg};
    });
    if(!rows.length){ wrap.innerHTML = '<p class="empty-note">Пока нет учеников с аккаунтом.</p>'; return; }
    wrap.innerHTML = `<table><thead><tr><th>Email</th><th>Пройдено тестов</th><th>Средний балл</th><th>Статус</th><th></th></tr></thead><tbody>` +
      rows.map(r=>`
        <tr>
          <td>${r.email}</td>
          <td>${r.testsCount}</td>
          <td>${r.avgPercent!=null ? r.avgPercent+'%' : '—'}</td>
          <td>${r.blocked ? '<span class="status-pill status-pending">заблокирован</span>' : '<span class="status-pill status-done">активен</span>'}</td>
          <td><button class="secondary small" onclick="toggleUserBlock('${r.uid}', ${!!r.blocked}, 'students')">${r.blocked?'Разблокировать':'Заблокировать'}</button></td>
        </tr>`).join('') + '</tbody></table>';
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить список.</p>';
  }
}

async function toggleUserBlock(uid, currentlyBlocked, listType){
  if(!confirm(currentlyBlocked ? 'Разблокировать пользователя?' : 'Заблокировать пользователя? Он не сможет создавать коды/сохранять результаты под своим аккаунтом.')) return;
  try{
    await db.collection('users').doc(uid).update({blocked: !currentlyBlocked});
    if(listType === 'teachers') loadAdminTeachers();
    if(listType === 'students') loadAdminStudents();
  } catch(err){
    alert('Не удалось изменить статус: ' + err.message);
  }
}
