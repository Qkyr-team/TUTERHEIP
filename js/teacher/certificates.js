/* js/teacher/certificates.js — Вкладка «Сертификаты» */
/* ---------------------------------------------------------
   ТЕАЧЕР: сертификаты
--------------------------------------------------------- */
async function renderCertificatesPanel(){
  const wrap = document.getElementById('certsWrap');
  if(!FIREBASE_CONFIGURED){
    wrap.innerHTML = '<p class="empty-note">Подключите базу данных Firebase, чтобы выдавать сертификаты.</p>';
    return;
  }
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  let entries;
  try{
    entries = await fetchAllCodes();
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить данные. Проверьте интернет и настройки Firebase.</p>';
    return;
  }
  cachedEntries = entries;
  const done = entries.filter(e=>e.status==='done');
  if(!done.length){
    wrap.innerHTML = '<p class="empty-note">Пока нет учеников, завершивших тест.</p>';
    return;
  }
  const byStudent = {};
  done.forEach(e=>{
    (byStudent[e.studentName] = byStudent[e.studentName] || []).push(e);
  });
  wrap.innerHTML = Object.keys(byStudent).map(name=>{
    const tests = byStudent[name].map(e=>`
      <div class="cert-test-row">
        <span>${e.testTitle} — ${e.score}/${e.total}</span>
        <button class="secondary small" onclick="downloadCertificate('${e.code}')">Выдать сертификат</button>
      </div>
    `).join('');
    return `<div class="cert-student-card"><h4>${name}</h4>${tests}</div>`;
  }).join('');
}

async function downloadCertificate(code){
  const e = cachedEntries.find(x=>x.code===code) || cachedStudentEntries.find(x=>x.code===code);
  if(!e) return;
  const canvas = document.getElementById('certCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  await ensureCertTemplateLoaded();

  let teacherSignature = '';
  if(FIREBASE_CONFIGURED && e.teacherId){
    try{
      const tSnap = await db.collection('users').doc(e.teacherId).get();
      if(tSnap.exists){
        const tData = tSnap.data();
        teacherSignature = tData.certSignature || tData.displayName || '';
      }
    } catch(err){ /* оставляем пустой строку — напечатаем линию для подписи от руки */ }
  }

  if(certTemplateImage){
    const img = new Image();
    await new Promise(resolve=>{ img.onload = resolve; img.onerror = resolve; img.src = certTemplateImage; });
    ctx.clearRect(0,0,W,H);
    ctx.drawImage(img, 0, 0, W, H);
  } else {
    // тёмно-синий фон
    ctx.fillStyle = '#0f1638';
    ctx.fillRect(0,0,W,H);
    // едва заметная тонкая рамка
    ctx.strokeStyle = 'rgba(45,212,191,0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(30,30,W-60,H-60);
  }

  const ORANGE = '#ff6a3d';
  const TEAL = '#2dd4bf';
  const WHITE = '#f3f6f8';

  ctx.textAlign = 'center';

  ctx.fillStyle = ORANGE;
  ctx.font = 'bold 34px Georgia';
  ctx.fillText(platformSettings.certTitle1, W/2, 110);
  ctx.fillText(platformSettings.certTitle2, W/2, 154);

  // тонкая бирюзовая линия под заголовком
  ctx.strokeStyle = TEAL;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W/2-190, 178);
  ctx.lineTo(W/2+190, 178);
  ctx.stroke();

  ctx.fillStyle = TEAL;
  ctx.font = '20px Georgia';
  ctx.fillText(platformSettings.certSubtitle, W/2, 230);

  ctx.fillStyle = WHITE;
  ctx.font = 'bold 44px Georgia';
  ctx.fillText(e.studentName, W/2, 320);

  ctx.fillStyle = TEAL;
  ctx.font = '17px Georgia';
  ctx.fillText(platformSettings.certCompletionText, W/2, 370);

  ctx.fillStyle = WHITE;
  ctx.font = 'bold 26px Georgia';
  ctx.fillText(e.testTitle, W/2, 408);

  ctx.fillStyle = TEAL;
  ctx.font = '18px Georgia';
  ctx.fillText(`Результат: ${e.score} из ${e.total}`, W/2, 452);

  const dateStr = new Date(e.completedAt || Date.now()).toLocaleDateString('ru-RU');
  ctx.font = '14px Georgia';
  ctx.fillStyle = 'rgba(243,246,248,0.6)';
  ctx.fillText('Дата: ' + dateStr, W/2, 484);

  // подпись репетитора внизу слева (в стиле "имя + должность")
  ctx.textAlign = 'left';
  ctx.strokeStyle = TEAL;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(90, H-140);
  ctx.lineTo(330, H-140);
  ctx.stroke();

  ctx.fillStyle = ORANGE;
  ctx.font = 'bold 18px Georgia';
  ctx.fillText(teacherSignature || 'Репетитор TutorHelp', 90, H-112);

  ctx.fillStyle = TEAL;
  ctx.font = '13px Georgia';
  ctx.fillText(platformSettings.certRoleLabel, 90, H-92);

  if(!certTemplateImage){
    // печать-плейсхолдер (пустой круг, как в референсе)
    ctx.strokeStyle = TEAL;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W-160, H-118, 55, 0, Math.PI*2);
    ctx.stroke();
  }

  const link = document.createElement('a');
  link.download = `Сертификат_${e.studentName.replace(/\s+/g,'_')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();

  if(FIREBASE_CONFIGURED){
    db.collection('codes').doc(code).update({certificateIssued:true}).catch(()=>{});
  }
}
