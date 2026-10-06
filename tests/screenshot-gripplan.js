#!/usr/bin/env node
/* Maakt de screenshot van het stappenplan voor het Gripplan-blok op de homepage.
   Rendert zo-werkt-het.html op 1280×800 (2× retina), knipt de module uit en
   slaat hem op als assets/gripplan-screenshot.avif, .webp en .png.
   Draai opnieuw na wijzigingen aan het stappenplan of zodra de renders er zijn.

   Gebruik (site moet draaien op poort 8000):
     cd tests && npm run screenshot:gripplan
   Andere stap of server: STAP=batterij BASE_URL=http://localhost:8000/ npm run screenshot:gripplan */
'use strict';
const path = require('path');
const sharp = require('sharp');
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:8000/';
const STAP = process.env.STAP || 'zonnepanelen';
const OUT = path.join(__dirname, '..', 'assets', 'gripplan-screenshot');

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, reducedMotion: 'no-preference' });
  await page.goto(BASE + 'zo-werkt-het.html?stap=' + STAP, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.body.classList.contains('is-ready'));
  // Header weg; de disclaimer onder de knoppen valt anders half buiten de uitsnede.
  await page.addStyleTag({ content: '.site-header{display:none} .plan-disclaimer{visibility:hidden}' });
  await page.waitForTimeout(1200);
  // Uitsnede: stappenbalk, render, energielabel en de twee cijferkaarten.
  const box = await page.evaluate(() => {
    const m = document.querySelector('.plan-module').getBoundingClientRect();
    const end = document.querySelector('.explain').getBoundingClientRect().top;
    return { x: m.x, y: m.y + window.scrollY, width: m.width, height: end - m.y - 12 };
  });
  const png = await page.screenshot({ clip: box, fullPage: true });
  await browser.close();
  const img = sharp(png).resize({ width: 1600 });
  await img.clone().png({ compressionLevel: 9 }).toFile(OUT + '.png');
  await img.clone().webp({ quality: 80 }).toFile(OUT + '.webp');
  await img.clone().avif({ quality: 55 }).toFile(OUT + '.avif');
  const meta = await sharp(OUT + '.png').metadata();
  console.log('Opgeslagen: assets/gripplan-screenshot.{avif,webp,png} (' + meta.width + '×' + meta.height + ')');
})();
