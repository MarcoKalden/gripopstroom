#!/usr/bin/env node
/* Test alle pagina's in Chromium:
   - geen horizontaal scrollen op 360, 768, 1024 en 1440 px
   - geen fouten in de console, geen verzoeken naar andere domeinen
   - geen axe-fouten (WCAG 2.2 AA)
   - labelanimatie: scroll op desktop, knoppen en pijltjestoetsen op mobiel
   - teaser op de homepage
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
const PAGES = ['index.html', 'zo-werkt-het.html', 'over-ons.html', 'contact.html',
  'privacy.html', 'cookies.html', 'voorwaarden.html', 'klachten.html', 'toegankelijkheid.html'];
const WIDTHS = [360, 768, 1024, 1440];

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
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
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

async function testAnimation(browser) {
  console.log('\nLabelanimatie op Zo werkt het');
  // Desktop: scroll-modus, header verdwijnt boven de animatie.
  {
    const { context, page } = await openPage(browser, 'zo-werkt-het.html', { width: 1440, height: 900 });
    const scrollMode = await page.$eval('[data-label-animation]', (el) => el.classList.contains('is-scroll-mode'));
    if (!scrollMode) fail('desktop: geen scroll-modus');
    const top = await page.$eval('.anim__track', (el) => el.getBoundingClientRect().top + window.scrollY);
    await page.evaluate((y) => window.scrollTo(0, y), top + 2 * 900 + 100);
    await page.waitForTimeout(700);
    const current = await page.$eval('.steps__btn[aria-current="step"]', (b) => b.getAttribute('aria-label'));
    if (!/^2\./.test(current)) fail('desktop: scrollen naar stap 2 geeft ' + current);
    const hidden = await page.$eval('.site-header', (h) => h.classList.contains('is-hidden'));
    if (!hidden) fail('desktop: header staat over de animatie');
    if (scrollMode && /^2\./.test(current) && hidden) ok('desktop: scroll stuurt de stappen, header uit beeld');
    await context.close();
  }
  // Mobiel: knoppen en pijltjestoetsen.
  {
    const { context, page } = await openPage(browser, 'zo-werkt-het.html', { width: 390, height: 800 });
    await page.click('[data-next]');
    await page.click('[data-next]');
    let current = await page.$eval('.steps__btn[aria-current="step"]', (b) => b.getAttribute('aria-label'));
    if (!/^2\./.test(current)) fail('mobiel: twee keer Volgende geeft ' + current);
    await page.focus('[data-figure]');
    await page.keyboard.press('ArrowLeft');
    current = await page.$eval('.steps__btn[aria-current="step"]', (b) => b.getAttribute('aria-label'));
    if (!/^1\./.test(current)) fail('mobiel: pijltje links geeft ' + current);
    else ok('mobiel: knoppen en pijltjestoetsen werken');
    await context.close();
  }
}

async function testHome(browser) {
  console.log('\nHomepage');
  const { context, page } = await openPage(browser, 'index.html', { width: 1280, height: 900 });
  const before = await page.textContent('[data-teaser-label]');
  await page.click('.teaser__tab:nth-child(3)');
  await page.waitForTimeout(900);
  const after = await page.textContent('[data-teaser-label]');
  const cost = await page.textContent('[data-teaser-cost]');
  if (before !== 'C' || after !== 'A++') fail(`teaser: label ${before} -> ${after}`);
  else ok(`teaser: C -> A++, kosten ${cost}`);
  await page.keyboard.press('ArrowLeft');
  const sel = await page.$eval('.teaser__tab[aria-selected="true"]', (t) => t.textContent);
  if (!/Ferme/.test(sel)) fail('teaser: pijltje links werkt niet'); else ok('teaser: pijltjestoetsen');
  const ld = await page.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => JSON.parse(x.textContent)['@type']));
  if (!ld.includes('FAQPage') || !ld.includes('HomeAndConstructionBusiness')) fail('structured data ontbreekt: ' + ld);
  else ok('structured data: ' + ld.join(', '));
  // Mobiel menu
  await page.setViewportSize({ width: 390, height: 800 });
  await page.click('[data-menu-toggle]');
  const open = await page.isVisible('#site-nav');
  await page.keyboard.press('Escape');
  const closed = !(await page.isVisible('#site-nav'));
  if (!open || !closed) fail('mobiel menu opent of sluit niet'); else ok('mobiel menu: openen en sluiten met Escape');
  await context.close();
}

async function testReducedMotion(browser) {
  console.log('\nMinder beweging');
  for (const file of ['index.html', 'zo-werkt-het.html']) {
    const { context, page } = await openPage(browser, file, { width: 1280, height: 900 }, { reducedMotion: 'reduce' });
    await scrollThrough(page);
    const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
    const hiddenReveal = await page.$$eval('.reveal:not(.is-visible)', (els) => els.length);
    if (running || hiddenReveal) fail(`${file}: ${running} animaties, ${hiddenReveal} verborgen blokken`);
    else ok(file);
    await context.close();
  }
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
    await r.fulfill({ response: res, json });
  };
  for (const file of ['index.html', 'over-ons.html', 'contact.html', 'privacy.html']) {
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
    await testAnimation(browser);
    await testHome(browser);
    await testReducedMotion(browser);
    await testEverythingOn(browser);
  } finally {
    await browser.close();
  }
  console.log(failures ? `\n${failures} fouten` : '\nAlle tests geslaagd');
  process.exit(failures ? 1 : 0);
})();
