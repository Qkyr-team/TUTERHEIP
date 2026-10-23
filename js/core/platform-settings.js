/* js/core/platform-settings.js — Настройки платформы (бренд, тексты, цвет), загрузка и сохранение */
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
