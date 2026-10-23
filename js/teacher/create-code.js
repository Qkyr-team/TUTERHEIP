/* js/teacher/create-code.js — Создание кода доступа для ученика */
async function generateUniqueCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code, exists = true;
  while(exists){
    code = Array.from({length:6}, ()=>chars[Math.floor(Math.random()*chars.length)]).join('');
    const snap = await db.collection('codes').doc(code).get();
    exists = snap.exists;
  }
  return code;
}

async function createCode(){
  if(!FIREBASE_CONFIGURED){ alert('Сначала подключите базу данных Firebase (см. инструкцию в чате).'); return; }
  if(!auth.currentUser){ alert('Сначала войдите в свой кабинет.'); return; }

  // Критическая проверка: Student не может создавать teacher-коды даже
  // при прямом вызове функции или обходе интерфейса.
  if(!(await getTeacherAccess())){
    alert('Доступ запрещён. Эта функция доступна только репетитору.');
    show('view-home');
    selectRole('student');
    return;
  }

  const testId = document.getElementById('tCourse').value;
  const name = document.getElementById('tName').value.trim();
  if(!testId){ alert('Выберите тест — сейчас нет подходящего теста под выбранные учебник/уровень.'); return; }
  if(!name){ alert('Введите фамилию и имя ученика'); return; }
  const btn = event.target;
  btn.disabled = true; btn.textContent = 'Создаю…';
  try{
    const test = findTest(testId);
    const sections = getTestSections(test);
    const selectedSections = getSelectedTeacherSections(test);
    const total = countAutoGradedQuestions(selectedSections.map(idx=>sections[idx]));
    const code = await generateUniqueCode();
    await saveCode(code, {
      code, studentName: name, testId, testTitle: test.title,
      testBook: test.book || null, testLevel: test.level || null, testTopic: test.topic || null,
      teacherId: auth.currentUser.uid, selectedSections,
      status: 'pending', answers: null, score: null, total,
      createdAt: new Date().toISOString(), completedAt: null
    });
    document.getElementById('codeValue').textContent = code;
    document.getElementById('codeMeta').textContent = `${name} · ${test.title}`;
    document.getElementById('codeResult').classList.remove('hidden');
    document.getElementById('tName').value = '';
  } catch(err){
    alert('Не удалось создать код. Проверьте настройки Firebase и подключение к интернету.\n' + err.message);
  } finally{
    btn.disabled = false; btn.textContent = '🔗 Сгенерировать код';
  }
}
