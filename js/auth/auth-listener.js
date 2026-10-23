/* js/auth/auth-listener.js — Реакция сайта на вход/выход пользователя */
if (FIREBASE_CONFIGURED) {
  auth.onAuthStateChanged(()=>{
    if(auth.currentUser){
      const cameFromTeacherPanel = !document.getElementById('view-home').classList.contains('hidden')
        && !document.getElementById('homeTeacherPanel').classList.contains('hidden');
      const cameFromStudentPanel = !document.getElementById('view-home').classList.contains('hidden')
        && !document.getElementById('homeStudentPanel').classList.contains('hidden');
      ensureUserProfile(cameFromTeacherPanel ? 'teacher' : (cameFromStudentPanel ? 'student' : 'teacher'));
    }
    // Уже в кабинете репетитора — обновить вид (например, после выхода)
    if(!document.getElementById('view-teacher').classList.contains('hidden')){
      refreshTeacherView();
    }
    // Форма входа репетитора открыта на главной и человек только что вошёл — сразу перейти в кабинет
    if(!document.getElementById('view-home').classList.contains('hidden')
       && !document.getElementById('homeTeacherPanel').classList.contains('hidden')
       && auth.currentUser){
      goTeacher();
    }
    // Панель ученика открыта на главной — обновить необязательный вход и историю
    if(!document.getElementById('view-home').classList.contains('hidden')
       && !document.getElementById('homeStudentPanel').classList.contains('hidden')){
      refreshStudentAuthUI();
    }
  });
}
