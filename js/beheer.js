/* Grip op Stroom: beheerpagina (beheer.html).
   Bewerk de teksten van de site zonder CMS. De pagina leest de JSON-bestanden
   uit GitHub, toont ze als invulvelden met een voorbeeld, en zet een wijziging
   met "Publiceren" als commit in de repo. Netlify zet de site daarna opnieuw online.

   Inloggen gaat met een fine-grained GitHub-sleutel met alleen "Contents: Read and write"
   op deze repo. De sleutel staat alleen in deze browser (sessionStorage, of localStorage
   bij "Onthoud op dit apparaat") en gaat alleen naar api.github.com. */
(function () {
  'use strict';

  var REPO = { owner: 'MarcoKalden', name: 'gripopstroom' };
  var API = 'https://api.github.com';
  var TOKEN_KEY = 'gos-beheer-token';

  // De bestanden die je hier kunt bewerken, met de pagina voor het voorbeeld.
  var FILES = [
    { path: 'content/home.json', title: 'Homepage', preview: 'index.html',
      intro: 'De teksten van de homepage. De pakketten en vragen op de homepage pas je aan bij Pakketten en Vragen.' },
    { path: 'content/zo-werkt-het.json', title: 'Zo werkt het', preview: 'zo-werkt-het.html',
      intro: 'De teksten rond het stappenplan. De cijfers per stap staan bij Stappenplan: cijfers per stap.' },
    { path: 'steps.json', title: 'Stappenplan: cijfers per stap', preview: 'zo-werkt-het.html', labels: { meta: 'Uitgangspunten' },
      intro: 'Label, energiekosten per jaar en woningwaarde per stap. Bedragen in hele euro\'s, zonder punt.' },
    { path: 'content/pakketten.json', title: 'Pakketten', preview: 'pakketten.html',
      intro: 'De pakketten, Grippunten en financiering. Ze staan ook op de homepage.' },
    { path: 'content/vragen.json', title: 'Vragen', preview: 'vragen.html',
      intro: 'De veelgestelde vragen. Vragen met "Op de homepage" aan staan ook op de homepage.' },
    { path: 'content/over-ons.json', title: 'Over ons', preview: 'over-ons.html', intro: '' },
    { path: 'content/contact.json', title: 'Contact', preview: 'contact.html',
      intro: 'De contactgegevens zelf staan bij Algemeen.' },
    { path: 'content/site.json', title: 'Algemeen: menu, contactgegevens en footer', preview: 'index.html',
      intro: 'Teksten die op elke pagina staan: menu, contactgegevens, bedrijfsgegevens, footer en het contactformulier.' },
    { path: 'content/juridisch.json', title: 'Juridische pagina\'s', preview: 'privacy.html',
      intro: 'Privacy, cookies, voorwaarden, klachten en toegankelijkheid.' },
    { path: 'sources.json', title: 'Bronnen', preview: 'zo-werkt-het.html',
      intro: 'De bronnen waar de site naar verwijst met [[bron-id]].' }
  ];
  var PREVIEW_PAGES = [
    ['index.html', 'Homepage'], ['zo-werkt-het.html', 'Zo werkt het'], ['pakketten.html', 'Pakketten'],
    ['vragen.html', 'Vragen'], ['over-ons.html', 'Over ons'], ['contact.html', 'Contact'],
    ['privacy.html', 'Privacyverklaring'], ['cookies.html', 'Cookieverklaring'], ['voorwaarden.html', 'Algemene voorwaarden'],
    ['klachten.html', 'Klachten'], ['toegankelijkheid.html', 'Toegankelijkheid']
  ];

  // Nederlandse namen voor de velden. Onbekende velden krijgen hun eigen naam.
  var LABELS = {
    meta: 'Zoekmachines', title: 'Titel', description: 'Omschrijving', lead: 'Inleiding', intro: 'Inleiding',
    text: 'Tekst', eyebrow: 'Kopje boven de titel', badge: 'Label', hero: 'Bovenste blok', cta: 'Knop',
    ctaPrimary: 'Hoofdknop', ctaSecondary: 'Tweede knop', ctaBand: 'Blok met knop onderaan', photoAlt: 'Beschrijving van de foto',
    renderAlt: 'Beschrijving van het beeld', screenshotAlt: 'Beschrijving van de afbeelding', alt: 'Beschrijving van het beeld',
    trust: 'Pluspunten', trustLabel: 'Kopje pluspunten', items: 'Onderdelen', name: 'Naam', summary: 'Korte omschrijving',
    question: 'Vraag', answer: 'Antwoord', groups: 'Groepen', faq: 'Veelgestelde vragen', home: 'Op de homepage',
    page: 'Pagina', paragraphs: 'Alinea\'s', body: 'Tekst', quote: 'Citaat', role: 'Functie', story: 'Verhaal',
    reviews: 'Reviews', score: 'Score', label: 'Label', value: 'Waarde', note: 'Toelichting', caption: 'Onderschrift',
    nav: 'Menu', footer: 'Footer', contact: 'Contactgegevens', company: 'Bedrijfsgegevens', details: 'Gegevens',
    phone: 'Telefoon', email: 'E-mail', address: 'Adres', street: 'Straat en huisnummer', postcode: 'Postcode', city: 'Plaats',
    hours: 'Bereikbaarheid', display: 'Zoals het op de site staat', tagline: 'Korte omschrijving bedrijf', payoff: 'Payoff',
    copyright: 'Copyright', menuTitle: 'Kopje menu', contactTitle: 'Kopje contact', legalTitle: 'Kopje juridisch',
    legal: 'Juridische links', sourcesTitle: 'Kopje bronnen', sourcesIntro: 'Uitleg bronnen', contactForm: 'Contactformulier',
    fields: 'Velden', errors: 'Foutmeldingen', submit: 'Verzendknop', success: 'Bericht na verzenden', failure: 'Bericht bij een fout',
    sending: 'Bericht tijdens verzenden', placeholder: 'Voorbeeldtekst in het veld', help: 'Hulptekst', optional: 'Optioneel',
    packages: 'Pakketten', measures: 'Maatregelen', measuresLabel: 'Kopje maatregelen', effectText: 'Labeleffect (tekst)',
    effectLabel: 'Kopje labeleffect', labelFrom: 'Label van', labelTo: 'Label naar', featured: 'Uitgelicht',
    grippunten: 'Grippunten', points: 'Punten', funding: 'Financiering', compare: 'Vergelijkingstabel', rows: 'Rijen',
    steps: 'Stappen', shortName: 'Korte naam', explanation: 'Uitleg', energyCostPerYear: 'Energiekosten per jaar (€)',
    homeValue: 'Woningwaarde (€)', labelNote: 'Tekst onder het label', costNote: 'Tekst onder de energiekosten',
    exampleHome: 'Voorbeeldwoning', labelScale: 'Labelschaal', process: 'Werkwijze', duration: 'Duur', plan: 'Gripplan',
    animation: 'Stappenplan', controls: 'Knoppen', meters: 'Meters', how: 'Uitleg', howTitle: 'Kopje uitleg',
    prefix: 'Voor het bedrag', disclaimer: 'Kleine lettertjes', comfort: 'Comfortblok', gripplan: 'Gripplan',
    why: 'Waarom', what: 'Wat', values: 'Waarden', team: 'Team', execution: 'Uitvoering', contactSection: 'Contactblok',
    reassurance: 'Geruststelling', more: 'Meer', allLink: 'Link naar alles', credentials: 'Keurmerken', verifyText: 'Tekst controleren',
    privacy: 'Privacyverklaring', cookies: 'Cookieverklaring', voorwaarden: 'Algemene voorwaarden', klachten: 'Klachten',
    toegankelijkheid: 'Toegankelijkheid', pending: 'Nog niet klaar', publisher: 'Uitgever', sources: 'Bronnen',
    ui: 'Kleine teksten', links: 'Links', brand: 'Merk', shortText: 'Korte tekst', priceNote: 'Toelichting prijs'
  };
  // Velden die de werking regelen en geen tekst zijn. Alleen zichtbaar met "Technische velden tonen".
  var TECHNICAL = /^(id|href|url|labelScale|icon|photo|render|component|endpoint|e164|schema|x|y|validated|recalculate|labelPending|labelCheck|labelEffect|renderHasLabel|countsTowardHomeEnergy|siteUrl|platform|platformUrl|verifyUrl|logo|ctaHref|ctaSecondaryHref|contactLink|privacyLink|whatsapp|valueRule|renders|type|buildYear|floorArea|startLabel|ready|live|liveNoLabelEffect|livePending|stepCounter)$|Href$|Url$/;

  var state = { token: null, branch: null, files: {}, current: null, showTechnical: false, open: {} };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var views = document.querySelectorAll('[data-view]');
  function show(view) { views.forEach(function (v) { v.hidden = v.getAttribute('data-view') !== view; }); }

  /* ---------- Opslag van de sleutel ---------- */

  function storedToken() {
    try { return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }
  function storeToken(token, remember) {
    try {
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
    } catch (e) { /* zonder opslag blijft de sleutel alleen in deze pagina */ }
  }
  function forgetToken() {
    try { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); } catch (e) { /* niets */ }
  }

  /* ---------- GitHub ---------- */

  function api(path, options) {
    options = options || {};
    return fetch(API + path, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + state.token,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: 'no-store'
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) { var err = new Error(data.message || ('GitHub gaf ' + res.status)); err.status = res.status; throw err; }
        return data;
      });
    });
  }

  function decodeBase64(b64) {
    var bin = atob(b64.replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function encodeBase64(text) {
    var bytes = new TextEncoder().encode(text);
    var bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  var repoPath = function (p) { return '/repos/' + REPO.owner + '/' + REPO.name + p; };
  var serialize = function (data) { return JSON.stringify(data, null, 2) + '\n'; };
  var clone = function (v) { return JSON.parse(JSON.stringify(v)); };

  function loadFile(file) {
    return api(repoPath('/contents/' + file.path + '?ref=' + encodeURIComponent(state.branch))).then(function (res) {
      var data = JSON.parse(decodeBase64(res.content));
      state.files[file.path] = { file: file, sha: res.sha, orig: clone(data), data: data };
    });
  }

  function login(token) {
    state.token = token;
    return api(repoPath('')).then(function (repo) {
      state.branch = repo.default_branch;
      api('/user').then(function (user) { $('[data-user-name]').textContent = 'Ingelogd als ' + user.login; }).catch(function () {});
      return Promise.all(FILES.map(loadFile));
    });
  }

  function loginMessage(err) {
    if (err.status === 401) return 'Deze sleutel klopt niet of is verlopen.';
    if (err.status === 403 || err.status === 404) return 'Deze sleutel heeft geen toegang tot de repo ' + REPO.owner + '/' + REPO.name + '.';
    return 'Inloggen lukt niet: ' + err.message;
  }

  /* ---------- Formulier ---------- */

  function humanize(key) {
    var own = state.current && state.files[state.current].file.labels;
    if (own && own[key]) return own[key];
    if (LABELS[key]) return LABELS[key];
    var words = String(key).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
  function isTechnical(key) { return typeof key === 'string' && TECHNICAL.test(key); }
  function getAt(obj, path) { return path.reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj); }
  function setAt(obj, path, value) { getAt(obj, path.slice(0, -1))[path[path.length - 1]] = value; }

  function itemTitle(item, index, key) {
    if (key === 'steps' && state.current === 'steps.json') return (index ? 'Stap ' + index : 'Start') + ': ' + item.name;
    if (item && typeof item === 'object') {
      var keys = ['title', 'name', 'question', 'shortName', 'label', 'text', 'id'];
      for (var i = 0; i < keys.length; i++) {
        var v = item[keys[i]];
        if (typeof v === 'string' && v.trim()) return (index + 1) + '. ' + v.replace(/\[\[[\w-]+\]\]/g, '').slice(0, 70);
      }
    }
    return 'Item ' + (index + 1);
  }

  function emptyCopy(value, key) {
    if (Array.isArray(value)) return value.length && typeof value[0] !== 'object' ? [''] : value.map(function (v) { return emptyCopy(v); });
    if (value && typeof value === 'object') {
      var out = {};
      Object.keys(value).forEach(function (k) { out[k] = emptyCopy(value[k], k); });
      return out;
    }
    if (typeof value === 'string' && !isTechnical(key)) return '';
    return value;
  }

  function sourceIds() {
    var s = state.files['sources.json'];
    return s ? s.data.sources.map(function (x) { return x.id; }) : [];
  }

  // Fouten in een veld: onbekende bronverwijzingen, ongeldige getallen, onbekend label.
  function fieldError(path, value) {
    if (typeof value === 'string') {
      var ids = sourceIds();
      var unknown = (value.match(/\[\[([^\]]*)\]\]/g) || []).map(function (m) { return m.slice(2, -2); })
        .filter(function (id) { return ids.indexOf(id) === -1; });
      if (unknown.length) return 'Onbekende bron: [[' + unknown.join(']], [[') + ']]';
      if (state.current === 'steps.json' && path[path.length - 1] === 'label' && path[0] === 'steps') {
        var scale = state.files['steps.json'].data.labelScale;
        if (scale.indexOf(value) === -1) return 'Kies een label uit: ' + scale.join(', ');
      }
    }
    if (typeof value === 'number' && !isFinite(value)) return 'Vul een getal in.';
    return '';
  }

  function render() {
    var entry = state.files[state.current];
    var form = $('[data-form]');
    var scroll = window.scrollY;
    form.textContent = '';
    $('[data-file-intro]').textContent = entry.file.intro;
    Object.keys(entry.data).forEach(function (key) {
      var node = renderNode(entry, [key], entry.data[key], key, 0);
      if (node) form.appendChild(node);
    });
    window.scrollTo(0, scroll);
  }

  function renderNode(entry, path, value, key, depth) {
    if (typeof key === 'string' && key.charAt(0) === '_') return null;
    if (value === null || value === undefined) return null;
    if (isTechnical(key) && !state.showTechnical && (typeof value !== 'object' || Array.isArray(value))) return null;
    if (Array.isArray(value)) return renderList(entry, path, value, key, depth);
    if (typeof value === 'object') return renderGroup(entry, path, value, humanize(key), depth);
    return renderField(entry, path, value, key);
  }

  function renderGroup(entry, path, obj, title, depth, controls) {
    var id = state.current + ':' + path.join('.');
    var box = document.createElement('details');
    box.className = 'beheer-group beheer-group--' + Math.min(depth, 2);
    box.open = state.open[id] !== undefined ? state.open[id] : depth === 0 && path[0] !== 'meta';
    box.addEventListener('toggle', function () { state.open[id] = box.open; });
    var summary = document.createElement('summary');
    summary.textContent = title;
    if (obj.enabled === false) {
      var off = document.createElement('span');
      off.className = 'beheer-off';
      off.textContent = 'staat uit';
      summary.appendChild(off);
    }
    box.appendChild(summary);
    if (controls) box.appendChild(controls);
    var inner = document.createElement('div');
    inner.className = 'beheer-group__body';
    var count = 0;
    Object.keys(obj).forEach(function (k) {
      var node = renderNode(entry, path.concat(k), obj[k], k, depth + 1);
      if (node) { inner.appendChild(node); count++; }
    });
    if (!count && !controls) return null;
    box.appendChild(inner);
    return box;
  }

  function renderList(entry, path, list, key, depth) {
    var objects = list.length && list[0] !== null && typeof list[0] === 'object';
    var wrap = document.createElement('div');
    wrap.className = 'beheer-list';
    var heading = document.createElement('p');
    heading.className = 'beheer-list__title';
    heading.textContent = humanize(key);
    wrap.appendChild(heading);
    // De stappen liggen vast (beelden en links horen erbij). Items met een id kun je alleen verplaatsen:
    // een nieuw item zou een dubbel id krijgen.
    var fixed = key === 'steps' && state.current === 'steps.json';
    var withIds = objects && list[0].id !== undefined;
    list.forEach(function (item, i) {
      var controls = fixed ? null : listControls(entry, path, list, i, withIds);
      var node = objects
        ? renderGroup(entry, path.concat(i), item, itemTitle(item, i, key), depth + 1, controls)
        : renderField(entry, path.concat(i), item, key, (i + 1) + '.', controls);
      if (node) wrap.appendChild(node);
    });
    if (list.length && !fixed && !withIds) {
      var add = document.createElement('button');
      add.type = 'button';
      add.className = 'btn btn--outline btn--small beheer-add';
      add.textContent = '+ Toevoegen aan ' + humanize(key).toLowerCase();
      add.addEventListener('click', function () {
        list.push(emptyCopy(list[list.length - 1]));
        state.open[state.current + ':' + path.concat(list.length - 1).join('.')] = true;
        changed();
        render();
      });
      wrap.appendChild(add);
    }
    return wrap.childNodes.length > 1 ? wrap : null;
  }

  function listControls(entry, path, list, i, moveOnly) {
    var bar = document.createElement('div');
    bar.className = 'beheer-item-controls';
    var buttons = [
      ['Omhoog', i > 0, function () { list.splice(i - 1, 0, list.splice(i, 1)[0]); }],
      ['Omlaag', i < list.length - 1, function () { list.splice(i + 1, 0, list.splice(i, 1)[0]); }],
      ['Verwijderen', list.length > 1, function () {
        if (window.confirm('Dit onderdeel verwijderen?')) list.splice(i, 1); else return false;
      }]
    ];
    if (moveOnly) buttons.pop();
    buttons.forEach(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'beheer-mini';
      btn.textContent = b[0];
      btn.disabled = !b[1];
      btn.addEventListener('click', function () {
        if (b[2]() === false) return;
        changed();
        render();
      });
      bar.appendChild(btn);
    });
    return bar;
  }

  var fieldCount = 0;
  function renderField(entry, path, value, key, labelText, controls) {
    var id = 'f' + (++fieldCount);
    var row = document.createElement('div');
    row.className = 'beheer-field';
    if (isTechnical(key)) row.classList.add('beheer-field--technical');
    var label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = labelText || humanize(key);
    var input;
    if (typeof value === 'boolean') {
      row.classList.add('beheer-field--check');
      input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = value;
      if (key === 'enabled') label.textContent = 'Tonen op de site';
    } else if (typeof value === 'number') {
      input = document.createElement('input');
      input.type = 'number';
      input.step = 'any';
      input.inputMode = 'decimal';
      input.value = String(value);
    } else {
      var long = value.length > 70 || /\[\[/.test(value) || /^(text|answer|lead|intro|description|explanation|body|story|quote|how|summary)$/.test(key);
      input = document.createElement(long ? 'textarea' : 'input');
      if (long) input.rows = Math.min(8, Math.max(2, Math.ceil(value.length / 80)));
      else input.type = 'text';
      input.value = value;
    }
    input.id = id;
    var orig = getAt(entry.orig, path);
    var error = document.createElement('p');
    error.className = 'beheer-error';
    error.id = id + '-error';
    input.setAttribute('aria-describedby', error.id);
    var mark = function (v) {
      row.classList.toggle('is-changed', JSON.stringify(v) !== JSON.stringify(orig));
      var msg = fieldError(path, v);
      error.textContent = msg;
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    };
    input.addEventListener(typeof value === 'boolean' ? 'change' : 'input', function () {
      var v = typeof value === 'boolean' ? input.checked
        : typeof value === 'number' ? (input.value.trim() === '' ? NaN : Number(input.value)) : input.value;
      setAt(entry.data, path, v);
      mark(v);
      changed();
    });
    mark(value);
    if (typeof value === 'boolean') { row.appendChild(input); row.appendChild(label); }
    else { row.appendChild(label); row.appendChild(input); }
    if (controls) row.appendChild(controls);
    row.appendChild(error);
    return row;
  }

  /* ---------- Wijzigingen, voorbeeld en publiceren ---------- */

  function dirtyFiles() {
    return FILES.map(function (f) { return state.files[f.path]; })
      .filter(function (e) { return e && serialize(e.data) !== serialize(e.orig); });
  }

  function flatten(value, path, out) {
    if (Array.isArray(value)) {
      value.forEach(function (v, i) { flatten(v, path.concat(i), out); });
    } else if (value !== null && typeof value === 'object') {
      Object.keys(value).forEach(function (k) { if (k.charAt(0) !== '_') flatten(value[k], path.concat(k), out); });
    } else out[JSON.stringify(path)] = value;
    return out;
  }

  function describePath(entry, path) {
    var parts = [];
    var node = entry.data;
    path.forEach(function (k) {
      parts.push(typeof k === 'number' ? itemTitle(node && node[k], k).replace(/^(\d+)\. (.{30}).+$/, '$1. $2…') : humanize(k));
      node = node == null ? undefined : node[k];
    });
    return parts.join(' › ');
  }

  function errorsIn(entry) {
    var errs = [];
    var flat = flatten(entry.data, [], {});
    Object.keys(flat).forEach(function (k) {
      var path = JSON.parse(k);
      var prev = state.current;
      state.current = entry.file.path;
      var msg = fieldError(path, flat[k]);
      state.current = prev;
      if (msg) errs.push(describePath(entry, path) + ': ' + msg);
    });
    return errs;
  }

  var previewTimer;
  function changed() {
    var dirty = dirtyFiles();
    $('[data-status]').textContent = dirty.length
      ? 'Niet gepubliceerd: ' + dirty.map(function (e) { return e.file.title; }).join(', ') + '.'
      : 'Geen wijzigingen.';
    $('[data-publish]').disabled = !dirty.length;
    $('[data-reset]').disabled = !dirty.length;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(reloadPreview, 700);
  }

  function reloadPreview() {
    var frame = $('[data-preview]');
    var page = $('[data-preview-page]').value;
    var y = 0;
    try { if (frame.contentWindow && frame.contentWindow.location.pathname.slice(-page.length) === page) y = frame.contentWindow.scrollY; } catch (e) { /* niets */ }
    window.GOS_PREVIEW = {};
    Object.keys(state.files).forEach(function (p) { window.GOS_PREVIEW[p] = state.files[p].data; });
    frame.onload = function () {
      var win = frame.contentWindow;
      var restore = function () {
        if (win.document.body && win.document.body.classList.contains('is-ready')) win.scrollTo(0, y);
        else setTimeout(restore, 100);
      };
      restore();
    };
    frame.src = page + '?voorbeeld=' + Date.now();
  }

  function openPublish() {
    var dialog = $('[data-publish-dialog]');
    var diff = $('[data-diff]');
    diff.textContent = '';
    var blocking = [];
    dirtyFiles().forEach(function (entry) {
      var h = document.createElement('h3');
      h.textContent = entry.file.title;
      diff.appendChild(h);
      var before = flatten(entry.orig, [], {});
      var after = flatten(entry.data, [], {});
      var list = document.createElement('ul');
      Object.keys(Object.assign({}, before, after)).forEach(function (k) {
        if (JSON.stringify(before[k]) === JSON.stringify(after[k])) return;
        var li = document.createElement('li');
        var where = document.createElement('strong');
        where.textContent = describePath(entry, JSON.parse(k));
        li.appendChild(where);
        [['was', before[k]], ['wordt', after[k]]].forEach(function (pair) {
          var p = document.createElement('span');
          p.className = 'beheer-diff__' + (pair[0] === 'was' ? 'old' : 'new');
          p.textContent = pair[0] + ': ' + (pair[1] === undefined ? '(niets)' : String(pair[1]));
          li.appendChild(p);
        });
        list.appendChild(li);
      });
      diff.appendChild(list);
      blocking = blocking.concat(errorsIn(entry));
    });
    var errorEl = $('[data-publish-error]');
    errorEl.textContent = blocking.length ? 'Eerst verbeteren: ' + blocking.join(' · ') : '';
    $('[data-publish-confirm]').disabled = blocking.length > 0;
    dialog.showModal();
  }

  function publish() {
    var button = $('[data-publish-confirm]');
    var errorEl = $('[data-publish-error]');
    var note = $('[data-publish-message]').value.trim();
    button.disabled = true;
    button.textContent = 'Bezig met publiceren…';
    var dirty = dirtyFiles();
    dirty.reduce(function (p, entry) {
      return p.then(function () {
        return api(repoPath('/contents/' + entry.file.path), {
          method: 'PUT',
          body: {
            message: 'Beheer: ' + entry.file.title + ' aangepast' + (note ? '\n\n' + note : ''),
            content: encodeBase64(serialize(entry.data)),
            sha: entry.sha,
            branch: state.branch
          }
        }).then(function (res) {
          entry.sha = res.content.sha;
          entry.orig = clone(entry.data);
        });
      });
    }, Promise.resolve()).then(function () {
      $('[data-publish-dialog]').close();
      $('[data-publish-message]').value = '';
      render();
      changed();
      $('[data-status]').textContent = 'Gepubliceerd. Over ongeveer een minuut staat het live op de site.';
    }).catch(function (err) {
      errorEl.textContent = err.status === 409 || err.status === 422
        ? 'Dit onderdeel is intussen ergens anders gewijzigd. Kopieer je wijziging, laad de pagina opnieuw en voer hem nog een keer in.'
        : err.status === 403 || err.status === 404
          ? 'Je sleutel mag niet schrijven. Zet bij de sleutel "Contents" op "Read and write".'
          : 'Publiceren lukt niet: ' + err.message;
      render();
      changed();
    }).then(function () {
      button.disabled = false;
      button.textContent = 'Ja, publiceren';
    });
  }

  /* ---------- Start ---------- */

  function startEditor() {
    var select = $('[data-file-select]');
    select.textContent = '';
    FILES.forEach(function (f) { select.add(new Option(f.title, f.path)); });
    var pages = $('[data-preview-page]');
    pages.textContent = '';
    PREVIEW_PAGES.forEach(function (p) { pages.add(new Option(p[1], p[0])); });
    var sources = $('[data-source-ids]');
    sources.textContent = '';
    state.files['sources.json'].data.sources.forEach(function (s) {
      var li = document.createElement('li');
      var code = document.createElement('code');
      code.textContent = '[[' + s.id + ']]';
      li.appendChild(code);
      li.appendChild(document.createTextNode(' ' + s.publisher + ': ' + s.title));
      sources.appendChild(li);
    });
    $('[data-user]').hidden = false;
    show('editor');
    selectFile(FILES[0].path);
  }

  function selectFile(path) {
    state.current = path;
    $('[data-file-select]').value = path;
    var file = state.files[path].file;
    $('[data-preview-page]').value = file.preview;
    render();
    reloadPreview();
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('[data-login-form]').addEventListener('submit', function (e) {
      e.preventDefault();
      var form = e.target;
      var token = form.token.value.trim();
      var errorEl = $('[data-login-error]');
      if (!token) { errorEl.textContent = 'Vul je GitHub-sleutel in.'; form.token.focus(); return; }
      errorEl.textContent = '';
      show('loading');
      login(token).then(function () {
        storeToken(token, form.remember.checked);
        form.token.value = '';
        startEditor();
      }).catch(function (err) {
        state.token = null;
        show('login');
        errorEl.textContent = loginMessage(err);
        form.token.focus();
      });
    });
    $('[data-logout]').addEventListener('click', function () {
      if (dirtyFiles().length && !window.confirm('Je hebt wijzigingen die nog niet gepubliceerd zijn. Toch uitloggen?')) return;
      forgetToken();
      window.location.reload();
    });
    $('[data-file-select]').addEventListener('change', function (e) { selectFile(e.target.value); });
    $('[data-preview-page]').addEventListener('change', reloadPreview);
    $('[data-preview-reload]').addEventListener('click', reloadPreview);
    $('[data-show-technical]').addEventListener('change', function (e) { state.showTechnical = e.target.checked; render(); });
    $('[data-reset]').addEventListener('click', function () {
      if (!window.confirm('Alle wijzigingen die nog niet gepubliceerd zijn wissen?')) return;
      Object.keys(state.files).forEach(function (p) { state.files[p].data = clone(state.files[p].orig); });
      render();
      changed();
    });
    $('[data-publish]').addEventListener('click', openPublish);
    $('[data-publish-confirm]').addEventListener('click', publish);
    window.addEventListener('beforeunload', function (e) {
      if (dirtyFiles().length) { e.preventDefault(); e.returnValue = ''; }
    });

    var token = storedToken();
    if (!token) { show('login'); return; }
    login(token).then(startEditor).catch(function (err) {
      forgetToken();
      state.token = null;
      show('login');
      $('[data-login-error]').textContent = loginMessage(err);
    });
  });
})();
