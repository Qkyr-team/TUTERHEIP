/* js/admin/panel.js — Админ-панель: подвкладки и dashboard */
/* ---------------------------------------------------------
   АДМИН-ПАНЕЛЬ
--------------------------------------------------------- */
function setAdminSubTab(tab){
  document.querySelectorAll('#admin-subtabs .tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.subtab===tab));
  ['dashboard','tests','books','teachers','students','certificate','news','platform'].forEach(t=>{
    document.getElementById('admin-'+t).classList.toggle('hidden', t!==tab);
  });
  if(tab==='dashboard') loadAdminDashboard();
  if(tab==='tests'){ refreshBookSelectOptions(); populateLevelSelects(); loadAdminTestsList(); }
  if(tab==='books') loadAdminBooks();
  if(tab==='teachers') loadAdminTeachers();
  if(tab==='students') loadAdminStudents();
  if(tab==='certificate') loadCertificateTemplatePanel();
  if(tab==='news') loadAdminNews();
  if(tab==='platform') loadPlatformSettingsForm(platformSettings);
}

async function loadAdminDashboard(){
  const wrap = document.getElementById('adminDashboardWrap');
  wrap.innerHTML = '<p class="empty-note">Загрузка статистики…</p>';
  try{
    const [usersSnap, testsSnap, codesSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('tests').get(),
      db.collection('codes').get()
    ]);
    const users = usersSnap.docs.map(d=>d.data());
    const teachersCount = users.filter(u=>u.role==='teacher').length;
    const studentsCount = users.filter(u=>u.role==='student').length;
    const testsCount = testsSnap.size + DEFAULT_TESTS.length;
    const codes = codesSnap.docs.map(d=>d.data());
    const doneCount = codes.filter(c=>c.status==='done').length;
    const certsCount = codes.filter(c=>c.certificateIssued).length;

    wrap.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-num">${teachersCount}</div><div class="stat-label">Репетиторов</div></div>
        <div class="stat-card"><div class="stat-num">${studentsCount}</div><div class="stat-label">Учеников с аккаунтом</div></div>
        <div class="stat-card"><div class="stat-num">${testsCount}</div><div class="stat-label">Тестов в базе</div></div>
        <div class="stat-card"><div class="stat-num">${doneCount}</div><div class="stat-label">Пройдено проверок</div></div>
        <div class="stat-card"><div class="stat-num">${certsCount}</div><div class="stat-label">Выдано сертификатов</div></div>
      </div>`;
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить статистику.</p>';
  }
}
