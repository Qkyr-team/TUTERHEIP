/* js/vocab/mode-speedquiz.js — Режим «Быстрый тест» */
/* --- 4.7 Быстрый тест --- */
let speedQuizTimeLeft = 60;
let speedQuizTimer = null;
let speedQuizAnswered = 0;
let speedQuizCorrect = 0;
let speedQuizCurrentIdx = null;
let speedQuizOptions = [];

function startSpeedQuiz(){
  speedQuizTimeLeft = 60;
  speedQuizAnswered = 0;
  speedQuizCorrect = 0;
  document.getElementById('vocabProgressLine').innerHTML = `
    <div class="speed-timer-bar"><div class="speed-timer-fill" id="speedTimerFill" style="width:100%;"></div></div>
    <span id="speedTimerText">Осталось: 60 сек</span> · Правильно: <span id="speedCorrectText">0</span>
  `;
  clearInterval(speedQuizTimer);
  speedQuizTimer = setInterval(()=>{
    speedQuizTimeLeft--;
    const fill = document.getElementById('speedTimerFill');
    const text = document.getElementById('speedTimerText');
    if(fill) fill.style.width = Math.max(0, speedQuizTimeLeft/60*100) + '%';
    if(text) text.textContent = `Осталось: ${speedQuizTimeLeft} сек`;
    if(speedQuizTimeLeft <= 0){
      clearInterval(speedQuizTimer);
      finishSpeedQuiz();
    }
  }, 1000);
  renderSpeedQuizQuestion();
}

function renderSpeedQuizQuestion(){
  const idx = Math.floor(Math.random()*currentWordSet.words.length);
  speedQuizCurrentIdx = idx;
  speedQuizOptions = buildChoiceOptions(idx);
  const w = currentWordSet.words[idx];
  const area = document.getElementById('vocabPlayArea');
  area.innerHTML = `
    <div class="q-block" style="text-align:center;">
      <div style="font-family:var(--serif);font-size:22px;margin-bottom:12px;">${escapeHtmlAttr(w.en)}</div>
      ${speedQuizOptions.map((opt,oi)=>`<button class="secondary" style="width:100%;margin-bottom:8px;"
        onclick="answerSpeedQuiz(${oi})">${escapeHtmlAttr(opt)}</button>`).join('')}
    </div>
  `;
}

function answerSpeedQuiz(optionIdx){
  if(speedQuizTimeLeft <= 0) return;
  const chosen = speedQuizOptions[optionIdx];
  const correct = currentWordSet.words[speedQuizCurrentIdx].translation;
  const knew = chosen === correct;
  speedQuizAnswered++;
  if(knew) speedQuizCorrect++;
  registerWordResult(speedQuizCurrentIdx, knew);
  const correctText = document.getElementById('speedCorrectText');
  if(correctText) correctText.textContent = speedQuizCorrect;
  renderSpeedQuizQuestion();
}

async function finishSpeedQuiz(){
  document.getElementById('vocab-play').classList.add('hidden');
  const resPanel = document.getElementById('vocab-result');
  resPanel.classList.remove('hidden');
  const pct = speedQuizAnswered ? Math.round(speedQuizCorrect/speedQuizAnswered*100) : 0;
  resPanel.innerHTML = `
    <div class="result-banner ${pct>=60?'good':'bad'}">
      <div>Время вышло!</div>
      <div class="big">${speedQuizCorrect} / ${speedQuizAnswered}</div>
      <div>${pct}% правильных · скорость: ${(speedQuizAnswered/60*60).toFixed(1)} ответов/мин</div>
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
