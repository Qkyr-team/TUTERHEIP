/* js/teacher/account.js — Вкладка «Аккаунт»: профиль, подпись, пароль */
/* ---------------------------------------------------------
   АККАУНТ РЕПЕТИТОРА
   Данные профиля хранятся в users/{uid}: displayName, certSignature
   (новых полей не добавляем). Статистика считается по codes
   тем же запросом, что и вкладка «Результаты» (teacherId == uid).
--------------------------------------------------------- */
const ACCT_NAME_MAX = 60;
const ACCT_SIG_MAX = 40;
const ACCT_RESET_LABEL = 'Не помните пароль? Отправить письмо для сброса';

let acctInitial = { displayName: '', certSignature: '' };
let acctProfile = {};
let acctProfileLoaded = false;
let acctSaving = false;
let acctPassBusy = false;
let acctStatsRequestId = 0;
let acctResetTimer = null;

function acctIsAdmin(){
  return ADMIN_EMAIL !== "ВСТАВЬТЕ_ВАШ_EMAIL_СЮДА"
    && !!auth.currentUser
    && (auth.currentUser.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

function acctInitials(name, email){
  const src = (name || '').trim();
  if(src){
    return src.split(/\s+/).filter(Boolean).slice(0, 2)
      .map(part => Array.from(part)[0]).join('').toUpperCase();
  }
  const e = (email || '').trim();
  return e ? Array.from(e)[0].toUpperCase() : '?';
}

function acctSetText(id, text){
  const el = document.getElementById(id);
  if(el) el.textContent = text;
}

function renderAccountProfileCard(profile){
  const user = auth.currentUser;
  if(!user) return;
  const name = (profile.displayName || '').trim();
  const email = user.email || '';

  acctSetText('acctAvatar', acctInitials(name, email));
  acctSetText('acctProfileName', name || email || 'Репетитор');
  acctSetText('acctProfileEmail', name ? email : '');
  acctSetText('acctRoleChip', acctIsAdmin() ? 'Администратор' : 'Репетитор');

  const labels = [];
  const ids = (user.providerData || []).map(p => p.providerId);
  if(ids.includes('password')) labels.push('email и пароль');
  if(ids.includes('google.com')) labels.push('Google');
  const providerChip = document.getElementById('acctProviderChip');
  providerChip.textContent = labels.length ? 'Вход: ' + labels.join(' + ') : '';
  providerChip.classList.toggle('hidden', !labels.length);

  const created = new Date(profile.createdAt || (user.metadata && user.metadata.creationTime) || '');
  const sinceChip = document.getElementById('acctSinceChip');
  if(isNaN(created)){
    sinceChip.classList.add('hidden');
  } else {
    sinceChip.textContent = 'На платформе с ' +
      created.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    sinceChip.classList.remove('hidden');
  }
}

/* --- предпросмотр подписи: ровно та же логика, что в downloadCertificate() --- */
function updateAcctSigPreview(){
  const name = document.getElementById('acctDisplayName').value.trim();
  const sig = document.getElementById('acctCertSignature').value.trim();
  const shown = sig || name || 'Репетитор TutorHelp';
  const roleLabel = (typeof platformSettings !== 'undefined' && platformSettings.certRoleLabel) || 'репетитор';

  acctSetText('acctSigPreviewName', shown);
  acctSetText('acctSigPreviewRole', roleLabel);
  acctSetText('acctSigCounter', Array.from(sig).length + ' / ' + ACCT_SIG_MAX);

  let hint;
  if(sig) hint = 'Так подпись будет выглядеть на сертификате.';
  else if(name) hint = 'Подпись не заполнена — на сертификате будет напечатано отображаемое имя.';
  else hint = 'Ничего не заполнено — на сертификате будет напечатано «Репетитор TutorHelp».';
  acctSetText('acctSigPreviewHint', hint);
}

function updateAcctSaveBtn(){
  const btn = document.getElementById('acctSaveBtn');
  if(!btn) return;
  const name = document.getElementById('acctDisplayName').value.trim();
  const sig = document.getElementById('acctCertSignature').value.trim();
  const dirty = name !== acctInitial.displayName || sig !== acctInitial.certSignature;
  btn.disabled = !acctProfileLoaded || !dirty || acctSaving;
}

function onAcctFormInput(){
  acctSetText('acctSaveMsg', '');
  updateAcctSigPreview();
  updateAcctSaveBtn();
}

async function loadAccountSettings(){
  const user = auth.currentUser;
  if(!user) return;

  // чистим поля паролей — вдруг на этом устройстве раньше был другой аккаунт
  ['acctCurrentPassword', 'acctNewPassword', 'acctConfirmPassword'].forEach(id=>{
    const el = document.getElementById(id);
    if(el){ el.value = ''; el.type = 'password'; }
  });
  document.querySelectorAll('.acct-eye').forEach(b=>{
    b.textContent = 'Показать';
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', 'Показать пароль');
  });
  onAcctPasswordInput();
  acctSetText('acctPasswordMsg', '');
  acctSetText('acctSaveMsg', '');

  const isPasswordUser = (user.providerData || []).some(p => p.providerId === 'password');
  document.getElementById('acctPasswordSection').classList.toggle('hidden', !isPasswordUser);
  acctSetText('acctPasswordNote', isPasswordUser ? '' :
    'Смена пароля недоступна для входа через Google — пароль управляется вашим Google-аккаунтом.');

  acctProfileLoaded = false;
  acctProfile = {};
  renderAccountProfileCard(acctProfile);
  if(!FIREBASE_CONFIGURED) return;

  try{
    const snap = await db.collection('users').doc(user.uid).get();
    acctProfile = snap.exists ? snap.data() : {};
    acctProfileLoaded = true;
  } catch(err){
    console.error('Не удалось загрузить профиль:', err);
    showToast('Не удалось загрузить профиль. Обновите страницу и попробуйте снова.', 'error');
    acctSetText('acctSaveMsg', 'Профиль не загружен — сохранение отключено, чтобы не затереть данные.');
  }

  if(acctProfileLoaded){
    const name = (acctProfile.displayName || '').trim();
    const sig = (acctProfile.certSignature || '').trim();
    document.getElementById('acctDisplayName').value = name;
    document.getElementById('acctCertSignature').value = sig;
    acctInitial = { displayName: name, certSignature: sig };
  }
  renderAccountProfileCard(acctProfile);
  updateAcctSigPreview();
  updateAcctSaveBtn();
  loadAccountStats();
}

async function saveAccountSettings(){
  if(acctSaving || !acctProfileLoaded || !auth.currentUser) return;
  const msgEl = document.getElementById('acctSaveMsg');
  const btn = document.getElementById('acctSaveBtn');
  msgEl.textContent = '';

  const displayName = document.getElementById('acctDisplayName').value.trim();
  const certSignature = document.getElementById('acctCertSignature').value.trim();
  if(Array.from(displayName).length > ACCT_NAME_MAX){
    msgEl.textContent = `Имя слишком длинное (максимум ${ACCT_NAME_MAX} символов).`;
    return;
  }
  if(Array.from(certSignature).length > ACCT_SIG_MAX){
    msgEl.textContent = `Подпись слишком длинная (максимум ${ACCT_SIG_MAX} символов).`;
    return;
  }

  acctSaving = true;
  btn.disabled = true;
  btn.textContent = 'Сохраняю…';
  try{
    await db.collection('users').doc(auth.currentUser.uid).set({displayName, certSignature}, {merge:true});
    acctInitial = { displayName, certSignature };
    acctProfile = { ...acctProfile, displayName, certSignature };
    renderAccountProfileCard(acctProfile);
    const emailLbl = document.getElementById('teacherEmailLabel');
    if(emailLbl) emailLbl.textContent = displayName || auth.currentUser.email || '';
    showToast('Изменения сохранены');
  } catch(err){
    console.error('Не удалось сохранить профиль:', err);
    msgEl.textContent = 'Не удалось сохранить: ' + err.message;
    showToast('Не удалось сохранить изменения', 'error');
  } finally {
    acctSaving = false;
    btn.textContent = 'Сохранить';
    updateAcctSaveBtn();
  }
}

/* --- статистика --- */
async function loadAccountStats(){
  const requestId = ++acctStatsRequestId;
  const valueIds = ['acctStatCodes', 'acctStatDone', 'acctStatStudents', 'acctStatCerts'];
  valueIds.forEach(id => acctSetText(id, '…'));
  document.getElementById('acctStatsError').classList.add('hidden');
  document.getElementById('acctStatsEmpty').classList.add('hidden');

  if(!FIREBASE_CONFIGURED || !auth.currentUser){
    valueIds.forEach(id => acctSetText(id, '—'));
    return;
  }
  try{
    const rows = await fetchAllCodes();
    if(requestId !== acctStatsRequestId) return; // пришёл более новый запрос
    const students = new Set(
      rows.map(r => (r.studentName || '').trim().toLowerCase()).filter(Boolean)
    );
    acctSetText('acctStatCodes', rows.length);
    acctSetText('acctStatDone', rows.filter(r => r.status === 'done').length);
    acctSetText('acctStatStudents', students.size);
    acctSetText('acctStatCerts', rows.filter(r => r.certificateIssued).length);
    document.getElementById('acctStatsEmpty').classList.toggle('hidden', rows.length > 0);
  } catch(err){
    if(requestId !== acctStatsRequestId) return;
    console.error('Не удалось загрузить статистику:', err);
    valueIds.forEach(id => acctSetText(id, '—'));
    document.getElementById('acctStatsError').classList.remove('hidden');
  }
}

/* --- пароль --- */
function toggleAcctPassword(btn){
  const input = document.getElementById(btn.dataset.target);
  if(!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.textContent = show ? 'Скрыть' : 'Показать';
  btn.setAttribute('aria-pressed', String(show));
  btn.setAttribute('aria-label', (show ? 'Скрыть' : 'Показать') + ' пароль');
}

function acctPasswordStrength(p){
  if(!p) return { cls: 'lvl-0', text: '' };
  if(p.length < 6) return { cls: 'lvl-short', text: 'Слишком короткий — минимум 6 символов' };
  let score = 1;
  if(p.length >= 10) score++;
  if(/[a-zа-яё]/i.test(p) && /\d/.test(p)) score++;
  if((/[a-zа-яё]/.test(p) && /[A-ZА-ЯЁ]/.test(p)) || /[^\wа-яё\s]/i.test(p)) score++;
  const text = ['', 'Слабый пароль', 'Средний пароль', 'Хороший пароль', 'Надёжный пароль'][score];
  return { cls: 'lvl-' + score, text };
}

function onAcctPasswordInput(){
  const p = document.getElementById('acctNewPassword').value;
  const s = acctPasswordStrength(p);
  document.getElementById('acctMeterFill').className = 'acct-meter-fill ' + s.cls;
  acctSetText('acctMeterText', s.text);
  acctSetText('acctPasswordMsg', '');
}

function acctAuthError(err){
  const map = {
    'auth/too-many-requests': 'Слишком много попыток. Подождите несколько минут и попробуйте снова.',
    'auth/requires-recent-login': 'Для этого действия нужно заново войти: выйдите из аккаунта и войдите снова.',
    'auth/network-request-failed': 'Нет соединения с интернетом. Проверьте подключение.',
    'auth/wrong-password': 'Текущий пароль указан неверно.',
    'auth/invalid-credential': 'Текущий пароль указан неверно.'
  };
  return map[err.code] || authErrorText(err);
}

async function changeAccountPassword(){
  if(acctPassBusy || !auth.currentUser) return;
  const msgEl = document.getElementById('acctPasswordMsg');
  const btn = document.getElementById('acctPassBtn');
  msgEl.textContent = '';

  const current = document.getElementById('acctCurrentPassword').value;
  const next = document.getElementById('acctNewPassword').value;
  const confirmValue = document.getElementById('acctConfirmPassword').value;

  if(!current || !next || !confirmValue){ msgEl.textContent = 'Заполните все три поля.'; return; }
  if(next.length < 6){ msgEl.textContent = 'Новый пароль должен быть не короче 6 символов.'; return; }
  if(next !== confirmValue){ msgEl.textContent = 'Новый пароль и повтор не совпадают.'; return; }
  if(next === current){ msgEl.textContent = 'Новый пароль должен отличаться от текущего.'; return; }

  acctPassBusy = true;
  btn.disabled = true;
  btn.textContent = 'Меняю…';
  try{
    const cred = firebase.auth.EmailAuthProvider.credential(auth.currentUser.email, current);
    await auth.currentUser.reauthenticateWithCredential(cred);
    await auth.currentUser.updatePassword(next);
    ['acctCurrentPassword', 'acctNewPassword', 'acctConfirmPassword'].forEach(id=>{
      document.getElementById(id).value = '';
    });
    onAcctPasswordInput();
    showToast('Пароль изменён');
  } catch(err){
    console.error('Не удалось сменить пароль:', err);
    msgEl.textContent = acctAuthError(err);
  } finally {
    acctPassBusy = false;
    btn.disabled = false;
    btn.textContent = 'Сменить пароль';
  }
}

async function sendAccountPasswordReset(){
  const user = auth.currentUser;
  const btn = document.getElementById('acctResetBtn');
  if(!user || !user.email || btn.disabled) return;
  btn.disabled = true;
  try{
    await auth.sendPasswordResetEmail(user.email);
    showToast('Письмо для сброса пароля отправлено на ' + user.email);
    let left = 30;
    btn.textContent = `Письмо отправлено. Повторно можно через ${left} с`;
    clearInterval(acctResetTimer);
    acctResetTimer = setInterval(()=>{
      left--;
      if(left <= 0){
        clearInterval(acctResetTimer);
        btn.textContent = ACCT_RESET_LABEL;
        btn.disabled = false;
      } else {
        btn.textContent = `Письмо отправлено. Повторно можно через ${left} с`;
      }
    }, 1000);
  } catch(err){
    console.error('Не удалось отправить письмо для сброса:', err);
    showToast(acctAuthError(err), 'error');
    btn.disabled = false;
  }
}
