/* Grip op Stroom: pakkettenpagina. Bouwt de vergelijkingstabel uit content/pakketten.json. */
(function () {
  'use strict';
  var G = window.GOS;

  function cell(tag, text) {
    var el = document.createElement(tag);
    if (text != null) el.textContent = text;
    return el;
  }

  G.ready.then(function (data) {
    var table = document.querySelector('[data-compare]');
    var p = data.content.packages;
    if (!table || !p.compare) return;
    var c = p.compare;
    var items = G.enabledItems(p.items);

    var thead = document.createElement('thead');
    var hr = document.createElement('tr');
    var corner = cell('th', c.measureCol);
    corner.scope = 'col';
    hr.appendChild(corner);
    items.forEach(function (item) { var th = cell('th', item.name); th.scope = 'col'; hr.appendChild(th); });
    thead.appendChild(hr);

    var tbody = document.createElement('tbody');
    c.rows.forEach(function (row) {
      var tr = document.createElement('tr');
      var th = cell('th', row.measure);
      th.scope = 'row';
      tr.appendChild(th);
      row.values.slice(0, items.length).forEach(function (v) {
        var td = document.createElement('td');
        if (v === 'optional') {
          td.className = 'optional';
          td.textContent = c.optional;
        } else {
          td.className = v;
          td.appendChild(G.iconSVG(v === 'yes' ? 'check' : 'minusCircle'));
          td.appendChild(cell('span', v === 'yes' ? c.yes : c.no)).className = 'sr-only';
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    // Laatste rij: verwacht labeleffect
    var lr = document.createElement('tr');
    var lth = cell('th', c.labelRow);
    lth.scope = 'row';
    lr.appendChild(lth);
    items.forEach(function (item) {
      var td = document.createElement('td');
      var chip = cell('span', item.labelTo);
      chip.className = 'label-chip label-chip--' + G.labelSlug(item.labelTo);
      td.appendChild(chip);
      lr.appendChild(td);
    });
    tbody.appendChild(lr);

    table.appendChild(thead);
    table.appendChild(tbody);
  });
})();
