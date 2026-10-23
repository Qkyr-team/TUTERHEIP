/* js/vocab/mode-truefalse.js — Режим «Правда или ложь» */
/* --- 4.8 Правда или ложь --- */
let currentTrueFalseAnswer = true;
function buildTrueFalseData(wordIdx){
  const w = currentWordSet.words[wordIdx];
  const isTrue = Math.random() < 0.5;
  if(isTrue) return {isTrue:true, shownTranslation: w.translation};
  const others = currentWordSet.words.filter((_,i)=>i!==wordIdx).map(x=>x.translation);
  const fake = others.length ? others[Math.floor(Math.random()*others.length)] : w.translation;
  return {isTrue: fake === w.translation, shownTranslation: fake};
}
function answerVocabTrueFalse(wordIdx, choseTrue){
  const knew = choseTrue === currentTrueFalseAnswer;
  if(!knew) showToast(`Неверно. Правильный перевод: ${currentWordSet.words[wordIdx].translation}`, 'error');
  registerWordResult(wordIdx, knew);
  currentWordPos++;
  setTimeout(renderVocabStep, knew ? 250 : 1100);
}
