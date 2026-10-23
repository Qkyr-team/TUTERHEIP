/* js/admin/test-sections.js — Админ: разделы теста (Grammar, Vocabulary, Reading, Writing) */
/* ---------------------------------------------------------
   СЕКЦИИ ТЕСТА (админ-конструктор)
   addAdminSection() создаёт блок нужного типа, при желании
   сразу заполненный (prefillSection) — используется и при
   "+ Grammar/Vocabulary/Reading/Writing", и при редактировании.
--------------------------------------------------------- */
let adminSectionCounter = 0;

function addAdminSection(type, prefillSection){
  adminSectionCounter++;
  const sid = 'sec'+adminSectionCounter+'_'+Date.now();
  const wrap = document.getElementById('adminSectionsWrap');
  const div = document.createElement('div');
  div.className = 'admin-section-block';
  div.dataset.sectionId = sid;
  div.dataset.sectionType = type;

  const titleVal = prefillSection ? escapeHtmlAttr(prefillSection.title || sectionDefaultTitle(type)) : sectionDefaultTitle(type);
  let bodyHtml = '';

  if(type === 'grammar' || type === 'vocabulary'){
    bodyHtml = `
      <div class="q-block-container"></div>
      <button class="secondary small" onclick="addAdminQuestionBlockTo(this.previousElementSibling)">+ Добавить вопрос</button>
      <button class="secondary small" onclick="toggleSectionImport('${sid}')">📥 Импорт вопросов</button>
      ${sectionImportPanelHtml(sid)}
    `;
  } else if(type === 'reading'){
    bodyHtml = `
      <label>Текст для чтения</label>
      <textarea class="readingTextInput" rows="6" placeholder="Вставьте текст, который будут читать ученики"></textarea>
      <label style="margin-top:10px;">Вопросы к тексту</label>
      <div class="q-block-container"></div>
      <button class="secondary small" onclick="addAdminQuestionBlockTo(this.previousElementSibling)">+ Добавить вопрос</button>
      <button class="secondary small" onclick="toggleSectionImport('${sid}')">📥 Импорт вопросов</button>
      ${sectionImportPanelHtml(sid)}
    `;
  } else if(type === 'writing'){
    bodyHtml = `
      <label>Задание</label>
      <textarea class="writingPromptInput" rows="4" placeholder="Write an email to your friend. Include: greeting, what you did, where you are, goodbye."></textarea>
      <div style="display:flex;gap:10px;">
        <div style="flex:1;"><label>Мин. слов</label><input type="number" class="writingMinWords" value="40"></div>
        <div style="flex:1;"><label>Макс. слов</label><input type="number" class="writingMaxWords" value="60"></div>
      </div>
      <label>Критерии проверки (через запятую)</label>
      <input type="text" class="writingCriteria" placeholder="Grammar, Vocabulary, Task Completion, Spelling, Punctuation">
      <p class="hint">Письменные ответы не проверяются автоматически (для настоящей проверки грамматики/лексики нейросетью нужен отдельный сервер с ИИ, которого пока нет) — репетитор читает ответ и сам выставляет оценку во вкладке «Результаты».</p>
    `;
  }

  div.innerHTML = `
    <div class="section-block-head">
      <span class="section-type-badge">${sectionIcon(type)} ${type.toUpperCase()}</span>
      <input type="text" class="sectionTitleInput" placeholder="Название секции" value="${titleVal}">
      <button class="secondary small" onclick="this.closest('.admin-section-block').remove()">✕ Удалить секцию</button>
    </div>
    ${bodyHtml}
  `;
  wrap.appendChild(div);

  if(prefillSection){
    if(type === 'grammar' || type === 'vocabulary' || type === 'reading'){
      const container = div.querySelector('.q-block-container');
      (prefillSection.questions || []).forEach(q => addAdminQuestionBlockTo(container, q));
      if(type === 'reading') div.querySelector('.readingTextInput').value = prefillSection.text || '';
    } else if(type === 'writing'){
      div.querySelector('.writingPromptInput').value = prefillSection.prompt || '';
      div.querySelector('.writingMinWords').value = prefillSection.minWords || 40;
      div.querySelector('.writingMaxWords').value = prefillSection.maxWords || 60;
      div.querySelector('.writingCriteria').value = (prefillSection.criteria || []).join(', ');
    }
  }
  return div;
}

function sectionImportPanelHtml(sid){
  return `
    <div class="section-import-panel hidden" data-import-for="${sid}" style="margin-top:10px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;">
      <p class="hint" style="margin:0 0 8px;">
        Формат: <code>QUESTION:</code> текст, затем <code>A:</code> <code>B:</code> <code>C:</code> <code>D:</code> варианты, затем <code>ANSWER:</code> буква. Между вопросами — пустая строка.
      </p>
      <textarea class="sectionImportText" rows="8" placeholder="QUESTION:&#10;She ___ to school every day.&#10;&#10;A:&#10;go&#10;&#10;B:&#10;goes&#10;&#10;C:&#10;going&#10;&#10;D:&#10;gone&#10;&#10;ANSWER:&#10;B"
        style="width:100%;background:var(--bg-panel);border:1px solid var(--border);color:var(--ink);border-radius:7px;padding:8px;font-family:var(--mono);font-size:12px;"></textarea>
      <div style="margin-top:8px;">
        <button class="primary small" onclick="runSectionImport('${sid}')">Разобрать и добавить</button>
        <button class="secondary small" onclick="toggleSectionImport('${sid}')">Отмена</button>
      </div>
      <p class="hint section-import-error"></p>
    </div>`;
}

function toggleSectionImport(sid){
  const panel = document.querySelector(`.section-import-panel[data-import-for="${sid}"]`);
  if(panel) panel.classList.toggle('hidden');
}
