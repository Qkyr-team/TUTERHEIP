/* js/student/finish-test.js — Ученик: переход между разделами и завершение теста */
function advanceSection(answerRecord){
  sectionAnswers[currentSectionPos] = answerRecord;
  if(currentSectionPos < currentSectionQueue.length - 1){
    currentSectionPos++;
    renderCurrentSection();
    window.scrollTo({top:0, behavior:'smooth'});
  } else {
    finishTest();
  }
}

async function finishTest(){
  const nextBtn = document.getElementById('sectionNextBtn');
  nextBtn.disabled = true; nextBtn.textContent = 'Отправляю…';
  try{
    let score = 0, total = 0;
    const richSections = currentSectionQueue.map((sIdx, pos)=>{
      const section = currentSections[sIdx];
      const record = sectionAnswers[pos];
      if(section.type === 'writing'){
        return { sectionIndex: sIdx, type:'writing', title: section.title,
          text: record.text, wordCount: record.wordCount, withinLimits: record.withinLimits };
      }
      const answers = record.answers;
      let sectionScore = 0;
      section.questions.forEach((q,qi)=>{ if(answers[qi]===q.correct) sectionScore++; });
      score += sectionScore; total += section.questions.length;
      return { sectionIndex: sIdx, type: section.type, title: section.title, answers, score: sectionScore, total: section.questions.length };
    });

    const hasWriting = richSections.some(s=>s.type==='writing');
    const updateData = {
      status: 'done',
      sectionAnswers: richSections,
      score, total,
      needsReview: hasWriting,
      completedAt: new Date().toISOString()
    };
    if(FIREBASE_CONFIGURED && auth.currentUser){
      updateData.studentUid = auth.currentUser.uid;
    }
    await updateCode(currentCode, updateData);

    document.getElementById('student-test').classList.add('hidden');
    const resPanel = document.getElementById('student-result');
    resPanel.classList.remove('hidden');
    const hasAutoGraded = total > 0;
    const good = hasAutoGraded ? (score/total >= 0.6) : true;
    resPanel.innerHTML = `
      <div class="result-banner ${good?'good':'bad'}">
        <div>${currentEntry.studentName}, тест завершён</div>
        ${hasAutoGraded ? `<div class="big">${score} / ${total}</div>` : `<div class="big">Готово</div>`}
        ${hasWriting ? `<div>Письменная часть будет проверена репетитором.</div>` : ''}
        <div>Результаты отправлены вашему репетитору.</div>
      </div>
      <button class="secondary" onclick="goHome()">Готово</button>
    `;
    showToast('Тест отправлен репетитору');
  } catch(e3){
    showToast('Не удалось отправить результат. Проверьте интернет-соединение.', 'error');
    nextBtn.disabled = false; nextBtn.textContent = 'Завершить тест';
  }
}
