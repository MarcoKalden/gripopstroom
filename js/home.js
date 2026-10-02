/* Grip op Stroom: homepage.
   "Comfort dat je voelt": render van de voorbeeldwoning met genummerde hotspots.
   Hotspot en bijbehorende rij markeren elkaar bij aanwijzen of focus. */
(function () {
  'use strict';

  var G = window.GOS;

  function setupComfort(data) {
    var c = data.content.comfort;
    var render = document.querySelector('[data-render]');
    var hotspots = document.querySelector('[data-hotspots]');
    var list = document.querySelector('[data-features]');
    if (!c || !render || !list) return;

    render.appendChild(G.renderLayer(c.render, c.renderAlt, c.placeholder, c.renderLabel));
    render.classList.toggle('has-own-label', Boolean(c.renderHasLabel));

    var pairs = [];
    var mark = function (i, on) {
      pairs.forEach(function (p, k) {
        var active = on && k === i;
        p.spot.classList.toggle('is-active', active);
        p.row.classList.toggle('is-active', active);
      });
    };

    G.enabledItems(c.items).forEach(function (item, i) {
      var spot = document.createElement('a');
      spot.className = 'hotspot';
      spot.href = item.href;
      spot.style.left = item.x;
      spot.style.top = item.y;
      spot.innerHTML = '<span class="hotspot__nr" aria-hidden="true"></span><span></span>';
      spot.firstChild.textContent = i + 1;
      spot.lastChild.textContent = item.title;
      spot.setAttribute('aria-label', (i + 1) + '. ' + item.title);
      hotspots.parentNode.insertBefore(spot, hotspots);

      var li = document.createElement('li');
      var row = document.createElement('a');
      row.className = 'feature';
      row.href = item.href;
      var icon = document.createElement('span');
      icon.className = 'feature__icon';
      icon.appendChild(G.iconSVG(item.icon));
      var title = document.createElement('p');
      title.className = 'feature__title';
      title.innerHTML = '<span class="nr" aria-hidden="true"></span><span></span>';
      title.firstChild.textContent = (i + 1) + '.';
      title.lastChild.textContent = item.title;
      var text = document.createElement('p');
      text.className = 'feature__text';
      G.renderRich(text, item.text);
      row.appendChild(icon);
      row.appendChild(title);
      row.appendChild(text);
      li.appendChild(row);
      list.appendChild(li);

      pairs.push({ spot: spot, row: row });
      [spot, row].forEach(function (el) {
        el.addEventListener('mouseenter', function () { mark(i, true); });
        el.addEventListener('mouseleave', function () { mark(i, false); });
        el.addEventListener('focus', function () { mark(i, true); });
        el.addEventListener('blur', function () { mark(i, false); });
      });
    });
    hotspots.remove();
  }

  G.ready.then(setupComfort);
})();
