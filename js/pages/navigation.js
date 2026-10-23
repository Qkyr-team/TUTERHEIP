/* js/pages/navigation.js — Переключение экранов (главная / кабинет / ученик / лексика) */
/* ---------------------------------------------------------
   НАВИГАЦИЯ
--------------------------------------------------------- */
function show(id){
  ['view-home','view-teacher','view-student','view-vocab'].forEach(v=>{
    document.getElementById(v).classList.toggle('hidden', v !== id);
  });
}
function goHome(){
  show('view-home');
  resetHomeUI();
}
function resetHomeUI(){
  document.getElementById('homeTeacherPanel').classList.remove('hidden');
  document.getElementById('homeStudentPanel').classList.add('hidden');
  document.getElementById('roleTabTeacher').classList.add('active');
  document.getElementById('roleTabStudent').classList.remove('active');
  renderTeacherHomePanel();
}
function renderTeacherHomePanel(){
  const loggedIn = FIREBASE_CONFIGURED && auth.currentUser;
  document.getElementById('teacherLoginForm').classList.toggle('hidden', loggedIn);
  document.getElementById('teacherAlreadyLoggedIn').classList.toggle('hidden', !loggedIn);
  if(loggedIn){
    document.getElementById('teacherAlreadyEmail').textContent = auth.currentUser.email || auth.currentUser.displayName || '';
  }
}
