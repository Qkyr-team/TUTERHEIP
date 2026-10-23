/* js/vocab/session.js — Лексика: карточки, учёт результатов, завершение занятия */
function revealFlashcard(){
  const wordIdx = currentWordQueue[currentWordPos];
  const w = currentWordSet.words[wordIdx];
  document.getElementById('flipArea').innerHTML = `
    <div style="font-size:20px;color:var(--accent);margin-bottom:6px;">${escapeHtmlAttr(w.translation)}</div>
    ${w.example ? `<div style="color:var(--ink-dim);font-size:13px;margin-bottom:14px;">${escapeHtmlAttr(w.example)}</div>` : ''}
    <button class="secondary" onclick="answerVocabFlashcard(${wordIdx}, false)">Повторить</button>
    <button class="primary" onclick="answerVocabFlashcard(${wordIdx}, true)">Знаю</button>
  `;
}

function answerVocabFlashcard(wordIdx, knew){
  registerWordResult(wordIdx, knew);
  currentWordPos++;
  renderVocabStep();
}

function answerVocabChoice(wordIdx, optionIdx){
  const chosen = currentChoiceOptions[optionIdx];
  const correct = currentWordSet.words[wordIdx].translation;
  const knew = chosen === correct;
  if(!knew) showToast(`Неверно. Правильный перевод: ${correct}`, 'error');
  registerWordResult(wordIdx, knew);
  currentWordPos++;
  setTimeout(renderVocabStep, knew ? 250 : 1100);
}

function registerWordResult(wordIdx, knew){
  if(knew) vocabSessionStats.correct++; else vocabSessionStats.wrong++;
  const existing = currentWordProgress.words[wordIdx] || {stage:0, correct:0, wrong:0};
  let stage = existing.stage || 0;
  stage = knew ? Math.min(stage+1, SRS_INTERVALS_DAYS.length-1) : Math.max(stage-1, 0);
  const days = SRS_INTERVALS_DAYS[stage];
  currentWordProgress.words[wordIdx] = {
    stage,
    nextReview: new Date(Date.now() + days*24*60*60*1000).toISOString(),
    correct: (existing.correct||0) + (knew?1:0),
    wrong: (existing.wrong||0) + (knew?0:1)
  };
}

async function finishVocabSession(){
  document.getElementById('vocab-play').classList.add('hidden');
  const resPanel = document.getElementById('vocab-result');
  resPanel.classList.remove('hidden');
  const total = vocabSessionStats.correct + vocabSessionStats.wrong;
  const pct = total ? Math.round(vocabSessionStats.correct/total*100) : 0;
  resPanel.innerHTML = `
    <div class="result-banner ${pct>=60?'good':'bad'}">
      <div>Сессия завершена</div>
      <div class="big">${vocabSessionStats.correct} / ${total}</div>
      <div>${pct}% правильных ответов</div>
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
  } catch(err){
    showToast('Не удалось сохранить прогресс: ' + err.message, 'error');
  }
}
