/* js/core/data-access.js — Поиск теста и работа с кодами в базе */
function findTest(testId){ return allTests().find(t=>t.id===testId); }

async function fetchCode(code){
  const snap = await db.collection('codes').doc(code).get();
  return snap.exists ? snap.data() : null;
}
async function saveCode(code, data){
  await db.collection('codes').doc(code).set(data);
}
async function updateCode(code, data){
  await db.collection('codes').doc(code).update(data);
}
async function fetchAllCodes(){
  const uid = auth.currentUser.uid;
  const snap = await db.collection('codes').where('teacherId','==',uid).get();
  const rows = snap.docs.map(d=>d.data());
  rows.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
  return rows;
}
