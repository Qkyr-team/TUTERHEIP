/* js/teacher/student-cards.js — Вкладка «Мои ученики»: карточки учеников */
let editingStudentId = null;
let cachedStudentCards = [];

function toggleStudentForm(){
  const wrap = document.getElementById('studentFormWrap');
  const wasHidden = wrap.classList.contains('hidden');
  if(wasHidden){
    clearStudentForm();
    wrap.classList.remove('hidden');
  } else {
    wrap.classList.add('hidden');
  }
}

function clearStudentForm(){
  editingStudentId = null;
  document.getElementById('studentFormTitle').textContent = 'Новый ученик';
  ['studentFirstName','studentLastName','studentGrade','studentNativeLang','studentPhone','studentEmail',
   'parentName','parentPhone','parentEmail','studentTextbook'].forEach(id=>{
    const el = document.getElementById(id);
    el.value = '';
    el.classList.remove('field-error');
  });
  document.getElementById('studentGoal').value = '';
  document.getElementById('studentLevel').value = '';
  document.getElementById('studentFrequency').value = '';
  document.getElementById('studentDuration').value = '';
  document.getElementById('studentNotes').value = '';
  document.getElementById('studentFormError').textContent = '';
}

function cancelStudentForm(){
  document.getElementById('studentFormWrap').classList.add('hidden');
  clearStudentForm();
}

async function saveStudentCard(){
  const firstNameEl = document.getElementById('studentFirstName');
  const lastNameEl = document.getElementById('studentLastName');
  const firstName = firstNameEl.value.trim();
  const lastName = lastNameEl.value.trim();
  const errEl = document.getElementById('studentFormError');
  errEl.textContent = '';
  firstNameEl.classList.remove('field-error');
  lastNameEl.classList.remove('field-error');

  if(!firstName || !lastName){
    if(!firstName) firstNameEl.classList.add('field-error');
    if(!lastName) lastNameEl.classList.add('field-error');
    errEl.textContent = 'Заполните обязательные поля.';
    return;
  }

  const data = {
    firstName, lastName,
    grade: document.getElementById('studentGrade').value.trim(),
    nativeLang: document.getElementById('studentNativeLang').value.trim(),
    goal: document.getElementById('studentGoal').value,
    studentPhone: document.getElementById('studentPhone').value.trim(),
    studentEmail: document.getElementById('studentEmail').value.trim(),
    parentName: document.getElementById('parentName').value.trim(),
    parentPhone: document.getElementById('parentPhone').value.trim(),
    parentEmail: document.getElementById('parentEmail').value.trim(),
    level: document.getElementById('studentLevel').value,
    textbook: document.getElementById('studentTextbook').value.trim(),
    frequency: document.getElementById('studentFrequency').value,
    duration: document.getElementById('studentDuration').value,
    notes: document.getElementById('studentNotes').value.trim(),
    teacherId: auth.currentUser.uid
  };

  try{
    if(editingStudentId){
      await db.collection('students').doc(editingStudentId).update(data);
    } else {
      data.createdAt = new Date().toISOString();
      await db.collection('students').add(data);
    }
    cancelStudentForm();
    await loadStudentCards();
    showToast('Ученик успешно добавлен');
  } catch(err){
    errEl.textContent = 'Не удалось сохранить: ' + err.message;
  }
}

async function loadStudentCards(){
  const wrap = document.getElementById('studentCardsWrap');
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  try{
    const snap = await db.collection('students').where('teacherId','==',auth.currentUser.uid).get();
    cachedStudentCards = snap.docs.map(d=>({id:d.id, ...d.data()}));
    renderStudentCards();
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить учеников.</p>';
  }
}

function renderStudentCards(){
  const wrap = document.getElementById('studentCardsWrap');
  if(!cachedStudentCards.length){
    wrap.innerHTML = '<p class="empty-note">Пока нет ни одной карточки ученика.</p>';
    return;
  }
  wrap.innerHTML = cachedStudentCards.map(s=>{
    const meta = [s.level, s.grade ? 'класс '+s.grade : ''].filter(Boolean).join(' · ') || '—';
    return `
    <div class="student-card">
      <div class="student-card-head">
        <div>
          <div class="student-card-name">${escapeHtmlAttr(s.firstName)} ${escapeHtmlAttr(s.lastName)}</div>
          <div class="student-card-meta">${meta} · Следующий урок: не назначен</div>
        </div>
      </div>
      <div class="student-card-tabs">
        <button class="secondary small" onclick="toggleStudentTab('${s.id}','lessons')">📅 История уроков</button>
        <button class="secondary small" onclick="toggleStudentTab('${s.id}','homework')">📚 Домашние задания</button>
        <button class="secondary small" onclick="toggleStudentTab('${s.id}','progress')">📊 Прогресс</button>
        <button class="secondary small" onclick="toggleStudentTab('${s.id}','notes')">📝 Заметки</button>
        <button class="secondary small" onclick="editStudentCard('${s.id}')">⚙️ Редактировать</button>
        <button class="secondary small" onclick="deleteStudentCard('${s.id}')">🗑 Удалить</button>
      </div>
      <div class="student-tab-content hidden" id="studentTab_${s.id}" data-open-tab=""></div>
    </div>`;
  }).join('');
}

function toggleStudentTab(id, tab){
  const el = document.getElementById('studentTab_'+id);
  const alreadyOpen = el.dataset.openTab === tab && !el.classList.contains('hidden');
  el.classList.add('hidden');
  el.innerHTML = '';
  el.dataset.openTab = '';
  if(alreadyOpen) return;

  el.dataset.openTab = tab;
  el.classList.remove('hidden');
  const student = cachedStudentCards.find(s=>s.id===id);
  if(!student) return;

  if(tab === 'notes'){
    el.innerHTML = `
      <textarea id="notesEdit_${id}" rows="4" style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--ink);border-radius:7px;padding:10px;">${escapeHtmlAttr(student.notes||'')}</textarea>
      <button class="secondary small" style="margin-top:8px;" onclick="saveStudentNotes('${id}')">Сохранить заметки</button>
    `;
    return;
  }
  if(tab === 'homework'){
    el.innerHTML = '<p class="hint">Отдельный трекер домашних заданий пока не реализован — используйте вкладку «Заметки», чтобы фиксировать, что задано.</p>';
    return;
  }

  el.innerHTML = '<p class="empty-note">Загрузка…</p>';
  fetchAllCodes().then(entries=>{
    const fullName = `${student.firstName} ${student.lastName}`.trim().toLowerCase();
    const matched = entries.filter(e=>(e.studentName||'').trim().toLowerCase() === fullName);
    if(tab === 'lessons'){
      if(!matched.length){
        el.innerHTML = '<p class="empty-note">Пока нет кодов с именем, точно совпадающим с этой карточкой.</p>';
        return;
      }
      el.innerHTML = matched.map(e=>`
        <div class="cert-test-row"><span>${e.testTitle}</span><span>${e.status==='done' ? (e.score+' / '+e.total) : 'ожидание'}</span></div>
      `).join('');
    } else if(tab === 'progress'){
      const done = matched.filter(e=>e.status==='done' && e.total>0);
      if(!done.length){
        el.innerHTML = '<p class="empty-note">Пока нет пройденных тестов с точным совпадением имени.</p>';
        return;
      }
      const avg = Math.round(done.reduce((sum,e)=>sum+(e.score/e.total),0)/done.length*100);
      el.innerHTML = `
        <div class="stat-grid">
          <div class="stat-card"><div class="stat-num">${done.length}</div><div class="stat-label">тестов пройдено</div></div>
          <div class="stat-card"><div class="stat-num">${avg}%</div><div class="stat-label">средний результат</div></div>
        </div>`;
    }
  }).catch(()=>{ el.innerHTML = '<p class="empty-note">Не удалось загрузить данные.</p>'; });
}

async function saveStudentNotes(id){
  const val = document.getElementById('notesEdit_'+id).value;
  try{
    await db.collection('students').doc(id).update({notes: val});
    const s = cachedStudentCards.find(x=>x.id===id);
    if(s) s.notes = val;
    showToast('Заметки сохранены');
  } catch(err){
    showToast('Не удалось сохранить заметки: ' + err.message, 'error');
  }
}

function editStudentCard(id){
  const s = cachedStudentCards.find(x=>x.id===id);
  if(!s) return;
  editingStudentId = id;
  document.getElementById('studentFormWrap').classList.remove('hidden');
  document.getElementById('studentFormTitle').textContent = 'Редактирование ученика';
  document.getElementById('studentFirstName').value = s.firstName || '';
  document.getElementById('studentLastName').value = s.lastName || '';
  document.getElementById('studentGrade').value = s.grade || '';
  document.getElementById('studentNativeLang').value = s.nativeLang || '';
  document.getElementById('studentGoal').value = s.goal || '';
  document.getElementById('studentPhone').value = s.studentPhone || '';
  document.getElementById('studentEmail').value = s.studentEmail || '';
  document.getElementById('parentName').value = s.parentName || '';
  document.getElementById('parentPhone').value = s.parentPhone || '';
  document.getElementById('parentEmail').value = s.parentEmail || '';
  document.getElementById('studentLevel').value = s.level || '';
  document.getElementById('studentTextbook').value = s.textbook || '';
  document.getElementById('studentFrequency').value = s.frequency || '';
  document.getElementById('studentDuration').value = s.duration || '';
  document.getElementById('studentNotes').value = s.notes || '';
  document.getElementById('studentFormWrap').scrollIntoView({behavior:'smooth', block:'start'});
}

async function deleteStudentCard(id){
  if(!confirm('Удалить карточку ученика? Это действие нельзя отменить.')) return;
  try{
    await db.collection('students').doc(id).delete();
    await loadStudentCards();
    showToast('Ученик удалён');
  } catch(err){
    showToast('Не удалось удалить: ' + err.message, 'error');
  }
}
