/* Zet de teksten uit content/ in de HTML van een pagina, zoals js/site.js dat in de browser doet.
   Zo staat wat je in de beheerpagina wijzigt ook in de HTML zelf: voor zoekmachines, voor
   bezoekers zonder JavaScript en voordat het script geladen is (geen flits van oude tekst).

   Wat wordt bijgewerkt:
   - de tekst van elementen met data-text="pad" (alleen gewone tekst, geen geneste HTML)
   - href bij data-href="pad", aria-label bij data-text-aria="pad"
   - de grote foto met data-photo en data-photo-current (andere foto en beschrijving)
   - <title> en <meta name="description"> uit meta
   Lijsten (menu, footerlinks) en voorwaardelijke onderdelen vult js/site.js zoals altijd.

   Gebruikt door scripts/build-public.js; werkt op de kopie in public/, nooit op de bron. */
'use strict';
const fs = require('fs');
const path = require('path');
const rules = require('../js/content-rules.js');

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
function merge(base, extra) {
  const out = {};
  Object.keys(base || {}).forEach((k) => { out[k] = base[k]; });
  Object.keys(extra || {}).forEach((k) => {
    out[k] = isPlainObject(out[k]) && isPlainObject(extra[k]) ? merge(out[k], extra[k]) : extra[k];
  });
  return out;
}
const getPath = (obj, p) => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => escText(s).replace(/"/g, '&quot;');
// Bronverwijzingen ([[id]]) maakt het script tot nummers; in de HTML laten we ze weg.
const plain = (s) => String(s).replace(/\[\[[\w-]+\]\]/g, '');

function contentFor(root, html) {
  const m = html.match(/<body[^>]*\sdata-content="([^"]*)"/);
  const files = ['content/site.json'].concat(m ? m[1].split(/\s+/).filter(Boolean) : []);
  const content = files.map((f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'))).reduce(merge, {});
  return rules.prepare(content);
}

function bakeHtml(html, content) {
  let count = 0;
  // Alleen buiten <template>: daarin staan de sjablonen voor lijsten.
  const mask = (h) => h.replace(/<template\b[\s\S]*?<\/template>/g, (t) => '\u0000'.repeat(t.length));
  // Voert een reeks wijzigingen [start, lengte, nieuw] uit, van achter naar voren.
  const apply = (edits) => {
    edits.sort((a, b) => b[0] - a[0]);
    for (const [start, len, text] of edits) {
      html = html.slice(0, start) + text + html.slice(start + len);
      count++;
    }
  };
  let m;

  // Ronde 1: attributen (href, aria-label).
  const attrEdits = [];
  const attrRe = /<[a-z][a-z0-9]*\b[^>]*\sdata-(href|text-aria)="([^"]+)"[^>]*>/g;
  let masked = mask(html);
  while ((m = attrRe.exec(masked))) {
    const v = getPath(content, m[2]);
    if (typeof v !== 'string' || !v) continue;
    const attr = m[1] === 'href' ? 'href' : 'aria-label';
    const before = html.slice(m.index, m.index + m[0].length);
    const re = new RegExp('\\s' + attr + '="[^"]*"');
    const tag = re.test(before) ? before.replace(re, ' ' + attr + '="' + escAttr(plain(v)) + '"')
      : before.replace(/^<([a-z][a-z0-9]*)/, '<$1 ' + attr + '="' + escAttr(plain(v)) + '"');
    if (tag !== before) attrEdits.push([m.index, before.length, tag]);
  }
  apply(attrEdits);

  // Ronde 2: tekst van elementen met data-text (alleen gewone tekst, geen geneste HTML).
  const textEdits = [];
  const textRe = /<([a-z][a-z0-9]*)\b([^>]*?)\sdata-text="([^"]+)"([^>]*)>([^<]*)<\/\1>/g;
  masked = mask(html);
  while ((m = textRe.exec(masked))) {
    const v = getPath(content, m[3]);
    if (typeof v !== 'string' && typeof v !== 'number') continue;
    const full = html.slice(m.index, m.index + m[0].length);
    const open = full.slice(0, full.indexOf('>') + 1);
    const replaced = open + escText(plain(v)) + '</' + m[1] + '>';
    if (replaced !== full) textEdits.push([m.index, full.length, replaced]);
  }
  apply(textEdits);

  // Grote foto die al in de HTML staat (data-photo-current): andere foto of beschrijving.
  html = html.replace(/(<div\b[^>]*\sdata-photo="([^"]+)"[^>]*>)([\s\S]*?<\/picture>)/g, (all, open, p, inner) => {
    const cur = (open.match(/data-photo-current="([^"]+)"/) || [])[1];
    const want = getPath(content, p);
    const altPath = (open.match(/data-photo-alt="([^"]+)"/) || [])[1];
    const alt = altPath ? getPath(content, altPath) : null;
    if (!cur) return all;
    let out = inner;
    if (typeof want === 'string' && want && want !== cur) {
      out = out.split('assets/foto/' + cur + '-').join('assets/foto/' + want + '-');
      open = open.replace('data-photo-current="' + cur + '"', 'data-photo-current="' + want + '"');
    }
    if (typeof alt === 'string') out = out.replace(/(<img\b[^>]*\salt=")[^"]*(")/, '$1' + escAttr(alt) + '$2');
    if (open + out !== all) count++;
    return open + out;
  });

  if (content.meta) {
    if (content.meta.title) html = html.replace(/<title>[^<]*<\/title>/, '<title>' + escText(content.meta.title) + '</title>');
    if (content.meta.description) {
      html = html.replace(/(<meta name="description" content=")[^"]*(")/, '$1' + escAttr(content.meta.description) + '$2');
    }
  }
  return { html, count };
}

// Werkt alle pagina's in een map bij (bijvoorbeeld public/). root is de map met content/.
function bakeDir(root, dir) {
  let total = 0;
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.html') && n !== 'beheer.html')) {
    const full = path.join(dir, f);
    const html = fs.readFileSync(full, 'utf8');
    if (!/data-content=|js\/site\.js/.test(html)) continue;
    const res = bakeHtml(html, contentFor(root, html));
    if (res.html !== html) fs.writeFileSync(full, res.html);
    total += res.count;
  }
  return total;
}

module.exports = { bakeHtml, bakeDir, contentFor };
