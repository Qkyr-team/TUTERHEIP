/* js/core/config.js — Ключи Firebase, email администратора, список уровней */
/* ---------------------------------------------------------
   1) НАСТРОЙКА FIREBASE
   Вставьте сюда ключи своего проекта из консоли Firebase
   (Project settings → General → Your apps → SDK setup and configuration).
--------------------------------------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyAOLhd3VqQQ6T9GQtm97PxqPPFGKlztFXM",
  authDomain: "tutorhelp-4c53c.firebaseapp.com",
  projectId: "tutorhelp-4c53c",
  storageBucket: "tutorhelp-4c53c.firebasestorage.app",
  messagingSenderId: "972285249430",
  appId: "1:972285249430:web:5b73f5a622aa8d03d97fb7"
};

// Email администратора — только этот аккаунт увидит вкладку "Админ".
// Впишите сюда свой email именно так, как вы им регистрируетесь/входите на сайте.
const ADMIN_EMAIL = "maksim896@icloud.com";

let LEVELS = [
  'Beginner (A1)',
  'Elementary (A2)',
  'Pre-Intermediate (A2+)',
  'Intermediate (B1)',
  'Upper-Intermediate (B2)',
  'Advanced (C1)'
];
