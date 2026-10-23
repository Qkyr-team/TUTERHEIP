/* js/vocab/mode-oddoneout.js — Режим «Найди лишнее» */
/* --- 4.12 Найди лишнее --- */
let currentOddOneOutData = null;
function buildOddOneOutData(wordIdx){
  const w = currentWordSet.words[wordIdx];
  const sameSetOthers = currentWordSet.words.filter((_,i)=>i!==wordIdx).map(x=>x.en);
  sameSetOthers.sort(()=>Math.random()-0.5);
  const sameThree = [w.en, ...sameSetOthers.slice(0,2)];

  const otherSets = cachedStudentWordSets.filter(s=>s.id !== currentWordSet.id && s.words && s.words.length);
  const donorSet = otherSets[Math.floor(Math.random()*otherSets.length)];
  const oddWord = donorSet.words[Math.floor(Math.random()*donorSet.words.length)].en;

  const words = [...sameThree, oddWord];
  words.sort(()=>Math.random()-0.5);
  return {words, oddWord};
}
function answerVocabOddOneOut(wordIdx, optionIdx){
  const chosen = currentOddOneOutData.words[optionIdx];
  const knew = chosen === currentOddOneOutData.oddWord;
  if(!knew) showToast(`Не совсем. Лишнее слово было: ${currentOddOneOutData.oddWord}`, 'error');
  registerWordResult(wordIdx, knew);
  currentWordPos++;
  setTimeout(renderVocabStep, knew ? 250 : 1100);
}
