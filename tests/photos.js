#!/usr/bin/env node
/* Verwerkt de foto's uit grip-op-stroom-fotos/ tot één set voor de site:
   iets warmer, iets matter (zwartpunt +4%), saturatie -10%.
   Levert AVIF, WebP en JPG in 640, 1024 en 1600 px breed in assets/foto/.
   (De bronfoto's zijn 1672 px breed; groter dan dat maken we niet.)
   Gebruik: cd tests && npm run photos */
'use strict';
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const src = path.join(root, 'grip-op-stroom-fotos');
const out = path.join(root, 'assets', 'foto');
const WIDTHS = [640, 1024, 1600];

(async () => {
  fs.mkdirSync(out, { recursive: true });
  for (const file of fs.readdirSync(src).filter((f) => /\.jpe?g$/i.test(f))) {
    const name = file.replace(/\.jpe?g$/i, '');
    const base = sharp(path.join(src, file))
      .modulate({ saturation: 0.9 })
      .linear([0.98, 0.96, 0.93], [12, 10, 8]);
    const graded = await base.toBuffer();
    for (const w of WIDTHS) {
      const img = sharp(graded).resize({ width: w, withoutEnlargement: true });
      await img.clone().avif({ quality: 50 }).toFile(path.join(out, `${name}-${w}.avif`));
      await img.clone().webp({ quality: 72 }).toFile(path.join(out, `${name}-${w}.webp`));
      await img.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(out, `${name}-${w}.jpg`));
    }
    console.log('klaar: ' + name);
  }
})();
