/* Grip op Stroom: regels die de inhoud aanvullen voordat een pagina gevuld wordt.
   Gebruikt door js/site.js (in de browser), js/beheer.js (controles) en
   scripts/build-public.js (teksten in de HTML zetten bij het publiceren).

   - Bellen, mailen en appen: de links maken we uit het nummer of adres onder "display".
     Wie in de beheerpagina het telefoonnummer wijzigt, wijzigt dus ook de link.
   - Openingstijden: openingHours voor zoekmachines komt uit days, opens en closes.
   - {telefoon} in een tekst wordt het telefoonnummer uit contact.phone.display. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GOSRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DAYS = { 'Mo-Fr': 'maandag t/m vrijdag', 'Mo-Sa': 'maandag t/m zaterdag', 'Mo-Su': 'elke dag' };
  var TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

  // 026 205 6179 wordt +31262056179. Geeft '' bij iets wat geen telefoonnummer is.
  function toE164(display) {
    var s = String(display || '').replace(/[\s().-]/g, '');
    if (/^00\d/.test(s)) s = '+' + s.slice(2);
    else if (/^0\d/.test(s)) s = '+31' + s.slice(1);
    if (!/^\+\d{8,15}$/.test(s)) return '';
    if (/^\+31/.test(s) && s.length !== 12) return '';
    return s;
  }

  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(v || '')); }

  // Fout bij een telefoonnummer, e-mailadres of openingstijd ('' = in orde). Voor de beheerpagina.
  function contactError(kind, value) {
    if (value === '') return '';
    if (kind === 'phone') return toE164(value) ? '' : 'Vul een geldig telefoonnummer in, bijvoorbeeld 026 205 6179.';
    if (kind === 'whatsapp') return toE164(value) ? '' : 'Vul een geldig mobiel nummer in, bijvoorbeeld 06 12345678.';
    if (kind === 'email') return isEmail(value) ? '' : 'Vul een geldig e-mailadres in, bijvoorbeeld info@gripopstroom.nl.';
    if (kind === 'time') return TIME.test(value) ? '' : 'Schrijf een tijd als 10:00.';
    if (kind === 'days') return DAYS[value] ? '' : 'Kies de dagen uit de lijst.';
    return '';
  }

  // Klopt de zin over de bereikbaarheid met de tijden? Geeft een foutmelding of ''.
  function hoursError(hours) {
    if (!hours || !hours.opens || !hours.closes) return '';
    if (hours.opens >= hours.closes) return '"Open vanaf" moet vóór "Open tot" liggen.';
    var text = String(hours.text || '');
    var norm = function (t) { return t.replace(/^0/, ''); };
    var found = (text.match(/\b\d{1,2}[:.]\d{2}\b/g) || []).map(function (t) { return norm(t.replace('.', ':')); });
    if (found.indexOf(norm(hours.opens)) === -1 || found.indexOf(norm(hours.closes)) === -1) {
      return 'De tekst noemt andere tijden dan "Open vanaf" (' + hours.opens + ') en "Open tot" (' + hours.closes + ').';
    }
    return '';
  }

  function walk(value, fn, key) {
    if (Array.isArray(value)) return value.map(function (v) { return walk(v, fn); });
    if (value !== null && typeof value === 'object') {
      var out = {};
      Object.keys(value).forEach(function (k) { out[k] = walk(value[k], fn, k); });
      return fn(out, key);
    }
    return fn(value, key);
  }

  // Vult de inhoud aan. Geeft een nieuwe kopie terug; het origineel blijft ongewijzigd.
  function prepare(content) {
    var phone = content && content.contact && content.contact.phone;
    var phoneText = phone && phone.display ? String(phone.display) : '';
    return walk(content, function (v, key) {
      if (typeof v === 'string') return phoneText ? v.split('{telefoon}').join(phoneText) : v;
      if (v === null || typeof v !== 'object' || Array.isArray(v)) return v;
      if (typeof v.display === 'string' && v.display) {
        if (key === 'phone') {
          v.e164 = toE164(v.display);
          if (v.e164) v.href = 'tel:' + v.e164;
        } else if (key === 'whatsapp') {
          var wa = toE164(v.display);
          if (wa) v.href = 'https://wa.me/' + wa.slice(1);
        } else if (key === 'email' && isEmail(v.display)) {
          v.href = 'mailto:' + v.display;
        }
      }
      if (key === 'hours' && v.days && v.opens && v.closes) v.schema = [v.days + ' ' + v.opens + '-' + v.closes];
      return v;
    });
  }

  return { prepare: prepare, toE164: toE164, contactError: contactError, hoursError: hoursError, DAYS: DAYS };
});
