/* js/auth/student-home.js — Главная ученика: напоминание о лексике и история тестов */
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
