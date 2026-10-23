/* js/core/toast.js — Всплывающие уведомления */
/* ---------------------------------------------------------
   TOAST-УВЕДОМЛЕНИЯ
--------------------------------------------------------- */
function showToast(message, type){
  const wrap = document.getElementById('toastWrap');
  if(!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' error' : '');
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(()=>{ el.remove(); }, 3800);
}
