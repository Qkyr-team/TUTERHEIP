/* js/admin/question-blocks.js — Админ: блок вопроса в конструкторе теста */
/* --- Банк тестов --- */
let adminAllCustomTests = [];
let adminQCounter = 0;

function escapeHtmlAttr(str){
  return String(str==null?'':str)
    .replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function addAdminQuestionBlockTo(containerEl, prefill){
  adminQCounter++;
  const qid = 'q'+adminQCounter+'_'+Date.now();
  const div = document.createElement('div');
  div.className = 'q-block';
  div.dataset.qid = qid;
  const qVal = prefill ? escapeHtmlAttr(prefill.q) : '';
  const opts = prefill && prefill.options ? prefill.options : ['','','',''];
  const correctIdx = prefill && Number.isInteger(prefill.correct) ? prefill.correct : 0;
  div.innerHTML = `
    <label>Вопрос</label>
    <input type="text" class="adminQText" placeholder="Текст вопроса" value="${qVal}">
    <label>Варианты ответа (отметьте правильный)</label>
    ${[0,1,2,3].map(i=>`
      <div class="opt">
        <input type="radio" name="correct-${qid}" value="${i}" ${i===correctIdx?'checked':''}>
        <input type="text" class="adminOpt" placeholder="Вариант ${i+1}" style="flex:1;" value="${escapeHtmlAttr(opts[i])}">
      </div>
    `).join('')}
    <button class="secondary small" style="margin-top:8px;" onclick="this.closest('.q-block').remove()">Удалить вопрос</button>
  `;
  containerEl.appendChild(div);
  return div;
}
