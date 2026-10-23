/* js/admin/certificate-template.js — Админ: дизайн сертификата */
/* --- Дизайн сертификата --- */
let certTemplateImage = null;
let certTemplatePromise = null;

function ensureCertTemplateLoaded(){
  if(!FIREBASE_CONFIGURED) return Promise.resolve(null);
  if(!certTemplatePromise){
    certTemplatePromise = db.collection('settings').doc('certificate').get().then(snap=>{
      certTemplateImage = snap.exists ? (snap.data().templateImage || null) : null;
      return certTemplateImage;
    }).catch(()=>{ certTemplatePromise = null; return null; });
  }
  return certTemplatePromise;
}

async function loadCertificateTemplatePanel(){
  certTemplatePromise = null; // всегда перечитываем при открытии вкладки
  await ensureCertTemplateLoaded();
  renderCertTemplatePreview();
}

function renderCertTemplatePreview(){
  const wrap = document.getElementById('certTemplatePreviewWrap');
  if(!wrap) return;
  wrap.innerHTML = certTemplateImage
    ? `<img src="${certTemplateImage}" style="max-width:100%;border-radius:8px;border:1px solid var(--border);display:block;">`
    : '<p class="empty-note">Сейчас используется стандартный дизайн сертификата.</p>';
}

function resizeImageForCertificate(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onerror = ()=>reject(new Error('Не удалось прочитать файл'));
    reader.onload = ()=>{
      const img = new Image();
      img.onload = ()=>{
        const canvas = document.createElement('canvas');
        canvas.width = 1000; canvas.height = 700;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0,0,1000,700);
        ctx.drawImage(img, 0, 0, 1000, 700);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = ()=>reject(new Error('Не удалось загрузить изображение'));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadCertificateTemplate(){
  const fileInput = document.getElementById('certTemplateFile');
  const errEl = document.getElementById('certTemplateError');
  errEl.textContent = '';
  const file = fileInput.files[0];
  if(!file){ errEl.textContent = 'Выберите файл изображения.'; return; }
  if(!file.type.startsWith('image/')){ errEl.textContent = 'Нужен файл изображения (PNG или JPEG).'; return; }
  try{
    const dataUrl = await resizeImageForCertificate(file);
    await db.collection('settings').doc('certificate').set({
      templateImage: dataUrl, updatedAt: new Date().toISOString()
    });
    certTemplateImage = dataUrl;
    certTemplatePromise = Promise.resolve(dataUrl);
    renderCertTemplatePreview();
    fileInput.value = '';
    errEl.textContent = 'Готово — новый дизайн сохранён.';
  } catch(err){
    errEl.textContent = 'Не удалось загрузить: ' + err.message;
  }
}

async function resetCertificateTemplate(){
  if(!confirm('Вернуть стандартный дизайн сертификата?')) return;
  try{
    await db.collection('settings').doc('certificate').delete();
    certTemplateImage = null;
    certTemplatePromise = Promise.resolve(null);
    renderCertTemplatePreview();
  } catch(err){
    alert('Не удалось сбросить дизайн: ' + err.message);
  }
}
