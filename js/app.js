/* ---------------------------------------------------------
   1) НАСТРОЙКА FIREBASE
   Вставьте сюда ключи своего проекта из консоли Firebase
   (Project settings → General → Your apps → SDK setup and configuration).
--------------------------------------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyAOLhd3VqQQ6T9GQtm97PxqPPFGKlztFXM",
  authDomain: "tutorhelp-4c53c.firebaseapp.com",
  projectId: "tutorhelp-4c53c",
  storageBucket: "tutorhelp-4c53c.firebasestorage.app",
  messagingSenderId: "972285249430",
  appId: "1:972285249430:web:5b73f5a622aa8d03d97fb7"
};

// Email администратора — только этот аккаунт увидит вкладку "Админ".
// Впишите сюда свой email именно так, как вы им регистрируетесь/входите на сайте.
const ADMIN_EMAIL = "maksim896@icloud.com";

let LEVELS = [
  'Beginner (A1)',
  'Elementary (A2)',
  'Pre-Intermediate (A2+)',
  'Intermediate (B1)',
  'Upper-Intermediate (B2)',
  'Advanced (C1)'
];


/* ---------------------------------------------------------
   НАСТРОЙКИ ПЛАТФОРМЫ (редактируются админом без правки кода)
--------------------------------------------------------- */
const DEFAULT_PLATFORM_SETTINGS = {
  brandName: 'TutorHelp',
  brandTagline: 'Платформа для репетиторов английского языка',
  heroHeadline: 'Качественные тесты по английскому языку для ваших учеников',
  heroLead: 'Готовая база тестов по школьной программе. Выбирайте подходящие тесты, отправляйте ученикам кодом и отслеживайте результаты в удобном кабинете.',
  heroBadge1: '⭐ Я создаю тесты, вы выбираете и используете',
  heroTag1: '🎁 Всё бесплатно',
  heroTag2: '♾️ Без ограничений',
  heroTag3: '🛡️ Без скрытых платежей',
  footerEmail: 'maksim896@icloud.com',
  levels: ['Beginner (A1)','Elementary (A2)','Pre-Intermediate (A2+)','Intermediate (B1)','Upper-Intermediate (B2)','Advanced (C1)'],
  accentColor: '#e0a94c',
  certTitle1: 'СЕРТИФИКАТ О ЗАВЕРШЕНИИ',
  certTitle2: 'УЧЕБНОГО МОДУЛЯ',
  certSubtitle: 'ПОДТВЕРЖДАЕТСЯ, ЧТО',
  certCompletionText: 'закончил(а) учебный модуль по теме',
  certRoleLabel: 'репетитор'
};
let platformSettings = {...DEFAULT_PLATFORM_SETTINGS};
let hasCustomPlatformSettings = false;

async function loadPlatformSettings(){
  if(!FIREBASE_CONFIGURED) return;
  try{
    const snap = await db.collection('settings').doc('platform').get();
    if(snap.exists){
      platformSettings = {...DEFAULT_PLATFORM_SETTINGS, ...snap.data()};
      hasCustomPlatformSettings = true;
    }
  } catch(err){ /* остаёмся со стандартными настройками */ }
}

function applyPlatformSettings(){
  if(!hasCustomPlatformSettings) return; // ничего не сохранено — оставляем исходный дизайн как есть
  const s = platformSettings;
  const setText = (id, val) => { const el = document.getElementById(id); if(el && val!=null) el.textContent = val; };
  setText('brandNameEl', s.brandName);
  setText('brandTaglineEl', s.brandTagline);
  setText('heroHeadlineEl', s.heroHeadline);
  setText('heroLeadEl', s.heroLead);
  setText('heroBadge0', s.heroBadge1);
  setText('heroTag1', s.heroTag1);
  setText('heroTag2', s.heroTag2);
  setText('heroTag3', s.heroTag3);

  const footerLink = document.getElementById('footerEmailLink');
  if(footerLink && s.footerEmail){ footerLink.href = 'mailto:' + s.footerEmail; }

  if(Array.isArray(s.levels) && s.levels.length === 6){
    LEVELS = [...s.levels];
  }

  if(s.accentColor){
    document.documentElement.style.setProperty('--accent', s.accentColor);
  }
}

async function savePlatformSettings(){
  const errEl = document.getElementById('platformSettingsMsg');
  errEl.textContent = '';
  const newSettings = {
    brandName: document.getElementById('setBrandName').value.trim() || DEFAULT_PLATFORM_SETTINGS.brandName,
    brandTagline: document.getElementById('setBrandTagline').value.trim(),
    heroHeadline: document.getElementById('setHeroHeadline').value.trim(),
    heroLead: document.getElementById('setHeroLead').value.trim(),
    heroBadge1: document.getElementById('setHeroBadge1').value.trim(),
    heroTag1: document.getElementById('setHeroTag1').value.trim(),
    heroTag2: document.getElementById('setHeroTag2').value.trim(),
    heroTag3: document.getElementById('setHeroTag3').value.trim(),
    footerEmail: document.getElementById('setFooterEmail').value.trim(),
    levels: [
      document.getElementById('setLevel0').value.trim(),
      document.getElementById('setLevel1').value.trim(),
      document.getElementById('setLevel2').value.trim(),
      document.getElementById('setLevel3').value.trim(),
      document.getElementById('setLevel4').value.trim(),
      document.getElementById('setLevel5').value.trim()
    ],
    accentColor: document.getElementById('setAccentColor').value,
    certTitle1: document.getElementById('setCertTitle1').value.trim(),
    certTitle2: document.getElementById('setCertTitle2').value.trim(),
    certSubtitle: document.getElementById('setCertSubtitle').value.trim(),
    certCompletionText: document.getElementById('setCertCompletionText').value.trim(),
    certRoleLabel: document.getElementById('setCertRoleLabel').value.trim()
  };
  if(newSettings.levels.some(l=>!l)){
    errEl.textContent = 'Заполните все 6 уровней.';
    return;
  }
  try{
    await db.collection('settings').doc('platform').set(newSettings, {merge:true});
    platformSettings = {...DEFAULT_PLATFORM_SETTINGS, ...newSettings};
    hasCustomPlatformSettings = true;
    applyPlatformSettings();
    showToast('Настройки платформы сохранены');
  } catch(err){
    errEl.textContent = 'Не удалось сохранить: ' + err.message;
  }
}

function resetPlatformSettingsForm(){
  loadPlatformSettingsForm(DEFAULT_PLATFORM_SETTINGS);
}

function loadPlatformSettingsForm(s){
  document.getElementById('setBrandName').value = s.brandName || '';
  document.getElementById('setBrandTagline').value = s.brandTagline || '';
  document.getElementById('setHeroHeadline').value = s.heroHeadline || '';
  document.getElementById('setHeroLead').value = s.heroLead || '';
  document.getElementById('setHeroBadge1').value = s.heroBadge1 || '';
  document.getElementById('setHeroTag1').value = s.heroTag1 || '';
  document.getElementById('setHeroTag2').value = s.heroTag2 || '';
  document.getElementById('setHeroTag3').value = s.heroTag3 || '';
  document.getElementById('setFooterEmail').value = s.footerEmail || '';
  const lv = s.levels || DEFAULT_PLATFORM_SETTINGS.levels;
  document.getElementById('setLevel0').value = lv[0] || '';
  document.getElementById('setLevel1').value = lv[1] || '';
  document.getElementById('setLevel2').value = lv[2] || '';
  document.getElementById('setLevel3').value = lv[3] || '';
  document.getElementById('setLevel4').value = lv[4] || '';
  document.getElementById('setLevel5').value = lv[5] || '';
  document.getElementById('setAccentColor').value = s.accentColor || DEFAULT_PLATFORM_SETTINGS.accentColor;
  document.getElementById('setCertTitle1').value = s.certTitle1 || '';
  document.getElementById('setCertTitle2').value = s.certTitle2 || '';
  document.getElementById('setCertSubtitle').value = s.certSubtitle || '';
  document.getElementById('setCertCompletionText').value = s.certCompletionText || '';
  document.getElementById('setCertRoleLabel').value = s.certRoleLabel || '';
}

const FIREBASE_CONFIGURED = firebaseConfig.apiKey !== "ВСТАВЬТЕ_СЮДА" && firebaseConfig.apiKey.length > 5;
let db = null;
let auth = null;
if (FIREBASE_CONFIGURED) {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  auth = firebase.auth();
} else {
  document.getElementById('configWarning').classList.remove('hidden');
}


/* ---------------------------------------------------------
   2) ТЕСТЫ
   Список пуст: в кабинете репетитора показываются только тесты,
   созданные через админ-панель (хранятся в Firestore, коллекция "tests").
--------------------------------------------------------- */
const DEFAULT_TESTS = [];

let customTests = [];
let customTestsPromise = null;
function ensureCustomTestsLoaded(){
  if(!FIREBASE_CONFIGURED) return Promise.resolve([]);
  if(!customTestsPromise){
    customTestsPromise = db.collection('tests').get().then(snap=>{
      customTests = snap.docs.map(d=>({id:d.id, ...d.data()}));
      return customTests;
    }).catch(()=>{ customTestsPromise = null; return []; });
  }
  return customTestsPromise;
}
function invalidateCustomTestsCache(){ customTestsPromise = null; }
function allTests(){ return [...DEFAULT_TESTS, ...customTests]; }
function sortTestsNaturally(arr){
  return [...arr].sort((a,b)=> a.title.localeCompare(b.title, 'ru', {numeric:true, sensitivity:'base'}));
}

/* ---------------------------------------------------------
   МОДУЛЬНЫЕ СЕКЦИИ ТЕСТА (Grammar/Vocabulary/Reading/Writing)
   Старые тесты (плоский questions[]) автоматически оборачиваются
   в одну секцию Grammar — ничего из старых тестов не ломается.
--------------------------------------------------------- */
function getTestSections(test){
  if(test.sections && test.sections.length) return test.sections;
  return [{ type:'grammar', title: test.title || 'Вопросы', questions: test.questions || [] }];
}
function sectionIcon(type){ return {grammar:'📘', vocabulary:'🔤', reading:'📖', writing:'✍️'}[type] || '📄'; }
function sectionDefaultTitle(type){ return {grammar:'Grammar', vocabulary:'Vocabulary', reading:'Reading', writing:'Writing'}[type] || 'Section'; }
function sectionQuestionCount(section){
  if(section.type === 'writing') return null;
  return (section.questions || []).length;
}
function countAutoGradedQuestions(sections){
  return sections.filter(s=>s.type!=='writing').reduce((sum,s)=>sum+(s.questions?s.questions.length:0),0);
}

/* ---------------------------------------------------------
   TOAST-УВЕДОМЛЕНИЯ
--------------------------------------------------------- */
function showToast(message, type){
  const wrap = document.getElementById('toastWrap');
  if(!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' error' : '');
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(()=>{ el.remove(); }, 3800);
}
function findTest(testId){ return allTests().find(t=>t.id===testId); }

async function fetchCode(code){
  const snap = await db.collection('codes').doc(code).get();
  return snap.exists ? snap.data() : null;
}
async function saveCode(code, data){
  await db.collection('codes').doc(code).set(data);
}
async function updateCode(code, data){
  await db.collection('codes').doc(code).update(data);
}
async function fetchAllCodes(){
  const uid = auth.currentUser.uid;
  const snap = await db.collection('codes').where('teacherId','==',uid).get();
  const rows = snap.docs.map(d=>d.data());
  rows.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
  return rows;
}

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

      // Перенаправление после успешного входа
      window.location.href = 'materials/materials.html';

    } else {

      await auth.createUserWithEmailAndPassword(email, password);

      // После регистрации тоже открываем кабинет
      window.location.href = 'materials/materials.html';

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

async function loadHomeVocabReminder(){
  const banner = document.getElementById('homeVocabReminder');
  const textEl = document.getElementById('homeVocabReminderText');
  if(!banner || !textEl) return;
  try{
    const snap = await db.collection('wordSets').where('published','==',true).get();
    const sets = snap.docs.map(d=>({id:d.id, ...d.data()}));
    if(!sets.length){ banner.classList.add('hidden'); return; }
    let dueTotal = 0;
    for(const s of sets){
      const prog = await fetchWordProgress(s.id);
      dueTotal += countDueWords(s, prog);
    }
    if(dueTotal > 0){
      textEl.textContent = `📚 Сегодня нужно повторить слов: ${dueTotal}`;
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  } catch(err){
    banner.classList.add('hidden');
  }
}

async function loadStudentHistory(){
  const wrap = document.getElementById('studentHistoryWrap');
  wrap.innerHTML = '<p class="empty-note">Загрузка истории…</p>';
  try{
    const uid = auth.currentUser.uid;
    const snap = await db.collection('codes').where('studentUid','==',uid).get();
    let entries = snap.docs.map(d=>d.data());
    entries.sort((a,b)=> new Date(b.completedAt||b.createdAt) - new Date(a.completedAt||a.createdAt));
    cachedStudentEntries = entries;
    if(!entries.length){
      wrap.innerHTML = '<p class="empty-note">Вы ещё не проходили тесты под этим аккаунтом.</p>';
      return;
    }
    wrap.innerHTML = '<h3 style="font-family:var(--serif);font-size:15px;margin:16px 0 8px;">Ваши тесты</h3>' + entries.map(e=>{
      const perfect = e.status==='done' && e.total > 0 && e.score === e.total;
      return `
        <div class="cert-test-row">
          <span>${e.testTitle} — ${e.status==='done' ? (e.score+' / '+e.total) : 'в процессе'}</span>
          ${perfect ? `<button class="secondary small" onclick="downloadCertificate('${e.code}')">Скачать сертификат</button>` : ''}
        </div>`;
    }).join('');
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить историю. Проверьте интернет-соединение.</p>';
  }
}

async function ensureUserProfile(likelyRole){
  if(!FIREBASE_CONFIGURED || !auth.currentUser) return;
  const uid = auth.currentUser.uid;
  const ref = db.collection('users').doc(uid);
  try{
    const snap = await ref.get();
    if(!snap.exists){
      await ref.set({
        email: auth.currentUser.email || '',
        role: likelyRole,
        blocked: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      });
    } else {
      await ref.update({ lastLoginAt: new Date().toISOString() });
    }
  } catch(err){
    console.error('ensureUserProfile failed', err);
  }
}

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
async function resetPassword(event) {
    event.preventDefault();

    const emailInput = document.getElementById('authEmail');
    const errorEl = document.getElementById('authError');

    const email = emailInput?.value.trim();

    if (!email) {
        errorEl.textContent =
            'Введите email, на который зарегистрирован аккаунт.';
        return;
    }

    try {
        await auth.sendPasswordResetEmail(email);

        errorEl.textContent =
            'Письмо для восстановления пароля отправлено на ваш email.';

        console.log('PASSWORD RESET EMAIL SENT:', email);

    } catch (error) {

        console.error('PASSWORD RESET ERROR:', error);

        switch (error.code) {

            case 'auth/invalid-email':
                errorEl.textContent =
                    'Введите корректный email.';
                break;

            case 'auth/user-not-found':
                errorEl.textContent =
                    'Аккаунт с таким email не найден.';
                break;

            case 'auth/too-many-requests':
                errorEl.textContent =
                    'Слишком много попыток. Попробуйте позже.';
                break;

            default:
                errorEl.textContent =
                    'Не удалось отправить письмо. Попробуйте ещё раз.';
        }
    }
}
