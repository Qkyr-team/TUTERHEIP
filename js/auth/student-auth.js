/* js/auth/student-auth.js — Вход и регистрация ученика */
let stuAuthMode = 'login'; // 'login' | 'register'
let cachedStudentEntries = [];

function toggleStudentAuth(){
  const form = document.getElementById('studentAuthForm');
  form.classList.toggle('hidden');
}

function toggleStudentAuthMode(e){
  if(e) e.preventDefault();
  stuAuthMode = stuAuthMode === 'login' ? 'register' : 'login';
  document.getElementById('stuAuthSubmitBtn').textContent = stuAuthMode === 'login' ? 'Войти' : 'Зарегистрироваться';
  document.getElementById('stuAuthSwitchWrap').innerHTML = stuAuthMode === 'login'
    ? 'Нет аккаунта? <a href="#" onclick="toggleStudentAuthMode(event)">Зарегистрироваться</a>'
    : 'Уже есть аккаунт? <a href="#" onclick="toggleStudentAuthMode(event)">Войти</a>';
  document.getElementById('stuAuthError').textContent = '';
}

async function submitStudentEmailAuth(){
  const email = document.getElementById('stuEmail').value.trim();
  const password = document.getElementById('stuPassword').value;
  const errEl = document.getElementById('stuAuthError');
  errEl.textContent = '';
  if(!email || !password){ errEl.textContent = 'Заполните email и пароль.'; return; }
  const btn = document.getElementById('stuAuthSubmitBtn');
  btn.disabled = true;
  try{
    if(stuAuthMode === 'login'){
      await auth.signInWithEmailAndPassword(email, password);
    } else {
      await auth.createUserWithEmailAndPassword(email, password);
    }
    document.getElementById('stuEmail').value = '';
    document.getElementById('stuPassword').value = '';
  } catch(err){
    errEl.textContent = authErrorText(err);
  } finally{
    btn.disabled = false;
  }
}

async function signInWithGoogleStudent(){
  const errEl = document.getElementById('stuAuthError');
  errEl.textContent = '';
  try{
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
  } catch(err){
    errEl.textContent = authErrorText(err);
  }
}

function signOutStudent(){
  auth.signOut().then(()=> refreshStudentAuthUI());
}

function refreshStudentAuthUI(){
  if(!FIREBASE_CONFIGURED) return;
  const isLoggedIn = !!auth.currentUser;
  document.getElementById('studentAuthLoggedOut').classList.toggle('hidden', isLoggedIn);
  document.getElementById('studentAuthLoggedIn').classList.toggle('hidden', !isLoggedIn);
  if(isLoggedIn){
    document.getElementById('studentEmailLabel').textContent = auth.currentUser.email || auth.currentUser.displayName || 'Вы вошли';
    loadStudentHistory();
    loadHomeVocabReminder();
  }
}
