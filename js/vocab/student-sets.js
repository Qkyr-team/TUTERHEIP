/* js/vocab/student-sets.js — Лексика (ученик): наборы, выбор режима, повторение */
/* ---------------------------------------------------------
   ЛЕКСИКА — ученик: наборы, режимы игры, интервальное повторение
--------------------------------------------------------- */
const SRS_INTERVALS_DAYS = [1,3,7,14,30];

let cachedStudentWordSets = [];
let currentWordSet = null;
let currentWordQueue = [];
let currentWordPos = 0;
let currentVocabMode = null;
let currentWordProgress = null;
let vocabSessionStats = {correct:0, wrong:0};

function goVocabStudent(){
  if(!FIREBASE_CONFIGURED || !auth.currentUser){
    showToast('Войдите в аккаунт ученика, чтобы пользоваться разделом «Лексика» — прогресс сохраняется только у вошедших пользователей.', 'error');
    return;
  }
  show('view-vocab');
  document.getElementById('vocab-sets-list').classList.remove('hidden');
  document.getElementById('vocab-mode-select').classList.add('hidden');
  document.getElementById('vocab-play').classList.add('hidden');
  document.getElementById('vocab-result').classList.add('hidden');
  loadStudentWordSets();
}

async function fetchWordProgress(setId){
  const docId = auth.currentUser.uid + '_' + setId;
  try{
    const snap = await db.collection('wordProgress').doc(docId).get();
    return snap.exists ? snap.data() : {uid: auth.currentUser.uid, setId, words: {}};
  } catch(err){
    return {uid: auth.currentUser.uid, setId, words: {}};
  }
}

function countDueWords(set, prog){
  const now = new Date();
  let count = 0;
  (set.words || []).forEach((w,idx)=>{
    const p = prog.words[idx];
    if(!p || new Date(p.nextReview) <= now) count++;
  });
  return count;
}

async function loadStudentWordSets(){
  const wrap = document.getElementById('studentWordSetsWrap');
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  try{
    const snap = await db.collection('wordSets').where('published','==',true).get();
    cachedStudentWordSets = snap.docs.map(d=>({id:d.id, ...d.data()}));
    if(!cachedStudentWordSets.length){
      wrap.innerHTML = '<p class="empty-note">Пока нет опубликованных наборов слов.</p>';
      document.getElementById('vocabDueBanner').textContent = '';
      return;
    }
    let dueTotal = 0;
    for(const s of cachedStudentWordSets){
      const prog = await fetchWordProgress(s.id);
      dueTotal += countDueWords(s, prog);
    }
    document.getElementById('vocabDueBanner').textContent = dueTotal > 0
      ? `Сегодня нужно повторить слов: ${dueTotal}`
      : 'Повторений на сегодня нет — можно изучать новые слова.';

    wrap.innerHTML = cachedStudentWordSets.map(s=>`
      <div class="cert-test-row">
        <span>${escapeHtmlAttr(s.title)} <span style="color:var(--ink-dim);font-size:12px;">${[s.level,s.topic].filter(Boolean).join(' · ')} · ${(s.words||[]).length} слов</span></span>
        <button class="secondary small" onclick="openVocabSet('${s.id}')">Открыть</button>
      </div>
    `).join('');
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить наборы.</p>';
  }
}

function openVocabSet(id){
  currentWordSet = cachedStudentWordSets.find(s=>s.id===id);
  if(!currentWordSet) return;
  document.getElementById('vocab-sets-list').classList.add('hidden');
  document.getElementById('vocab-mode-select').classList.remove('hidden');
  document.getElementById('vocabSetTitle').textContent = currentWordSet.title;
}

function backToVocabList(){
  clearInterval(speedQuizTimer);
  document.getElementById('vocab-mode-select').classList.add('hidden');
  document.getElementById('vocab-play').classList.add('hidden');
  document.getElementById('vocab-result').classList.add('hidden');
  document.getElementById('vocab-sets-list').classList.remove('hidden');
  loadStudentWordSets();
}

function backToVocabModeSelect(){
  clearInterval(speedQuizTimer);
  document.getElementById('vocab-play').classList.add('hidden');
  document.getElementById('vocab-result').classList.add('hidden');
  document.getElementById('vocab-mode-select').classList.remove('hidden');
}

function wordHasBlankableExample(w){
  if(!w.example || !w.en) return false;
  const re = new RegExp('\\b' + w.en.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\b', 'i');
  return re.test(w.example);
}

async function startVocabMode(mode){
  if(mode === 'choice' && (!currentWordSet.words || currentWordSet.words.length < 4)){
    showToast('Для этого режима в наборе должно быть минимум 4 слова.', 'error');
    return;
  }
  if(mode === 'fillblank' && !currentWordSet.words.some(wordHasBlankableExample)){
    showToast('В этом наборе нет слов с примером предложения, где встречается само слово — режим недоступен.', 'error');
    return;
  }
  if(mode === 'oddoneout' && cachedStudentWordSets.filter(s=>s.id!==currentWordSet.id).length === 0){
    showToast('Для режима «Найди лишнее» нужен ещё хотя бы один опубликованный набор.', 'error');
    return;
  }
  if(mode === 'memory' && (!currentWordSet.words || currentWordSet.words.length < 3)){
    showToast('Для Memory в наборе должно быть минимум 3 слова.', 'error');
    return;
  }

  currentVocabMode = mode;
  currentWordProgress = await fetchWordProgress(currentWordSet.id);

  if(mode === 'memory'){
    document.getElementById('vocab-mode-select').classList.add('hidden');
    document.getElementById('vocab-play').classList.remove('hidden');
    document.getElementById('vocab-result').classList.add('hidden');
    startMemoryGame();
    return;
  }
  if(mode === 'speedquiz'){
    if(!currentWordSet.words || currentWordSet.words.length < 4){
      showToast('Для «Быстрого теста» в наборе должно быть минимум 4 слова.', 'error');
      currentVocabMode = null;
      return;
    }
    document.getElementById('vocab-mode-select').classList.add('hidden');
    document.getElementById('vocab-play').classList.remove('hidden');
    document.getElementById('vocab-result').classList.add('hidden');
    startSpeedQuiz();
    return;
  }

  const now = new Date();
  let indices = [];
  currentWordSet.words.forEach((w,idx)=>{
    const p = currentWordProgress.words[idx];
    if(!p || new Date(p.nextReview) <= now) indices.push(idx);
  });
  if(!indices.length){
    indices = currentWordSet.words.map((_,idx)=>idx);
  }
  if(mode === 'fillblank'){
    indices = indices.filter(idx=>wordHasBlankableExample(currentWordSet.words[idx]));
    if(!indices.length) indices = currentWordSet.words.map((_,idx)=>idx).filter(idx=>wordHasBlankableExample(currentWordSet.words[idx]));
  }
  indices.sort(()=>Math.random()-0.5);
  currentWordQueue = indices;
  currentWordPos = 0;
  vocabSessionStats = {correct:0, wrong:0};

  document.getElementById('vocab-mode-select').classList.add('hidden');
  document.getElementById('vocab-play').classList.remove('hidden');
  document.getElementById('vocab-result').classList.add('hidden');
  renderVocabStep();
}

function speakWord(text){
  try{
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    speechSynthesis.speak(u);
  } catch(err){ /* Web Speech API недоступен в этом браузере — тихо игнорируем */ }
}

function speakCurrentWord(){
  const wordIdx = currentWordQueue[currentWordPos];
  const w = currentWordSet.words[wordIdx];
  if(w) speakWord(w.en);
}
