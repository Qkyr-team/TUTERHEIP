/* js/core/firebase-init.js — Подключение к Firebase */
const FIREBASE_CONFIGURED = firebaseConfig.apiKey !== "ВСТАВЬТЕ_СЮДА" && firebaseConfig.apiKey.length > 5;
let db = null;
let auth = null;
if (FIREBASE_CONFIGURED) {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  auth = firebase.auth();
} else {
  document.getElementById('configWarning').classList.remove('hidden');
}
