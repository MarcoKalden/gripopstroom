/* Grip op Stroom: pagina met alle vragen. Zoekveld filtert vragen en antwoorden. */
(function () {
  'use strict';
  var G = window.GOS;

  function norm(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  G.ready.then(function () {
    var input = document.querySelector('[data-faq-search]');
    var empty = document.querySelector('[data-faq-empty]');
    if (!input) return;
    input.addEventListener('input', function () {
      var q = norm(input.value.trim());
      var shown = 0;
      document.querySelectorAll('[data-faq-group]').forEach(function (group) {
        var groupShown = 0;
        group.querySelectorAll('.faq__item').forEach(function (item) {
          var hit = !q || norm(item.textContent).indexOf(q) !== -1;
          item.hidden = !hit;
          if (hit) groupShown++;
        });
        group.hidden = groupShown === 0;
        shown += groupShown;
      });
      empty.hidden = shown > 0;
    });
  });
})();
