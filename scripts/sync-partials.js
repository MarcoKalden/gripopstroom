#!/usr/bin/env node
/* Kopieert partials/head.html, header.html en footer.html naar elke pagina,
   tussen de markeringen <!-- head:start --> ... <!-- head:end --> enzovoort.
   Staat siteUrl in content/site.json, dan zet het script ook canonical en og:url
   in elke pagina en schrijft het sitemap.xml en robots.txt.
   Geen buildstap: het resultaat staat gewoon in de HTML en wordt mee-gecommit.
   Gebruik: node scripts/sync-partials.js */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const parts = ['head', 'header', 'contact', 'footer'].map((name) => ({
  name,
  html: fs.readFileSync(path.join(root, 'partials', name + '.html'), 'utf8').trimEnd()
}));

const site = JSON.parse(fs.readFileSync(path.join(root, 'content', 'site.json'), 'utf8'));
const siteUrl = (site.siteUrl || '').replace(/\/$/, '');
const pages = fs.readdirSync(root).filter((f) => f.endsWith('.html')).sort();
const indexable = [];
let changed = 0;
for (const file of pages) {
  const full = path.join(root, file);
  let html = fs.readFileSync(full, 'utf8');
  const before = html;
  const pageUrl = siteUrl + '/' + (file === 'index.html' ? '' : file);
  for (const { name, html: rawPart } of parts) {
    let part = rawPart;
    if (name === 'head' && siteUrl) {
      part += '\n<link rel="canonical" href="' + pageUrl + '">\n<meta property="og:url" content="' + pageUrl + '">';
      part = part.replace('content="assets/og-image.png"', 'content="' + siteUrl + '/assets/og-image.png"');
    }
    const re = new RegExp('([ \\t]*)<!-- ' + name + ':start -->[\\s\\S]*?<!-- ' + name + ':end -->');
    html = html.replace(re, (m, indent) => {
      const body = part.split('\n').map((l) => (l ? indent + l : l)).join('\n');
      return indent + '<!-- ' + name + ':start -->\n' + body + '\n' + indent + '<!-- ' + name + ':end -->';
    });
  }
  if (!/name="robots" content="noindex"/.test(html)) indexable.push(pageUrl);
  if (html !== before) {
    fs.writeFileSync(full, html);
    changed++;
  }
}
console.log('Bijgewerkt: ' + changed + ' van ' + pages.length + ' pagina\'s');

let robots = 'User-agent: *\nAllow: /\n';
if (siteUrl) {
  const urls = indexable.map((u) => '  <url><loc>' + u + '</loc></url>').join('\n');
  fs.writeFileSync(path.join(root, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '\n</urlset>\n');
  robots += '\nSitemap: ' + siteUrl + '/sitemap.xml\n';
  console.log('sitemap.xml geschreven met ' + indexable.length + ' pagina\'s');
} else {
  console.log('Geen siteUrl in content/site.json: geen canonical, og:url en sitemap.xml.');
}
fs.writeFileSync(path.join(root, 'robots.txt'), robots);
