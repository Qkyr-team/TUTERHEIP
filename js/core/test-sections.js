/* js/core/test-sections.js — Разделы теста: иконки, названия, подсчёт вопросов */
/* ---------------------------------------------------------
   МОДУЛЬНЫЕ СЕКЦИИ ТЕСТА (Grammar/Vocabulary/Reading/Writing)
   Старые тесты (плоский questions[]) автоматически оборачиваются
   в одну секцию Grammar — ничего из старых тестов не ломается.
--------------------------------------------------------- */
function getTestSections(test){
  if(test.sections && test.sections.length) return test.sections;
  return [{ type:'grammar', title: test.title || 'Вопросы', questions: test.questions || [] }];
}
function sectionIcon(type){ return {grammar:'📘', vocabulary:'🔤', reading:'📖', writing:'✍️'}[type] || '📄'; }
function sectionDefaultTitle(type){ return {grammar:'Grammar', vocabulary:'Vocabulary', reading:'Reading', writing:'Writing'}[type] || 'Section'; }
function sectionQuestionCount(section){
  if(section.type === 'writing') return null;
  return (section.questions || []).length;
}
function countAutoGradedQuestions(sections){
  return sections.filter(s=>s.type!=='writing').reduce((sum,s)=>sum+(s.questions?s.questions.length:0),0);
}
