/* Sets the colour theme before the page paints, to avoid a flash. */
(function () {
  var theme = null;
  try { theme = localStorage.getItem('stecia-theme'); } catch (e) { /* storage unavailable */ }
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
