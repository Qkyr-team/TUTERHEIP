/* js/courses/student-state.js — Курсы (ученик): состояние и прогресс */
'use strict';
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
