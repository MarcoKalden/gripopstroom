# Grip op Stroom: website

Statische site (HTML, CSS, vanilla JavaScript). Geen framework, geen buildstap en
geen npm-afhankelijkheden in de site zelf.

| Pagina | Inhoud |
| --- | --- |
| `index.html` | Homepage: hero, keurmerken, aanpak, labelsprong-teaser, drie stappen, pakketten, griptegoed, wie zijn wij, beloftes, ervaringen, subsidie, veelgestelde vragen, afsluiting |
| `zo-werkt-het.html` | De brandingpagina met de labelanimatie, gripplan, pakketten, griptegoed en vertrouwen |
| `over-ons.html` | Waarom we bestaan, hoe we werken, team en uitvoering |
| `contact.html` | Contactkanalen en bedrijfsgegevens |
| `privacy.html`, `cookies.html`, `voorwaarden.html`, `klachten.html`, `toegankelijkheid.html` | Sjablonen. De tekst volgt; tot die tijd `noindex` |

De opdracht voor de homepage staat in `docs/instructie-homepage.md`.

## Bekijken

De pagina's laden JSON en de SVG met `fetch`, dus open ze via een webserver:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Bestanden

| Bestand | Inhoud |
| --- | --- |
| `content/site.json` | Gedeeld: menu, links, contactgegevens, bedrijfsgegevens, keurmerken, footer |
| `content/home.json`, `zo-werkt-het.json`, `over-ons.json`, `contact.json`, `juridisch.json` | Teksten per pagina. Een paginabestand mag elke waarde uit `site.json` overschrijven |
| `steps.json` | Stappen, labels en bedragen van de voorbeeldwoning (placeholders, `"validated": false`). De homepage-teaser haalt zijn cijfers hier ook uit |
| `sources.json` | Bronnenlijst. Elke pagina toont alleen de bronnen die hij aanhaalt, genummerd in de volgorde van dit bestand |
| `js/site.js` | Laadt en vult alle pagina's, header, menu, mobiele balk, inschuiven, structured data |
| `js/animation.js` | Alleen de labelanimatie op Zo werkt het |
| `js/home.js` | Labelsprong-teaser en het (nog uitgeschakelde) adresformulier |
| `css/styles.css` | Huisstijl (CSS-variabelen op `:root`) en opmaak van alle pagina's |
| `partials/` | Gedeelde head, header en footer |
| `assets/` | Logo's, woning-SVG, iconen (Lucide, ISC), lettertype Source Sans 3 (OFL), favicon, OG-afbeelding |
| `scripts/sync-partials.js` | Zet de partials in alle pagina's, plus canonical, `sitemap.xml` en `robots.txt` |
| `scripts/check-livegang.js` | Meldt alles wat nog moet gebeuren voor livegang |
| `tests/` | Playwright- en axe-tests |

### Teksten aanpassen

Alle teksten staan in `content/`. In de HTML staat alleen de opbouw, plus een
terugvaltekst voor de hero, het menu en de Gripscan-knop voor als JavaScript niet laadt.
Een bronverwijzing schrijf je als `[[bron-id]]`, met een id uit `sources.json`.

### Het `enabled`-patroon

Alles wat nog niet echt bestaat, staat in de JSON met `"enabled": false` en verschijnt
niet op de site. Lege lijsten en lege teksten verschijnen ook niet. Zo staan er nooit
verzonnen reviews, keurmerken, garanties of bedrijfsgegevens op de site.

Een onderdeel aanzetten: vul de echte gegevens in en zet `enabled` op `true`. De pagina
past zich aan. In de HTML regel je dit met `data-if="pad"` (tonen als het aan staat) en
`data-if-not="pad"` (het omgekeerde). In lijsten worden items met `enabled: false`
overgeslagen.

### Header en footer wijzigen

Pas `partials/header.html`, `partials/footer.html` of `partials/head.html` aan en draai:

```sh
node scripts/sync-partials.js
```

Het resultaat staat gewoon in de HTML en gaat mee in de commit. Zet je `siteUrl` in
`content/site.json`, dan schrijft hetzelfde script ook canonical, `og:url` en `sitemap.xml`.

## Gedrag

- Het menu staat altijd zichtbaar, ook op mobiel (geen hamburgermenu). Op smalle schermen
  staat het als rij onder logo en knop, met korte namen uit `nav.items[].shortText`.
- Header blijft boven in beeld, wordt compact bij scrollen, verdwijnt bij omlaag scrollen
  en komt terug bij omhoog scrollen. Boven de labelanimatie blijft hij weg.
- Elke woningafbeelding is gemarkeerd als voorbeeldwoning.
- Op mobiel verschijnt onderin een balk met de Gripscan-knop (en een belknop zodra er
  een telefoonnummer is) als de hero uit beeld is. Bij de animatie, de afsluiting en de footer
  verdwijnt hij.
- De labelanimatie loopt op desktop mee met scrollen als de hele sectie in één schermhoogte
  past. Op lagere schermen en op mobiel werkt hij met knoppen, swipe en pijltjestoetsen.
  De optionele laadpaalstap staat in `steps.json` met `"enabled": false`.
- Met `prefers-reduced-motion: reduce` beweegt er niets automatisch.
- Tussen pagina's een rustige overgang (View Transitions) in browsers die dat ondersteunen.

## Testen

```sh
python3 -m http.server 8000     # in de hoofdmap, laat draaien
cd tests && npm install && npm test
```

De tests controleren alle pagina's op 360, 768, 1024 en 1440 px (geen horizontaal
scrollen, geen consolefouten, geen verzoeken naar andere domeinen), axe (WCAG 2.2 AA),
de labelanimatie (scroll op desktop, knoppen en toetsen op mobiel), de teaser, het menu
op smalle schermen, minder beweging, en een ronde waarin alles met `enabled: false` tijdelijk aan staat.
Schermafdrukken komen in `tests/screenshots/`.

Lighthouse (mobiel, lokale server zonder compressie): Prestaties 97, Toegankelijkheid 100,
Best practices 100, SEO 100. LCP circa 2,6 s, CLS 0,001.

## Voor livegang

`node scripts/check-livegang.js` meldt alles wat hieronder nog openstaat. Livegang kan
pas als het script niets meer meldt.

Inhoud en cijfers:

- Stappen, bedragen en labelsprongen valideren met een EP-adviseur (`steps.json`).
- Bevestigen dat batterij, energiemanagement en laadpaal niet meetellen in NTA 8800.
- Labeleffecten per pakket laten valideren (`content/zo-werkt-het.json` en `content/home.json` → `packages`).
- Bron-URL's en publicatiedata in `sources.json` controleren, ook de nieuwe bronnen voor ISDE en Warmtefonds.
- Teksten op de homepage en Over ons laten nalezen door Marco, vooral `about.text` en `why`.

Gegevens van Marco (pad in de JSON):

- Vestigingsadres, KvK-nummer, btw-nummer → `content/site.json` → `company.details`.
- Telefoonnummer met openingstijden, e-mailadres, eventueel WhatsApp → `content/site.json` → `contact`.
- Reactietermijn → `content/site.json` → `contact.responseTime`.
- Echte certificeringen en lidmaatschappen met registerlink en logo → `content/site.json` → `credentials.items`.
- Garantie, geschillencommissie, voorwaarden, vaste contactpersoon, vaste prijs → `content/home.json` → `promises.items`.
- Wie het werk uitvoert en het werkgebied → `content/home.json` → `about.facts` en `content/over-ons.json` → `execution`.
- Foto's en teksten van Marco en het team → `about.team` en `content/over-ons.json` → `team` en `why.story`.
- Doorlooptijden per stap → `content/home.json` → `process.items[].duration`.
- Antwoorden op de open vragen → `content/home.json` → `faq.items`.
- Reviewplatform, score en hoe reviews worden gecontroleerd → `content/home.json` → `reviews`.
- Of we helpen bij ISDE- en Warmtefonds-aanvragen → `content/home.json` → `funding.help`.

Juridisch:

- Juridische toets van het griptegoed: op wiens rekening staat het, wat gebeurt er bij stoppen
  of faillissement, is er een vergunning nodig? Pas daarna `credit.safety` en de FAQ over het
  griptegoed aanzetten.
- Teksten voor privacy, cookies, voorwaarden, klachten en toegankelijkheid →
  `content/juridisch.json`. Zet per pagina `ready` op `true` en haal de `noindex`-regel uit de HTML.

Techniek:

- De echte link naar de Gripscan → `content/site.json` → `links.gripscan`, en haal de
  overschrijving `links.gripscan` uit `home.json` en `zo-werkt-het.json` weg.
  Daarna eventueel het adresformulier aanzetten → `content/home.json` → `hero.addressForm`.
- Domein invullen → `content/site.json` → `siteUrl`, dan `node scripts/sync-partials.js`.
- Hosting met HTTPS, HSTS, compressie (gzip of brotli) en een Content-Security-Policy.
  Let op: `partials/head.html` bevat één klein inline script dat de klasse `js` zet;
  sta dat toe met een hash in de CSP.
- Als er statistieken komen: een cookieloze oplossing. De `data-cta`-attributen zijn de meetpunten.
