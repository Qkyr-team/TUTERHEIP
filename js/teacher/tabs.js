/* js/teacher/tabs.js — Переключение вкладок кабинета */
function setTeacherTab(tab){
  document.querySelectorAll('#teacher-tabs-and-panels .dash-nav-item')
    .forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  syncMobileNav(tab);

  ['dashboard','info','create','results','certs','students','vocab','account','admin'].forEach(t=>{
    const el = document.getElementById('teacher-'+t);
    if(el) el.classList.toggle('hidden', t !== tab);
  });

  const titles = {
    dashboard: 'Dashboard',
    info: 'Информация',
    create: 'Создать код',
    results: 'Результаты',
    certs: 'Выдать сертификат',
    students: 'Мои ученики',
    vocab: 'Лексика',
    account: 'Аккаунт',
    admin: 'Админ'
  };

  const bc = document.getElementById('dashBreadcrumbCurrent');
  if(bc) bc.textContent = titles[tab] || '';

  if(tab === 'dashboard') loadTeacherDashboard();

  if(tab === 'info') renderTeacherInfo();
  if(tab === 'create') populateTestSelect();
  if(tab === 'results') renderResultsTable();
  if(tab === 'certs') renderCertificatesPanel();
  if(tab === 'students') loadStudentCards();
  if(tab === 'vocab') loadWordSetsList();
  if(tab === 'account') loadAccountSettings();
  if(tab === 'admin') setAdminSubTab('dashboard');
}
