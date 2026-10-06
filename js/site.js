/* Grip op Stroom: gedeelde code voor alle pagina's.
   Laadt de teksten (content/site.json plus de bestanden van de pagina),
   de stappen en de bronnen, en vult de pagina. Vanilla JavaScript, geen framework.

   Elke pagina zegt in <body> welke contentbestanden hij gebruikt, in volgorde
   (latere bestanden overschrijven eerdere):
   <body data-page="home" data-content="content/pakketten.json content/home.json">

   Andere pagina-scripts wachten op GOS.ready. */
(function () {
  'use strict';

  var body = document.body;
  var PAGE_FILES = (body.getAttribute('data-content') || '').split(/\s+/).filter(Boolean);
  var FILES = { site: 'content/site.json', steps: 'steps.json', sources: 'sources.json' };
  var PHOTO_WIDTHS = [640, 1024, 1600];

  document.documentElement.classList.add('js');

  var currency = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  var formatEUR = function (n) { return currency.format(n); };
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Hulpfuncties ---------- */

  function getPath(obj, path) {
    if (path === '.' || path === '') return obj;
    return path.split('.').reduce(function (o, key) { return o == null ? undefined : o[key]; }, obj);
  }

  function template(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (m, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : m;
    });
  }

  function loadJSON(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('Kan ' + url + ' niet laden (' + res.status + ')');
      return res.json();
    });
  }

  function isPlainObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

  // Latere inhoud overschrijft eerdere; lijsten worden vervangen, niet samengevoegd.
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
    return (items || []).filter(function (item) { return !(isPlainObject(item) && item.enabled === false); });
  }

  function iconSVG(name, extraClass) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'icon' + (extraClass ? ' ' + extraClass : ''));
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(ns, 'use');
    use.setAttribute('href', 'assets/icons.svg#i-' + name);
    svg.appendChild(use);
    return svg;
  }

  function setIcon(el, name) {
    var use = el.querySelector('use');
    if (use && name) use.setAttribute('href', 'assets/icons.svg#i-' + name);
  }

  // <picture> met AVIF, WebP en JPG uit assets/foto/ (zie tests/photos.js).
  function buildPicture(holder, name, alt, sizes, eager) {
    if (!holder || !name) return;
    var base = 'assets/foto/' + name + '-';
    var set = function (ext) {
      return PHOTO_WIDTHS.map(function (w) { return base + w + '.' + ext + ' ' + w + 'w'; }).join(', ');
    };
    var pic = document.createElement('picture');
    ['avif', 'webp'].forEach(function (ext) {
      var s = document.createElement('source');
      s.type = 'image/' + ext;
      s.srcset = set(ext);
      s.sizes = sizes;
      pic.appendChild(s);
    });
    var img = document.createElement('img');
    img.src = base + '1024.jpg';
    img.srcset = set('jpg');
    img.sizes = sizes;
    img.alt = alt || '';
    img.width = 1600;
    img.height = 900;
    img.decoding = 'async';
    img.loading = eager ? 'eager' : 'lazy';
    pic.appendChild(img);
    holder.textContent = '';
    holder.appendChild(pic);
  }

  /* ---------- Woningrender of placeholder ---------- */

  // Maakt een laag met de render. Bestaat het bestand (nog) niet, dan een duidelijk
  // gelabelde placeholder in dezelfde verhouding, met de bestandsnaam die verwacht wordt.
  function renderLayer(src, alt, title, subtitle) {
    var layer = document.createElement('div');
    layer.className = 'render__layer';
    var showPlaceholder = function () {
      layer.textContent = '';
      var ph = document.createElement('div');
      ph.className = 'render__placeholder';
      ph.setAttribute('role', 'img');
      ph.setAttribute('aria-label', alt || title);
      ph.appendChild(iconSVG('image'));
      var strong = document.createElement('strong');
      strong.textContent = title;
      ph.appendChild(strong);
      if (subtitle) {
        var p = document.createElement('span');
        p.textContent = subtitle;
        ph.appendChild(p);
      }
      var code = document.createElement('code');
      code.textContent = src.split('/').pop();
      ph.appendChild(code);
      layer.appendChild(ph);
    };
    if (!src) { showPlaceholder(); return layer; }
    var img = document.createElement('img');
    img.alt = alt || '';
    img.decoding = 'async';
    img.addEventListener('error', showPlaceholder);
    img.src = src;
    layer.appendChild(img);
    return layer;
  }

  /* ---------- Bronnen ---------- */

  var allSources = [];
  var sourceIndex = {}; // id -> { n, source }

  function indexSources(list) {
    sourceIndex = {};
    list.forEach(function (source, i) { sourceIndex[source.id] = { n: i + 1, source: source }; });
  }

  function refLabel(entry) { return 'Bron ' + entry.n + ': ' + entry.source.publisher; }

  // Maakt <sup class="ref"> met genummerde links naar de bronnenlijst.
  function makeRefs(ids) {
    var sup = document.createElement('sup');
    sup.className = 'ref';
    ids.forEach(function (id, i) {
      var entry = sourceIndex[id];
      if (!entry) { console.warn('Onbekende bron: ' + id); return; }
      if (i > 0) sup.appendChild(document.createTextNode(','));
      var a = document.createElement('a');
      a.href = '#bron-' + id;
      a.dataset.source = id;
      a.textContent = entry.n;
      a.setAttribute('aria-label', refLabel(entry));
      sup.appendChild(a);
    });
    return sup;
  }

  // Zet tekst met [[bron-id]] om naar tekst plus bronverwijzingen.
  function renderRich(el, text) {
    el.textContent = '';
    var parts = String(text).split(/\[\[([\w-]+)\]\]/);
    var pending = [];
    var flush = function () { if (pending.length) el.appendChild(makeRefs(pending)); pending = []; };
    parts.forEach(function (part, i) {
      if (i % 2 === 1) pending.push(part);
      else if (part !== '') { flush(); el.appendChild(document.createTextNode(part)); }
    });
    flush();
  }

  // Na het vullen: alleen de bronnen die op de pagina staan, genummerd in de volgorde van sources.json.
  function finalizeSources(extraIds) {
    var used = {};
    document.querySelectorAll('.ref a[data-source]').forEach(function (a) {
      if (!a.closest('[hidden]')) used[a.dataset.source] = true;
    });
    (extraIds || []).forEach(function (id) { used[id] = true; });
    var list = allSources.filter(function (s) { return used[s.id]; });
    indexSources(list);
    document.querySelectorAll('.ref a[data-source]').forEach(function (a) {
      var entry = sourceIndex[a.dataset.source];
      if (!entry) return;
      a.textContent = entry.n;
      a.setAttribute('aria-label', refLabel(entry));
    });
    return list;
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

  // Een klik op een bronnummer klapt de bronnenlijst in de footer open.
  function setupSourceLinks() {
    var details = document.getElementById('bronnen');
    if (!details) return;
    var open = function (hash) {
      if (!/^#bron-/.test(hash)) return;
      details.open = true;
      var target = document.getElementById(hash.slice(1));
      if (target) target.scrollIntoView({ block: 'center' });
    };
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#bron-"]');
      if (!a) return;
      e.preventDefault();
      history.replaceState(null, '', a.getAttribute('href'));
      open(a.getAttribute('href'));
      var target = document.getElementById(a.getAttribute('href').slice(1));
      if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); }
    });
    if (location.hash) open(location.hash);
  }

  /* ---------- Teksten uit de JSON-bestanden ---------- */

  // Klasse voor de labelkleur: A++ wordt a2, C wordt c.
  function labelSlug(label) {
    var plus = (String(label).match(/\+/g) || []).length;
    return String(label).charAt(0).toLowerCase() + (plus ? plus : '');
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
      frag.querySelectorAll('[data-item-text]').forEach(function (el) { el.textContent = val(el, 'data-item-text'); });
      frag.querySelectorAll('[data-item-rich]').forEach(function (el) { renderRich(el, val(el, 'data-item-rich')); });
      frag.querySelectorAll('[data-item-href]').forEach(function (el) { el.setAttribute('href', val(el, 'data-item-href')); });
      frag.querySelectorAll('[data-item-src]').forEach(function (el) { el.setAttribute('src', val(el, 'data-item-src')); });
      frag.querySelectorAll('[data-item-id]').forEach(function (el) { el.id = val(el, 'data-item-id'); });
      frag.querySelectorAll('[data-item-icon]').forEach(function (el) { setIcon(el, val(el, 'data-item-icon')); });
      frag.querySelectorAll('[data-item-photo]').forEach(function (el) {
        buildPicture(el, val(el, 'data-item-photo'), getPath(item, el.getAttribute('data-item-photo-alt') || 'photoAlt'),
          el.getAttribute('data-sizes') || '100vw', false);
      });
      frag.querySelectorAll('[data-item-label]').forEach(function (el) {
        var label = val(el, 'data-item-label');
        el.textContent = label;
        el.classList.add('label-chip--' + labelSlug(label));
      });
      frag.querySelectorAll('[data-item-index]').forEach(function (el) { el.textContent = index + 1; });
      frag.querySelectorAll('[data-ref-text]').forEach(function (el) {
        el.textContent = getPath(content, el.getAttribute('data-ref-text'));
      });
      frag.querySelectorAll('[data-item-class]').forEach(function (el) {
        el.getAttribute('data-item-class').split(' ').forEach(function (pair) {
          var p = pair.split(':');
          if (getPath(item, p[0])) el.classList.add(p[1]);
        });
      });
      // Geneste lijsten als laatste, zodat hun items niet opnieuw worden gevuld.
      frag.querySelectorAll('[data-item-list]').forEach(function (el) {
        renderList(el, val(el, 'data-item-list'), content);
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
      el.hidden = !el.getAttribute('data-if').split(' ').some(function (p) { return isOn(getPath(content, p)); });
    });
    root.querySelectorAll('[data-if-not]').forEach(function (el) {
      el.hidden = el.getAttribute('data-if-not').split(' ').some(function (p) { return isOn(getPath(content, p)); });
    });
  }

  function applyContent(root, content) {
    root.querySelectorAll('[data-text]').forEach(function (el) {
      var v = getPath(content, el.getAttribute('data-text'));
      if (v != null) el.textContent = v;
    });
    root.querySelectorAll('[data-rich]').forEach(function (el) {
      var v = getPath(content, el.getAttribute('data-rich'));
      if (v != null) renderRich(el, v);
    });
    root.querySelectorAll('[data-text-aria]').forEach(function (el) {
      var v = getPath(content, el.getAttribute('data-text-aria'));
      if (v != null) el.setAttribute('aria-label', v);
    });
    root.querySelectorAll('[data-text-placeholder]').forEach(function (el) {
      var v = getPath(content, el.getAttribute('data-text-placeholder'));
      if (v != null) el.setAttribute('placeholder', v);
    });
    root.querySelectorAll('[data-href]').forEach(function (el) {
      var v = getPath(content, el.getAttribute('data-href'));
      if (v != null && v !== '') el.setAttribute('href', v);
    });
    root.querySelectorAll('[data-photo]').forEach(function (el) {
      if (el.querySelector('picture')) return; // staat al in de HTML
      buildPicture(el, getPath(content, el.getAttribute('data-photo')), getPath(content, el.getAttribute('data-photo-alt')),
        el.getAttribute('data-sizes') || '100vw', el.hasAttribute('data-eager'));
    });
    if (content.meta) {
      if (content.meta.title) document.title = content.meta.title;
      var desc = document.querySelector('meta[name="description"]');
      if (desc && content.meta.description) desc.setAttribute('content', content.meta.description);
    }
  }

  // Vragen: platte lijst en de vragen voor de homepage (maximaal vijf).
  function prepareFaq(content) {
    if (!content.faq || !content.faq.groups) return;
    var all = [];
    content.faq.groups.forEach(function (g) { all = all.concat(enabledItems(g.items)); });
    content.faq.allItems = all;
    content.faq.homeItems = all.filter(function (q) { return q.home; }).slice(0, 5);
  }

  /* ---------- Header ---------- */

  function markCurrentNav() {
    var here = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.site-nav a, .site-footer a').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (href.indexOf('#') === -1 && href === here) a.setAttribute('aria-current', 'page');
    });
  }

  // Header verdwijnt bij omlaag scrollen en komt terug bij omhoog scrollen.
  function setupHeader() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var lastY = window.scrollY;
    var ticking = false;
    var update = function () {
      ticking = false;
      var y = window.scrollY;
      header.classList.toggle('is-hidden', y > lastY && y > 320);
      if (Math.abs(y - lastY) > 4) lastY = y;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    header.addEventListener('focusin', function () { header.classList.remove('is-hidden'); });
  }

  /* ---------- Contactformulier ---------- */

  var PATTERNS = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    postcode: /^[1-9][0-9]{3}\s?[A-Za-z]{2}$/,
    telefoon: /^[0-9+()\-\s]{8,}$/
  };

  function setupContactForms(content) {
    var cfg = content.contactForm;
    document.querySelectorAll('[data-contact-form]').forEach(function (form) {
      var status = form.querySelector('[data-form-status]');
      var button = form.querySelector('button[type="submit"]');
      var fields = ['naam', 'email', 'telefoon', 'postcode', 'bericht'];
      var showError = function (name, msg) {
        var input = form.elements[name];
        var err = form.querySelector('[data-error-for="' + name + '"]');
        input.setAttribute('aria-invalid', msg ? 'true' : 'false');
        if (err) { err.textContent = msg || ''; err.hidden = !msg; }
      };
      var check = function (name) {
        var v = form.elements[name].value.trim();
        var ok = v !== '' && (!PATTERNS[name] || PATTERNS[name].test(v));
        showError(name, ok ? '' : cfg.errors[name]);
        return ok;
      };
      // Een melding verdwijnt al tijdens het typen zodra het veld klopt, zodat de knop
      // niet verspringt op het moment dat iemand erop klikt.
      fields.forEach(function (name) {
        var input = form.elements[name];
        input.addEventListener('input', function () {
          if (input.getAttribute('aria-invalid') === 'true') check(name);
        });
      });
      var setStatus = function (msg, kind) {
        status.textContent = msg;
        status.className = 'form-status is-' + kind;
        status.hidden = !msg;
      };
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var firstBad = null;
        fields.forEach(function (name) { if (!check(name) && !firstBad) firstBad = form.elements[name]; });
        if (firstBad) { setStatus(cfg.summary, 'error'); firstBad.focus(); return; }
        if (form.elements.website && form.elements.website.value) return; // honeypot: stil negeren
        if (!cfg.endpoint) { setStatus(cfg.notConnected, 'error'); return; }
        var data = {};
        fields.forEach(function (name) { data[name] = form.elements[name].value.trim(); });
        data.pagina = location.pathname;
        button.disabled = true;
        var label = button.textContent;
        button.textContent = cfg.sending;
        fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
          .then(function (res) {
            if (!res.ok) throw new Error(res.status);
            form.reset();
            setStatus(cfg.success, 'success');
          })
          .catch(function () { setStatus(cfg.failure, 'error'); })
          .then(function () { button.disabled = false; button.textContent = label; });
      });
    });
  }

  /* ---------- Structured data ---------- */

  function addJSONLD(data) {
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }

  function stripRefs(text) { return String(text).replace(/\[\[[\w-]+\]\]/g, ''); }

  // Alleen ingeschakelde gegevens komen in de structured data.
  function businessData(content) {
    var c = content.contact;
    var data = {
      '@context': 'https://schema.org',
      '@type': 'HomeAndConstructionBusiness',
      name: content.brand.name,
      legalName: content.company.legalName,
      description: content.meta && content.meta.description,
      areaServed: { '@type': 'Country', name: 'Nederland' }
    };
    if (isOn(c.address)) {
      data.address = {
        '@type': 'PostalAddress',
        streetAddress: c.address.street,
        postalCode: c.address.postcode,
        addressLocality: c.address.city,
        addressCountry: 'NL'
      };
    }
    if (isOn(c.phone)) data.telephone = c.phone.e164 || c.phone.display;
    if (isOn(c.email)) data.email = c.email.display;
    if (isOn(c.hours)) data.openingHours = c.hours.schema;
    if (content.siteUrl) {
      data.url = content.siteUrl;
      data.logo = content.siteUrl.replace(/\/$/, '') + '/assets/logo-gos.png';
    }
    return data;
  }

  function faqData(items) {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: enabledItems(items).map(function (q) {
        return { '@type': 'Question', name: q.question, acceptedAnswer: { '@type': 'Answer', text: stripRefs(q.answer) } };
      })
    };
  }

  /* ---------- Start ---------- */

  var resolveReady;
  var rejectReady;
  var ready = new Promise(function (resolve, reject) { resolveReady = resolve; rejectReady = reject; });

  function init() {
    Promise.all([
      loadJSON(FILES.site),
      Promise.all(PAGE_FILES.map(loadJSON)),
      loadJSON(FILES.steps),
      loadJSON(FILES.sources)
    ]).then(function (results) {
      var content = results[1].reduce(merge, results[0]);
      var stepsConfig = results[2];
      allSources = results[3].sources;
      indexSources(allSources);
      prepareFaq(content);

      renderLists(document, content);
      applyContent(document, content);
      applyConditions(document, content);

      // Bronnen van de stappen tellen mee op pagina's die de stappen tonen.
      var stepIds = [];
      if (document.querySelector('[data-uses-steps]')) {
        enabledItems(stepsConfig.steps).forEach(function (step) {
          (String(step.explanation).match(/\[\[([\w-]+)\]\]/g) || []).forEach(function (m) { stepIds.push(m.slice(2, -2)); });
          Object.keys(step.sources || {}).forEach(function (k) { stepIds = stepIds.concat(step.sources[k]); });
        });
      }
      var sources = finalizeSources(stepIds);
      content._sources = sources.length ? { count: sources.length } : null;
      applyConditions(document.querySelector('.site-footer') || document, content);
      renderSourceList(document.querySelector('[data-sources]'), sources);

      if (/^(home|contact)$/.test(body.getAttribute('data-page'))) addJSONLD(businessData(content));
      document.querySelectorAll('[data-faq]').forEach(function (el) {
        var items = getPath(content, el.getAttribute('data-faq'));
        if (isOn(items)) addJSONLD(faqData(items));
      });

      markCurrentNav();
      setupHeader();
      setupSourceLinks();
      setupContactForms(content);
      body.classList.add('is-ready');
      resolveReady({ content: content, steps: stepsConfig, sources: sources });
    }).catch(function (err) {
      console.error(err);
      body.classList.add('is-ready');
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
    enabledItems: enabledItems,
    isOn: isOn,
    iconSVG: iconSVG,
    renderLayer: renderLayer,
    reducedMotion: reducedMotion
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
