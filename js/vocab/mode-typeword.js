/* js/vocab/mode-typeword.js — Режим «Напечатай слово» */
/* --- 4.11 Напечатай слово --- */
function answerVocabTypeWord(wordIdx){
  const input = document.getElementById('typeWordInput');
  const feedback = document.getElementById('typeWordFeedback');
  const w = currentWordSet.words[wordIdx];
  const given = (input.value || '').trim().toLowerCase();
  const correct = w.en.trim().toLowerCase();
  const knew = given.length > 0 && given === correct;
  feedback.innerHTML = knew
    ? `<span style="color:var(--green);">Верно!</span>`
    : `<span style="color:var(--red);">Правильное слово: ${escapeHtmlAttr(w.en)}</span>`;
  input.disabled = true;
  registerWordResult(wordIdx, knew);
  currentWordPos++;
  setTimeout(renderVocabStep, knew ? 400 : 1400);
}
