# Grip op Stroom: website

Statische site (HTML, CSS, vanilla JavaScript). Geen framework, geen buildstap en
geen npm-afhankelijkheden in de site zelf. Vormgeving volgens `REDESIGN.md`
("lekker wonen": rustig, met mensen en sfeer), met foto's en achtergrond in de koele huisstijlkleuren.

| Pagina | Inhoud |
| --- | --- |
| `index.html` | Homepage volgens de golden circle (waarom, hoe, wat): hero met foto, Gripplan-blok met screenshot, Alles onder één dak (totaalbeeld met een hotspot per installatie), pakketten, Grippunten, waarom Grip op Stroom, contact met formulier, vijf vragen |
| `zo-werkt-het.html` | Het stappenplan met de voorbeeldwoning, drie stappen, wat er gebeurt na je aanvraag |
| `pakketten.html` | Pakketten, vergelijkingstabel, Grippunten, hulp bij het betalen |
| `vragen.html` | Alle vragen, gegroepeerd, met zoekveld |
| `over-ons.html` | Waarom we bestaan, hoe we werken, wat we doen, team en uitvoering (staan uit tot er gegevens zijn) |
| `contact.html` | Adres, telefoon, bereikbaarheid en contactformulier |
| `privacy.html`, `cookies.html`, `voorwaarden.html`, `klachten.html`, `toegankelijkheid.html` | Sjablonen. De tekst volgt; tot die tijd `noindex` |

## Bekijken

De pagina's laden JSON met `fetch`, dus open ze via een webserver:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Publiceren

De site staat op Netlify (gratis), gekoppeld aan deze repository. `netlify.toml` zegt wat
Netlify doet: `node scripts/build-public.js` zet alleen de websitebestanden in `public/` en
publiceert die map. README's, ontwerpinstructies, originele beelden, de PDF-export, tests,
scripts en de servercode komen zo niet online. Elke wijziging op de hoofdbranch staat
binnen een minuut live.

Zolang `siteUrl` in `content/site.json` leeg is, stuurt elke pagina `X-Robots-Tag: noindex`
mee: de testversie op het `netlify.app`-adres verschijnt dan niet in zoekmachines. Vul
`siteUrl` pas in als de site echt live gaat (zie Voor livegang) en draai daarna
`node scripts/sync-partials.js`.

Lokaal controleren wat er online komt:

```sh
node scripts/build-public.js
cd public && python3 -m http.server 8000
```

## Bestanden

| Bestand | Inhoud |
| --- | --- |
| `content/site.json` | Gedeeld: menu, links, contact- en bedrijfsgegevens, formulierteksten, footer, CTA-band |
| `content/pakketten.json` | Pakketten, vergelijkingstabel, Grippunten, financiering (homepage en pakkettenpagina) |
| `content/vragen.json` | Alle vragen. `home: true` zet een vraag ook op de homepage (maximaal vijf) |
| `content/home.json`, `zo-werkt-het.json`, `over-ons.json`, `contact.json`, `juridisch.json` | Teksten per pagina |
| `steps.json` | Stappen van het stappenplan: naam, label, bedragen, bronnen en render (placeholders, `"validated": false`) |
| `sources.json` | Bronnenlijst. Elke pagina toont alleen de bronnen die hij aanhaalt, in de footer onder "Bronnen" |
| `js/site.js` | Laadt en vult alle pagina's, header, bronnen, contactformulier, structured data |
| `js/stappenplan.js` | Het stappenplan op Zo werkt het |
| `js/home.js`, `js/pakketten.js`, `js/vragen.js` | Hotspots, vergelijkingstabel, zoeken in de vragen |
| `css/styles.css` | Design tokens (`:root`) en opmaak van alle pagina's |
| `partials/` | Gedeelde head, header, footer en contactblok |
| `grip-op-stroom-fotos/` | De vijf aangeleverde foto's (bron) |
| `assets/foto/` | Bewerkte foto's in AVIF, WebP en JPG, 640/1024/1600 px |
| `grip-op-stroom-renders/` | De aangeleverde beelden van de voorbeeldwoning (bron) |
| `assets/woning/` | Beelden van de voorbeeldwoning voor de site, per stap en het totaalbeeld (zie hieronder) |
| `assets/gripplan-screenshot.*` | Screenshot van het stappenplan voor de homepage |
| `assets/fonts/` | Figtree (OFL), lokaal. Koppen en tekst staan in Figtree, het lettertype dat het dichtst bij het logo ligt |
| `server/contact.js` | Server-route die het contactformulier doormailt |
| `scripts/sync-partials.js` | Zet de partials in alle pagina's, plus canonical, `sitemap.xml` en `robots.txt` |
| `scripts/check-livegang.js` | Meldt alles wat nog moet gebeuren voor livegang |
| `tests/` | Tests en beeldgereedschap (Playwright, axe, sharp) |

### Teksten aanpassen

Alle teksten staan in `content/`. Een pagina noemt in `<body data-content="...">` welke
bestanden hij gebruikt; latere bestanden overschrijven eerdere. Een bronverwijzing schrijf
je als `[[bron-id]]`, met een id uit `sources.json`.

### Beheerpagina (`/beheer.html`)

Teksten en cijfers aanpassen zonder CMS: ga naar `/beheer.html` op de site. De pagina
leest de JSON-bestanden uit GitHub, toont ze als invulvelden met een voorbeeld van de
pagina, en zet een wijziging met **Publiceren** als commit op de standaardbranch. Netlify
zet de site daarna binnen een minuut opnieuw online. Elke wijziging staat dus in de
geschiedenis van GitHub en is terug te draaien.

- Inloggen met een fine-grained GitHub-sleutel: alleen deze repo, alleen
  *Contents: Read and write*. De stappen staan op de inlogpagina. De sleutel blijft in de
  browser en gaat alleen naar `api.github.com`.
- Controles voor publiceren: onbekende `[[bron-id]]`, een label buiten de labelschaal en
  lege getallen houden publiceren tegen. Je ziet eerst een overzicht van was en wordt.
- Velden die de werking regelen (links, id's, beelden, `recalculate` enzovoort) staan
  verborgen achter *Technische velden tonen*. De stappen van het stappenplan liggen vast;
  items met een id kun je alleen verplaatsen.
- Het voorbeeld laadt de echte pagina in een frame; `js/site.js` neemt dan de teksten uit
  de editor (`window.parent.GOS_PREVIEW`) in plaats van de bestanden.
- De pagina staat niet in het menu, niet in zoekmachines (`noindex` en `robots.txt`) en
  krijgt van `scripts/build-public.js` een strenge Content-Security-Policy.
- Foto's: bij elk fotoveld een keuzelijst met alleen foto's die al op de site staan. Onder
  *Foto's* vervang je een foto of voeg je er een toe (zie [Foto's](#fotos)). De pagina wacht
  tot de GitHub Action de foto verwerkt heeft en hij op de site staat. Blijft een foto op
  "Wordt verwerkt" staan, kijk dan in GitHub bij **Actions** naar *Foto's verwerken*.
- Repo en bestanden staan bovenin `js/beheer.js`. Een nieuw contentbestand voeg je daar
  toe aan `FILES`.

### Het `enabled`-patroon

Alles wat nog niet echt bestaat, staat in de JSON met `"enabled": false` en verschijnt
niet op de site. Lege lijsten en lege teksten verschijnen ook niet. Zo staan er nooit
verzonnen reviews, keurmerken, garanties of bedrijfsgegevens op de site. In de HTML regel je
dit met `data-if="pad"` en `data-if-not="pad"`.

### Header, footer en contactblok wijzigen

Pas het bestand in `partials/` aan en draai `node scripts/sync-partials.js`. Het resultaat
staat gewoon in de HTML en gaat mee in de commit.

### Foto's

De bronfoto's staan in `grip-op-stroom-fotos/`. Na een wijziging:

```sh
cd tests && npm install && npm run photos
```

Dat trekt de set naar de huisstijl (minder warm, iets naar blauw en groen, saturatie −15%,
zwartpunt licht opgetild) en levert drie breedtes. De pagina-achtergrond (`--gos-ground`,
`--gos-sand`, `--gos-line`) is daar op afgestemd: koel lichtgrijs-groen in plaats van crème.
De bronnen zijn 1672 px breed; 2400 px uit REDESIGN.md kan pas met grotere bronbestanden.

Foto's vervangen of toevoegen kan ook via de beheerpagina (onderdeel *Foto's*). Die zet de foto
bijgesneden tot 16:9 (hooguit 2400 px breed) als JPG in `grip-op-stroom-fotos/`. De GitHub
Action `.github/workflows/fotos.yml` draait dan `tests/photos.js` voor alleen die foto en zet
de versies in `assets/foto/` terug in de repo. `node tests/photos.js grip-op-stroom-fotos/naam.jpg`
doet hetzelfde met de hand. De grote foto bovenaan de homepage (`woonkamer-gezin`) staat vast
in `index.html`; die verander je door hem te vervangen.

### Beelden van de voorbeeldwoning

Alle stappen (Start tot en met 7 Warmtepomp) en het totaalbeeld (8) op de homepage zijn
aangeleverde beelden (originelen in `grip-op-stroom-renders/`, voor de site als WebP in
`assets/woning/`). De voorbeeldwoning is een hoekwoning uit circa 1980 van circa 120 m². Zie
`assets/woning/LEESMIJ.md` voor de status en hoe je beelden vervangt.

Op de homepage staat op het totaalbeeld een genummerde hotspot per installatie, in de volgorde
van het stappenplan. De plek staat in `content/home.json → comfort.items` (`x`, `y`, en
`side: "left"` als het label naar links moet uitklappen). Verandert het totaalbeeld, controleer
dan die plekken.

De stappen "Airco die ook verwarmt" (6) en "Warmtepomp" (7) hebben nog geen cijfers: de site toont
"Volgt" bij label en bedragen tot een EP-adviseur ze berekend heeft (`pending: true` in `steps.json`).

### Grippunten

Het abonnement is vervangen door een puntensysteem: de Grippunten (`content/pakketten.json →
grippunten`, op de homepage en op de pakkettenpagina). Klanten sparen automatisch punten bij een
uitgevoerde maatregel, een lopend energiecontract of energiemanagement en als ze een andere
woningeigenaar aanbrengen, en wisselen die in voor korting op een volgende stap of extra service.
Betalen gaat uit eigen middelen of met een financiering. Hoeveel punten er bij een stap horen,
wat een punt waard is, hoe lang punten geldig zijn en welke voorwaarden gelden, wordt nog
uitgewerkt. Tot die tijd staat dat in `grippunten.pending` en meldt `scripts/check-livegang.js` het.
Noem geen aantallen punten of bedragen voordat ze vaststaan, en vergelijk het puntensysteem
niet met ING of een ander merk (besluit Marco).

### Contactformulier

Het formulier controleert alle velden in de browser (Nederlandse meldingen, focus naar het
eerste foute veld, honeypot tegen spam). Verzenden gaat naar `content/site.json →
contactForm.endpoint`. Zolang dat leeg is, krijgt de bezoeker de melding dat het formulier
nog niet gekoppeld is, met het telefoonnummer. `server/contact.js` is een kleine Node-route
die de inzending mailt naar `CONTACT_TO` (instellingen staan bovenin het bestand).

## Gedrag

- Het menu staat altijd zichtbaar, ook op mobiel (als rij onder logo en knop).
- De header verdwijnt bij omlaag scrollen en komt terug bij omhoog scrollen.
- Stappenplan: stappenbalk als tablist, pijltjestoetsen, vegen, afspelen (3 s per stap,
  stopt bij interactie), crossfade van de renders, cijfers tellen mee, `?stap=batterij` of
  `?stap=5` in de URL. De hotspots op de homepage linken hierheen.
- Homepage: op het totaalbeeld staat een genummerde stip per installatie. Bij aanwijzen of focus
  klapt het label uit en licht de bijbehorende rij op, en andersom. De afbeelding blijft op
  desktop staan terwijl je de lijst leest.
- Een klik op een bronnummer klapt de bronnenlijst in de footer open.
- Met `prefers-reduced-motion: reduce` beweegt er niets en staat Afspelen uit.

## Testen

```sh
python3 -m http.server 8000     # in de hoofdmap, laat draaien
cd tests && npm install && npm test
```

De tests controleren alle pagina's op 390, 768, 1024 en 1440 px (geen horizontaal
scrollen, geen consolefouten behalve ontbrekende renders, geen externe verzoeken), axe
(WCAG 2.2 AA), het stappenplan (ook de laatste stap, de warmtepomp), de homepage (geen
stappenplan-module, een hotspot per installatie, Grippunten in plaats van het abonnement, vijf vragen,
structured data, menu), het formulier, zoeken in de vragen, minder beweging, en een ronde
waarin alles met `enabled: false` tijdelijk aan staat. Schermafdrukken komen in
`tests/screenshots/`.

Lighthouse (mobiel, lokale server zonder compressie): homepage 95 / 100 / 96 / 100,
Zo werkt het 97 / 100 / 96 / 100, Pakketten 96 / 100 / 100 / 100. LCP homepage circa 2,8 s; met
compressie op de echte hosting moet die onder 2,5 s komen.

## Voor livegang

`node scripts/check-livegang.js` meldt alles wat nog openstaat. Livegang kan pas als het
script niets meer meldt.

Open punten uit REDESIGN.md §10 (eerst bevestigen, niet zelf invullen):

1. ~~E-mailadres~~: info@gripopstroom.nl (bevestigd).
2. KvK-nummer van Grip op Stroom B.V. → `content/site.json → company.details`.
3. ~~Warmtepomp~~: terug als stap 7, na de airco, met een eigen beeld (oktober 2026). In de
   pakketten zit hij, net als laadpaal en airco, als keuze in Volledige grip (bevestigd). De labels en
   bedragen van zonnepanelen, thuisbatterij en laadpaal en de labeleffecten van Stevige en
   Volledige grip waren berekend met de warmtepomp als stap 3 en moeten opnieuw berekend worden
   (`recalculate: true`). Airco en warmtepomp hebben nog geen cijfers (`pending: true`).
4. ~~Renders~~: alle beelden van de voorbeeldwoning zijn aangeleverd.
5. Logo als SVG aanleveren.

Verder:

- Stappen, bedragen en labelsprongen valideren met een EP-adviseur (`steps.json`), ook de laadpaalstap die nu aan staat.
- Labeleffecten per pakket laten valideren (`content/pakketten.json`).
- Bron-URL's in `sources.json` controleren.
- Grippunten uitwerken: punten per stap, waarde per punt, geldigheidsduur en voorwaarden
  (`content/pakketten.json → grippunten`). Laat de voorwaarden juridisch toetsen. Vul daarna de
  twee vragen over Grippunten in `content/vragen.json` in en zet ze aan.
- Contactformulier koppelen: `server/contact.js` draaien of een bestaande formulierdienst,
  en de URL in `contactForm.endpoint` zetten.
- Teksten voor privacy, cookies, voorwaarden, klachten en toegankelijkheid → `content/juridisch.json`.
- Domein koppelen in Netlify, dan `content/site.json → siteUrl` invullen en `node scripts/sync-partials.js` draaien.
  Daarmee vervalt ook de noindex-kop van de testversie.
- Hosting met HTTPS, HSTS, compressie en een Content-Security-Policy (het kleine inline
  script in `partials/head.html` met een hash toestaan).
