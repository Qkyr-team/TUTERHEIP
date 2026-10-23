/* js/vocab/admin-wordsets.js — Лексика (админ): наборы слов */
/* ---------------------------------------------------------
   ЛЕКСИКА — админ: CRUD наборов слов
--------------------------------------------------------- */
let editingWordSetId = null;
let cachedWordSets = [];

function addWordRow(prefill){
  const wrap = document.getElementById('wsWordsWrap');
  const div = document.createElement('div');
  div.className = 'word-row';
  div.innerHTML = `
    <input type="text" class="wsWordEn" placeholder="Слово (en)" value="${prefill?escapeHtmlAttr(prefill.en):''}">
    <input type="text" class="wsWordTranslation" placeholder="Перевод" value="${prefill?escapeHtmlAttr(prefill.translation):''}">
    <input type="text" class="wsWordTranscription" placeholder="Транскрипция" value="${prefill?escapeHtmlAttr(prefill.transcription||''):''}">
    <input type="text" class="wsWordExample" placeholder="Пример предложения" value="${prefill?escapeHtmlAttr(prefill.example||''):''}">
    <button class="secondary small" onclick="this.closest('.word-row').remove()">✕</button>
  `;
  wrap.appendChild(div);
}

function toggleWordSetForm(){
  const wrap = document.getElementById('wordSetFormWrap');
  const wasHidden = wrap.classList.contains('hidden');
  if(wasHidden){ clearWordSetForm(); wrap.classList.remove('hidden'); }
  else wrap.classList.add('hidden');
}

function clearWordSetForm(){
  editingWordSetId = null;
  document.getElementById('wordSetFormTitle').textContent = 'Новый набор слов';
  document.getElementById('wsTitle').value = '';
  document.getElementById('wsLevel').value = '';
  document.getElementById('wsTopic').value = '';
  document.getElementById('wsDescription').value = '';
  document.getElementById('wsWordsWrap').innerHTML = '';
  document.getElementById('wsPublished').checked = true;
  document.getElementById('wordSetFormError').textContent = '';
  addWordRow();
}

function cancelWordSetForm(){
  document.getElementById('wordSetFormWrap').classList.add('hidden');
  clearWordSetForm();
}

async function saveWordSet(){
  const title = document.getElementById('wsTitle').value.trim();
  const level = document.getElementById('wsLevel').value;
  const topic = document.getElementById('wsTopic').value.trim();
  const description = document.getElementById('wsDescription').value.trim();
  const published = document.getElementById('wsPublished').checked;
  const errEl = document.getElementById('wordSetFormError');
  errEl.textContent = '';
  if(!title){ errEl.textContent = 'Введите название набора.'; return; }
  const rows = document.querySelectorAll('#wsWordsWrap .word-row');
  if(!rows.length){ errEl.textContent = 'Добавьте хотя бы одно слово.'; return; }
  const words = [];
  for(const row of rows){
    const en = row.querySelector('.wsWordEn').value.trim();
    const translation = row.querySelector('.wsWordTranslation').value.trim();
    const transcription = row.querySelector('.wsWordTranscription').value.trim();
    const example = row.querySelector('.wsWordExample').value.trim();
    if(!en || !translation){ errEl.textContent = 'У каждого слова должны быть заполнены английское слово и перевод.'; return; }
    words.push({en, translation, transcription, example});
  }
  try{
    const payload = {title, level: level || null, topic: topic || null, description: description || null, words, published};
    if(editingWordSetId){
      await db.collection('wordSets').doc(editingWordSetId).update(payload);
    } else {
      payload.createdAt = new Date().toISOString();
      await db.collection('wordSets').add(payload);
    }
    cancelWordSetForm();
    loadWordSetsList();
    showToast('Набор слов сохранён');
  } catch(err){
    errEl.textContent = 'Не удалось сохранить: ' + err.message;
  }
}

function editWordSet(id){
  const s = cachedWordSets.find(x=>x.id===id);
  if(!s) return;
  editingWordSetId = id;
  document.getElementById('wordSetFormWrap').classList.remove('hidden');
  document.getElementById('wordSetFormTitle').textContent = 'Редактирование набора';
  document.getElementById('wsTitle').value = s.title || '';
  document.getElementById('wsLevel').value = s.level || '';
  document.getElementById('wsTopic').value = s.topic || '';
  document.getElementById('wsDescription').value = s.description || '';
  document.getElementById('wsPublished').checked = s.published !== false;
  document.getElementById('wsWordsWrap').innerHTML = '';
  (s.words || []).forEach(w=>addWordRow(w));
  document.getElementById('wordSetFormWrap').scrollIntoView({behavior:'smooth', block:'start'});
}

async function deleteWordSet(id){
  if(!confirm('Удалить набор слов?')) return;
  try{
    await db.collection('wordSets').doc(id).delete();
    loadWordSetsList();
    showToast('Набор удалён');
  } catch(err){
    showToast('Не удалось удалить: ' + err.message, 'error');
  }
}

async function loadWordSetsList(){
  const wrap = document.getElementById('wordSetsListWrap');
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  const isAdminUser = ADMIN_EMAIL !== "ВСТАВЬТЕ_ВАШ_EMAIL_СЮДА"
    && auth.currentUser && (auth.currentUser.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const adminControls = document.getElementById('vocabAdminControls');
  if(adminControls) adminControls.classList.toggle('hidden', !isAdminUser);
  try{
    const snap = isAdminUser
      ? await db.collection('wordSets').get()
      : await db.collection('wordSets').where('published','==',true).get();
    cachedWordSets = snap.docs.map(d=>({id:d.id, ...d.data()}));
    if(!cachedWordSets.length){ wrap.innerHTML = '<p class="empty-note">Наборов слов пока нет.</p>'; return; }
    wrap.innerHTML = cachedWordSets.map(s=>`
      <div class="cert-test-row">
        <span>${escapeHtmlAttr(s.title)} <span style="color:var(--ink-dim);font-size:12px;">
          ${[s.level,s.topic].filter(Boolean).join(' · ')} · ${(s.words||[]).length} слов
          ${s.published===false ? ' · <span style="color:var(--red);">не опубликован</span>' : ''}
        </span></span>
        ${isAdminUser ? `<span>
          <button class="secondary small" onclick="editWordSet('${s.id}')">Редактировать</button>
          <button class="secondary small" onclick="deleteWordSet('${s.id}')">Удалить</button>
        </span>` : ''}
      </div>
    `).join('');
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить наборы.</p>';
  }
}
