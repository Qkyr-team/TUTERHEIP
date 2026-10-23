/* js/teacher/results.js — Вкладка «Результаты» */
/* ---------------------------------------------------------
   ТЕАЧЕР: таблица результатов
--------------------------------------------------------- */
let cachedEntries = [];

async function renderResultsTable(){
  const wrap = document.getElementById('resultsTableWrap');
  if(!FIREBASE_CONFIGURED){
    wrap.innerHTML = '<p class="empty-note">Подключите базу данных Firebase, чтобы видеть результаты.</p>';
    return;
  }
  wrap.innerHTML = '<p class="empty-note">Загрузка…</p>';
  let entries;
  try{
    entries = await fetchAllCodes();
  } catch(err){
    wrap.innerHTML = '<p class="empty-note">Не удалось загрузить данные. Проверьте интернет и настройки Firebase.</p>';
    return;
  }
  cachedEntries = entries;
  if(!entries.length){
    wrap.innerHTML = '<p class="empty-note">Пока нет ни одного созданного кода.</p>';
    return;
  }
  let rows = entries.map((e,i)=>{
    const statusHtml = e.status==='done'
      ? `<span class="status-pill status-done">пройден</span>`
      : `<span class="status-pill status-pending">ожидание</span>`;
    const scoreHtml = e.status==='done'
      ? `<span class="${e.score===e.total?'score-good':(e.score/e.total<0.5?'score-bad':'')}">${e.score} / ${e.total}</span>`
      : '—';
    return `
      <tr class="row-toggle" onclick="toggleDetail(${i})">
        <td>${e.studentName}</td>
        <td>${e.testTitle}</td>
        <td><span style="font-family:var(--mono)">${e.code}</span></td>
        <td>${statusHtml}</td>
        <td>${scoreHtml}</td>
        <td>${new Date(e.createdAt).toLocaleDateString('ru-RU')}</td>
      </tr>
      <tr class="expand-row hidden" id="detail-${i}"><td colspan="6">${renderDetail(e)}</td></tr>
    `;
  }).join('');
  wrap.innerHTML = `
    <table>
      <thead><tr><th>Ученик</th><th>Тест</th><th>Код</th><th>Статус</th><th>Результат</th><th>Дата</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  focusPendingResult();
}
function toggleDetail(i){
  document.getElementById('detail-'+i).classList.toggle('hidden');
}
function renderDetail(e){
  if(e.status!=='done') return '<p class="empty-note">Ученик ещё не прошёл тест.</p>';
  const test = findTest(e.testId);

  if(e.sectionAnswers && e.sectionAnswers.length){
    return e.sectionAnswers.map((rec, pos)=>{
      const section = test ? getTestSections(test)[rec.sectionIndex] : null;
      if(rec.type === 'writing'){
        return renderWritingReviewBlock(e, rec, pos, section);
      }
      if(!section){
        return `<p class="empty-note">${rec.title || rec.type}: исходный тест изменён, детали недоступны.</p>`;
      }
      const qHtml = section.questions.map((q,i)=>{
        const ans = rec.answers[i];
        const ok = ans === q.correct;
        return `<div class="detail-q ${ok?'detail-ok':'detail-bad'}">
          <b>${i+1}. ${q.q}</b><br>
          Ответ ученика: ${ans!=null?q.options[ans]:'нет ответа'} ${ok?'✓':'✗'}
          ${!ok?`<br>Правильный ответ: ${q.options[q.correct]}`:''}
        </div>`;
      }).join('');
      return `<h4 style="font-family:var(--serif);margin:14px 0 8px;">${sectionIcon(rec.type)} ${rec.title || sectionDefaultTitle(rec.type)} — ${rec.score}/${rec.total}</h4>${qHtml}`;
    }).join('');
  }

  // Старый формат (плоский список вопросов) — для результатов, сохранённых до появления секций
  if(!test || !test.questions) return '<p class="empty-note">Исходный тест недоступен.</p>';
  return test.questions.map((q,i)=>{
    const ans = e.answers[i];
    const ok = ans===q.correct;
    return `<div class="detail-q ${ok?'detail-ok':'detail-bad'}">
      <b>${i+1}. ${q.q}</b><br>
      Ответ ученика: ${ans!=null?q.options[ans]:'нет ответа'} ${ok?'✓':'✗'}
      ${!ok?`<br>Правильный ответ: ${q.options[q.correct]}`:''}
    </div>`;
  }).join('');
}

function renderWritingReviewBlock(e, rec, pos, section){
  const review = (e.writingReviews && e.writingReviews[pos]) || null;
  const criteria = section && section.criteria && section.criteria.length ? section.criteria.join(', ') : '';
  return `
    <div class="q-block" style="margin-top:14px;">
      <div class="q-title">✍️ ${rec.title || 'Writing'} ${rec.wordCount!=null ? `— ${rec.wordCount} слов` : ''}
        ${rec.withinLimits===false ? '<span style="color:var(--red);"> (вне лимита слов)</span>' : ''}
      </div>
      ${section ? `<p class="hint" style="margin-bottom:8px;">Задание: ${escapeHtmlAttr(section.prompt)}${criteria?` · Критерии: ${escapeHtmlAttr(criteria)}`:''}</p>` : ''}
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;white-space:pre-wrap;font-size:13.5px;margin-bottom:10px;">${escapeHtmlAttr(rec.text || '(пусто)')}</div>
      <label>Оценка (0–100)</label>
      <input type="number" min="0" max="100" id="wrScore_${e.code}_${pos}" value="${review && review.score!=null ? review.score : ''}">
      <label>Комментарий</label>
      <input type="text" id="wrComment_${e.code}_${pos}" value="${review ? escapeHtmlAttr(review.comment) : ''}" placeholder="Комментарий для ученика">
      <button class="secondary small" style="margin-top:8px;" onclick="saveWritingReview('${e.code}', ${pos})">Сохранить оценку</button>
      ${review ? `<p class="hint">Проверено ${new Date(review.reviewedAt).toLocaleString('ru-RU')}</p>` : '<p class="hint">Ещё не проверено репетитором</p>'}
    </div>
  `;
}

async function saveWritingReview(code, pos){
  const scoreInput = document.getElementById(`wrScore_${code}_${pos}`);
  const commentInput = document.getElementById(`wrComment_${code}_${pos}`);
  const score = scoreInput.value === '' ? null : Math.max(0, Math.min(100, parseInt(scoreInput.value,10)));
  const comment = commentInput.value.trim();
  try{
    const snap = await db.collection('codes').doc(code).get();
    const data = snap.data();
    const writingReviews = data.writingReviews || {};
    writingReviews[pos] = { score, comment, reviewedAt: new Date().toISOString() };
    await db.collection('codes').doc(code).update({ writingReviews });
    showToast('Оценка сохранена');
  } catch(err){
    showToast('Не удалось сохранить оценку: ' + err.message, 'error');
  }
}
