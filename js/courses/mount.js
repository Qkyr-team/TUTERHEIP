/* js/courses/mount.js — Курсы: встраивание в страницу и запуск */
'use strict';
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
