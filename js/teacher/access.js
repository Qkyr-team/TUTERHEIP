/* js/teacher/access.js — Вход в кабинет репетитора и проверка доступа */
function goTeacher(){
  show('view-teacher');
  refreshTeacherView();
}
async function getTeacherAccess(){
  if(!FIREBASE_CONFIGURED || !auth.currentUser) return false;

  const isAdmin = ADMIN_EMAIL !== "ВСТАВЬТЕ_ВАШ_EMAIL_СЮДА"
    && (auth.currentUser.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
  if(isAdmin) return true;

  try{
    const snap = await db.collection('users').doc(auth.currentUser.uid).get();
    const profile = snap.exists ? snap.data() : null;
    return !!(profile && profile.role === 'teacher' && !profile.blocked);
  } catch(err){
    return false;
  }
}

async function refreshTeacherView(){
  const isLoggedIn = FIREBASE_CONFIGURED && auth.currentUser;
  if(!isLoggedIn){
    show('view-home');
    selectRole('teacher');
    return;
  }

  const isAdmin = ADMIN_EMAIL !== "ВСТАВЬТЕ_ВАШ_EMAIL_СЮДА"
    && (auth.currentUser.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
  document.getElementById('teacherEmailLabel').textContent = auth.currentUser.email || auth.currentUser.displayName || 'Вы вошли';
  document.getElementById('adminTabBtn').classList.toggle('hidden', !isAdmin);

  if(!(await getTeacherAccess())){
    document.getElementById('teacherBlockedNotice').classList.add('hidden');
    document.getElementById('teacher-tabs-and-panels').classList.add('hidden');
    show('view-home');
    selectRole('student');
    return;
  }

  document.getElementById('teacherBlockedNotice').classList.add('hidden');
  document.getElementById('teacher-tabs-and-panels').classList.remove('hidden');
  setTeacherTab('create');
}
