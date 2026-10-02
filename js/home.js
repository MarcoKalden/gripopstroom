/* Grip op Stroom: homepage.
   Labelsprong-teaser: drie momenten van de voorbeeldwoning met cijfers uit steps.json,
   en het optionele adresformulier dat doorstuurt naar de Gripscan. */
(function () {
  'use strict';

  var G = window.GOS;
  var COUNT_MS = 700;

  function Teaser(root, data) {
    this.root = root;
    this.text = data.content.teaser;
    var steps = G.enabledItems(data.steps.steps);
    this.steps = steps;
    this.moments = this.text.moments.map(function (m) {
      var index = steps.findIndex(function (s) { return s.id === m.step; });
      return { title: m.title, text: m.text, index: index, step: steps[index] };
    }).filter(function (m) { return m.step; });
    this.current = -1;

    var q = function (sel) { return root.querySelector(sel); };
    this.el = {
      tabs: q('[data-teaser-tabs]'),
      house: q('[data-teaser-house]'),
      moment: q('[data-teaser-text]'),
      label: q('[data-teaser-label]'),
      cost: q('[data-teaser-cost]'),
      value: q('[data-teaser-value]'),
      costDelta: q('[data-teaser-cost-delta]'),
      valueDelta: q('[data-teaser-value-delta]'),
      live: q('[data-teaser-live]'),
      refs: {
        label: q('[data-teaser-refs="label"]'),
        cost: q('[data-teaser-refs="cost"]'),
        value: q('[data-teaser-refs="value"]')
      }
    };

    var svg = G.mountHouse(this.el.house, data.svg, 'teaser-', true);
    this.components = {};
    var self = this;
    if (svg) {
      svg.querySelectorAll('[data-component]').forEach(function (g) {
        self.components[g.getAttribute('data-component')] = g;
      });
    }
    this.buildTabs();
    this.show(0, true);
  }

  Teaser.prototype.buildTabs = function () {
    var self = this;
    this.tabs = this.moments.map(function (m, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'teaser__tab';
      btn.id = 'teaser-tab-' + i;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-controls', 'teaser-panel');
      btn.innerHTML = '<span class="teaser__tab-title"></span><span class="label-chip"></span>';
      btn.querySelector('.teaser__tab-title').textContent = m.title;
      var chip = btn.querySelector('.label-chip');
      chip.textContent = m.step.label;
      chip.classList.add('label-chip--' + G.labelSlug(m.step.label));
      btn.addEventListener('click', function () { self.show(i); });
      btn.addEventListener('keydown', function (e) {
        var map = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: self.moments.length - 1 };
        if (!(e.key in map)) return;
        e.preventDefault();
        var next = (map[e.key] + self.moments.length) % self.moments.length;
        self.show(next);
        self.tabs[next].focus();
      });
      self.el.tabs.appendChild(btn);
      return btn;
    });
  };

  Teaser.prototype.countTo = function (el, to, animate) {
    if (el._raf) cancelAnimationFrame(el._raf);
    var from = typeof el._value === 'number' ? el._value : to;
    if (!animate || from === to) {
      el._value = to;
      el.textContent = G.formatEUR(to);
      return;
    }
    var start = performance.now();
    var tick = function (now) {
      var t = Math.min(1, (now - start) / COUNT_MS);
      var v = from + (to - from) * (1 - Math.pow(1 - t, 3));
      el._value = v;
      el.textContent = G.formatEUR(t < 1 ? Math.round(v / 10) * 10 : to);
      el._raf = t < 1 ? requestAnimationFrame(tick) : null;
      if (t >= 1) el._value = to;
    };
    el._raf = requestAnimationFrame(tick);
  };

  Teaser.prototype.show = function (i, instant) {
    if (i === this.current) return;
    var self = this;
    var m = this.moments[i];
    var step = m.step;
    var animate = !instant && !G.reducedMotion.matches;
    this.current = i;

    this.tabs.forEach(function (tab, k) {
      tab.setAttribute('aria-selected', String(k === i));
      tab.tabIndex = k === i ? 0 : -1;
    });
    this.root.querySelector('[role="tabpanel"]').setAttribute('aria-labelledby', this.tabs[i].id);

    // Woning: alle componenten tot en met deze stap zichtbaar.
    this.steps.forEach(function (s, k) {
      var g = s.component && self.components[s.component];
      if (g) g.classList.toggle('is-on', k <= m.index);
    });

    this.el.moment.textContent = m.text;
    this.el.label.textContent = step.label;
    this.el.label.className = 'label-chip label-chip--lg label-chip--' + G.labelSlug(step.label);
    this.countTo(this.el.cost, step.energyCostPerYear, animate);
    this.countTo(this.el.value, step.homeValue, animate);
    var first = this.moments[0].step;
    var costDiff = first.energyCostPerYear - step.energyCostPerYear;
    var valueDiff = step.homeValue - first.homeValue;
    this.el.costDelta.textContent = costDiff > 0 ? G.template(this.text.costDelta, { delta: G.formatEUR(costDiff) }) : '';
    this.el.valueDelta.textContent = valueDiff > 0 ? G.template(this.text.valueDelta, { delta: G.formatEUR(valueDiff) }) : '';

    ['label', 'cost', 'value'].forEach(function (key) {
      var holder = self.el.refs[key];
      holder.textContent = '';
      var ids = (step.sources && step.sources[key]) || [];
      if (ids.length) holder.appendChild(G.makeRefs(ids));
    });

    if (!instant) {
      this.el.live.textContent = m.title + ': ' + this.text.labelTitle + ' ' + step.label + '. ' +
        this.text.costTitle + ' ' + this.text.prefix + ' ' + G.formatEUR(step.energyCostPerYear) + '. ' +
        this.text.valueTitle + ' ' + this.text.prefix + ' ' + G.formatEUR(step.homeValue) + '.';
    }
  };

  // Adresformulier: stuurt postcode en huisnummer mee naar de Gripscan.
  function setupAddressForm(form, content) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var url = new URL(content.links.gripscan, location.href);
      url.searchParams.set('postcode', form.postcode.value.replace(/\s+/g, '').toUpperCase());
      url.searchParams.set('huisnummer', form.huisnummer.value.trim());
      location.href = url.toString();
    });
  }

  G.ready.then(function (data) {
    var root = document.querySelector('[data-teaser]');
    if (root) root.teaser = new Teaser(root, data);
    var form = document.querySelector('[data-address-form]');
    if (form && !form.hidden) setupAddressForm(form, data.content);
  });
})();
