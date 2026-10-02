#!/usr/bin/env node
/* Controle voor livegang. Meldt alles wat nog niet klaar is:
   - "validated": false in steps.json, sources.json en de contentbestanden
   - bronnen zonder URL
   - "[volgt]" of lege waarden in onderdelen die aan staan
   - verplichte gegevens die nog uit staan (bedrijfsgegevens, contact, siteUrl, Gripscan-link)
   - juridische pagina's zonder tekst
   Livegang kan pas als dit script niets meer meldt (exitcode 0).
   Gebruik: node scripts/check-livegang.js */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const issues = [];
const add = (file, where, msg) => issues.push({ file, where, msg });

// Loopt door de JSON en meldt validated: false en [volgt].
function walk(file, value, where, parentEnabled) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => walk(file, v, where + '[' + i + ']', parentEnabled));
  } else if (value && typeof value === 'object') {
    const enabled = parentEnabled && value.enabled !== false;
    if (value.validated === false && enabled) add(file, where || '(bestand)', 'nog niet gevalideerd');
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('_')) continue;
      walk(file, v, where ? where + '.' + k : k, enabled);
    }
  } else if (typeof value === 'string' && parentEnabled && /\[volgt\]/i.test(value)) {
    add(file, where, 'bevat "[volgt]"');
  }
}

const contentFiles = fs.readdirSync(path.join(root, 'content')).filter((f) => f.endsWith('.json'));
for (const f of contentFiles) walk('content/' + f, read('content/' + f), '', true);
walk('steps.json', read('steps.json'), '', true);

const sources = read('sources.json');
if (sources.validated === false) add('sources.json', 'validated', 'bronnenlijst nog niet gevalideerd');
sources.sources.forEach((s) => {
  if (s.validated === false) add('sources.json', s.id, 'bron nog niet gevalideerd');
  if (!s.url) add('sources.json', s.id, 'bron heeft geen URL');
});

const site = read('content/site.json');
if (!site.siteUrl) add('content/site.json', 'siteUrl', 'leeg: nodig voor canonical, og:url en sitemap.xml');
if (!/^https?:\/\//.test(site.links.gripscan)) add('content/site.json', 'links.gripscan', 'nog geen echte link naar de Gripscan');
site.company.details.forEach((d, i) => {
  if (d.enabled === false || !d.value) add('content/site.json', 'company.details[' + i + '] ' + d.label, 'verplicht gegeven ontbreekt (art. 3:15d BW)');
});
['phone', 'email'].forEach((c) => {
  const v = site.contact[c];
  if (v.enabled === false || !v.display || !v.href) add('content/site.json', 'contact.' + c, 'nog niet ingevuld of uitgeschakeld');
});
if (!site.contact.address || site.contact.address.enabled === false) add('content/site.json', 'contact.address', 'vestigingsadres staat uit');
if (!site.contactForm.endpoint) add('content/site.json', 'contactForm.endpoint', 'formulier nog niet gekoppeld (zie server/contact.js)');

// Renders van de voorbeeldwoning (REDESIGN.md §4b)
const exists = (rel) => fs.existsSync(path.join(root, rel));
read('steps.json').steps.filter((st) => st.enabled !== false).forEach((st) => {
  if (st.render && !exists(st.render)) add('steps.json', st.id, 'render ontbreekt: ' + st.render);
  else if (/\.svg$/.test(st.render)) add('steps.json', st.id, 'nog een schets, geen render: ' + st.render);
});
const homeContent = read('content/home.json');
if (homeContent.comfort && !exists(homeContent.comfort.render)) add('content/home.json', 'comfort.render', 'totaalbeeld ontbreekt: ' + homeContent.comfort.render);
else if (homeContent.comfort && /\.svg$/.test(homeContent.comfort.render)) add('content/home.json', 'comfort.render', 'nog een schets, geen render');
// Na het weghalen van de warmtepomp moeten deze cijfers opnieuw berekend worden.
read('steps.json').steps.filter((st) => st.recalculate).forEach((st) => {
  add('steps.json', st.id, 'label en bedragen opnieuw berekenen zonder warmtepomp');
});
read('content/pakketten.json').packages.items.filter((it) => it.recalculate).forEach((it) => {
  add('content/pakketten.json', it.name, 'labeleffect opnieuw berekenen zonder warmtepomp');
});
for (const [k, v] of Object.entries(read('content/juridisch.json'))) {
  if (v && typeof v === 'object' && 'ready' in v && !v.ready) add('content/juridisch.json', k, 'juridische tekst ontbreekt');
}

// Ingeschakelde items zonder tekst
function emptyEnabled(file, list, where, field) {
  (list || []).forEach((item, i) => {
    if (item.enabled !== false && typeof item[field] === 'string' && !item[field].trim()) {
      add(file, where + '[' + i + ']', 'staat aan maar "' + field + '" is leeg');
    }
  });
}
const vragen = read('content/vragen.json');
vragen.faq.groups.forEach((g, i) => emptyEnabled('content/vragen.json', g.items, 'faq.groups[' + i + '].items', 'answer'));
emptyEnabled('content/site.json', site.credentials.items, 'credentials.items', 'verifyUrl');

if (!issues.length) {
  console.log('Klaar voor livegang: niets gevonden.');
  process.exit(0);
}
const byFile = {};
issues.forEach((i) => { (byFile[i.file] = byFile[i.file] || []).push(i); });
for (const [file, list] of Object.entries(byFile)) {
  console.log('\n' + file);
  list.forEach((i) => console.log('  - ' + i.where + ': ' + i.msg));
}
console.log('\n' + issues.length + ' punten voor livegang.');
process.exit(1);
