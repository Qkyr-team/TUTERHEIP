/* js/vocab/mode-fillblank.js — Режим «Заполни пропуск» */
/* --- 4.9 Заполни пропуск --- */
function buildFillBlankData(wordIdx){
  const w = currentWordSet.words[wordIdx];
  const re = new RegExp('\\b' + w.en.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\b', 'i');
  const blankedHtml = escapeHtmlAttr(w.example).replace(re, '<b style="color:var(--accent);">____</b>');
  const others = currentWordSet.words.filter((_,i)=>i!==wordIdx).map(x=>x.en);
  others.sort(()=>Math.random()-0.5);
  const options = [w.en, ...others.slice(0,3)];
  options.sort(()=>Math.random()-0.5);
  return {blankedHtml, options};
}
function answerVocabFillBlank(wordIdx, optionIdx){
  const chosen = currentChoiceOptions[optionIdx];
  const correct = currentWordSet.words[wordIdx].en;
  const knew = chosen.toLowerCase() === correct.toLowerCase();
  if(!knew) showToast(`Неверно. Правильное слово: ${correct}`, 'error');
  registerWordResult(wordIdx, knew);
  currentWordPos++;
  setTimeout(renderVocabStep, knew ? 250 : 1100);
}
