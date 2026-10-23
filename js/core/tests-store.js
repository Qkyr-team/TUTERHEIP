/* js/core/tests-store.js — Хранилище тестов (загрузка, кэш, сортировка) */
/* ---------------------------------------------------------
   2) ТЕСТЫ
   Список пуст: в кабинете репетитора показываются только тесты,
   созданные через админ-панель (хранятся в Firestore, коллекция "tests").
--------------------------------------------------------- */
const DEFAULT_TESTS = [];

let customTests = [];
let customTestsPromise = null;
function ensureCustomTestsLoaded(){
  if(!FIREBASE_CONFIGURED) return Promise.resolve([]);
  if(!customTestsPromise){
    customTestsPromise = db.collection('tests').get().then(snap=>{
      customTests = snap.docs.map(d=>({id:d.id, ...d.data()}));
      return customTests;
    }).catch(()=>{ customTestsPromise = null; return []; });
  }
  return customTestsPromise;
}
function invalidateCustomTestsCache(){ customTestsPromise = null; }
function allTests(){ return [...DEFAULT_TESTS, ...customTests]; }
function sortTestsNaturally(arr){
  return [...arr].sort((a,b)=> a.title.localeCompare(b.title, 'ru', {numeric:true, sensitivity:'base'}));
}
