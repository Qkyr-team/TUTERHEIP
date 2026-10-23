/* js/vocab/mode-scramble.js — Режим «Собери слово» */
/* --- 4.6 Собери слово --- */
let scrambleLetters = [];
let scrambleUsed = [];
let scrambleAnswer = '';

function initScrambleStep(wordIdx){
  const w = currentWordSet.words[wordIdx];
  const letters = w.en.split('');
  do { letters.sort(()=>Math.random()-0.5); } while(letters.join('') === w.en && letters.length > 1);
  scrambleLetters = letters;
  scrambleUsed = new Array(letters.length).fill(false);
  scrambleAnswer = '';
  renderScrambleArea(wordIdx);
}

function renderScrambleArea(wordIdx){
  const w = currentWordSet.words[wordIdx];
  const area = document.getElementById('vocabPlayArea');
  area.innerHTML = `
    <div class="q-block" style="text-align:center;">
      <div style="font-size:20px;color:var(--accent);margin-bottom:4px;">${escapeHtmlAttr(w.translation)}</div>
      <p class="hint" style="margin-bottom:10px;">Соберите слово из букв</p>
      <div class="scramble-answer" id="scrambleAnswerLine">${scrambleAnswer.split('').join(' ') || '&nbsp;'}</div>
      <div class="scramble-letters" id="scrambleLettersWrap">
        ${scrambleLetters.map((l,i)=>`<button class="scramble-letter" id="scrLetter_${i}" onclick="pickScrambleLetter(${wordIdx}, ${i})" ${scrambleUsed[i]?'disabled':''}>${escapeHtmlAttr(l)}</button>`).join('')}
      </div>
      <button class="secondary small" onclick="clearScrambleAnswer(${wordIdx})">Стереть</button>
      <button class="primary small" onclick="checkScrambleAnswer(${wordIdx})">Проверить</button>
    </div>
  `;
}

function pickScrambleLetter(wordIdx, letterIdx){
  if(scrambleUsed[letterIdx]) return;
  scrambleUsed[letterIdx] = true;
  scrambleAnswer += scrambleLetters[letterIdx];
  renderScrambleArea(wordIdx);
}

function clearScrambleAnswer(wordIdx){
  scrambleUsed = new Array(scrambleLetters.length).fill(false);
  scrambleAnswer = '';
  renderScrambleArea(wordIdx);
}

function checkScrambleAnswer(wordIdx){
  const w = currentWordSet.words[wordIdx];
  const knew = scrambleAnswer.toLowerCase() === w.en.toLowerCase();
  if(!knew) showToast(`Неверно. Правильное слово: ${w.en}`, 'error');
  registerWordResult(wordIdx, knew);
  currentWordPos++;
  setTimeout(renderVocabStep, knew ? 350 : 1300);
}
