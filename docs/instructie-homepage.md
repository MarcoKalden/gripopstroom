# Instructie voor Claude Code: homepage Grip op Stroom

> Geef dit bestand in zijn geheel aan Claude Code. Het beschrijft wat er gebouwd
> moet worden, wat vastligt en wanneer het af is.

## 1. Opdracht in één alinea

Bouw een moderne homepage voor Grip op Stroom. De bestaande brandingpagina
(labelanimatie, gripplan, pakketten, griptegoed, vertrouwen) wordt onderdeel van
de site als verdiepingspagina **"Zo werkt het"**. De homepage is de voordeur:
binnen vijf seconden moet een woningeigenaar zien **wat** Grip op Stroom doet,
**waarom** het anders is (één plan, stap voor stap, in jouw tempo) en **waarom
je deze partij kunt vertrouwen**. Elke sectie draagt bij aan één van die drie
vragen of verwijst door naar de Gripscan.

## 2. Lees eerst

1. `README.md`: opbouw, bestanden en de lijst "Voor livegang".
2. `index.html`, `styles.css`, `animation.js`: het content-systeem
   (`data-text`, `data-rich`, `data-list`, `<template>`), de huisstijltokens op
   `:root` en de labelanimatie.
3. `content.json`, `steps.json`, `sources.json`: teksten, voorbeeldwoning en
   bronnen. Let op `validated: false` en `enabled: false`.

Maak daarna eerst een kort plan (bestanden, secties, wat je hergebruikt) en
begin pas dan met bouwen.

## 3. Wat vastligt

- **Stack**: statische HTML, CSS en vanilla JavaScript. Geen framework, geen
  buildstap, geen npm-afhankelijkheden in de site zelf.
- **Content-systeem**: alle teksten in JSON, nooit hard in de HTML. Lijsten
  via `<template>`. Bronverwijzingen als `[[bron-id]]` uit `sources.json`.
- **Huisstijl**: de kleuren op `:root` in `styles.css` (navy `#02275B`, groen
  `#7CBA74`, turquoise `#48B4BA` / `#0E979D`) en het lettertype Source Sans 3.
  Nieuwe tokens mag je toevoegen; bestaande niet hernoemen.
- **Logo**: `assets/logo-gos.png`, zonder "B.V.".
- **Toon**: je-vorm, korte zinnen, taalniveau B1, actief. Geen jargon zonder
  uitleg. Geen superlatieven ("de beste", "goedkoopste") en geen druk
  ("nog maar 3 plekken"). Productnamen: Gripscan, Gripplan, Griptegoed,
  Ferme grip, Stevige grip, Volledige grip, Versterk je gripplan.
- **Eerlijkheid boven alles**: verzin nooit reviews, klantaantallen,
  keurmerken, certificaten, partnerlogo's, mediavermeldingen, garanties,
  teamfoto's of bedrijfsgegevens. Alles wat nog niet bestaat krijgt een
  placeholder in de JSON met `"enabled": false` en verschijnt niet op de pagina.
  Dit patroon bestaat al bij `trust.reviews`; gebruik het overal.
- **Elk cijfer een bron**: elk getal of claim over energie, geld of waarde
  krijgt een `[[bron-id]]`. Dat sluit aan bij de ACM-leidraad
  duurzaamheidsclaims: concreet, onderbouwd en controleerbaar.

## 4. Sitestructuur

```
index.html                 homepage (nieuw)
zo-werkt-het.html          de huidige brandingpagina (verplaatst, inhoud gelijk)
over-ons.html              wie zijn we, waarom bestaan we (nieuw, sjabloon)
contact.html               alle contactmogelijkheden (nieuw)
juridisch/
  privacy.html             sjabloon, tekst volgt van Marco/jurist
  cookies.html             sjabloon
  voorwaarden.html         sjabloon
  klachten.html            klachtenprocedure en geschillencommissie, sjabloon
  toegankelijkheid.html    toegankelijkheidsverklaring, sjabloon
content/
  site.json                gedeeld: merk, links, navigatie, contact, footer, bedrijfsgegevens
  home.json                teksten homepage
  zo-werkt-het.json        de huidige content.json zonder de gedeelde delen
  over-ons.json, contact.json, juridisch.json
steps.json, sources.json   blijven gedeeld
js/site.js                 content laden en renderen, header, menu, reveal-effecten
js/animation.js            alleen de labelanimatie
css/styles.css             tokens, basis, componenten
assets/
```

Regels voor de verhuizing:

- Splits de rendercode uit `animation.js` in `js/site.js` (laden, `applyContent`,
  `renderList`, bronnen) en `js/animation.js` (alleen `LabelAnimation`). Elke
  pagina geeft via `<body data-page="home">` aan welke contentbestanden hij laadt.
- `site.json` wordt samengevoegd met het paginabestand; pagina wint bij conflict.
- De brandingpagina moet na de verhuizing **pixel voor pixel hetzelfde werken**:
  scroll-gestuurde animatie op desktop, knoppen, swipe en pijltjestoetsen op
  mobiel. Test dit expliciet.
- Bronnen: toon per pagina alleen de bronnen die op die pagina worden
  aangehaald, genummerd in de volgorde van `sources.json`.
- Interne ankers (`#gripplan`, `#pakketten`) worden op de homepage links naar
  `zo-werkt-het.html#…`.
- Juridische sjablonen krijgen `<meta name="robots" content="noindex">` en een
  duidelijke melding "Deze tekst volgt" tot Marco ze aanlevert. Schrijf zelf
  geen juridische tekst als definitief.

## 5. De homepage, sectie voor sectie

Volgorde is bewust: eerst begrijpen, dan geloven, dan doen. Elke sectie heeft
een eigen `id` en een `aria-labelledby`.

### 5.1 Header

- Logo links, navigatie: Zo werkt het, Pakketten, Over ons, Veelgestelde
  vragen, Contact. Rechts de knop **Start je Gripscan**.
- Op desktop een zichtbaar telefoonnummer met openingstijden in de tooltip of
  eronder (`site.json → contact.phone`, `enabled: false` tot het er is).
  Een bereikbaar nummer is een van de sterkste vertrouwenssignalen.
- Sticky, doorschijnend met `backdrop-filter: blur()` zodra je scrolt, en iets
  lager van hoogte. Op mobiel een menu achter een knop met `aria-expanded`,
  focus-trap en sluiten met Escape.

### 5.2 Hero

- Kop: "Jouw huis, jouw pad, jouw tempo." Lead: één zin over wat we doen.
- Primaire knop **Start je Gripscan**, secundair **Zo werkt het**.
- Direct onder de knoppen een **vertrouwensregel** met kleine iconen, vier
  punten die nu al waar zijn:
  Vrijblijvende Gripscan · Gecertificeerde EP-adviseurs · 14 dagen
  bedenktijd[[bedenktijd]] · Geen verkoop aan de deur.
- Beeld rechts: de woning uit `assets/house.svg` met het labelchip "Nu: label C",
  zoals op de brandingpagina, met een zachte merkgradiënt (navy naar turquoise)
  als achtergrondvlak. Geen stockfoto's van lachende gezinnen.
- Optioneel (achter `hero.addressForm.enabled`, nu `false`): een invoerveld
  postcode + huisnummer dat doorstuurt naar de Gripscan. Met een regel eronder
  over wat we met die gegevens doen en een link naar de privacyverklaring.

### 5.3 Bewijsbalk (keurmerken en lidmaatschappen)

- Een rustige rij logo's direct onder de hero: certificeringen, branchelid-
  maatschappen en aansluiting bij een geschillencommissie.
- Voorbeelden van wat hier kán staan, **alleen als het echt zo is**:
  BRL 9500 (EP-adviseur), InstallQ-erkenning, F-gassencertificaat voor
  warmtepompen, lidmaatschap Techniek Nederland, aansluiting bij De
  Geschillencommissie, een garantieregeling voor installatiewerk.
- Elk logo linkt naar het openbare register waar de consument het kan
  controleren. Een keurmerk dat je niet kunt controleren, telt niet.
- Lijst in `site.json → credentials.items`, elk item met `enabled`,
  `verifyUrl` en `validated`. Is er niets ingeschakeld, dan verdwijnt de hele
  sectie zonder lege ruimte.

### 5.4 Het probleem en onze aanpak

- Korte sectie in twee kolommen. Links het herkenbare probleem: losse offertes,
  tegenstrijdige adviezen, niet weten waar je moet beginnen. Rechts de aanpak:
  één plan voor je hele woning, stap voor stap, in jouw tempo.
- Hergebruik de gedachte uit `plan.intro`: isolatie maakt de warmtepomp
  zuiniger, zonnepanelen voeden de warmtepomp, de batterij bewaart het
  overschot.

### 5.5 Labelsprong-teaser (de brug naar de brandingpagina)

- Een compacte, statische versie van de labelanimatie: de woning, drie
  momenten (Nu C → na Ferme grip A → na Stevige grip A++) met energiekosten en
  indicatieve woningwaarde uit `steps.json`. Haal de getallen uit dat bestand,
  zet ze nergens dubbel.
- Interactie: drie tabs of een kleine schuifregelaar; de woning verandert mee
  (componentgroepen in `house.svg` aan/uit).
- Duidelijk label "Voorbeeldwoning" en de disclaimer "Indicatief voorbeeld.
  Jouw situatie berekenen we in de Gripscan."
- Knop **Bekijk alle stappen** naar `zo-werkt-het.html#labelanimatie`.
- Gebruik cross-document View Transitions zodat de woning bij het doorklikken
  naadloos overgaat in de woning van de volledige animatie
  (`view-transition-name: gos-house`). Zonder ondersteuning gewoon een normale
  paginawissel.

### 5.6 Zo werkt het in drie stappen

- Gripscan → Gripplan → Uitvoering in jouw tempo, uit `plan.steps`, korter
  geformuleerd. Genummerde kaarten met een verbindende lijn.
- Onder de stappen: **"Wat gebeurt er na je aanvraag?"** Een tijdlijn met
  realistische termijnen (bijvoorbeeld: binnen 2 werkdagen contact, binnen
  2 weken je gripplan). Termijnen alleen invullen als Marco ze bevestigt;
  tot die tijd `enabled: false`.

### 5.7 Pakketten (samenvatting)

- Drie kaarten Ferme, Stevige en Volledige grip met naam, één zin, de
  labelchips van → naar en een link naar `zo-werkt-het.html#pakketten`.
- Geen prijzen tot die vastliggen. Wel de zin "De prijs hoort bij jouw woning.
  Die krijg je na de Gripscan." Prijzen die later verschijnen altijd
  inclusief btw.

### 5.8 Griptegoed (kort)

- Uitleg in drie regels plus de drie zekerheden uit `credit.points`.
- Een kaart **"Waar staat je geld?"** met het antwoord op de vraag die elke
  consument stelt: op wiens rekening staat het tegoed, wat gebeurt ermee bij
  stoppen of faillissement, kun je het terugvragen.
- **Belangrijk**: deze kaart en elke belofte over het tegoed blijven
  `enabled: false` tot er een juridische toets is gedaan (denk aan
  derdengeldenrekening en of er een vergunning nodig is). Zet dit op de lijst
  "Voor livegang".

### 5.9 Wie zijn wij

- Gezicht bij het bedrijf: foto van Marco en eventueel het team, met naam,
  rol en een korte persoonlijke zin over waarom Grip op Stroom bestaat.
- Wie voert het werk uit: eigen mensen of vaste, gecertificeerde partners.
  Consumenten willen weten wie er straks in hun huis staat.
- Werkgebied (regio's of provincies).
- Alleen echte foto's. Tot die er zijn: een nette placeholder met initialen,
  of de sectie uit (`about.enabled`). Link naar `over-ons.html`.

### 5.10 Onze beloftes (vertrouwen)

Een bento-grid met kaarten van verschillende grootte. Gebruik de bestaande
`trust.items` en vul aan met de punten hieronder, elk als eigen item met
`enabled`:

| Belofte | Status nu |
| --- | --- |
| Gecertificeerde EP-adviseurs | bestaat, aan |
| Een bron bij elk cijfer | bestaat, aan |
| 14 dagen bedenktijd | bestaat, aan |
| Jij neemt het initiatief, geen verkoop aan de deur of telefoon | bestaat, aan |
| Garantie op het werk (termijn en wie het dekt) | placeholder, uit |
| Aangesloten bij een geschillencommissie | placeholder, uit |
| Duidelijke algemene voorwaarden, bij voorkeur branchevoorwaarden | placeholder, uit |
| Vaste contactpersoon tijdens je hele traject | placeholder, uit |
| Vaste prijs per stap, vooraf schriftelijk | placeholder, uit |
| Zorgvuldig met je gegevens: alleen openbare data en wat jij deelt | aan, met link naar privacy |

### 5.11 Ervaringen

- Blijft verborgen (`reviews.enabled: false`) tot er echte reviews zijn.
- Als hij aangaat: score, aantal reviews en platform (bijvoorbeeld Kiyoh,
  Trustpilot of Google) met link naar de bron, plus een paar uitgelichte
  citaten met voornaam en woonplaats en het afgeronde gripplan.
- Vermeld **hoe reviews worden gecontroleerd** (verplicht sinds de
  Omnibus-richtlijn). Geen selectie van alleen vijfsterrenreviews.
- Later ook mogelijk: projectverhalen met voor/na-label, alleen met
  toestemming van de bewoner.

### 5.12 Subsidies en financiering

- Korte, feitelijke uitleg met bronnen: ISDE-subsidie (RVO) en lenen via het
  Nationaal Warmtefonds. Voeg beide toe aan `sources.json` met
  `validated: false`.
- Alleen "wij helpen je met de aanvraag" als dat echt zo is (`enabled`).
- Geen bedragen die snel verouderen zonder datum erbij ("stand: 2026").

### 5.13 Veelgestelde vragen

Accordion met `<details>`/`<summary>`, teksten in `home.json → faq.items`.
Startset (antwoorden die nog niet vaststaan krijgen `enabled: false`):

- Wat kost de Gripscan? Zit ik ergens aan vast?
- Welke gegevens gebruiken jullie voor de Gripscan?
- Moet ik alles in één keer doen?
- Wat gebeurt er met mijn griptegoed als ik stop?
- Wie voert de werkzaamheden uit?
- Welke garantie krijg ik?
- In welke regio's werken jullie?
- Wat als ik niet tevreden ben?
- Klopt het energielabel in jullie voorbeeld ook voor mijn huis?

Voeg `FAQPage`-structured data toe, gegenereerd uit dezelfde JSON en alleen
voor ingeschakelde vragen.

### 5.14 Afsluiting

- Kop "Benieuwd wat dit voor jouw woning betekent?", knop **Start je
  Gripscan**, geruststelling "Vrijblijvend, je zit nergens aan vast".
- Daarnaast de andere routes: bellen, mailen, eventueel WhatsApp, met een
  belofte over reactietijd ("We reageren binnen één werkdag") zodra die
  bevestigd is.

### 5.15 Footer

Volledig en controleerbaar. Dit zijn verplichte gegevens (art. 3:15d BW) en
tegelijk vertrouwenssignalen:

- Statutaire naam Grip op Stroom B.V., vestigingsadres, KvK-nummer,
  btw-nummer, e-mailadres, telefoonnummer met openingstijden.
- Links: privacyverklaring, cookieverklaring, algemene voorwaarden,
  klachtenprocedure, toegankelijkheidsverklaring, contact.
- Logo's van keurmerken (alleen ingeschakelde, zie 5.3).
- Bronnenlijst zoals op de brandingpagina.
- Alles uit `site.json`; ontbrekende waarden tonen als "[volgt]" alleen in
  ontwikkeling, nooit live (zie acceptatiecriteria).

### 5.16 Mobiel: vaste CTA-balk

Zodra de hero uit beeld is, verschijnt onderaan een smalle balk met
**Start je Gripscan** en een belknop. Verdwijnt boven de afsluitende sectie
en de footer, zodat hij niets afdekt.

## 6. Modern ontwerp

Modern betekent hier: rustig, ruim, precies en snel. Geen effectbejag.

- **Typografie**: vloeiende maten met `clamp()`. Grote, strakke koppen
  (Source Sans 3, 700, `letter-spacing: -0.02em`), bodytekst minimaal 17px.
- **Ruimte**: royale witruimte tussen secties (`clamp(64px, 10vw, 128px)`),
  maximale tekstbreedte circa 65 tekens.
- **Vorm**: kaarten met radius 20 tot 24px, knoppen als pil (bestaat al), zachte
  schaduwen in twee lagen, dunne randen in `--gos-line`.
- **Kleur**: wit en `--gos-surface` als basis, navy voor koppen en
  primaire knoppen, turquoise en groen als accent. Eén donkere navy-sectie als
  ritmebreker (bijvoorbeeld 5.10 of de afsluiting). Zachte radiale gradiënten
  in merkkleuren achter de hero, nooit achter tekst die daardoor slechter
  leesbaar wordt.
- **Layout**: CSS Grid, bento-grid voor de beloftes, container queries voor
  kaarten die op meerdere plekken terugkomen.
- **Beweging**: subtiel inschuiven bij in beeld komen
  (`animation-timeline: view()` met `@supports`, anders IntersectionObserver),
  hover-lift op kaarten, getallen die optellen in de teaser. Alles uit bij
  `prefers-reduced-motion: reduce`. Geen autoplay-carrousels.
- **Iconen**: één consistente lijn-iconenset als inline SVG in `assets/icons/`
  (bijvoorbeeld uit Lucide, met licentie in de README). Geen icon-fonts, geen
  CDN.
- **Overgangen**: cross-document View Transitions tussen pagina's
  (`@view-transition { navigation: auto; }`).
- **Niet doen**: chatpop-ups, nieuwsbriefpop-ups, cookiemuren, aftellers,
  "X mensen bekijken dit nu", tekst in afbeeldingen, stockfoto's.

## 7. Techniek, privacy en vindbaarheid

- **Toegankelijkheid**: WCAG 2.2 AA. Contrast gecontroleerd, focus altijd
  zichtbaar, alles met toetsenbord bedienbaar, skip-link, één `h1` per pagina,
  logische kopvolgorde, doelgroottes minimaal 44×44px. Sinds juni 2025 geldt de
  Europese toegankelijkheidswet ook voor veel consumentendiensten online.
- **Privacy**: host Source Sans 3 zelf (`assets/fonts/`, woff2, `font-display:
  swap`) in plaats van Google Fonts, zodat er geen IP-adressen naar derden
  gaan. Geen trackers van derden. Als er statistieken komen: een
  cookieloze, privacyvriendelijke oplossing, dan is er geen cookiebanner nodig.
  De bestaande `data-cta`-attributen blijven het meetpunt.
- **Prestaties**: LCP onder 2,5 s en CLS onder 0,1 op een mobiele
  verbinding. Afbeeldingen als AVIF/WebP met `width`/`height` en
  `loading="lazy"` onder de vouw. Totale JS per pagina klein houden.
- **SEO**: unieke `<title>` en `meta description` per pagina uit JSON,
  `canonical`, Open Graph en een OG-afbeelding (1200×630, maak een nette versie
  met logo en woning), `sitemap.xml` en `robots.txt`.
  Structured data: `Organization` (of `HomeAndConstructionBusiness`) met alleen
  echte, ingeschakelde gegevens, en `FAQPage`.
- **Zonder JavaScript**: de kop, de lead en de Gripscan-knop moeten ook
  zonder JS zichtbaar zijn. Zet die drie als terugvaltekst in de HTML, of zorg
  op een andere manier dat de belangrijkste boodschap niet afhangt van `fetch`.
- **Beveiliging** (bij livegang, noteer in README): HTTPS, HSTS, een strikte
  Content-Security-Policy. Geen inline event-handlers zodat CSP strikt kan.

## 8. Werkwijze

1. Lees de bestanden uit hoofdstuk 2 en maak een plan.
2. Verhuis eerst de brandingpagina naar `zo-werkt-het.html` met de nieuwe
   mappen- en contentstructuur. Controleer dat hij precies hetzelfde werkt.
   Commit.
3. Bouw de gedeelde header, footer en mobiele CTA-balk. Commit.
4. Bouw de homepage sectie voor sectie. Commit per logisch blok.
5. Maak de overige pagina's en de juridische sjablonen. Commit.
6. Test (zie hoofdstuk 9), los op wat je vindt, werk de README bij en
   breid de lijst "Voor livegang" uit met alle nieuwe open punten.
7. Push naar de werkbranch. Maak geen pull request tenzij daarom gevraagd wordt.

Bekijken: `python3 -m http.server 8000` en open `http://localhost:8000`.

## 9. Acceptatiecriteria

- [ ] Homepage en brandingpagina werken op 360, 768, 1024 en 1440px breed,
      zonder horizontaal scrollen. Maak met Playwright schermafdrukken van
      elke breedte en bekijk ze zelf.
- [ ] De labelanimatie op `zo-werkt-het.html` werkt als voorheen: scroll op
      desktop, knoppen, swipe en pijltjestoetsen op mobiel.
- [ ] Geen enkele tekst staat hard in de HTML, behalve de terugvaltekst uit
      hoofdstuk 7.
- [ ] Elk cijfer heeft een bronnummer dat naar de juiste bron in de footer
      springt.
- [ ] Elk item met `enabled: false` is onzichtbaar en laat geen lege ruimte
      achter. Zet ze tijdelijk aan om te controleren dat ze er goed uitzien.
- [ ] Er staat nergens een verzonnen review, cijfer, logo, keurmerk, garantie
      of bedrijfsgegeven.
- [ ] Een script `scripts/check-livegang.js` (Node, geen afhankelijkheden)
      meldt alle `validated: false`, lege URL's en "[volgt]"-waarden in de
      JSON-bestanden. Livegang kan pas als het script niets meer meldt.
- [ ] axe-core via Playwright geeft geen fouten op alle pagina's.
- [ ] Lighthouse (mobiel) scoort minimaal 95 op Toegankelijkheid,
      Best practices en SEO, en minimaal 90 op Prestaties.
- [ ] Met `prefers-reduced-motion: reduce` beweegt er niets automatisch.
- [ ] Geen verzoeken naar externe domeinen bij het laden van de pagina.
- [ ] README beschrijft de nieuwe structuur, het `enabled`-patroon en de
      bijgewerkte lijst "Voor livegang".

## 10. Open punten voor Marco

Neem deze lijst op in de README onder "Voor livegang" en vul per punt het
JSON-pad in waar het antwoord moet komen.

- KvK-nummer, btw-nummer, vestigingsadres, telefoonnummer, openingstijden,
  e-mailadres.
- Welke certificeringen en lidmaatschappen er echt zijn, met registerlink.
- Aansluiting bij een geschillencommissie en welke algemene voorwaarden.
- Garantie: termijn, wat het dekt, en of er een garantieregeling achter zit
  als het bedrijf stopt.
- Wie het werk uitvoert: eigen mensen of partners, en hoe die geselecteerd
  worden.
- Werkgebied.
- Foto's van Marco en het team, plus een korte persoonlijke tekst.
- Juridische constructie van het griptegoed (rekening, faillissement,
  terugbetaling, vergunning).
- Reactietermijn en doorlooptijd van aanvraag tot gripplan.
- Reviewplatform en hoe reviews worden gecontroleerd.
- Of Grip op Stroom helpt bij ISDE-aanvragen en Warmtefonds-leningen.
- De echte link naar de Gripscan.
- Teksten voor privacy, cookies, voorwaarden, klachten en toegankelijkheid.
