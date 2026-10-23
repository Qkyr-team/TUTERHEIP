/* js/teacher/mobile-nav.js — Нижнее меню кабинета на телефоне («Ещё») */
/* ---------------------------------------------------------
   МОБИЛЬНАЯ НАВИГАЦИЯ КАБИНЕТА (нижняя панель + «Ещё»)
   Использует те же кнопки .dash-nav-item, что и боковое меню на
   компьютере. На экранах шире 760px ничего не меняется.
--------------------------------------------------------- */
const MOBILE_NAV_MQ = window.matchMedia('(max-width: 760px)');
const NAV_TEXT_INPUT_SELECTOR =
  'textarea, select, input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=range]):not([type=color]):not([type=file])';

function openNavMore(){
  const sidebar = document.getElementById('dashSidebar');
  const btn = document.getElementById('navMoreBtn');
  const scrim = document.getElementById('navMoreScrim');
  if(!sidebar || !btn || !MOBILE_NAV_MQ.matches) return;
  sidebar.classList.add('more-open');
  btn.setAttribute('aria-expanded', 'true');
  if(scrim) scrim.classList.add('is-open');
}

function closeNavMore(){
  const sidebar = document.getElementById('dashSidebar');
  const btn = document.getElementById('navMoreBtn');
  const scrim = document.getElementById('navMoreScrim');
  if(sidebar) sidebar.classList.remove('more-open');
  if(btn) btn.setAttribute('aria-expanded', 'false');
  if(scrim) scrim.classList.remove('is-open');
}

function toggleNavMore(){
  const sidebar = document.getElementById('dashSidebar');
  if(sidebar && sidebar.classList.contains('more-open')) closeNavMore();
  else openNavMore();
}

// вызывается из setTeacherTab(tab): закрывает «Ещё» и подсвечивает её,
// если открыта вкладка из скрытой группы
function syncMobileNav(tab){
  closeNavMore();
  const btn = document.getElementById('navMoreBtn');
  if(!btn) return;
  const item = document.querySelector('#dashSidebar .dash-nav-item[data-tab="' + tab + '"]');
  btn.classList.toggle('has-active', !!item && item.classList.contains('nav-more'));
}

document.addEventListener('keydown', e=>{
  if(e.key === 'Escape') closeNavMore();
});

MOBILE_NAV_MQ.addEventListener('change', closeNavMore);

// пока идёт ввод текста, нижнюю панель прячем: иначе она прыгает вместе с клавиатурой
document.addEventListener('focusin', e=>{
  const sidebar = document.getElementById('dashSidebar');
  if(!sidebar || !MOBILE_NAV_MQ.matches) return;
  if(e.target.matches && e.target.matches(NAV_TEXT_INPUT_SELECTOR)){
    closeNavMore();
    sidebar.classList.add('kbd-open');
  }
});
document.addEventListener('focusout', ()=>{
  setTimeout(()=>{
    const sidebar = document.getElementById('dashSidebar');
    if(!sidebar) return;
    const a = document.activeElement;
    if(!(a && a.matches && a.matches(NAV_TEXT_INPUT_SELECTOR))) sidebar.classList.remove('kbd-open');
  }, 120);
});
