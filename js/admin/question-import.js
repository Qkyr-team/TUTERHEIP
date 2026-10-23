/* js/admin/question-import.js — Админ: импорт вопросов из текста */
/* ---------------------------------------------------------
   ИМПОРТ ВОПРОСОВ
   parseQuestionsText() разбирает конкретно текстовый формат
   QUESTION/A/B/C/D/ANSWER и не привязан к конкретной секции —
   на эту же функцию в будущем можно завести парсеры Excel/Word/ИИ,
   результат у них у всех один и тот же: {q, options[4], correct}.
--------------------------------------------------------- */
function parseQuestionsText(raw){
  const questions = [];
  const errors = [];
  const blocks = raw.split(/\n?QUESTION:\s*\n?/i).map(b=>b.trim()).filter(Boolean);
  const letterMap = {A:0,B:1,C:2,D:3};

  blocks.forEach((block, idx)=>{
    const qNum = idx+1;
    const m = block.match(/^([\s\S]*?)\n?A:\s*\n?([\s\S]*?)\n?B:\s*\n?([\s\S]*?)\n?C:\s*\n?([\s\S]*?)\n?D:\s*\n?([\s\S]*?)\n?ANSWER:\s*\n?([\s\S]*)$/i);
    if(!m){
      errors.push(`Вопрос ${qNum}: не распознан формат (нужны A:, B:, C:, D:, ANSWER:).`);
      return;
    }
    const qText = m[1].trim();
    const options = [m[2].trim(), m[3].trim(), m[4].trim(), m[5].trim()];
    const answerLetter = m[6].trim().split('\n')[0].trim().toUpperCase();

    if(!qText){ errors.push(`Вопрос ${qNum}: пустой текст вопроса.`); return; }
    if(options.some(o=>!o)){ errors.push(`Вопрос ${qNum}: заполнены не все варианты ответа.`); return; }
    if(!(answerLetter in letterMap)){ errors.push(`Вопрос ${qNum}: не найден корректный ответ (ожидается A, B, C или D).`); return; }

    questions.push({ q: qText, options, correct: letterMap[answerLetter] });
  });

  return { questions, errors };
}

function runSectionImport(sid){
  const sectionBlock = document.querySelector(`.admin-section-block[data-section-id="${sid}"]`);
  if(!sectionBlock) return;
  const panel = sectionBlock.querySelector('.section-import-panel');
  const textarea = panel.querySelector('.sectionImportText');
  const errEl = panel.querySelector('.section-import-error');
  errEl.textContent = '';
  const raw = textarea.value;
  if(!raw.trim()){ errEl.textContent = 'Вставьте текст с вопросами.'; return; }

  const { questions, errors } = parseQuestionsText(raw);
  if(!questions.length){
    errEl.textContent = 'Не удалось распознать ни одного вопроса. ' + (errors[0] || '');
    return;
  }
  const container = sectionBlock.querySelector('.q-block-container');
  questions.forEach(q => addAdminQuestionBlockTo(container, q));

  errEl.textContent = errors.length
    ? `Добавлено ${questions.length} вопрос(ов). Пропущено с ошибками (${errors.length}).`
    : `Добавлено ${questions.length} вопрос(ов).`;
  textarea.value = '';
}
