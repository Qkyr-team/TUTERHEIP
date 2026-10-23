/* js/student/render-section.js — Ученик: показ раздела теста */
function renderCurrentSection(){
  const sIdx = currentSectionQueue[currentSectionPos];
  const section = currentSections[sIdx];
  const isLast = currentSectionPos === currentSectionQueue.length - 1;

  document.getElementById('testHeader').textContent = `${currentTest.title} — ${currentEntry.studentName}`;
  document.getElementById('sectionProgress').textContent =
    `${sectionIcon(section.type)} ${section.title || sectionDefaultTitle(section.type)} · раздел ${currentSectionPos+1} из ${currentSectionQueue.length}`;

  const qWrap = document.getElementById('testQuestions');
  const nextBtn = document.getElementById('sectionNextBtn');
  nextBtn.disabled = false;
  nextBtn.textContent = isLast ? 'Завершить тест' : 'Далее';
  window.onbeforeunload = null;

  if(section.type === 'grammar' || section.type === 'vocabulary'){
    const localAnswers = new Array(section.questions.length).fill(null);
    qWrap.innerHTML = section.questions.map((q,qi)=>`
      <div class="q-block">
        <div class="q-title">${qi+1}. ${q.q}</div>
        ${q.options.map((opt,oi)=>`
          <label class="opt">
            <input type="radio" name="sq${qi}" value="${oi}" onchange="__sectionLocalAnswers[${qi}]=${oi}">
            ${opt}
          </label>
        `).join('')}
      </div>
    `).join('');
    window.__sectionLocalAnswers = localAnswers;
    nextBtn.onclick = ()=>advanceSection({ type: section.type, answers: window.__sectionLocalAnswers });

  } else if(section.type === 'reading'){
    const localAnswers = new Array(section.questions.length).fill(null);
    qWrap.innerHTML = `
      <div class="reading-layout">
        <div class="reading-text-panel">${escapeHtmlAttr(section.text)}</div>
        <div>
          ${section.questions.map((q,qi)=>`
            <div class="q-block">
              <div class="q-title">${qi+1}. ${q.q}</div>
              ${q.options.map((opt,oi)=>`
                <label class="opt">
                  <input type="radio" name="rq${qi}" value="${oi}" onchange="__sectionLocalAnswers[${qi}]=${oi}">
                  ${opt}
                </label>
              `).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    `;
    window.__sectionLocalAnswers = localAnswers;
    nextBtn.onclick = ()=>advanceSection({ type: section.type, answers: window.__sectionLocalAnswers });

  } else if(section.type === 'writing'){
    const draftKey = 'writingDraft_'+currentCode+'_'+sIdx;
    let savedDraft = '';
    try{ savedDraft = sessionStorage.getItem(draftKey) || ''; }catch(err){}
    qWrap.innerHTML = `
      <div class="q-block">
        <div class="q-title" style="white-space:pre-wrap;">${escapeHtmlAttr(section.prompt)}</div>
        <textarea id="writingAnswerInput" class="writing-textarea" placeholder="Введите ответ здесь…">${escapeHtmlAttr(savedDraft)}</textarea>
        <div id="writingWordCountBadge" class="word-count-badge">0 слов</div>
      </div>
    `;
    const textarea = document.getElementById('writingAnswerInput');
    const badge = document.getElementById('writingWordCountBadge');
    const updateCount = ()=>{
      const words = textarea.value.trim().split(/\s+/).filter(Boolean);
      const count = words.length;
      const within = count >= section.minWords && count <= section.maxWords;
      badge.textContent = `${count} слов (нужно ${section.minWords}–${section.maxWords})`;
      badge.className = 'word-count-badge ' + (count===0 ? '' : (within ? 'ok' : 'bad'));
      try{ sessionStorage.setItem(draftKey, textarea.value); }catch(err){}
      return {count, within};
    };
    textarea.addEventListener('input', updateCount);
    updateCount();
    window.onbeforeunload = function(){ return 'У вас есть незавершённое письменное задание. Точно уйти со страницы?'; };

    nextBtn.onclick = ()=>{
      const {count, within} = updateCount();
      if(count === 0){
        if(!confirm('Вы ничего не написали. Продолжить без ответа?')) return;
      } else if(!within){
        if(!confirm(`Количество слов вне лимита (${section.minWords}–${section.maxWords}). Продолжить всё равно?`)) return;
      }
      try{ sessionStorage.removeItem(draftKey); }catch(err){}
      window.onbeforeunload = null;
      advanceSection({ type:'writing', text: textarea.value.trim(), wordCount: count, withinLimits: within });
    };
  }
}
