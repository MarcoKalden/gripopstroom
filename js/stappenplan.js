/* Grip op Stroom: het stappenplan op Zo werkt het.
   Stapdata (titels, bedragen, labels, renders, bronnen) komt uit steps.json,
   de teksten uit content/zo-werkt-het.json. Gebruikt de hulpfuncties uit js/site.js.

   - Stappenbalk is een tablist; pijltjes links en rechts wisselen van stap.
   - Renders crossfaden, het nieuwe onderdeel krijgt een label met een korte gloed.
   - Cijfers tellen naar de nieuwe waarde.
   - Afspelen loopt door alle stappen (3 s per stap) en stopt bij interactie.
   - De stap staat in de URL: zo-werkt-het.html?stap=batterij of ?stap=4.
   - Met prefers-reduced-motion wisselt alles direct en staat Afspelen uit. */
(function () {
  'use strict';

  var G = window.GOS;
  var TIMING = { fade: 300, count: 600, autoplay: 3000 };

  function Stappenplan(root, data) {
    this.root = root;
    this.text = data.content.animation;
    this.scale = data.steps.labelScale;
    this.steps = G.enabledItems(data.steps.steps);
    this.current = -1;
    this.timer = null;
    this.maxValue = Math.max.apply(null, this.steps.map(function (s) { return s.homeValue; }));

    var q = function (sel) { return root.querySelector(sel); };
    this.el = {
      stepbar: q('[data-stepbar]'),
      progress: q('[data-progress]'),
      stage: q('[data-render-stage]'),
      chip: q('[data-part-chip]'),
      ladder: q('[data-ladder]'),
      ladderList: q('[data-ladder-list]'),
      ladderMarker: q('[data-ladder-marker]'),
      labelSr: q('[data-label-sr]'),
      labelNote: q('[data-label-note]'),
      cost: q('[data-cost]'),
      value: q('[data-value]'),
      valueDelta: q('[data-value-delta]'),
      stepName: q('[data-step-name]'),
      explanation: q('[data-explanation]'),
      live: q('[data-live]'),
      prev: q('[data-prev]'),
      next: q('[data-next]'),
      play: q('[data-play]'),
      playLabel: q('[data-play-label]'),
      refs: { label: q('[data-refs="label"]'), cost: q('[data-refs="cost"]'), value: q('[data-refs="value"]') }
    };

    this.buildStepbar();
    this.buildLadder();
    this.bindControls();
    this.updatePlay();
    this.show(this.indexFromUrl(), { instant: true, silent: true, keepUrl: true });
  }

  Stappenplan.prototype.indexFromUrl = function () {
    var stap = new URLSearchParams(location.search).get('stap');
    if (stap == null) return 0;
    var byId = this.steps.findIndex(function (s) { return s.id === stap; });
    if (byId !== -1) return byId;
    var n = parseInt(stap, 10);
    return isNaN(n) ? 0 : Math.max(0, Math.min(this.steps.length - 1, n));
  };

  Stappenplan.prototype.buildStepbar = function () {
    var self = this;
    this.tabs = this.steps.map(function (step, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'stepbar__btn';
      btn.id = 'stap-tab-' + step.id;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-controls', 'plan-panel');
      if (i > 0) {
        var nr = document.createElement('span');
        nr.className = 'stepbar__nr';
        nr.setAttribute('aria-hidden', 'true');
        nr.textContent = i;
        btn.appendChild(nr);
      }
      var name = document.createElement('span');
      name.textContent = step.shortName;
      btn.appendChild(name);
      btn.addEventListener('click', function () { self.go(i, 'user'); });
      self.el.stepbar.appendChild(btn);
      return btn;
    });
    this.el.stepbar.addEventListener('keydown', function (e) {
      var map = { ArrowRight: self.current + 1, ArrowLeft: self.current - 1, Home: 0, End: self.steps.length - 1 };
      if (!(e.key in map)) return;
      e.preventDefault();
      self.go(map[e.key], 'user');
      self.tabs[self.current].focus();
    });
  };

  Stappenplan.prototype.buildLadder = function () {
    var self = this;
    var count = this.scale.length;
    this.scale.forEach(function (label, i) {
      var li = document.createElement('li');
      li.className = 'ladder__rung';
      li.dataset.label = label;
      li.style.setProperty('--w', (38 + (62 * i) / (count - 1)) + '%');
      li.textContent = label;
      self.el.ladderList.appendChild(li);
    });
    this.el.ladderMarker.textContent = this.text.meters.label.markerText;
  };

  Stappenplan.prototype.bindControls = function () {
    var self = this;
    this.el.prev.addEventListener('click', function () { self.go(self.current - 1, 'user'); });
    this.el.next.addEventListener('click', function () { self.go(self.current + 1, 'user'); });
    this.el.play.addEventListener('click', function () { if (self.timer) self.stop(); else self.play(); });

    // Pijltjes werken ook als de focus in het paneel staat.
    this.root.querySelector('[role="tabpanel"]').addEventListener('keydown', function (e) {
      if (e.target.closest('summary, a, button')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); self.go(self.current + 1, 'user'); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); self.go(self.current - 1, 'user'); }
    });

    // Vegen over de render
    var startX = 0;
    var startY = 0;
    this.el.stage.addEventListener('touchstart', function (e) {
      startX = e.changedTouches[0].clientX;
      startY = e.changedTouches[0].clientY;
    }, { passive: true });
    this.el.stage.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      self.go(self.current + (dx < 0 ? 1 : -1), 'user');
    }, { passive: true });

    // Afspelen pauzeert bij elke andere interactie met het stappenplan.
    this.root.addEventListener('pointerdown', function (e) {
      if (self.timer && !e.target.closest('[data-play]')) self.stop();
    });
    G.reducedMotion.addEventListener('change', function () { self.stop(); self.updatePlay(); });
  };

  Stappenplan.prototype.go = function (index, source) {
    index = Math.max(0, Math.min(this.steps.length - 1, index));
    if (source !== 'play') this.stop();
    if (index === this.current) return;
    this.show(index, {});
  };

  Stappenplan.prototype.play = function () {
    if (G.reducedMotion.matches) return;
    var self = this;
    if (this.current >= this.steps.length - 1) this.go(0, 'play');
    this.timer = window.setInterval(function () {
      if (self.current >= self.steps.length - 1) { self.stop(); return; }
      self.go(self.current + 1, 'play');
      if (self.current >= self.steps.length - 1) self.stop();
    }, TIMING.autoplay);
    this.updatePlay();
  };

  Stappenplan.prototype.stop = function () {
    if (!this.timer) return;
    window.clearInterval(this.timer);
    this.timer = null;
    this.updatePlay();
  };

  Stappenplan.prototype.updatePlay = function () {
    var playing = Boolean(this.timer);
    this.el.playLabel.textContent = playing ? this.text.controls.pause : this.text.controls.play;
    this.el.play.setAttribute('aria-pressed', String(playing));
    this.el.play.querySelector('use').setAttribute('href', 'assets/icons.svg#i-' + (playing ? 'pause' : 'play'));
    this.el.play.disabled = G.reducedMotion.matches;
  };

  Stappenplan.prototype.countTo = function (el, to, animate) {
    if (el._raf) cancelAnimationFrame(el._raf);
    var from = typeof el._value === 'number' ? el._value : to;
    if (!animate || from === to) { el._value = to; el.textContent = G.formatEUR(to); return; }
    var start = performance.now();
    var tick = function (now) {
      var t = Math.min(1, (now - start) / TIMING.count);
      var v = from + (to - from) * (1 - Math.pow(1 - t, 3));
      el._value = v;
      el.textContent = G.formatEUR(t < 1 ? Math.round(v / 10) * 10 : to);
      if (t < 1) el._raf = requestAnimationFrame(tick);
      else { el._value = to; el._raf = null; }
    };
    el._raf = requestAnimationFrame(tick);
  };

  // Nieuwe render erin, oude eruit (crossfade). Zonder animatie: direct wisselen.
  Stappenplan.prototype.swapRender = function (step, animate) {
    var stage = this.el.stage;
    var alt = this.text.figureLabel + ' ' + step.name + '.';
    var layer = G.renderLayer(step.render, alt, this.text.placeholder, step.name);
    var old = Array.prototype.slice.call(stage.querySelectorAll('.render__layer'));
    if (animate) layer.classList.add('is-out');
    stage.insertBefore(layer, this.el.chip);
    if (animate) {
      requestAnimationFrame(function () { requestAnimationFrame(function () { layer.classList.remove('is-out'); }); });
      old.forEach(function (o) {
        o.classList.add('is-out');
        setTimeout(function () { o.remove(); }, TIMING.fade + 50);
      });
    } else {
      old.forEach(function (o) { o.remove(); });
    }
    // Volgende render alvast laden
    var next = this.steps[this.steps.indexOf(step) + 1];
    if (next && next.render) { var pre = new Image(); pre.src = next.render; }
  };

  Stappenplan.prototype.show = function (index, opts) {
    var self = this;
    var step = this.steps[index];
    var first = this.steps[0];
    var t = this.text;
    var animate = !opts.instant && !G.reducedMotion.matches;
    this.current = index;

    // Stappenbalk
    this.tabs.forEach(function (tab, i) {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      tab.classList.toggle('is-done', i < index);
    });
    this.root.querySelector('[role="tabpanel"]').setAttribute('aria-labelledby', this.tabs[index].id);
    // Actieve stap in beeld in de (op mobiel scrollbare) stappenbalk, zonder de pagina te verschuiven.
    var bar = this.el.stepbar;
    var tab = this.tabs[index];
    var left = tab.offsetLeft - bar.offsetLeft - 16;
    if (left < bar.scrollLeft || tab.offsetLeft - bar.offsetLeft + tab.offsetWidth > bar.scrollLeft + bar.clientWidth) {
      bar.scrollTo({ left: Math.max(0, left), behavior: animate ? 'smooth' : 'auto' });
    }
    this.el.progress.style.width = (100 * index / (this.steps.length - 1)) + '%';

    // Render en onderdeel-label
    this.swapRender(step, animate);
    // Heeft het beeld zelf al een stapnummer en titel, dan geen extra label erover.
    this.el.stage.classList.toggle('has-own-label', Boolean(step.renderHasLabel));
    if (step.component && !step.renderHasLabel) {
      this.el.chip.textContent = G.template(t.newPart, { name: step.shortName });
      this.el.chip.hidden = false;
      this.el.chip.classList.remove('is-pulse');
      if (animate) { void this.el.chip.offsetWidth; this.el.chip.classList.add('is-pulse'); }
    } else {
      this.el.chip.hidden = true;
    }

    // Energielabel
    // Stap zonder berekende cijfers (pending): geen label of bedragen tonen, maar "Volgt".
    var pending = Boolean(step.pending);
    var labelIndex = pending ? -1 : this.scale.indexOf(step.label);
    this.el.ladder.style.setProperty('--active', Math.max(labelIndex, 0));
    this.el.ladder.classList.toggle('is-pending', pending);
    this.el.ladderList.querySelectorAll('.ladder__rung').forEach(function (li, i) {
      li.classList.toggle('is-active', i === labelIndex);
    });
    this.el.labelSr.textContent = t.meters.label.title + ': ' + (pending ? t.pendingValue : step.label);

    // Cijfers
    if (pending) {
      [this.el.cost, this.el.value].forEach(function (el) {
        if (el._raf) cancelAnimationFrame(el._raf);
        el._value = null;
        el.textContent = t.pendingValue;
      });
      this.el.valueDelta.textContent = '';
    } else {
      this.countTo(this.el.cost, step.energyCostPerYear, animate);
      this.countTo(this.el.value, step.homeValue, animate);
      var delta = step.homeValue - first.homeValue;
      this.el.valueDelta.textContent = delta > 0 ? G.template(t.meters.value.deltaText, { delta: G.formatEUR(delta) }) : '';
    }
    this.root.querySelectorAll('.data-card__prefix').forEach(function (el) { el.hidden = pending; });
    ['label', 'cost', 'value'].forEach(function (key) {
      var holder = self.el.refs[key];
      holder.textContent = '';
      var ids = (step.sources && step.sources[key]) || [];
      if (ids.length) holder.appendChild(G.makeRefs(ids));
    });

    // Toelichting
    this.el.stepName.textContent = index === 0 ? step.name : G.template(t.stepCounter, { n: index, total: this.steps.length - 1 }) + ': ' + step.name;
    G.renderRich(this.el.explanation, step.explanation);
    if ((step.labelEffect === false || pending) && step.labelNote) {
      this.el.labelNote.textContent = step.labelNote;
      this.el.labelNote.hidden = false;
    } else {
      this.el.labelNote.hidden = true;
    }

    this.el.prev.disabled = index === 0;
    this.el.next.disabled = index === this.steps.length - 1;

    if (!opts.keepUrl) {
      var url = new URL(location.href);
      if (index === 0) url.searchParams.delete('stap'); else url.searchParams.set('stap', step.id);
      history.replaceState(null, '', url);
    }

    if (!opts.silent && pending) {
      this.el.live.textContent = G.template(t.livePending, { n: index, total: this.steps.length - 1, name: step.name });
    } else if (!opts.silent) {
      var msg = G.template(t.live, {
        n: index, total: this.steps.length - 1, name: step.name, label: step.label,
        cost: G.formatEUR(step.energyCostPerYear), value: G.formatEUR(step.homeValue)
      });
      if (step.labelEffect === false) msg += ' ' + t.liveNoLabelEffect;
      this.el.live.textContent = msg;
    }
  };

  var root = document.querySelector('[data-stappenplan]');
  if (!root) return;
  G.ready.then(function (data) {
    root.stappenplan = new Stappenplan(root, data);
  }).catch(function () {
    var p = document.createElement('p');
    p.className = 'container';
    p.textContent = 'Het stappenplan kon niet worden geladen. Open de pagina via een webserver.';
    root.prepend(p);
  });
})();
