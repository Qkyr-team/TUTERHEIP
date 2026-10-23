/* js/pages/landing.js — Главная: прокрутка, кнопки, счётчик тестов, выбор роли */
/* ---------------------------------------------------------
   ЛЕНДИНГ: скролл к разделам, CTA-кнопки, живой счётчик тестов
--------------------------------------------------------- */
function scrollToSection(id){
  const el = document.getElementById(id);
  if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
}
function ctaLogin(){
  selectRole('teacher');
  scrollToSection('authSection');
}
function ctaSelectRole(role){
  selectRole(role);
  scrollToSection('authSection');
}
async function loadPublicTestsCount(){
  let count = DEFAULT_TESTS.length;
  if(FIREBASE_CONFIGURED){
    try{
      await ensureCustomTestsLoaded();
      count = allTests().length;
    } catch(e){ /* оставляем количество базовых тестов */ }
  }
  const a = document.getElementById('statTestsCount');
  const b = document.getElementById('previewTestsCount');
  if(a) a.textContent = count + '+';
  if(b) b.textContent = count + '+';
}

function selectRole(role){
  if(role === 'teacher'){
    if(FIREBASE_CONFIGURED && auth.currentUser){
      // Уже авторизован — проверяем реальную роль
      getTeacherAccess().then(hasAccess=>{
        if(hasAccess){
          goTeacher();
        } else {
          showToast('Доступ в кабинет репетитора запрещён.', 'error');
          selectRole('student');
        }
      });
      return;
    }

    document.getElementById('homeTeacherPanel').classList.remove('hidden');
    document.getElementById('homeStudentPanel').classList.add('hidden');
    document.getElementById('roleTabTeacher').classList.add('active');
    document.getElementById('roleTabStudent').classList.remove('active');

  } else {

    document.getElementById('homeStudentPanel').classList.remove('hidden');
    document.getElementById('homeTeacherPanel').classList.add('hidden');
    document.getElementById('roleTabStudent').classList.add('active');
    document.getElementById('roleTabTeacher').classList.remove('active');

    document.getElementById('sCode').value = '';
    document.getElementById('sError').textContent = '';

    refreshStudentAuthUI();
  }
}
