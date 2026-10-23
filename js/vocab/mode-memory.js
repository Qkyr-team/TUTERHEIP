/* js/vocab/mode-memory.js — Режим «Memory» */
/* --- 4.4 Memory --- */
let memoryTiles = [];
let memoryFlipped = [];
let memoryMatchedCount = 0;
let memoryAttempts = 0;
let memoryStartTime = 0;
let memoryWordIndices = [];

function startMemoryGame(){
  const allIdx = currentWordSet.words.map((_,idx)=>idx);
  allIdx.sort(()=>Math.random()-0.5);
  memoryWordIndices = allIdx.slice(0, Math.min(8, allIdx.length));

  const tiles = [];
  memoryWordIndices.forEach(idx=>{
    tiles.push({pairId: idx, text: currentWordSet.words[idx].en, matched:false});
    tiles.push({pairId: idx, text: currentWordSet.words[idx].translation, matched:false});
  });
  tiles.sort(()=>Math.random()-0.5);
  memoryTiles = tiles;
  memoryFlipped = [];
  memoryMatchedCount = 0;
  memoryAttempts = 0;
  memoryStartTime = Date.now();

  document.getElementById('vocabProgressLine').textContent = 'Memory — найдите все пары';
  renderMemoryBoard();
}

function renderMemoryBoard(){
  const area = document.getElementById('vocabPlayArea');
  area.innerHTML = `
    <div class="memory-grid">
      ${memoryTiles.map((t,i)=>{
        const isFlipped = memoryFlipped.includes(i) || t.matched;
        const cls = t.matched ? 'memory-tile matched' : (isFlipped ? 'memory-tile flipped' : 'memory-tile hidden-tile');
        return `<div class="${cls}" onclick="flipMemoryTile(${i})">${isFlipped ? escapeHtmlAttr(t.text) : '?'}</div>`;
      }).join('')}
    </div>
    <p class="hint" style="margin-top:12px;">Попыток: ${memoryAttempts}</p>
  `;
}

function flipMemoryTile(i){
  const tile = memoryTiles[i];
  if(tile.matched || memoryFlipped.includes(i) || memoryFlipped.length >= 2) return;
  memoryFlipped.push(i);
  renderMemoryBoard();
  if(memoryFlipped.length === 2){
    memoryAttempts++;
    const [a,b] = memoryFlipped;
    if(memoryTiles[a].pairId === memoryTiles[b].pairId){
      memoryTiles[a].matched = true;
      memoryTiles[b].matched = true;
      memoryMatchedCount++;
      memoryFlipped = [];
      renderMemoryBoard();
      if(memoryMatchedCount === memoryWordIndices.length){
        setTimeout(finishMemoryGame, 400);
      }
    } else {
      setTimeout(()=>{ memoryFlipped = []; renderMemoryBoard(); }, 800);
    }
  }
}

async function finishMemoryGame(){
  const seconds = Math.round((Date.now() - memoryStartTime)/1000);
  memoryWordIndices.forEach(idx=>registerWordResult(idx, true));
  document.getElementById('vocab-play').classList.add('hidden');
  const resPanel = document.getElementById('vocab-result');
  resPanel.classList.remove('hidden');
  resPanel.innerHTML = `
    <div class="result-banner good">
      <div>Все пары найдены!</div>
      <div class="big">${seconds} сек</div>
      <div>Попыток: ${memoryAttempts}</div>
    </div>
    <button class="secondary" onclick="backToVocabModeSelect()">Ещё раз</button>
    <button class="primary" onclick="backToVocabList()">К наборам</button>
  `;
  try{
    const docId = auth.currentUser.uid + '_' + currentWordSet.id;
    await db.collection('wordProgress').doc(docId).set({
      uid: auth.currentUser.uid, setId: currentWordSet.id,
      words: currentWordProgress.words, updatedAt: new Date().toISOString()
    });
  } catch(err){ showToast('Не удалось сохранить прогресс: ' + err.message, 'error'); }
}
