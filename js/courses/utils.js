/* js/courses/utils.js — Курсы: общие вспомогательные функции и настройки */
'use strict';
/* ---------- утилиты ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s==null?'':s)
  .replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const rid = () => Math.random().toString(36).slice(2,9);
const toast = (m,t) => (typeof showToast === 'function') ? showToast(m,t) : alert(m);
const shuffle = a => {
  a = a.slice();
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
};
// Сравнение ответов: без регистра, без знаков препинания, одинарные пробелы
const norm = s => String(s||'').toLowerCase()
  .replace(/[’‘`´]/g,"'").replace(/[.!?,;:"«»]+/g,' ').replace(/\s+/g,' ').trim();
const lines = t => String(t||'').split('\n').map(s=>s.trim()).filter(Boolean);

const EX_TYPES = {
  info:   '📖 Подсказка (теория)',
  choice: '🔘 Выбор варианта',
  type:   '⌨️ Ввести ответ',
  order:  '🧩 Собрать предложение',
  match:  '🔗 Соединить пары'
};
const COLORS = ['#58cc02','#1cb0f6','#ce82ff','#ff9600','#ff4b4b','#2b70c9'];
const OFFSETS = [0, 38, 64, 38, 0, -38, -64, -38];

function countLessons(c){ return (c.units||[]).reduce((n,u)=>n+(u.lessons||[]).length,0); }
function flatLessons(c){
  const out = [];
  (c.units||[]).forEach(u => (u.lessons||[]).forEach(l => out.push({unit:u, lesson:l})));
  return out;
}
