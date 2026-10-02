/* Grip op Stroom: teksten laden en labelanimatie.
   Vanilla JavaScript, geen framework. Alle teksten staan in content.json,
   alle stappen en bedragen in steps.json, alle bronnen in sources.json. */
(function () {
  'use strict';

  var FILES = {
    content: 'content.json',
    steps: 'steps.json',
    sources: 'sources.json',
    house: 'assets/house.svg'
  };

  var TIMING = {
    componentIn: 500,   // fade en kleine verschuiving van een component
    componentOut: 300,
    count: 800,         // getallen tellen naar de nieuwe waarde
    autoplay: 4000      // tijd per stap bij Afspelen
  };
  var EASE_OUT = 'cubic-bezier(.22, .61, .36, 1)';

  var currency = new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  });
  var formatEUR = function (n) { return currency.format(n); };

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var scrollModeQuery = window.matchMedia('(min-width: 1024px) and (min-height: 760px)');

  /* ---------- Hulpfuncties ---------- */

  function getPath(obj, path) {
    return path.split('.').reduce(function (o, key) {
      return o == null ? undefined : o[key];
    }, obj);
  }

  function template(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (match, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match;
    });
  }

  function loadText(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('Kan ' + url + ' niet laden (' + res.status + ')');
      return res.text();
    });
  }

  function loadJSON(url) {
    return loadText(url).then(JSON.parse);
  }

  /* ---------- Bronnen ---------- */

  var sourceIndex = {}; // id -> { n, source }

  function indexSources(list) {
    list.forEach(function (source, i) {
      sourceIndex[source.id] = { n: i + 1, source: source };
    });
  }

  // Maakt <sup class="ref"> met een of meer genummerde links naar de bronnenlijst.
  function makeRefs(ids) {
    var sup = document.createElement('sup');
    sup.className = 'ref';
    ids.forEach(function (id, i) {
      var entry = sourceIndex[id];
      if (!entry) {
        console.warn('Onbekende bron: ' + id);
        return;
      }
      if (i > 0) sup.appendChild(document.createTextNode(','));
      var a = document.createElement('a');
      a.href = '#bron-' + id;
      a.textContent = entry.n;
      a.setAttribute('aria-label', 'Bron ' + entry.n + ': ' + entry.source.publisher);
      sup.appendChild(a);
    });
    return sup;
  }

  // Zet tekst met [[bron-id]] om naar tekst plus bronverwijzingen.
  function renderRich(el, text) {
    el.textContent = '';
    var parts = String(text).split(/\[\[([\w-]+)\]\]/);
    var pending = [];
    var flush = function () {
      if (pending.length) el.appendChild(makeRefs(pending));
      pending = [];
    };
    parts.forEach(function (part, i) {
      if (i % 2 === 1) {
        pending.push(part);
      } else if (part !== '') {
        flush();
        el.appendChild(document.createTextNode(part));
      }
    });
    flush();
  }

  function renderSourceList(listEl, sources) {
    if (!listEl) return;
    listEl.textContent = '';
    sources.forEach(function (source) {
      var li = document.createElement('li');
      li.id = 'bron-' + source.id;
      li.appendChild(document.createTextNode(source.publisher + '. ' + source.title + '. '));
      var a = document.createElement('a');
      a.href = source.url;
      a.rel = 'noopener';
      a.textContent = source.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      li.appendChild(a);
      listEl.appendChild(li);
    });
  }

  /* ---------- Teksten uit content.json ---------- */

  function applyContent(root, content) {
    root.querySelectorAll('[data-text]').forEach(function (el) {
      var value = getPath(content, el.getAttribute('data-text'));
      if (value != null) el.textContent = value;
    });
    root.querySelectorAll('[data-rich]').forEach(function (el) {
      var value = getPath(content, el.getAttribute('data-rich'));
      if (value != null) renderRich(el, value);
    });
    root.querySelectorAll('[data-text-aria]').forEach(function (el) {
      var value = getPath(content, el.getAttribute('data-text-aria'));
      if (value != null) el.setAttribute('aria-label', value);
    });
    root.querySelectorAll('[data-href]').forEach(function (el) {
      var value = getPath(content, el.getAttribute('data-href'));
      if (value != null) el.setAttribute('href', value);
    });
    if (content.meta) {
      if (content.meta.title) document.title = content.meta.title;
      var desc = document.querySelector('meta[name="description"]');
      if (desc && content.meta.description) desc.setAttribute('content', content.meta.description);
    }
  }

  /* ---------- Labelanimatie ---------- */

  function LabelAnimation(root, options) {
    this.root = root;
    this.text = options.text;
    this.scale = options.config.labelScale;
    this.steps = options.config.steps.filter(function (s) { return s.enabled !== false; });
    this.current = -1;
    this.timer = null;
    this.observer = null;
    this.scrollLockUntil = 0;

    this.maxCost = Math.max.apply(null, this.steps.map(function (s) { return s.energyCostPerYear; }));
    this.maxValue = Math.max.apply(null, this.steps.map(function (s) { return s.homeValue; }));

    this.q = function (sel) { return root.querySelector(sel); };
    this.el = {
      house: this.q('[data-house]'),
      figure: this.q('[data-figure]'),
      steps: this.q('[data-steps]'),
      counter: this.q('[data-counter]'),
      ladder: this.q('[data-ladder]'),
      ladderList: this.q('[data-ladder-list]'),
      ladderMarker: this.q('[data-ladder-marker]'),
      labelSr: this.q('[data-label-sr]'),
      labelNote: this.q('[data-label-note]'),
      cost: this.q('[data-cost]'),
      costBar: this.q('[data-cost-bar]'),
      value: this.q('[data-value]'),
      valueBar: this.q('[data-value-bar]'),
      valueUnchanged: this.q('[data-value-unchanged]'),
      valueDelta: this.q('[data-value-delta]'),
      explanation: this.q('[data-explanation]'),
      live: this.q('[data-live]'),
      prev: this.q('[data-prev]'),
      next: this.q('[data-next]'),
      play: this.q('[data-play]'),
      cta: this.q('.anim__cta'),
      sentinels: this.q('[data-sentinels]'),
      refs: {
        label: this.q('[data-refs="label"]'),
        cost: this.q('[data-refs="cost"]'),
        value: this.q('[data-refs="value"]')
      }
    };

    this.mountHouse(options.svg);
    this.buildStepNav();
    this.buildLadder();
    this.bindControls();
    this.bindKeyboard();
    this.bindSwipe();
    this.setupScrollMode();
    this.updatePlayButton();
    this.render(0, { instant: true, silent: true });
  }

  LabelAnimation.prototype.mountHouse = function (svgText) {
    this.el.house.innerHTML = svgText;
    var svg = this.el.house.querySelector('svg');
    this.components = {};
    var self = this;
    svg.querySelectorAll('[data-component]').forEach(function (g) {
      g.style.opacity = '0';
      g.style.visibility = 'hidden';
      g.dataset.shown = 'false';
      self.components[g.id] = g;
    });
  };

  LabelAnimation.prototype.buildStepNav = function () {
    var self = this;
    this.stepButtons = this.steps.map(function (step, i) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'steps__btn';
      btn.setAttribute('aria-label', (i === 0 ? '' : i + '. ') + step.name);
      btn.innerHTML = '<span class="steps__bar"></span><span class="steps__name"></span>';
      btn.querySelector('.steps__name').textContent = step.shortName;
      btn.addEventListener('click', function () { self.goTo(i, 'user'); });
      li.appendChild(btn);
      self.el.steps.appendChild(li);
      return btn;
    });
  };

  LabelAnimation.prototype.buildLadder = function () {
    var count = this.scale.length;
    var self = this;
    this.scale.forEach(function (label, i) {
      var li = document.createElement('li');
      li.className = 'ladder__rung';
      li.dataset.label = label;
      // De pijlen worden langer richting G, zoals op het echte energielabel.
      li.style.setProperty('--w', (38 + (62 * i) / (count - 1)) + '%');
      li.textContent = label;
      self.el.ladderList.appendChild(li);
    });
    this.el.ladderMarker.textContent = this.text.meters.label.markerText;
  };

  LabelAnimation.prototype.bindControls = function () {
    var self = this;
    this.el.prev.addEventListener('click', function () { self.goTo(self.current - 1, 'user'); });
    this.el.next.addEventListener('click', function () { self.goTo(self.current + 1, 'user'); });
    this.el.play.addEventListener('click', function () {
      if (self.timer) self.stop(); else self.play();
    });
  };

  LabelAnimation.prototype.bindKeyboard = function () {
    var self = this;
    this.root.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var target = e.target;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      var last = self.steps.length - 1;
      var map = {
        ArrowRight: self.current + 1,
        ArrowDown: self.current + 1,
        ArrowLeft: self.current - 1,
        ArrowUp: self.current - 1,
        Home: 0,
        End: last
      };
      if (!(e.key in map)) return;
      e.preventDefault();
      self.goTo(map[e.key], 'user');
      // Houd de focus op de stapindicator als die de focus had.
      if (target && target.classList.contains('steps__btn')) {
        self.stepButtons[self.current].focus();
      }
    });
  };

  LabelAnimation.prototype.bindSwipe = function () {
    var self = this;
    var startX = 0;
    var startY = 0;
    var area = this.el.figure;
    area.addEventListener('touchstart', function (e) {
      var t = e.changedTouches[0];
      startX = t.clientX;
      startY = t.clientY;
    }, { passive: true });
    area.addEventListener('touchend', function (e) {
      var t = e.changedTouches[0];
      var dx = t.clientX - startX;
      var dy = t.clientY - startY;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      self.goTo(self.current + (dx < 0 ? 1 : -1), 'user');
    }, { passive: true });
  };

  /* Scroll-koppeling: alleen op desktop. Elke stap krijgt een onzichtbaar
     blok van één schermhoogte; het blok op de middellijn van het scherm
     bepaalt de stap. */
  LabelAnimation.prototype.setupScrollMode = function () {
    var self = this;
    var count = this.steps.length;
    this.root.style.setProperty('--step-count', count);
    for (var i = 0; i < count; i++) {
      var s = document.createElement('div');
      s.className = 'anim__sentinel';
      s.style.top = (i * 100) + 'vh';
      s.dataset.step = i;
      this.el.sentinels.appendChild(s);
    }

    var apply = function () {
      var on = scrollModeQuery.matches && 'IntersectionObserver' in window;
      self.root.classList.toggle('is-scroll-mode', on);
      if (self.observer) {
        self.observer.disconnect();
        self.observer = null;
      }
      if (!on) return;
      self.observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          // Negeer meldingen die nog over een eigen scrollsprong gaan.
          if (performance.now() < self.scrollLockUntil) return;
          if (entry.isIntersecting) self.goTo(Number(entry.target.dataset.step), 'scroll');
        });
      }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
      self.el.sentinels.querySelectorAll('.anim__sentinel').forEach(function (s) {
        self.observer.observe(s);
      });
    };
    apply();
    scrollModeQuery.addEventListener('change', apply);
  };

  LabelAnimation.prototype.isScrollMode = function () {
    return this.root.classList.contains('is-scroll-mode');
  };

  // Houd scrollpositie en stap gelijk als iemand knoppen of toetsen gebruikt.
  LabelAnimation.prototype.syncScroll = function (index) {
    var trackTop = this.root.querySelector('.anim__track').getBoundingClientRect().top + window.scrollY;
    this.scrollLockUntil = performance.now() + 250;
    window.scrollTo({ top: trackTop + index * window.innerHeight, behavior: 'instant' });
  };

  LabelAnimation.prototype.goTo = function (index, source) {
    var last = this.steps.length - 1;
    index = Math.max(0, Math.min(last, index));
    if (index === this.current) return;
    if (source !== 'play') this.stop();
    this.render(index, {});
    if (source !== 'scroll' && this.isScrollMode()) this.syncScroll(index);
  };

  LabelAnimation.prototype.play = function () {
    var self = this;
    if (this.current >= this.steps.length - 1) this.goTo(0, 'play');
    this.timer = window.setInterval(function () {
      if (self.current >= self.steps.length - 1) {
        self.stop();
        return;
      }
      self.goTo(self.current + 1, 'play');
      if (self.current >= self.steps.length - 1) self.stop();
    }, TIMING.autoplay);
    this.updatePlayButton();
  };

  LabelAnimation.prototype.stop = function () {
    if (!this.timer) return;
    window.clearInterval(this.timer);
    this.timer = null;
    this.updatePlayButton();
  };

  LabelAnimation.prototype.updatePlayButton = function () {
    var playing = Boolean(this.timer);
    this.el.play.textContent = playing ? this.text.controls.pause : this.text.controls.play;
    this.el.play.setAttribute('aria-pressed', String(playing));
  };

  LabelAnimation.prototype.shouldAnimate = function (opts) {
    return !opts.instant && !reducedMotion.matches;
  };

  LabelAnimation.prototype.setComponent = function (g, show, animate) {
    if (g.dataset.shown === String(show)) return;
    g.dataset.shown = String(show);
    if (g._anim) g._anim.cancel();
    if (show) {
      g.style.visibility = 'visible';
      g.style.opacity = '1';
      if (animate && g.animate) {
        g._anim = g.animate(
          [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: TIMING.componentIn, easing: EASE_OUT }
        );
      }
    } else {
      g.style.opacity = '0';
      if (animate && g.animate) {
        g._anim = g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: TIMING.componentOut, easing: EASE_OUT });
        g._anim.onfinish = function () {
          if (g.dataset.shown === 'false') g.style.visibility = 'hidden';
        };
      } else {
        g.style.visibility = 'hidden';
      }
    }
  };

  // Telt rustig naar de nieuwe waarde. Tussenwaarden worden afgerond op tientallen.
  LabelAnimation.prototype.countTo = function (el, to, animate) {
    if (el._raf) cancelAnimationFrame(el._raf);
    var from = typeof el._value === 'number' ? el._value : to;
    if (!animate || from === to) {
      el._value = to;
      el.textContent = formatEUR(to);
      return;
    }
    var start = performance.now();
    var tick = function (now) {
      var t = Math.min(1, (now - start) / TIMING.count);
      var eased = 1 - Math.pow(1 - t, 3);
      var v = from + (to - from) * eased;
      el._value = v;
      el.textContent = formatEUR(t < 1 ? Math.round(v / 10) * 10 : to);
      if (t < 1) {
        el._raf = requestAnimationFrame(tick);
      } else {
        el._value = to;
        el._raf = null;
      }
    };
    el._raf = requestAnimationFrame(tick);
  };

  LabelAnimation.prototype.render = function (index, opts) {
    var self = this;
    var step = this.steps[index];
    var first = this.steps[0];
    var prevStep = index > 0 ? this.steps[index - 1] : null;
    var last = this.steps.length - 1;
    var animate = this.shouldAnimate(opts);
    var t = this.text;
    this.current = index;

    // Componenten in de woning: alles tot en met deze stap is zichtbaar.
    this.steps.forEach(function (s, k) {
      if (s.component && self.components[s.component]) {
        self.setComponent(self.components[s.component], k <= index, animate);
      }
    });

    // Energielabel
    var labelIndex = this.scale.indexOf(step.label);
    this.el.ladder.style.setProperty('--active', labelIndex);
    this.el.ladderList.querySelectorAll('.ladder__rung').forEach(function (li, i) {
      li.classList.toggle('is-active', i === labelIndex);
    });
    this.el.labelSr.textContent = t.meters.label.title + ': ' + step.label;
    if (step.labelEffect === false && step.labelNote) {
      this.el.labelNote.textContent = step.labelNote;
      this.el.labelNote.hidden = false;
    } else {
      this.el.labelNote.hidden = true;
    }

    // Energiekosten en woningwaarde
    this.countTo(this.el.cost, step.energyCostPerYear, animate);
    this.countTo(this.el.value, step.homeValue, animate);
    this.el.costBar.style.width = (100 * step.energyCostPerYear / this.maxCost) + '%';
    this.el.valueBar.style.width = (100 * step.homeValue / this.maxValue) + '%';

    var unchanged = prevStep && prevStep.homeValue === step.homeValue;
    this.el.valueUnchanged.hidden = !unchanged;
    this.el.valueUnchanged.textContent = t.meters.value.unchanged;
    var delta = step.homeValue - first.homeValue;
    this.el.valueDelta.textContent = delta > 0
      ? template(t.meters.value.deltaText, { delta: formatEUR(delta) })
      : '';

    // Bronverwijzingen per meter
    ['label', 'cost', 'value'].forEach(function (key) {
      var holder = self.el.refs[key];
      holder.textContent = '';
      var ids = (step.sources && step.sources[key]) || [];
      if (ids.length) holder.appendChild(makeRefs(ids));
    });

    // Uitleg, stapindicator en bediening
    this.el.explanation.textContent = step.explanation;
    this.stepButtons.forEach(function (btn, i) {
      if (i === index) btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');
      btn.classList.toggle('is-done', i < index);
    });
    this.el.counter.textContent = index === 0
      ? step.name
      : template(t.stepCounter, { n: index, total: last }) + ': ' + step.shortName;
    this.el.prev.disabled = index === 0;
    this.el.next.disabled = index === last;
    this.el.cta.hidden = index !== last;

    // Schermlezer: nieuwe waarden voorlezen
    if (!opts.silent) {
      var msg = template(t.live, {
        n: index,
        total: last,
        name: step.name,
        label: step.label,
        cost: formatEUR(step.energyCostPerYear),
        value: formatEUR(step.homeValue)
      });
      if (step.labelEffect === false) msg += ' ' + t.liveNoLabelEffect;
      this.el.live.textContent = msg;
    }
  };

  /* ---------- Start ---------- */

  function init() {
    var animRoot = document.querySelector('[data-label-animation]');
    Promise.all([
      loadJSON(FILES.content),
      loadJSON(FILES.steps),
      loadJSON(FILES.sources),
      animRoot ? loadText(FILES.house) : Promise.resolve('')
    ]).then(function (results) {
      var content = results[0];
      var stepsConfig = results[1];
      var sources = results[2].sources;
      indexSources(sources);
      applyContent(document, content);
      renderSourceList(document.querySelector('[data-sources]'), sources);
      if (animRoot) {
        animRoot.labelAnimation = new LabelAnimation(animRoot, {
          text: content.animation,
          config: stepsConfig,
          svg: results[3]
        });
      }
    }).catch(function (err) {
      console.error(err);
      if (animRoot) {
        var p = document.createElement('p');
        p.className = 'container';
        p.textContent = 'De animatie kon niet worden geladen. Open de pagina via een webserver.';
        animRoot.prepend(p);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
