/* js/vocab/render-step.js — Лексика: показ шага, выбор ответа, заучивание */
let currentChoiceOptions = [];

function renderVocabStep(){
  if(currentWordPos >= currentWordQueue.length){
    finishVocabSession();
    return;
  }
  document.getElementById('vocabProgressLine').textContent = `Слово ${currentWordPos+1} из ${currentWordQueue.length}`;
  const wordIdx = currentWordQueue[currentWordPos];
  const w = currentWordSet.words[wordIdx];
  const area = document.getElementById('vocabPlayArea');

  if(currentVocabMode === 'flashcards'){
    area.innerHTML = `
      <div class="q-block" style="text-align:center;">
        <div style="font-family:var(--serif);font-size:26px;margin-bottom:6px;">${escapeHtmlAttr(w.en)}</div>
        ${w.transcription ? `<div style="color:var(--ink-dim);margin-bottom:10px;">[${escapeHtmlAttr(w.transcription)}]</div>` : ''}
        <button class="secondary small" onclick="speakCurrentWord()">🔊 Озвучить</button>
        <div id="flipArea" style="margin-top:18px;">
          <button class="primary" onclick="revealFlashcard()">Показать перевод</button>
        </div>
      </div>
    `;
  } else if(currentVocabMode === 'choice'){
    const options = buildChoiceOptions(wordIdx);
    currentChoiceOptions = options;
    area.innerHTML = `
      <div class="q-block" style="text-align:center;">
        <div style="font-family:var(--serif);font-size:24px;margin-bottom:14px;">${escapeHtmlAttr(w.en)}</div>
        ${options.map((opt,oi)=>`<button class="secondary" style="width:100%;margin-bottom:8px;"
          onclick="answerVocabChoice(${wordIdx}, ${oi})">${escapeHtmlAttr(opt)}</button>`).join('')}
      </div>
    `;

  } else if(currentVocabMode === 'learn'){
    area.innerHTML = `
      <div class="q-block" style="text-align:center;">
        <div style="font-family:var(--serif);font-size:24px;margin-bottom:14px;">${escapeHtmlAttr(w.en)}</div>
        <input type="text" id="learnAnswerInput" placeholder="Введите перевод" style="text-align:center;" autocomplete="off">
        <button class="primary" style="margin-top:12px;" onclick="answerVocabLearn(${wordIdx})">Проверить</button>
        <div id="learnFeedback" style="margin-top:10px;"></div>
      </div>
    `;
    setTimeout(()=>{ const inp = document.getElementById('learnAnswerInput'); if(inp) inp.focus(); }, 50);

  } else if(currentVocabMode === 'truefalse'){
    const tf = buildTrueFalseData(wordIdx);
    currentTrueFalseAnswer = tf.isTrue;
    area.innerHTML = `
      <div class="q-block" style="text-align:center;">
        <div style="font-family:var(--serif);font-size:24px;margin-bottom:6px;">${escapeHtmlAttr(w.en)}</div>
        <div style="font-size:18px;color:var(--accent);margin-bottom:16px;">${escapeHtmlAttr(tf.shownTranslation)}</div>
        <button class="secondary" style="width:48%;margin-right:4%;" onclick="answerVocabTrueFalse(${wordIdx}, true)">✅ Правда</button>
        <button class="secondary" style="width:48%;" onclick="answerVocabTrueFalse(${wordIdx}, false)">❌ Ложь</button>
      </div>
    `;

  } else if(currentVocabMode === 'fillblank'){
    const fb = buildFillBlankData(wordIdx);
    currentChoiceOptions = fb.options;
    area.innerHTML = `
      <div class="q-block" style="text-align:center;">
        <div style="font-size:16px;line-height:1.6;margin-bottom:14px;">${fb.blankedHtml}</div>
        ${fb.options.map((opt,oi)=>`<button class="secondary" style="width:100%;margin-bottom:8px;"
          onclick="answerVocabFillBlank(${wordIdx}, ${oi})">${escapeHtmlAttr(opt)}</button>`).join('')}
      </div>
    `;

  } else if(currentVocabMode === 'typeword'){
    area.innerHTML = `
      <div class="q-block" style="text-align:center;">
        <div style="font-size:20px;color:var(--accent);margin-bottom:14px;">${escapeHtmlAttr(w.translation)}</div>
        <input type="text" id="typeWordInput" placeholder="Напишите слово на английском" style="text-align:center;" autocomplete="off">
        <button class="primary" style="margin-top:12px;" onclick="answerVocabTypeWord(${wordIdx})">Проверить</button>
        <div id="typeWordFeedback" style="margin-top:10px;"></div>
      </div>
    `;
    setTimeout(()=>{ const inp = document.getElementById('typeWordInput'); if(inp) inp.focus(); }, 50);

  } else if(currentVocabMode === 'oddoneout'){
    const ood = buildOddOneOutData(wordIdx);
    currentOddOneOutData = ood;
    area.innerHTML = `
      <div class="q-block" style="text-align:center;">
        <p class="hint" style="margin-bottom:12px;">Найдите слово, которое не относится к теме «${escapeHtmlAttr(currentWordSet.topic || currentWordSet.title)}»</p>
        ${ood.words.map((word,oi)=>`<button class="secondary" style="width:100%;margin-bottom:8px;"
          onclick="answerVocabOddOneOut(${wordIdx}, ${oi})">${escapeHtmlAttr(word)}</button>`).join('')}
      </div>
    `;

  } else if(currentVocabMode === 'scramble'){
    initScrambleStep(wordIdx);

  } else if(currentVocabMode === 'listen'){
    const options = buildChoiceOptions(wordIdx);
    currentChoiceOptions = options;
    area.innerHTML = `
      <div class="q-block" style="text-align:center;">
        <button class="primary" onclick="speakCurrentWord()">🔊 Прослушать слово</button>
        <div style="margin-top:16px;">
          ${options.map((opt,oi)=>`<button class="secondary" style="width:100%;margin-bottom:8px;"
            onclick="answerVocabChoice(${wordIdx}, ${oi})">${escapeHtmlAttr(opt)}</button>`).join('')}
        </div>
      </div>
    `;
    setTimeout(speakCurrentWord, 300);
  }
}

function buildChoiceOptions(correctIdx){
  const correct = currentWordSet.words[correctIdx].translation;
  const others = currentWordSet.words.filter((_,i)=>i!==correctIdx).map(w=>w.translation);
  others.sort(()=>Math.random()-0.5);
  const opts = [correct, ...others.slice(0,3)];
  opts.sort(()=>Math.random()-0.5);
  return opts;
}

/* --- 4.2 Заучивание (ввод перевода) --- */
function answerVocabLearn(wordIdx){
  const input = document.getElementById('learnAnswerInput');
  const feedback = document.getElementById('learnFeedback');
  const w = currentWordSet.words[wordIdx];
  const given = (input.value || '').trim().toLowerCase();
  const correct = w.translation.trim().toLowerCase();
  const knew = given.length > 0 && given === correct;
  feedback.innerHTML = knew
    ? `<span style="color:var(--green);">Верно!</span>`
    : `<span style="color:var(--red);">Правильный перевод: ${escapeHtmlAttr(w.translation)}</span>`;
  input.disabled = true;
  registerWordResult(wordIdx, knew);
  currentWordPos++;
  setTimeout(renderVocabStep, knew ? 400 : 1400);
}
