#!/usr/bin/env node
/* Zet alleen de bestanden van de website in public/, voor de hosting (zie netlify.toml).
   Interne bestanden blijven zo buiten de live site: README, ontwerpinstructies, originele
   beelden, PDF-export, tests, scripts en de servercode van het contactformulier.

   Zolang siteUrl in content/site.json leeg is, krijgt elke pagina de kop
   "X-Robots-Tag: noindex": de testversie verschijnt dan niet in zoekmachines.
   Vul siteUrl in zodra de site op het echte domein live gaat.

   Gebruik: node scripts/build-public.js */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'public');

// Wat er online mag. Mappen worden in hun geheel gekopieerd, behalve tekstbestanden
// met aantekeningen (.md).
const DIRS = ['assets', 'content', 'css', 'js'];
const FILES = ['steps.json', 'sources.json', 'robots.txt', 'sitemap.xml'];
const SKIP = /\.md$/i;

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else if (!SKIP.test(entry.name)) fs.copyFileSync(src, dest);
  }
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);

const pages = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
for (const f of pages.concat(FILES)) {
  if (fs.existsSync(path.join(root, f))) fs.copyFileSync(path.join(root, f), path.join(out, f));
}
for (const d of DIRS) copyDir(path.join(root, d), path.join(out, d));

// Kopregels voor de hosting (Netlify leest public/_headers).
const site = JSON.parse(fs.readFileSync(path.join(root, 'content', 'site.json'), 'utf8'));
const headers = [
  '/*',
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '  X-Frame-Options: SAMEORIGIN',
];
if (!site.siteUrl) headers.push('  X-Robots-Tag: noindex');
fs.writeFileSync(path.join(out, '_headers'), headers.join('\n') + '\n');

let count = 0;
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(dir, e.name)); else count++;
  }
})(out);
console.log(`public/ klaar: ${pages.length} pagina's, ${count} bestanden` +
  (site.siteUrl ? '' : ' (testversie: noindex, want siteUrl is leeg)'));
