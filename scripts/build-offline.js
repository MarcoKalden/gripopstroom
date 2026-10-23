#!/usr/bin/env node
/* Maakt een versie van de site die zonder internet en zonder server werkt: dubbelklik
   index.html. Bedoeld als back-up en om de site te laten zien zonder verbinding.

   Browsers laden vanaf de harde schijf (file://) geen JSON met fetch en geen iconen uit
   een los SVG-bestand. Daarom:
   - komen alle teksten (content/*.json, steps.json, sources.json) in js/offline-inhoud.js,
     dat fetch voor die bestanden opvangt;
   - staat de iconenset in elke pagina zelf;
   - zit het lettertype in de stylesheet (lettertypen laden vanaf schijf ook niet).
   Het contactformulier en de beheerpagina werken offline niet en gaan niet mee.

   Gebruik: node scripts/build-offline.js [map]   (standaard: offline/) */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'offline'));
const pub = path.join(root, 'public');

execFileSync(process.execPath, [path.join(__dirname, 'build-public.js')], { stdio: 'inherit' });
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(pub, out, { recursive: true });
['_headers', 'robots.txt', 'sitemap.xml', 'beheer.html', 'css/beheer.css', 'js/beheer.js']
  .forEach((f) => fs.rmSync(path.join(out, f), { force: true }));

// Teksten in één script.
const data = {};
const add = (rel) => { data[rel] = JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); };
fs.readdirSync(path.join(root, 'content')).filter((f) => f.endsWith('.json')).forEach((f) => add('content/' + f));
add('steps.json');
add('sources.json');
fs.writeFileSync(path.join(out, 'js', 'offline-inhoud.js'),
  '/* Offline versie: de teksten van de site, zodat ze zonder server laden (zie scripts/build-offline.js). */\n' +
  '(function () {\n' +
  '  var DATA = ' + JSON.stringify(data) + ';\n' +
  '  var original = window.fetch;\n' +
  '  window.fetch = function (url, options) {\n' +
  '    var key = String(url).replace(/^\\.?\\//, "");\n' +
  '    if (DATA[key]) return Promise.resolve(new Response(JSON.stringify(DATA[key]), { headers: { "Content-Type": "application/json" } }));\n' +
  '    return original ? original.apply(this, arguments) : Promise.reject(new Error("Offline"));\n' +
  '  };\n' +
  '})();\n');

// Iconenset in de pagina, en verwijzingen naar #i-... in plaats van assets/icons.svg#i-...
const sprite = fs.readFileSync(path.join(root, 'assets', 'icons.svg'), 'utf8')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace('<svg ', '<svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden" ');
const pages = fs.readdirSync(out).filter((f) => f.endsWith('.html'));
for (const f of pages) {
  const file = path.join(out, f);
  let html = fs.readFileSync(file, 'utf8')
    .replace(/assets\/icons\.svg#/g, '#')
    .replace(/<link rel="preload" href="[^"]+\.(json|woff2)" as="(fetch|font)"[^>]*>\n?\s*/g, '')
    .replace('<script src="js/site.js"', '<script src="js/offline-inhoud.js"></script>\n  <script src="js/site.js"')
    .replace(/(<body[^>]*>)/, '$1\n' + sprite);
  fs.writeFileSync(file, html);
}
const css = path.join(out, 'css', 'styles.css');
fs.writeFileSync(css, fs.readFileSync(css, 'utf8').replace(/url\("\.\.\/(assets\/fonts\/[^"]+\.woff2)"\)/g, (m, rel) =>
  'url("data:font/woff2;base64,' + fs.readFileSync(path.join(root, rel)).toString('base64') + '")'));
for (const f of ['site.js', 'stappenplan.js']) {
  const file = path.join(out, 'js', f);
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/assets\/icons\.svg#/g, '#'));
}

fs.writeFileSync(path.join(out, 'LEESMIJ.txt'), [
  'Grip op Stroom - offline versie van de website',
  '',
  'Dubbelklik index.html om de site te openen. Er is geen internet of server nodig.',
  'Het contactformulier verstuurt offline niets. De beheerpagina zit niet in deze versie.',
  '',
  'Gemaakt op ' + new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' met scripts/build-offline.js.',
  ''
].join('\r\n'));

fs.rmSync(pub, { recursive: true, force: true });
console.log('Offline versie klaar in ' + path.relative(process.cwd(), out) + ' (' + pages.length + " pagina's)");
