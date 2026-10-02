#!/usr/bin/env node
/* Test alle pagina's in Chromium:
   - geen horizontaal scrollen op 360, 768, 1024 en 1440 px
   - geen fouten in de console, geen verzoeken naar andere domeinen
   - geen axe-fouten (WCAG 2.2 AA)
   - stappenplan: stappenbalk, pijltjestoetsen, ?stap= in de URL
   - homepage: hotspots, structured data, maximaal vijf vragen, menu op smalle schermen
   - contactformulier: foutmeldingen en focus; zoeken in de vragen
   - met prefers-reduced-motion beweegt er niets automatisch
   - alles met enabled: false tijdelijk aan (alleen in de test) en dan nog steeds netjes
   Schermafdrukken komen in tests/screenshots/.

   Gebruik:
     cd tests && npm install && npm test
   De site moet draaien: python3 -m http.server 8000 (in de hoofdmap).
   Eigen Chromium: CHROMIUM_PATH=/pad/naar/chrome npm test */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

const BASE = process.env.BASE_URL || 'http://localhost:8000/';
const OUT = path.join(__dirname, 'screenshots');
const PAGES = ['index.html', 'zo-werkt-het.html', 'pakketten.html', 'vragen.html', 'over-ons.html', 'contact.html',
  'privacy.html', 'cookies.html', 'voorwaarden.html', 'klachten.html', 'toegankelijkheid.html'];
const WIDTHS = [390, 768, 1024, 1440];
// Renders die nog niet bestaan geven een 404; de site toont dan een gelabelde placeholder.
const EXPECTED_MISSING = /\/assets\/woning\//;

let failures = 0;
const fail = (msg) => { failures++; console.log('  FOUT ' + msg); };
const ok = (msg) => console.log('  ok   ' + msg);

async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
}

async function openPage(browser, file, viewport, options = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: options.reducedMotion || 'no-preference' });
  const page = await context.newPage();
  const errors = [];
  const external = [];
  page.on('console', (m) => {
    if ((m.type() === 'error' || m.type() === 'warning') && !/^Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  page.on('response', (r) => { if (r.status() >= 400 && !EXPECTED_MISSING.test(r.url())) errors.push(r.status() + ' ' + r.url()); });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) external.push(r.url()); });
  if (options.route) await page.route('**/content/*.json', options.route);
  await page.goto(BASE + file, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.body.classList.contains('is-ready'));
  return { context, page, errors, external };
}

async function testLayout(browser) {
  console.log('\nOpmaak, console en externe verzoeken');
  for (const file of PAGES) {
    for (const width of WIDTHS) {
      const { context, page, errors, external } = await openPage(browser, file, { width, height: 900 });
      await scrollThrough(page);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      if (sw > width) fail(`${file} @${width}: horizontaal scrollen (${sw}px)`);
      if (errors.length) fail(`${file} @${width}: console: ${errors.join(' | ')}`);
      if (external.length) fail(`${file} @${width}: externe verzoeken: ${external.join(', ')}`);
      await page.screenshot({ path: path.join(OUT, `${file.replace('.html', '')}-${width}.png`), fullPage: true });
      await context.close();
    }
    ok(file);
  }
}

async function testAxe(browser) {
  console.log('\nToegankelijkheid (axe, WCAG 2.2 AA)');
  for (const file of PAGES) {
    for (const width of [390, 1440]) {
      const { context, page } = await openPage(browser, file, { width, height: 900 }, { reducedMotion: 'reduce' });
      const res = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      if (res.violations.length) {
        res.violations.forEach((v) => fail(`${file} @${width}: ${v.id} (${v.nodes.length}x) ${v.help} -> ${v.nodes[0].target.join(' ')}`));
      } else {
        ok(`${file} @${width}`);
      }
      await context.close();
    }
  }
}

async function testStappenplan(browser) {
  console.log('\nStappenplan op Zo werkt het');
  const { context, page } = await openPage(browser, 'zo-werkt-het.html?stap=batterij', { width: 1440, height: 900 });
  let sel = await page.$eval('[role="tab"][aria-selected="true"]', (t) => t.textContent);
  if (!/Batterij/.test(sel)) fail('?stap=batterij opent ' + sel); else ok('deeplink ?stap=batterij');
  await page.click('[role="tab"]:nth-child(2)');
  await page.waitForTimeout(800);
  sel = await page.$eval('[role="tab"][aria-selected="true"]', (t) => t.textContent);
  const url = page.url();
  const cost = await page.textContent('[data-cost]');
  if (!/Kozijnen/.test(sel) || !/stap=kozijnen/.test(url)) fail(`klik op Kozijnen: ${sel}, ${url}`);
  else ok(`klik op stap: ${sel}, URL ${url.split('?')[1]}, kosten ${cost}`);
  await page.keyboard.press('ArrowRight');
  sel = await page.$eval('[role="tab"][aria-selected="true"]', (t) => t.textContent);
  if (!/Isolatie/.test(sel)) fail('pijltje rechts geeft ' + sel); else ok('pijltjestoetsen in de stappenbalk');
  const chip = await page.textContent('[data-part-chip]');
  if (!/Isolatie/.test(chip)) fail('onderdeel-label: ' + chip); else ok('onderdeel-label: ' + chip);
  const placeholder = await page.$('[data-render-stage] .render__placeholder');
  ok(placeholder ? 'render ontbreekt nog: gelabelde placeholder zichtbaar' : 'render geladen');
  await page.click('[data-play]');
  const pressed = await page.getAttribute('[data-play]', 'aria-pressed');
  await page.click('[data-next]');
  const after = await page.getAttribute('[data-play]', 'aria-pressed');
  if (pressed !== 'true' || after !== 'false') fail(`afspelen ${pressed}, na interactie ${after}`); else ok('afspelen en pauzeren bij interactie');
  await page.setViewportSize({ width: 390, height: 800 });
  await page.click('[data-prev]');
  sel = await page.$eval('[role="tab"][aria-selected="true"]', (t) => t.textContent);
  if (!/Isolatie/.test(sel)) fail('mobiel Vorige geeft ' + sel); else ok('mobiel: knoppen werken');
  await context.close();
}

async function testHome(browser) {
  console.log('\nHomepage');
  const { context, page } = await openPage(browser, 'index.html', { width: 1280, height: 900 });
  const module = await page.$('[data-stappenplan]');
  if (module) fail('homepage bevat nog de stappenplan-module'); else ok('geen stappenplan-module op de homepage');
  const spots = await page.$$eval('.hotspot', (as) => as.map((a) => a.textContent.trim() + ' -> ' + a.getAttribute('href')));
  if (spots.length !== 3) fail('hotspots: ' + spots.join(', ')); else ok('hotspots: ' + spots.join(' | '));
  await page.hover('.hotspot:nth-of-type(1)');
  const linked = await page.$eval('.feature.is-active .feature__title', (e) => e.textContent).catch(() => '');
  if (!linked) fail('hotspot markeert de rij niet'); else ok('hotspot markeert rij: ' + linked);
  const faq = await page.$$eval('#vragen .faq__item', (d) => d.length);
  if (faq > 5 || faq === 0) fail(faq + ' vragen op de homepage'); else ok(faq + ' vragen op de homepage');
  const ld = await page.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => JSON.parse(x.textContent)));
  const biz = ld.find((x) => x['@type'] === 'HomeAndConstructionBusiness');
  if (!biz || !biz.address || !biz.telephone || !ld.find((x) => x['@type'] === 'FAQPage')) fail('structured data onvolledig');
  else ok(`structured data: ${biz.address.streetAddress}, ${biz.telephone}, FAQPage`);
  const shot = await page.$eval('.browser img', (i) => i.naturalWidth);
  if (!shot) fail('screenshot stappenplan ontbreekt'); else ok('screenshot stappenplan geladen');
  for (const w of [320, 390]) {
    await page.setViewportSize({ width: w, height: 800 });
    const visible = await page.$$eval('.site-nav a', (as) => as.filter((a) => a.getBoundingClientRect().width > 0).length);
    const overflow = await page.$eval('.site-nav__list', (el) => el.scrollWidth - el.clientWidth);
    const cta = await page.isVisible('.site-header__cta');
    if (visible < 5 || overflow > 0 || !cta) fail(`menu @${w}: ${visible} links, ${overflow}px te breed, CTA ${cta}`);
    else ok(`menu @${w}: alle links en de CTA zichtbaar`);
  }
  await context.close();
}

async function testForm(browser) {
  console.log('\nContactformulier');
  const { context, page } = await openPage(browser, 'contact.html', { width: 1280, height: 900 });
  await page.click('[data-contact-form] button[type="submit"]');
  const errors = await page.$$eval('.field__error:not([hidden])', (e) => e.length);
  const focused = await page.evaluate(() => document.activeElement && document.activeElement.name);
  if (errors !== 5 || focused !== 'naam') fail(`leeg verzenden: ${errors} meldingen, focus op ${focused}`);
  else ok('leeg verzenden: 5 meldingen, focus op het eerste veld');
  await page.fill('#cf-naam', 'Test Persoon');
  await page.fill('#cf-email', 'test@voorbeeld.nl');
  await page.fill('#cf-telefoon', '0612345678');
  await page.fill('#cf-postcode', '12AB');
  await page.fill('#cf-bericht', 'Testbericht');
  await page.click('[data-contact-form] button[type="submit"]');
  const pc = await page.textContent('[data-error-for="postcode"]');
  if (!pc) fail('ongeldige postcode niet gemeld'); else ok('ongeldige postcode gemeld: ' + pc);
  await page.fill('#cf-postcode', '7041 GX');
  await page.click('[data-contact-form] button[type="submit"]');
  const status = await page.textContent('[data-form-status]');
  if (!/nog niet gekoppeld/.test(status)) fail('geldig formulier: ' + status); else ok('geldig formulier zonder endpoint: ' + status);
  await context.close();

  const v = await openPage(browser, 'vragen.html', { width: 1280, height: 900 });
  await v.page.fill('[data-faq-search]', 'bedenktijd');
  const shown = await v.page.$$eval('.faq__item', (d) => d.filter((x) => !x.hidden).length);
  await v.page.fill('[data-faq-search]', 'xyzxyz');
  const empty = await v.page.isVisible('[data-faq-empty]');
  if (!shown || !empty) fail(`zoeken: ${shown} treffers, lege melding ${empty}`); else ok(`zoeken op "bedenktijd": ${shown} vraag`);
  await v.context.close();
}

async function testReducedMotion(browser) {
  console.log('\nMinder beweging');
  const { context, page } = await openPage(browser, 'zo-werkt-het.html', { width: 1280, height: 900 }, { reducedMotion: 'reduce' });
  const disabled = await page.$eval('[data-play]', (b) => b.disabled);
  await page.click('[data-next]');
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  if (!disabled || running) fail(`afspelen uit: ${disabled}, ${running} animaties`); else ok('afspelen uit, geen animaties');
  await context.close();
}

// Alles wat uit staat tijdelijk aan, met testtekst. Alleen in deze test.
function enableAll(value) {
  if (Array.isArray(value)) return value.map(enableAll);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = enableAll(v);
    if ('enabled' in out) out.enabled = true;
    if ('ready' in out) {
      out.ready = true;
      out.body = [{ heading: 'Testkop', text: 'Testtekst voor de opmaak.' }];
    }
    return out;
  }
  return value;
}
function fillEmpty(value, key) {
  if (Array.isArray(value)) return value.map((v) => fillEmpty(v, key));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = fillEmpty(v, k);
    return out;
  }
  if (value === '' && !/^(_|siteUrl)/.test(key)) {
    if (/href|Url|url/.test(key)) return '#test';
    if (/photo|logo/.test(key)) return 'assets/favicon.png';
    return 'Testwaarde';
  }
  return value;
}

async function testEverythingOn(browser) {
  console.log('\nAlles aan (alleen in de test)');
  const route = async (r) => {
    const res = await r.fetch();
    const json = fillEmpty(enableAll(await res.json()));
    if (json.reviews) json.reviews.items = [{ quote: 'Testcitaat', author: 'Test', place: 'Teststad' }];
    if (json.contactForm) json.contactForm.endpoint = '';
    await r.fulfill({ response: res, json });
  };
  for (const file of ['index.html', 'pakketten.html', 'over-ons.html', 'contact.html', 'privacy.html']) {
    for (const width of [390, 1440]) {
      const { context, page, errors } = await openPage(browser, file, { width, height: 900 }, { route });
      await scrollThrough(page);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      if (sw > width) fail(`${file} @${width} alles aan: horizontaal scrollen (${sw}px)`);
      if (errors.length) fail(`${file} @${width} alles aan: ${errors.join(' | ')}`);
      await page.screenshot({ path: path.join(OUT, `alles-aan-${file.replace('.html', '')}-${width}.png`), fullPage: true });
      await context.close();
    }
    ok(file);
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  try {
    await testLayout(browser);
    await testAxe(browser);
    await testStappenplan(browser);
    await testHome(browser);
    await testForm(browser);
    await testReducedMotion(browser);
    await testEverythingOn(browser);
  } finally {
    await browser.close();
  }
  console.log(failures ? `\n${failures} fouten` : '\nAlle tests geslaagd');
  process.exit(failures ? 1 : 0);
})();
