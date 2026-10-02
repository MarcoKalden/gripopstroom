/* Grip op Stroom: gedeelde code voor alle pagina's.
   Laadt de teksten (content/site.json plus het bestand van de pagina),
   de stappen, de bronnen en de woning, en vult de pagina.
   Vanilla JavaScript, geen framework.

   Elke pagina zegt in <body> welk contentbestand hij gebruikt:
   <body data-page="home" data-content="content/home.json">

   Andere pagina-scripts wachten op GOS.ready. */
(function () {
  'use strict';

  var body = document.body;
  var FILES = {
    site: 'content/site.json',
    page: body.getAttribute('data-content'),
    steps: 'steps.json',
    sources: 'sources.json',
    house: 'assets/house.svg'
  };

  document.documentElement.classList.add('js');

  var currency = new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  });
  var formatEUR = function (n) { return currency.format(n); };

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Hulpfuncties ---------- */

  function getPath(obj, path) {
    if (path === '.' || path === '') return obj;
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

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  // Pagina-inhoud overschrijft gedeelde inhoud; lijsten worden vervangen, niet samengevoegd.
  function merge(base, extra) {
    var out = {};
    Object.keys(base || {}).forEach(function (k) { out[k] = base[k]; });
    Object.keys(extra || {}).forEach(function (k) {
      out[k] = isPlainObject(out[k]) && isPlainObject(extra[k]) ? merge(out[k], extra[k]) : extra[k];
    });
    return out;
  }

  // Staat iets "aan"? Uitgeschakelde items, lege lijsten en lege tekst tellen niet.
  function isOn(value) {
    if (value == null || value === false) return false;
    if (Array.isArray(value)) return value.some(isOn);
    if (isPlainObject(value)) {
      if (value.enabled === false) return false;
      if ('items' in value) return isOn(value.items);
      return true;
    }
    if (typeof value === 'string') return value.trim() !== '';
    return Boolean(value);
  }

  function enabledItems(items) {
    return (items || []).filter(function (item) {
      return !(isPlainObject(item) && item.enabled === false);
    });
  }

  /* ---------- Bronnen ---------- */

  var sourceIndex = {}; // id -> { n, source }

  // Verzamelt alle [[bron-id]] uit ingeschakelde inhoud.
  function collectRefs(value, found) {
    if (typeof value === 'string') {
      value.replace(/\[\[([\w-]+)\]\]/g, function (m, id) { found[id] = true; return m; });
    } else if (Array.isArray(value)) {
      value.forEach(function (v) { collectRefs(v, found); });
    } else if (isPlainObject(value) && value.enabled !== false) {
      Object.keys(value).forEach(function (k) { collectRefs(value[k], found); });
    }
    return found;
  }

  // Alleen bronnen die op deze pagina worden aangehaald, in de volgorde van sources.json.
  function indexSources(list, cited) {
    var used = list.filter(function (s) { return cited[s.id]; });
    used.forEach(function (source, i) {
      sourceIndex[source.id] = { n: i + 1, source: source };
    });
    return used;
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
      li.appendChild(document.createTextNode(source.publisher + '. ' + source.title + '.'));
      if (source.url) {
        var a = document.createElement('a');
        a.href = source.url;
        a.rel = 'noopener';
        a.textContent = source.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
        li.appendChild(document.createTextNode(' '));
        li.appendChild(a);
      }
      listEl.appendChild(li);
    });
  }

  /* ---------- Teksten uit de JSON-bestanden ---------- */

  // Klasse voor de labelkleur: A++ wordt a2, C wordt c.
  function labelSlug(label) {
    var plus = (String(label).match(/\+/g) || []).length;
    return String(label).charAt(0).toLowerCase() + (plus ? plus : '');
  }

  function setIcon(el, name) {
    var use = el.querySelector('use');
    if (use && name) use.setAttribute('href', 'assets/icons.svg#i-' + name);
  }

  // Vult een lijst met de <template> in de lijst. Items met enabled: false worden overgeslagen.
  function renderList(container, items, content) {
    var tpl = container.querySelector(':scope > template');
    if (!tpl || !Array.isArray(items)) return;
    Array.prototype.slice.call(container.children).forEach(function (child) {
      if (child !== tpl) child.remove();
    });
    enabledItems(items).forEach(function (item, index) {
      var frag = tpl.content.cloneNode(true);
      var val = function (el, attr) { return getPath(item, el.getAttribute(attr)); };
      frag.querySelectorAll('[data-item-if]').forEach(function (el) {
        if (!isOn(val(el, 'data-item-if'))) el.remove();
      });
      frag.querySelectorAll('[data-item-text]').forEach(function (el) {
        el.textContent = val(el, 'data-item-text');
      });
      frag.querySelectorAll('[data-item-rich]').forEach(function (el) {
        renderRich(el, val(el, 'data-item-rich'));
      });
      frag.querySelectorAll('[data-item-href]').forEach(function (el) {
        el.setAttribute('href', val(el, 'data-item-href'));
      });
      frag.querySelectorAll('[data-item-src]').forEach(function (el) {
        el.setAttribute('src', val(el, 'data-item-src'));
      });
      frag.querySelectorAll('[data-item-icon]').forEach(function (el) {
        setIcon(el, val(el, 'data-item-icon'));
      });
      frag.querySelectorAll('[data-item-label]').forEach(function (el) {
        var label = val(el, 'data-item-label');
        el.textContent = label;
        el.classList.add('label-chip--' + labelSlug(label));
      });
      frag.querySelectorAll('[data-item-index]').forEach(function (el) {
        el.textContent = index + 1;
      });
      frag.querySelectorAll('[data-ref-text]').forEach(function (el) {
        el.textContent = getPath(content, el.getAttribute('data-ref-text'));
      });
      // Geneste lijsten als laatste, zodat hun items niet opnieuw worden gevuld.
      frag.querySelectorAll('[data-item-list]').forEach(function (el) {
        renderList(el, val(el, 'data-item-list'), content);
      });
      Array.prototype.forEach.call(frag.children, function (child) {
        if (item && item.size) child.classList.add('is-' + item.size);
      });
      container.appendChild(frag);
    });
  }

  function renderLists(root, content) {
    root.querySelectorAll('[data-list]').forEach(function (el) {
      renderList(el, getPath(content, el.getAttribute('data-list')), content);
    });
  }

  // data-if="pad": tonen als het onderdeel aan staat. data-if-not="pad": het omgekeerde.
  function applyConditions(root, content) {
    root.querySelectorAll('[data-if]').forEach(function (el) {
      el.hidden = !el.getAttribute('data-if').split(' ').some(function (p) {
        return isOn(getPath(content, p));
      });
    });
    root.querySelectorAll('[data-if-not]').forEach(function (el) {
      el.hidden = el.getAttribute('data-if-not').split(' ').some(function (p) {
        return isOn(getPath(content, p));
      });
    });
  }

  // De uitgangswoning: dezelfde SVG zonder componenten, met eigen id's.
  function mountHouse(holder, svgText, prefix, keepComponents) {
    if (!holder || !svgText) return null;
    holder.innerHTML = svgText
      .replace(/id="/g, 'id="' + prefix)
      .replace(/url\(#/g, 'url(#' + prefix)
      .replace(/href="#/g, 'href="#' + prefix);
    if (!keepComponents) {
      holder.querySelectorAll('[data-component]').forEach(function (g) { g.remove(); });
    }
    return holder.querySelector('svg');
  }

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
      if (value != null && value !== '') el.setAttribute('href', value);
    });
    if (content.meta) {
      if (content.meta.title) document.title = content.meta.title;
      var desc = document.querySelector('meta[name="description"]');
      if (desc && content.meta.description) desc.setAttribute('content', content.meta.description);
    }
  }

  /* ---------- Header, menu en mobiele balk ---------- */

  function markCurrentNav() {
    var here = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.site-nav a, .site-footer a').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (href.indexOf('#') === -1 && href === here) a.setAttribute('aria-current', 'page');
    });
  }

  function setupMenu(content) {
    var btn = document.querySelector('[data-menu-toggle]');
    var nav = document.getElementById('site-nav');
    if (!btn || !nav) return;
    var label = btn.querySelector('[data-menu-label]');
    var focusables = function () {
      return [btn].concat(Array.prototype.slice.call(nav.querySelectorAll('a')));
    };
    var setOpen = function (open) {
      btn.setAttribute('aria-expanded', String(open));
      body.classList.toggle('menu-open', open);
      setIcon(btn, open ? 'close' : 'menu');
      if (label) label.textContent = open ? content.ui.menuClose : content.ui.menuOpen;
    };
    btn.addEventListener('click', function () {
      setOpen(btn.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (btn.getAttribute('aria-expanded') !== 'true') return;
      if (e.key === 'Escape') {
        setOpen(false);
        btn.focus();
      } else if (e.key === 'Tab') {
        // Focus blijft in het geopende menu.
        var list = focusables();
        var first = list[0];
        var last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function () { setOpen(false); });
  }

  // Header wordt compact bij scrollen, verdwijnt bij omlaag scrollen en komt terug bij omhoog scrollen.
  // Boven een sectie die zelf het hele scherm gebruikt (data-header-hide) blijft hij weg.
  function setupHeader() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var lastY = window.scrollY;
    var ticking = false;
    var covers = Array.prototype.slice.call(document.querySelectorAll('[data-header-hide]'));
    var update = function () {
      ticking = false;
      var y = window.scrollY;
      var menuOpen = body.classList.contains('menu-open');
      header.classList.toggle('is-scrolled', y > 8);
      var covered = covers.some(function (el) {
        if (!el.classList.contains('is-scroll-mode')) return false;
        var r = el.getBoundingClientRect();
        return r.top <= 1 && r.bottom >= window.innerHeight;
      });
      var down = y > lastY && y > 240;
      header.classList.toggle('is-hidden', !menuOpen && (covered || down));
      if (Math.abs(y - lastY) > 4) lastY = y;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    header.addEventListener('focusin', function () { header.classList.remove('is-hidden'); });
    update();
  }

  // Mobiele balk: verschijnt als de hero uit beeld is, verdwijnt bij de afsluiting en de footer.
  function setupMobileBar() {
    var bar = document.querySelector('[data-mobile-bar]');
    var hero = document.querySelector('.hero');
    if (!bar || !hero || !('IntersectionObserver' in window)) return;
    var stops = document.querySelectorAll('.closing, .site-footer, [data-label-animation]');
    var heroVisible = true;
    var stopVisible = {};
    var update = function () {
      var anyStop = Object.keys(stopVisible).some(function (k) { return stopVisible[k]; });
      bar.classList.toggle('is-visible', !heroVisible && !anyStop);
    };
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      update();
    }).observe(hero);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { stopVisible[e.target.dataset.stopId] = e.isIntersecting; });
      update();
    });
    Array.prototype.forEach.call(stops, function (el, i) {
      el.dataset.stopId = String(i);
      io.observe(el);
    });
  }

  // Rustig inschuiven bij in beeld komen. Zonder JS of met minder beweging staat alles er meteen.
  function setupReveal() {
    var els = document.querySelectorAll('[data-reveal]');
    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) {
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  /* ---------- Structured data ---------- */

  function addJSONLD(data) {
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }

  function stripRefs(text) {
    return String(text).replace(/\[\[[\w-]+\]\]/g, '');
  }

  // Alleen echte, ingeschakelde gegevens komen in de structured data.
  function organizationData(content) {
    var data = {
      '@context': 'https://schema.org',
      '@type': 'HomeAndConstructionBusiness',
      name: content.brand.name,
      legalName: content.company.legalName,
      description: content.meta && content.meta.description,
      areaServed: { '@type': 'Country', name: 'Nederland' }
    };
    if (content.siteUrl) {
      data.url = content.siteUrl;
      data.logo = content.siteUrl.replace(/\/$/, '') + '/assets/logo-gos.png';
    }
    if (isOn(content.contact.phone)) data.telephone = content.contact.phone.display;
    if (isOn(content.contact.email)) data.email = content.contact.email.display;
    return data;
  }

  function faqData(items) {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: enabledItems(items).map(function (q) {
        return {
          '@type': 'Question',
          name: q.question,
          acceptedAnswer: { '@type': 'Answer', text: stripRefs(q.answer) }
        };
      })
    };
  }

  /* ---------- Start ---------- */

  var resolveReady;
  var rejectReady;
  var ready = new Promise(function (resolve, reject) {
    resolveReady = resolve;
    rejectReady = reject;
  });

  function init() {
    Promise.all([
      loadJSON(FILES.site),
      FILES.page ? loadJSON(FILES.page) : Promise.resolve({}),
      loadJSON(FILES.steps),
      loadJSON(FILES.sources),
      loadText(FILES.house)
    ]).then(function (results) {
      var content = merge(results[0], results[1]);
      var stepsConfig = results[2];
      var svg = results[4];

      // Welke bronnen worden op deze pagina aangehaald?
      var cited = collectRefs(results[1], {});
      collectRefs(results[0].company, cited);
      if (document.querySelector('[data-uses-steps]')) {
        enabledItems(stepsConfig.steps).forEach(function (step) {
          collectRefs(step.explanation, cited);
          Object.keys(step.sources || {}).forEach(function (k) {
            step.sources[k].forEach(function (id) { cited[id] = true; });
          });
        });
      }
      var sources = indexSources(results[3].sources, cited);
      content._sources = sources.length ? { count: sources.length } : null;

      renderLists(document, content);
      applyContent(document, content);
      applyConditions(document, content);
      mountHouse(document.querySelector('[data-hero-house]'), svg, 'hero-', false);
      renderSourceList(document.querySelector('[data-sources]'), sources);

      if (body.getAttribute('data-page') === 'home') {
        addJSONLD(organizationData(content));
      }
      document.querySelectorAll('[data-faq]').forEach(function (el) {
        var items = getPath(content, el.getAttribute('data-faq'));
        if (isOn(items)) addJSONLD(faqData(items));
      });

      markCurrentNav();
      setupMenu(content);
      body.classList.add('is-ready');
      resolveReady({ content: content, steps: stepsConfig, sources: sources, svg: svg });
      // Pas na andere pagina-scripts meten, zodat de animatie zijn scroll-modus heeft gekozen.
      setTimeout(function () {
        setupHeader();
        setupMobileBar();
        setupReveal();
      }, 0);
    }).catch(function (err) {
      console.error(err);
      body.classList.add('is-ready');
      setupReveal();
      rejectReady(err);
    });
  }

  window.GOS = {
    ready: ready,
    getPath: getPath,
    template: template,
    renderRich: renderRich,
    makeRefs: makeRefs,
    formatEUR: formatEUR,
    labelSlug: labelSlug,
    mountHouse: mountHouse,
    enabledItems: enabledItems,
    isOn: isOn,
    reducedMotion: reducedMotion
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
