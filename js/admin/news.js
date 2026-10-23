/* js/admin/news.js — Админ: новости для репетиторов */
/* ---------------------------------------------------------
   НОВОСТИ ДЛЯ РЕПЕТИТОРОВ — админ
--------------------------------------------------------- */
let editingNewsId = null;
let cachedNews = [];

function todayISO(){
  const d = new Date();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${m}-${day}`;
}

async function loadAdminNews(){
  const wrap = document.getElementById('newsListWrap');
  const dateEl = document.getElementById('newsDate');
  if(!dateEl.value) dateEl.value = todayISO();
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  try{
    const snap = await db.collection('teacherNews').get();
    cachedNews = snap.docs.map(d=>({id:d.id, ...d.data()}));
    cachedNews.sort((a,b)=>
      (b.date||'').localeCompare(a.date||'') ||
      (b.createdAt||'').localeCompare(a.createdAt||'')
    );
    wrap.innerHTML = cachedNews.length ? cachedNews.map(n=>`
      <div class="cert-test-row">
        <span>${escapeHtmlAttr(n.title)}
          <span style="color:var(--ink-dim);font-size:12px;">
            ${escapeHtmlAttr(n.date||'')} · ${TEACHER_INFO_TAGS[n.tag]||''}
          </span>
        </span>
        <span>
          <button class="secondary small" onclick="editNews('${n.id}')">Редактировать</button>
          <button class="secondary small" onclick="deleteNews('${n.id}')">Удалить</button>
        </span>
      </div>`).join('') : '<p class="empty-note">Публикаций пока нет.</p>';
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить: ' + escapeHtmlAttr(err.message) + '</p>';
  }
}

async function saveNews(){
  const title = document.getElementById('newsTitle').value.trim();
  const text  = document.getElementById('newsText').value.trim();
  const tag   = document.getElementById('newsTag').value;
  const date  = document.getElementById('newsDate').value || todayISO();
  const errEl = document.getElementById('newsFormError');
  errEl.textContent = '';
  if(!title){ errEl.textContent = 'Введите заголовок.'; return; }
  if(!text){ errEl.textContent = 'Введите текст.'; return; }
  try{
    const payload = {title, text, tag, date};
    if(editingNewsId){
      await db.collection('teacherNews').doc(editingNewsId).update(payload);
    } else {
      payload.createdAt = new Date().toISOString();
      await db.collection('teacherNews').add(payload);
    }
    resetNewsForm();
    loadAdminNews();
    showToast('Публикация сохранена');
  } catch(err){
    errEl.textContent = 'Не удалось сохранить: ' + err.message;
  }
}

function editNews(id){
  const n = cachedNews.find(x=>x.id===id);
  if(!n) return;
  editingNewsId = id;
  document.getElementById('newsTitle').value = n.title || '';
  document.getElementById('newsText').value  = n.text || '';
  document.getElementById('newsTag').value   = n.tag || 'new';
  document.getElementById('newsDate').value  = n.date || todayISO();
  document.getElementById('newsFormTitle').textContent = 'Редактирование публикации';
  document.getElementById('newsCancelBtn').classList.remove('hidden');
  document.getElementById('newsTitle').scrollIntoView({behavior:'smooth', block:'center'});
}

function resetNewsForm(){
  editingNewsId = null;
  document.getElementById('newsTitle').value = '';
  document.getElementById('newsText').value  = '';
  document.getElementById('newsTag').value   = 'new';
  document.getElementById('newsDate').value  = todayISO();
  document.getElementById('newsFormTitle').textContent = 'Новая публикация';
  document.getElementById('newsCancelBtn').classList.add('hidden');
  document.getElementById('newsFormError').textContent = '';
}

async function deleteNews(id){
  if(!confirm('Удалить публикацию?')) return;
  try{
    await db.collection('teacherNews').doc(id).delete();
    if(editingNewsId === id) resetNewsForm();
    loadAdminNews();
    showToast('Публикация удалена');
  } catch(err){
    alert('Не удалось удалить: ' + err.message);
  }
}
