/* init */
/* ---------------------------------------------------------
   ТЕМА (светлая/тёмная) — общая настройка для всех посетителей
--------------------------------------------------------- */
function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
    theme = 'dark';
  }

  const themeButton = document.getElementById('themeToggleBtn');

  if (themeButton) {
    themeButton.textContent = theme === 'light' ? '☀️' : '🌙';
  }

  try {
    localStorage.setItem('siteTheme', theme);
  } catch (e) {
    console.warn('Не удалось сохранить тему:', e);
  }
}

function toggleTheme() {
  const currentTheme =
    document.documentElement.getAttribute('data-theme');

  applyTheme(currentTheme === 'light' ? 'dark' : 'light');
}

const savedTheme = (() => {
  try {
    return localStorage.getItem('siteTheme') || 'dark';
  } catch (e) {
    return 'dark';
  }
})();

applyTheme(savedTheme);