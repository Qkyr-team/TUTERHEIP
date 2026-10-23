/* js/auth/teacher-auth.js — Вход и регистрация репетитора */
/* ---------------------------------------------------------
   АВТОРИЗАЦИЯ РЕПЕТИТОРА
--------------------------------------------------------- */
let authMode = 'login'; // 'login' | 'register'

function toggleAuthMode(e){
  if(e) e.preventDefault();
  authMode = authMode === 'login' ? 'register' : 'login';
  document.getElementById('authTitle').textContent = authMode === 'login'
    ? 'Вход в кабинет репетитора' : 'Регистрация репетитора';
  document.getElementById('authSubmitBtn').textContent = authMode === 'login' ? 'Войти' : 'Зарегистрироваться';
  document.getElementById('authSwitchWrap').innerHTML = authMode === 'login'
    ? 'Нет аккаунта? <a href="#" onclick="toggleAuthMode(event)">Зарегистрироваться</a>'
    : 'Уже есть аккаунт? <a href="#" onclick="toggleAuthMode(event)">Войти</a>';
  document.getElementById('authError').textContent = '';
}

function authErrorText(err){
  const map = {
    'auth/email-already-in-use': 'Этот email уже зарегистрирован. Попробуйте войти.',
    'auth/invalid-email': 'Некорректный email.',
    'auth/weak-password': 'Пароль слишком короткий (минимум 6 символов).',
    'auth/user-not-found': 'Пользователь с таким email не найден.',
    'auth/wrong-password': 'Неверный пароль.',
    'auth/invalid-credential': 'Неверный email или пароль.',
    'auth/popup-closed-by-user': 'Окно входа через Google было закрыто.'
  };
  return map[err.code] || ('Ошибка: ' + err.message);
}

async function submitEmailAuth(){
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const errEl = document.getElementById('authError');
  errEl.textContent = '';

  if(!email || !password){
    errEl.textContent = 'Заполните email и пароль.';
    return;
  }

  const btn = document.getElementById('authSubmitBtn');
  btn.disabled = true;

  try{
    if(authMode === 'login'){
      await auth.signInWithEmailAndPassword(email, password);
    } else {
      await auth.createUserWithEmailAndPassword(email, password);
    }

    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';

  } catch(err){
    errEl.textContent = authErrorText(err);
  } finally{
    btn.disabled = false;
  }
}

async function signInWithGoogle(){
  const errEl = document.getElementById('authError');
  errEl.textContent = '';
  try{
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
  } catch(err){
    errEl.textContent = authErrorText(err);
  }
}

function signOutTeacher(){
  auth.signOut().then(()=> goHome());
}
