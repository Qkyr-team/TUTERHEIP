/* js/admin/books.js — Админ: учебники */
/* --- Учебники --- */
let cachedBooks = [];
async function refreshBookSelectOptions(){
  try{
    const snap = await db.collection('books').get();
    cachedBooks = snap.docs.map(d=>({id:d.id, name:d.data().name}));
  } catch(err){ cachedBooks = []; }
  const createSel = document.getElementById('adminTestBook');
  const filterSel = document.getElementById('adminFilterBook');
  const optsPlain = cachedBooks.map(b=>`<option value="${b.name}">${b.name}</option>`).join('');
  if(createSel) createSel.innerHTML = '<option value="">—</option>' + optsPlain;
  if(filterSel) filterSel.innerHTML = '<option value="">Все учебники</option>' + optsPlain;
}
function populateLevelSelects(){
  const optsPlain = LEVELS.map(l=>`<option value="${l}">${l}</option>`).join('');
  const createSel = document.getElementById('adminTestLevel');
  const filterSel = document.getElementById('adminFilterLevel');
  if(createSel) createSel.innerHTML = '<option value="">—</option>' + optsPlain;
  if(filterSel) filterSel.innerHTML = '<option value="">Все уровни</option>' + optsPlain;
}
async function loadAdminBooks(){
  const wrap = document.getElementById('adminBooksWrap');
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  try{
    const snap = await db.collection('books').get();
    const books = snap.docs.map(d=>({id:d.id, ...d.data()}));
    wrap.innerHTML = books.length ? books.map(b=>`
      <div class="cert-test-row">
        <span>${b.name}</span>
        <button class="secondary small" onclick="deleteBook('${b.id}')">Удалить</button>
      </div>`).join('') : '<p class="empty-note">Учебников пока нет.</p>';
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить учебники.</p>';
  }
}
async function addBook(){
  const input = document.getElementById('newBookName');
  const name = input.value.trim();
  if(!name) return;
  try{
    await db.collection('books').add({name, createdAt:new Date().toISOString()});
    input.value = '';
    loadAdminBooks();
    refreshBookSelectOptions();
  } catch(err){ alert('Не удалось добавить учебник: ' + err.message); }
}
async function deleteBook(id){
  if(!confirm('Удалить учебник? Тесты, где он указан, не удалятся, просто останутся без учебника в фильтре.')) return;
  await db.collection('books').doc(id).delete();
  loadAdminBooks();
  refreshBookSelectOptions();
}
