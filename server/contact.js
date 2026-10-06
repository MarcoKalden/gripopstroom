#!/usr/bin/env node
/* Grip op Stroom: server-route voor het contactformulier (REDESIGN.md §7).
   Ontvangt POST /contact met JSON {naam, email, telefoon, postcode, bericht, website}
   en mailt de inzending naar CONTACT_TO.

   Instellingen via omgevingsvariabelen (niets staat in de code):
     CONTACT_TO       ontvanger, verplicht
     CONTACT_FROM     afzender (standaard: CONTACT_TO)
     SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE ("true" voor poort 465)
     ALLOWED_ORIGIN   herkomst van de site, bijvoorbeeld https://www.gripopstroom.nl
     PORT             standaard 8787

   Zet daarna in content/site.json → contactForm.endpoint de URL van deze route.
   Spam: honeypot-veld "website" en maximaal 5 inzendingen per IP per 10 minuten.

   Gebruik: cd server && npm install && CONTACT_TO=... SMTP_HOST=... npm start */
'use strict';
const http = require('http');
const nodemailer = require('nodemailer');

const env = process.env;
if (!env.CONTACT_TO) {
  console.error('CONTACT_TO ontbreekt.');
  process.exit(1);
}
const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT || 587),
  secure: env.SMTP_SECURE === 'true',
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
});

const RULES = {
  naam: (v) => v.length >= 2 && v.length <= 120,
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 200,
  telefoon: (v) => /^[0-9+()\-\s]{8,20}$/.test(v),
  postcode: (v) => /^[1-9][0-9]{3}\s?[A-Za-z]{2}$/.test(v),
  bericht: (v) => v.length >= 2 && v.length <= 5000
};

const hits = new Map(); // ip -> [tijdstippen]
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(body));
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method !== 'POST' || req.url !== '/contact') return send(res, 404, { error: 'niet gevonden' });
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (limited(ip)) return send(res, 429, { error: 'te veel inzendingen' });

  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
    if (raw.length > 20000) req.destroy();
  });
  req.on('end', async () => {
    let data;
    try { data = JSON.parse(raw); } catch (e) { return send(res, 400, { error: 'ongeldige invoer' }); }
    if (data.website) return send(res, 200, { ok: true }); // honeypot: doen alsof het gelukt is
    const clean = {};
    for (const [key, ok] of Object.entries(RULES)) {
      const v = String(data[key] || '').trim();
      if (!ok(v)) return send(res, 422, { error: 'veld ongeldig', veld: key });
      clean[key] = v;
    }
    try {
      await transport.sendMail({
        from: env.CONTACT_FROM || env.CONTACT_TO,
        to: env.CONTACT_TO,
        replyTo: clean.email,
        subject: 'Contactformulier Grip op Stroom: ' + clean.naam,
        text: [
          'Naam: ' + clean.naam,
          'E-mail: ' + clean.email,
          'Telefoon: ' + clean.telefoon,
          'Postcode: ' + clean.postcode.toUpperCase(),
          'Pagina: ' + String(data.pagina || '').slice(0, 200),
          '',
          clean.bericht
        ].join('\n')
      });
      send(res, 200, { ok: true });
    } catch (e) {
      console.error(e);
      send(res, 502, { error: 'versturen mislukt' });
    }
  });
}).listen(Number(env.PORT || 8787), () => console.log('Contactformulier luistert op poort ' + (env.PORT || 8787)));
