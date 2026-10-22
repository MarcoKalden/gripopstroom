#!/usr/bin/env node
/* Test alle pagina's in Chromium:
   - geen horizontaal scrollen op 360, 768, 1024 en 1440 px
   - geen fouten in de console, geen verzoeken naar andere domeinen
   - geen axe-fouten (WCAG 2.2 AA)
   - stappenplan: stappenbalk, pijltjestoetsen, ?stap= in de URL, de warmtepomp als laatste stap
   - homepage: een hotspot per installatie, Grippunten (geen abonnement), structured data,
     maximaal vijf vragen, menu op smalle schermen
   - contactformulier: foutmeldingen en focus; zoeken in de vragen
   - met prefers-reduced-motion beweegt er niets automatisch
   - alles met enabled: false tijdelijk aan (alleen in de test) en dan nog steeds netjes
   - beheerpagina met een nagebootste GitHub: inloggen, voorbeeld, controles, publiceren en foto's
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
const sharp = require('sharp');

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
  // Isolatie heeft een beeld met eigen nummer en titel: dan geen extra onderdeel-label.
  const chipHidden = await page.$eval('[data-part-chip]', (c) => c.hidden);
  if (!chipHidden) fail('onderdeel-label staat over een beeld met eigen titel'); else ok('beeld met eigen titel: geen extra label');
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

  // Laatste stap: de warmtepomp, nog zonder cijfers ("Volgt").
  const wp = await openPage(browser, 'zo-werkt-het.html?stap=warmtepomp', { width: 1440, height: 900 });
  sel = await wp.page.$eval('[role="tab"][aria-selected="true"]', (t) => t.textContent);
  const wpCost = await wp.page.textContent('[data-cost]');
  const wpImg = await wp.page.$eval('[data-render-stage] img', (i) => i.naturalWidth).catch(() => 0);
  const last = await wp.page.$eval('[data-next]', (b) => b.disabled);
  // Verwacht bedrag uit steps.json; "Volgt" zolang de stap nog pending is.
  const wpStep = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'steps.json'), 'utf8')).steps.find((st) => st.id === 'warmtepomp');
  const wpExpected = wpStep.pending ? 'Volgt' : '€\u00a0' + wpStep.energyCostPerYear.toLocaleString('nl-NL');
  if (!/Warmtepomp/.test(sel) || wpCost !== wpExpected || !wpImg || !last) fail(`?stap=warmtepomp: ${sel}, kosten ${wpCost} (verwacht ${wpExpected}), beeld ${wpImg}px, laatste stap ${last}`);
  else ok(`?stap=warmtepomp: laatste stap, beeld geladen, kosten ${wpCost}`);
  await wp.context.close();
}

async function testHome(browser) {
  console.log('\nHomepage');
  const { context, page } = await openPage(browser, 'index.html', { width: 1280, height: 900 });
  const module = await page.$('[data-stappenplan]');
  if (module) fail('homepage bevat nog de stappenplan-module'); else ok('geen stappenplan-module op de homepage');
  const comfortItems = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content', 'home.json'), 'utf8'))
    .comfort.items.filter((i) => i.enabled !== false).length;
  const spots = await page.$$eval('.hotspot', (as) => as.map((a) => a.textContent.trim() + ' -> ' + a.getAttribute('href')));
  if (spots.length !== comfortItems) fail(`hotspots: ${spots.length} van ${comfortItems}: ` + spots.join(', '));
  else ok('hotspots: ' + spots.join(' | '));
  await page.hover('.hotspot:nth-of-type(1)');
  const linked = await page.$eval('.feature.is-active .feature__title', (e) => e.textContent).catch(() => '');
  if (!linked) fail('hotspot markeert de rij niet'); else ok('hotspot markeert rij: ' + linked);
  const faq = await page.$$eval('#vragen .faq__item', (d) => d.length);
  if (faq > 5 || faq === 0) fail(faq + ' vragen op de homepage'); else ok(faq + ' vragen op de homepage');
  const ld = await page.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => JSON.parse(x.textContent)));
  const biz = ld.find((x) => x['@type'] === 'HomeAndConstructionBusiness');
  if (!biz || !biz.address || !biz.telephone || !ld.find((x) => x['@type'] === 'FAQPage')) fail('structured data onvolledig');
  else ok(`structured data: ${biz.address.streetAddress}, ${biz.telephone}, FAQPage`);
  // Het abonnement is vervangen door Grippunten.
  const pointCards = await page.$$eval('#grippunten .points__card', (c) => c.length);
  const mainText = await page.textContent('main');
  if (pointCards !== 3 || /abonnement|griptegoed/i.test(mainText)) fail(`Grippunten: ${pointCards} kaarten, abonnement nog genoemd: ${/abonnement|griptegoed/i.test(mainText)}`);
  else ok('Grippunten: 3 kaarten, geen abonnement meer');
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

// Beheerpagina met een nagebootste GitHub: inloggen, tekst aanpassen, voorbeeld, controle en publiceren.
async function testBeheer(browser) {
  console.log('\nBeheerpagina');
  const root = path.join(__dirname, '..');
  const puts = [];
  const processed = new Set(); // foto's die de nagebootste GitHub Action al verwerkt heeft
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => { window.GOS_BEHEER_POLL_MS = 150; });
  const page = await context.newPage();
  page.on('dialog', (d) => d.accept());
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.route('https://api.github.com/**', async (r) => {
    const url = new URL(r.request().url());
    const auth = r.request().headers().authorization;
    if (auth !== 'Bearer github_pat_test') return r.fulfill({ status: 401, json: { message: 'Bad credentials' } });
    if (url.pathname === '/repos/MarcoKalden/gripopstroom') return r.fulfill({ json: { default_branch: 'main' } });
    if (url.pathname === '/user') return r.fulfill({ json: { login: 'testbeheerder' } });
    const m = url.pathname.match(/^\/repos\/MarcoKalden\/gripopstroom\/contents\/(.+)$/);
    if (m && m[1] === 'grip-op-stroom-fotos') {
      return r.fulfill({ json: fs.readdirSync(path.join(root, m[1])).map((f) => ({ name: f, sha: 'sha-' + m[1] + '/' + f })) });
    }
    const variant = m && m[1].match(/^assets\/foto\/(.+)-1600\.jpg$/);
    if (variant) {
      // Na een upload is de foto bij de tweede vraag verwerkt.
      const name = variant[1];
      if (processed.has(name + ':wacht')) { processed.delete(name + ':wacht'); processed.add(name); }
      else if (puts.some((p) => p.file === 'grip-op-stroom-fotos/' + name + '.jpg') && !processed.has(name)) processed.add(name + ':wacht');
      if (processed.has(name)) return r.fulfill({ json: { sha: 'verwerkt-' + name } });
      return fs.existsSync(path.join(root, m[1])) ? r.fulfill({ json: { sha: 'oud-' + name } }) : r.fulfill({ status: 404, json: { message: 'Not Found' } });
    }
    if (m && r.request().method() === 'GET') {
      const content = fs.readFileSync(path.join(root, m[1])).toString('base64');
      return r.fulfill({ json: { sha: 'sha-' + m[1], content } });
    }
    if (m && r.request().method() === 'PUT') {
      puts.push({ file: m[1], body: r.request().postDataJSON() });
      return r.fulfill({ json: { content: { sha: 'nieuw' } } });
    }
    return r.fulfill({ status: 404, json: { message: 'Not Found' } });
  });
  await page.goto(BASE + 'beheer.html', { waitUntil: 'networkidle' });

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  if (axe.violations.length) axe.violations.forEach((v) => fail(`beheer inloggen: ${v.id} ${v.help}`)); else ok('inlogscherm: geen axe-fouten');

  await page.fill('#token', 'fout');
  await page.click('[data-login-form] button[type="submit"]');
  await page.waitForSelector('[data-login-error]:not(:empty)');
  ok('verkeerde sleutel: ' + await page.textContent('[data-login-error]'));

  await page.fill('#token', 'github_pat_test');
  await page.click('[data-login-form] button[type="submit"]');
  await page.waitForSelector('[data-view="editor"]:not([hidden])');
  const user = await page.textContent('[data-user-name]');
  if (!/testbeheerder/.test(user)) fail('gebruikersnaam: ' + user); else ok('ingelogd: ' + user);

  // Titel van de homepage aanpassen en terugzien in het voorbeeld.
  const home = JSON.parse(fs.readFileSync(path.join(root, 'content/home.json'), 'utf8'));
  const field = await page.evaluateHandle((t) => [...document.querySelectorAll('[data-form] input, [data-form] textarea')].find((el) => el.value === t), home.hero.title);
  if (!field.asElement()) fail('veld met de titel van de homepage niet gevonden');
  await field.asElement().fill('Testtitel uit beheer');
  const frame = page.frameLocator('[data-preview]');
  await frame.locator('h1', { hasText: 'Testtitel uit beheer' }).waitFor({ timeout: 8000 })
    .then(() => ok('voorbeeld toont de nieuwe titel'), () => fail('voorbeeld toont de nieuwe titel niet'));

  // Onbekende bron blokkeert publiceren.
  const lead = await page.evaluateHandle((t) => [...document.querySelectorAll('[data-form] textarea')].find((el) => el.value === t), home.hero.lead);
  await lead.asElement().fill(home.hero.lead + '[[bestaat-niet]]');
  await page.click('[data-publish]');
  const blocked = await page.isDisabled('[data-publish-confirm]');
  const msg = await page.textContent('[data-publish-error]');
  if (!blocked || !/bestaat-niet/.test(msg)) fail('onbekende bron blokkeert publiceren niet'); else ok('onbekende bron blokkeert publiceren');
  await page.click('[data-publish-dialog] button[value="cancel"]');
  await lead.asElement().fill(home.hero.lead);

  // Stappenplan: een label buiten de schaal geeft een fout.
  await page.selectOption('[data-file-select]', 'steps.json');
  const label = await page.evaluateHandle(() => {
    const el = [...document.querySelectorAll('[data-form] input[type="text"]')].find((i) => i.value === 'A++++');
    for (let d = el && el.closest('details'); d; d = d.parentElement.closest('details')) d.open = true;
    return el;
  });
  await label.asElement().fill('Z');
  const labelError = await page.evaluate(() => [...document.querySelectorAll('[data-form] .beheer-error')].map((e) => e.textContent).join(' '));
  if (!/Kies een label/.test(labelError)) fail('label buiten de schaal geeft geen fout'); else ok('label buiten de schaal geeft een fout');
  await label.asElement().fill('A++++');

  // Publiceren: alleen de homepage, met precies de ene wijziging.
  await page.click('[data-publish]');
  const diff = await page.textContent('[data-diff]');
  if (!/Testtitel uit beheer/.test(diff) || !/Homepage/.test(diff)) fail('overzicht van wijzigingen: ' + diff); else ok('overzicht van wijzigingen klopt');
  await page.fill('[data-publish-message]', 'Test');
  await page.click('[data-publish-confirm]');
  await page.waitForFunction(() => /Gepubliceerd/.test(document.querySelector('[data-status]').textContent));
  const expected = JSON.parse(JSON.stringify(home));
  expected.hero.title = 'Testtitel uit beheer';
  const sent = puts.length === 1 ? Buffer.from(puts[0].body.content, 'base64').toString('utf8') : '';
  if (puts.length !== 1 || puts[0].file !== 'content/home.json' || puts[0].body.branch !== 'main' || puts[0].body.sha !== 'sha-content/home.json' ||
      sent !== JSON.stringify(expected, null, 2) + '\n') {
    fail('publiceren stuurt niet de juiste wijziging: ' + JSON.stringify(puts.map((p) => p.file)));
  } else ok('publiceren: één commit op content/home.json met alleen de nieuwe titel');

  // Foto kiezen bij een pakket: keuzelijst met alleen foto's die op de site staan.
  await page.selectOption('[data-file-select]', 'content/pakketten.json');
  const photoSelect = await page.evaluateHandle(() => {
    const el = [...document.querySelectorAll('[data-form] select')].find((s) => s.value === 'ontbijt-gezin');
    for (let d = el && el.closest('details'); d; d = d.parentElement.closest('details')) d.open = true;
    return el;
  });
  if (!photoSelect.asElement()) fail('fotoveld bij Ferme grip niet gevonden');
  else {
    await photoSelect.asElement().selectOption('bank-stel');
    await page.click('[data-publish]');
    const photoDiff = await page.textContent('[data-diff]');
    if (!/ontbijt-gezin/.test(photoDiff) || !/bank-stel/.test(photoDiff)) fail('fotokeuze niet in het overzicht: ' + photoDiff); else ok('foto kiezen bij een pakket');
    await page.click('[data-publish-dialog] button[value="cancel"]');
    await page.click('[data-reset]');
  }

  // Nieuwe foto uploaden vanuit een fotoveld: na de verwerking staat hij vanzelf in dat veld.
  let fieldPhotoLive = false;
  await page.route('**/assets/foto/veld-foto-640.webp*', (r) => (fieldPhotoLive
    ? r.fulfill({ path: path.join(root, 'assets/foto/keuken-senioren-640.webp'), contentType: 'image/webp' })
    : r.fulfill({ status: 404, body: '' })));
  const fieldRow = page.locator('.beheer-field--photo').first();
  await fieldRow.evaluate((el) => { for (let d = el.closest('details'); d; d = d.parentElement.closest('details')) d.open = true; });
  await fieldRow.getByRole('button', { name: '+ Nieuwe foto uploaden' }).click();
  await page.setInputFiles('#upload-file', path.join(root, 'grip-op-stroom-fotos', 'keuken-senioren.jpg'));
  await page.waitForSelector('.beheer-upload__result img');
  await page.fill('#upload-name', 'veld-foto');
  await page.click('[data-upload] >> text=Foto uploaden');
  await page.waitForFunction(() => /Verwerkt/.test((document.querySelector('[data-upload] .beheer-photo__status') || {}).textContent || ''), null, { timeout: 8000 })
    .then(() => ok('upload vanuit een fotoveld: toont de voortgang'), () => fail('upload vanuit een fotoveld: geen voortgang'));
  fieldPhotoLive = true;
  await page.waitForFunction(() => [...document.querySelectorAll('.beheer-field--photo select')].some((s) => s.value === 'veld-foto'), null, { timeout: 8000 })
    .then(() => ok('upload vanuit een fotoveld: daarna vanzelf gekozen'), () => fail('upload vanuit een fotoveld: foto niet gekozen'));
  await page.click('[data-reset]');

  // Nieuwe foto: staande, kleine foto geeft waarschuwingen; een bestaande naam wordt geweigerd.
  await page.selectOption('[data-file-select]', '__fotos');
  const cards = await page.locator('.beheer-photo').count();
  // De bestaande foto's plus de foto die hierboven vanuit het fotoveld is geüpload.
  if (cards !== fs.readdirSync(path.join(root, 'grip-op-stroom-fotos')).length + 1) fail('fotolijst toont ' + cards + ' foto\'s'); else ok('fotolijst: ' + cards + ' foto\'s');
  const usage = await page.locator('.beheer-photo', { hasText: 'woonkamer-gezin' }).textContent();
  const bankUsage = await page.locator('.beheer-photo', { hasText: 'bank-stel' }).textContent();
  if (!/Pakketten: Volledige grip/.test(bankUsage)) fail('gebruik van bank-stel: ' + bankUsage); else ok('fotolijst: korte omschrijving van waar een foto staat');
  if (!/grote foto bovenaan/.test(usage)) fail('gebruik van woonkamer-gezin: ' + usage); else ok('fotolijst toont waar een foto staat');
  await page.click('text=+ Nieuwe foto toevoegen');
  const small = await sharp({ create: { width: 800, height: 1000, channels: 3, background: '#88aa99' } }).jpeg().toBuffer();
  await page.setInputFiles('#upload-file', { name: 'Klein staand.jpg', mimeType: 'image/jpeg', buffer: small });
  await page.waitForSelector('.beheer-warning');
  const warnings = await page.locator('.beheer-warning').allTextContents();
  if (!warnings.some((w) => /staande foto/.test(w)) || !warnings.some((w) => /800 pixels/.test(w))) fail('waarschuwingen: ' + warnings.join(' | ')); else ok('waarschuwing voor een staande en te kleine foto');
  await page.screenshot({ path: path.join(OUT, 'beheer-fotos-1440.png'), fullPage: false });
  const suggested = await page.inputValue('#upload-name');
  if (suggested !== 'klein-staand') fail('voorgestelde naam: ' + suggested); else ok('naam voorgesteld uit de bestandsnaam');
  await page.fill('#upload-name', 'bank-stel');
  await page.click('text=Foto uploaden');
  if (!/al een foto met deze naam/.test(await page.textContent('#upload-error'))) fail('bestaande naam niet geweigerd'); else ok('bestaande naam geweigerd');

  // Uploaden: JPG in 16:9 naar grip-op-stroom-fotos/, wachten op verwerking, daarna op de site.
  await page.setInputFiles('#upload-file', path.join(root, 'grip-op-stroom-fotos', 'keuken-senioren.jpg'));
  await page.waitForSelector('.beheer-upload__result img');
  await page.fill('#upload-name', 'test-foto');
  let testPhotoLive = false;
  await page.route('**/assets/foto/test-foto-640.webp*', (r) => (testPhotoLive
    ? r.fulfill({ path: path.join(root, 'assets/foto/keuken-senioren-640.webp'), contentType: 'image/webp' })
    : r.fulfill({ status: 404, body: '' })));
  await page.click('text=Foto uploaden');
  await page.locator('.beheer-photo', { hasText: 'test-foto' }).locator('.beheer-photo__status', { hasText: 'Verwerkt' }).waitFor({ timeout: 8000 })
    .then(() => ok('upload: wacht op de verwerking door GitHub'), () => fail('upload: status "Verwerkt" komt niet'));
  testPhotoLive = true;
  await page.locator('.beheer-photo', { hasText: 'test-foto' }).locator('.beheer-photo__status', { hasText: 'Klaar' }).waitFor({ timeout: 8000 })
    .then(() => ok('upload: daarna op de site en te kiezen'), () => fail('upload: status "Klaar" komt niet'));
  const upload = puts.find((p) => p.file === 'grip-op-stroom-fotos/test-foto.jpg');
  if (!upload) fail('geen upload naar grip-op-stroom-fotos/test-foto.jpg');
  else {
    const meta = await sharp(Buffer.from(upload.body.content, 'base64')).metadata();
    if (meta.format !== 'jpeg' || Math.abs(meta.width / meta.height - 16 / 9) > 0.01 || upload.body.sha || upload.body.branch !== 'main') {
      fail(`upload: ${meta.format} ${meta.width}x${meta.height}, sha ${upload.body.sha}, branch ${upload.body.branch}`);
    } else ok(`upload: JPG ${meta.width}x${meta.height} (16:9), nieuw bestand op main`);
  }

  // Vervangen: zelfde naam, met de sha van het oude bestand.
  await page.locator('.beheer-photo', { hasText: 'bank-stel' }).getByRole('button', { name: /vervangen/i }).click();
  await page.setInputFiles('#upload-file', path.join(root, 'grip-op-stroom-fotos', 'ontbijt-gezin.jpg'));
  await page.waitForSelector('.beheer-upload__result img');
  await page.click('[data-upload] >> text=Foto vervangen');
  await page.locator('.beheer-photo', { hasText: 'bank-stel' }).locator('.beheer-photo__status', { hasText: 'Verwerkt' }).waitFor({ timeout: 8000 })
    .then(() => ok('vervangen: wacht op de verwerking'), () => fail('vervangen: status "Verwerkt" komt niet'));
  const replaced = puts.find((p) => p.file === 'grip-op-stroom-fotos/bank-stel.jpg');
  if (!replaced || replaced.body.sha !== 'sha-grip-op-stroom-fotos/bank-stel.jpg') fail('vervangen stuurt niet de sha van het oude bestand mee'); else ok('vervangen: overschrijft bank-stel.jpg');

  await page.selectOption('[data-file-select]', 'content/home.json');
  await page.screenshot({ path: path.join(OUT, 'beheer-1440.png'), fullPage: false });
  await page.setViewportSize({ width: 390, height: 900 });
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  if (sw > 390) fail('beheer @390: horizontaal scrollen (' + sw + 'px)'); else ok('beheer @390: geen horizontaal scrollen');
  const axe2 = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).exclude('[data-preview]').analyze();
  if (axe2.violations.length) axe2.violations.forEach((v) => fail(`beheer editor: ${v.id} ${v.help} -> ${v.nodes[0].target.join(' ')}`)); else ok('editor: geen axe-fouten');
  if (errors.length) fail('beheer: ' + errors.join(' | ')); else ok('geen fouten in de console');
  await context.close();
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
    await testBeheer(browser);
  } finally {
    await browser.close();
  }
  console.log(failures ? `\n${failures} fouten` : '\nAlle tests geslaagd');
  process.exit(failures ? 1 : 0);
})();
