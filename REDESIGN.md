# Instructie voor Claude Code — Redesign Grip op Stroom

> Plak dit bestand in de root van de repository van de Grip op Stroom-site (bijv. als `REDESIGN.md`) en geef Claude Code de opdracht: *"Voer REDESIGN.md uit."*
> Visuele referentie: het Design-canvas **"Grip op Stroom – nieuwe richting"** (artboards *Homepage* en *Zo werkt het – stappenplan*). Bij twijfel gaat dit document vóór het canvas.

---

## 0. Werkwijze voor Claude Code

1. **Eerst lezen, dan bouwen.** Bekijk de bestaande codebase: framework, routing, componentstructuur, styling (Tailwind/CSS-modules/etc.), waar content staat en hoe de bronnen-voetnoten werken. Behoud de bestaande stack; introduceer geen nieuw framework.
2. Maak een branch `redesign/lekker-wonen`.
3. Werk in deze volgorde: design tokens → globale componenten (header, footer, knoppen, kaarten) → homepage → stappenplan-pagina → contactpagina → overige pagina's (Pakketten, Over ons, Vragen) → beeld → QA.
4. **Content blijft inhoudelijk gelijk** (teksten, cijfers, bronnen-voetnoten, juridische links). Je verandert vorm, volgorde en beeld — niet de claims. Verzin geen nieuwe cijfers, reviews of keurmerken. Ontbreekt iets, gebruik een placeholder als `[INVULLEN]`.
5. Sluit af met de checklist in §9 en lever een korte samenvatting + screenshots (desktop 1440 en mobiel 390) van elke pagina.

---

## 1. Probleem met het huidige ontwerp

- Koel, zakelijk en "template-achtig": witte vlakken, dunne lijnen, kleine kaartjes, veel gelijkwaardige blokken.
- De woning is een plat, grafisch lijntekeningetje; de verduurzamingsproducten zijn niet zichtbaar.
- Het stappenplan met het huisje staat centraal op de homepage en maakt die zwaar en technisch.
- Geen mensen, geen sfeer: het "lekker wonen"-gevoel ontbreekt.

**Doel:** een moderne, warme, rustige site waar comfort en thuisgevoel voorop staan, en techniek (airco, thuisbatterij, laadpaal) als vanzelfsprekend onderdeel van een fijn huis in beeld komt. Vertrouwen en objectiviteit (EP-adviseurs, bronnen bij elk cijfer, geen verkoop aan de deur) blijven duidelijk.

---

## 2. Design tokens

Leg deze vast als CSS custom properties (of in de Tailwind-config) en gebruik ze overal; geen losse hex-waarden in componenten.

```css
:root {
  /* Kleuren */
  --gos-navy:        #0A2A5E;  /* merkkleur: koppen, primaire knop, footer */
  --gos-ink:         #10233F;  /* bodytekst donker */
  --gos-text:        #3A4A60;  /* bodytekst */
  --gos-muted:       #5B6B80;  /* bijschriften (haalt 4.5:1 op crème) */
  --gos-ground:      #FBF8F3;  /* warme pagina-achtergrond (vervangt wit/grijs) */
  --gos-surface:     #FFFFFF;  /* kaarten, wisselsecties */
  --gos-sand:        #EFE8DC;  /* subtiele vlakken, progress-track */
  --gos-line:        #E2DACB;  /* randen */
  --gos-green:       #1F7A63;  /* accent: labels, iconen, voortgang */
  --gos-green-soft:  #E3EFE8;  /* zachte accentvlakken, chips */
  --gos-leaf:        #7FB069;  /* alleen in logo/illustratie */

  /* Typografie */
  --font-display: 'Bricolage Grotesque', system-ui, sans-serif; /* 600/700, letter-spacing -0.02em */
  --font-body:    'Figtree', system-ui, sans-serif;             /* 400/500/600/700 */

  /* Vorm */
  --radius-sm: 14px;  --radius-md: 20px;  --radius-lg: 28px;  --radius-xl: 36px;
  --radius-pill: 999px;
  --shadow-float: 0 24px 60px rgba(16,35,63,.18);
  --shadow-chip:  0 8px 24px rgba(16,35,63,.14);

  /* Ritme */
  --section-y: 96px;     /* mobiel: 64px */
  --container: 1240px;   /* + 32px gutter, mobiel 16px */
}
```

Typeschaal (desktop / mobiel): H1 60/44px, line-height 1.02 · H2 44/32px, 1.08 · H3 26/22px · lead 18px/1.55 · body 16–17px/1.6 · klein 13–14px.

Fonts laden via Google Fonts of self-hosted (`font-display: swap`). Geen Inter/Roboto/Arial.

**Stijlregels**
- Royale witruimte, grote afgeronde beeldvlakken (28–36px radius), pill-knoppen (min. 48px hoog).
- Afwisseling van achtergronden per sectie: crème (`--gos-ground`) ↔ wit ↔ één donkerblauw blok ↔ één zachtgroen blok. Geen gradients, geen "blur blobs", geen gekleurde linkerranden op kaarten, geen emoji.
- Eyebrow-labels boven koppen in `--gos-green`, 14px, 600 — **zonder** pill/achtergrond (de huidige pill-labels mogen weg, behalve als badge in de hero-kaart).
- Iconen: één lijn-iconenset (bijv. Lucide), stroke 2, kleur `--gos-green`.
- Micro-interactie: knoppen en kaarten krijgen subtiele hover (lift 2px, schaduw), beelden lichte zoom (1.03) op hover. Respecteer `prefers-reduced-motion`.

---

## 3. Navigatie & informatiearchitectuur

Header (sticky, crème met lichte transparantie + 1px onderlijn):

`Logo` · **Zo werkt het** · Pakketten · Over ons · Vragen · Contact · `[Start je Gripscan]` (primaire knop)

- **Het stappenplan met het huisje verhuist naar `/zo-werkt-het`** (menu-item "Zo werkt het"). Het staat **niet** meer als centrale module op de homepage.
- Op mobiel: hamburger → full-screen menu met grote tikdoelen; de CTA blijft zichtbaar in de header.
- Behoud bestaande URL's waar mogelijk; voeg redirects toe als een slug wijzigt.

---

## 4. Beeld

### 4a. Lifestyle-foto's ("lekker wonen")

Er zijn vijf aangeleverde foto's, licht nabewerkt tot één set (iets warmer, iets matter, minder verzadigd). Bestanden in `grip-op-stroom-fotos/`:

| Bestand | Inhoud | Gebruik |
|---|---|---|
| `woonkamer-gezin.jpg` | gezin in warme woonkamer, schemer | **Homepage hero** |
| `ontbijt-gezin.jpg` | gezin aan ontbijt, zonlicht | Pakket *Ferme grip* |
| `keuken-senioren.jpg` | ouder stel in zonnige keuken | Pakket *Stevige grip* |
| `bank-stel.jpg` | stel op de bank, modern interieur | Pakket *Volledige grip* + achtergrond in stappenplan-screenshot |
| `spelavond-gezin.jpg` | gezin met bordspel, avond | Sectie "Waarom Grip op Stroom" / Over ons |

Plaats ze in de assets-map van het project. Verwerking:
- Lever AVIF + WebP + JPG fallback via `<picture>`/de image-component van het framework, met `srcset` (640/1024/1600/2400) en `sizes`.
- Hero: `loading="eager"`, `fetchpriority="high"`; alle andere `loading="lazy"`.
- Crops: hero 16:7 desktop / 4:5 mobiel (focus op het gezin, linkerkant), pakketkaarten 16:10, vertrouwensblok 4:5. Gebruik `object-position` om gezichten in beeld te houden.
- Alt-teksten beschrijvend in het Nederlands (zie canvas).
- Mag je de nabewerking zelf opnieuw doen (bijv. met `sharp`): saturatie −10%, zwartpunt licht opgetild (+4%), temperatuur iets warmer. Niet zwaarder dan dat.

### 4b. De woning: van plat icoon naar fotorealistische render

Vervang het grafische huisje overal door **fotorealistische 3D-renders** van dezelfde voorbeeldwoning. Laat die genereren met een beeld-AI (bijv. Midjourney, Firefly, Imagen) of door een 3D-visualisatiebureau — Claude Code kan deze beelden niet zelf maken. Tot ze er zijn: bouw met een duidelijk gelabelde placeholder in dezelfde verhouding (zie canvas) en lever de component zo op dat alleen de bestanden vervangen hoeven te worden.

**Basisprompt (Engels werkt het best bij beeldgeneratoren):**

> Photorealistic architectural visualization of a Dutch terraced house (tussenwoning) built around 1980, red-brown brick, pitched roof with dark tiles, white window frames, small front garden with a driveway. Three-quarter front view from eye level, slightly elevated. Late afternoon golden hour in autumn, warm light glowing from inside the windows, cozy and inviting atmosphere. Soft natural shadows, shallow depth of field on the edges, high detail, 35mm lens, magazine-quality real-estate photography. Clean, no people, no text, no logos. 16:10.

**Per stap een variant met dezelfde camera, belichting en compositie** (gebruik dezelfde seed / reference image zodat alleen het onderdeel verandert):

| Stap | Toevoeging aan de prompt |
|---|---|
| 0 · Start | — (basiswoning, oude enkele beglazing zichtbaar) |
| 1 · Kozijnen | *new slim white frames with HR++ / triple glazing* |
| 2 · Isolatie | *subtle, no visible change outside; add a small cut-away showing roof and floor insulation* (of: zelfde beeld + overlay-label) |
| 3 · Zonnepanelen | *sleek all-black solar panels neatly covering the front roof slope* |
| 4 · Thuisbatterij | *a compact modern white wall-mounted home battery in an open carport/side wall, softly lit* |
| 5 · Laadpaal | *a modern wall-mounted EV charger next to the front door with a charging electric hatchback on the driveway, cable plugged in* |
| 6 · Airco | *a compact, neatly installed air-conditioning outdoor unit on a wall bracket on the side façade* |

**Niet tonen: warmtepomp.** Geen warmtepomp-buitenunit op de renders (een airco-buitenunit is klein en strak; laat dat verschil goed zien).

Lever ook één **totaalbeeld** (alle onderdelen tegelijk) voor de homepage-sectie "Comfort dat je voelt" — daarop komen de hotspots *Airco*, *Thuisbatterij* en *Laadpaal*.

Bestandsnamen: `woning-stap-0-start.avif` … `woning-stap-6-airco.avif`, `woning-totaal.avif`; formaat min. 2400×1500.

---

## 5. Homepage — sectie voor sectie

Volg de artboard *Homepage* op het canvas.

1. **Hero** — groot afgerond beeld (`woonkamer-gezin`) over de volle containerbreedte, ±640px hoog. Daarop linksonder een crème kaart (`--shadow-float`) met: badge "Lekker wonen, slim verduurzamen", H1 *"Jouw huis, jouw pad, jouw tempo."*, de bestaande lead, knoppen **Start je Gripscan** (primair) en **Bekijk het stappenplan** (secundair, outline → `/zo-werkt-het`). Onder het beeld een rij van vier vinkjes: Vrijblijvende Gripscan · Gecertificeerde EP-adviseurs · 14 dagen bedenktijd · Geen verkoop aan de deur. Mobiel: kaart schuift onder het beeld met negatieve marge.
2. **"Comfort dat je voelt"** (wit) — links het totaalbeeld van de woning (§4b) met drie klikbare hotspots (genummerde pill-chips) voor *Airco*, *Thuisbatterij*, *Laadpaal*; rechts eyebrow "Eén plan voor je hele huis", H2, korte tekst en drie item-rijen met icoon + titel + één zin. Hotspot-klik/hover markeert de bijbehorende rij (en andersom). Onderaan klein: "Ook: kozijnen, isolatie, zonnepanelen, energiemanagement en energiecontracten." (vervangt de huidige chip-rij "Wat we voor je regelen").
3. **Gripplan-blok** (donkerblauw vlak, radius 36px) — links: eyebrow "Het Gripplan", H2 *"Zie per stap wat er verandert in jouw huis."*, korte uitleg, genummerde lijst Gripscan → Gripplan → Uitvoering in jouw tempo, knop **Bekijk het stappenplan** → `/zo-werkt-het`. Rechts: **screenshot van de stappenplan-module** in een licht browserframe, 1–2° gedraaid, met diepe schaduw. Maak die screenshot automatisch: render `/zo-werkt-het` met Playwright op 1280×800, crop de module, sla op als `gripplan-screenshot.avif/webp` (2× retina). Voeg een npm-script toe (`npm run screenshot:gripplan`) zodat hij opnieuw gemaakt kan worden na wijzigingen.
4. **Pakketten** — kop links, intro rechts; drie kaarten met foto bovenaan (zie §4a), titel, één zin, maatregelen-lijst en het verwachte labeleffect (kleurchips C → A / A++) met voetnoot. Middelste kaart krijgt een 2px groene rand. Inhoud van de pakketten 1-op-1 overnemen uit de huidige site.
5. **Griptegoed** (zachtgroen vlak) — tekst links, rechts een kaart met voortgangsbalk "Ferme grip gerealiseerd → Volgende stap: …" (label "Voorbeeld"). Wijzig in de voorbeeld-tekst de volgende stap van "warmtepomp" naar "thuisbatterij".
6. **Waarom Grip op Stroom** (wit) — `spelavond-gezin` links (4:5), rechts H2 *"Een vaste partij voor het hele traject"* en een 2×2 grid zonder kaarten: EP-adviseurs · Bron bij elk cijfer · 14 dagen bedenktijd · Jij neemt het initiatief.
7. **Contact** — zie §7: adresblok links, formulier rechts.
8. **FAQ** — behoud de accordeon, maar max. 5 vragen op de homepage + link "Alle vragen". Accordeon in de nieuwe stijl (grote tikdoelen, +/− icoon, `<details>/<summary>` of ARIA-conform).
9. **Footer** (donkerblauw) — 4 kolommen: merk + payoff · menu · contact (adres/telefoon) · juridische links + **Bronnen**. De bronnenlijst verhuist naar een uitklapbaar blok in de footer of een aparte `/bronnen`-pagina; voetnootnummers in de tekst blijven en linken ernaartoe.

Verwijder van de homepage: de grote interactieve stappenplan-module en het losse "Hulp bij het betalen"-blok (verplaats naar Pakketten of FAQ).

---

## 6. Pagina "Zo werkt het" — het stappenplan, moderner

Volg de artboard *Zo werkt het – stappenplan*. Functioneel gelijk aan de huidige module, visueel vernieuwd.

**Layout**
- Paginakop: eyebrow "Zo werkt het · Stappenplan", H1 *"Elke stap maakt je woning sterker"*, lead.
- Stappenbalk: horizontale rij pill-knoppen `Start · 1 Kozijnen · 2 Isolatie · 3 Zonnepanelen · 4 Thuisbatterij · 5 Laadpaal · 6 Airco`, daaronder een dunne voortgangsbalk. Op mobiel horizontaal scrollbaar met scroll-snap. (Stappen- en volgorde-data uit de bestaande module halen; de warmtepomp-stap vervalt hier visueel — check §10.)
- Links (±60%): grote kaart met de **render van de actieve stap** (§4b), label linksboven "Voorbeeldwoning · tussenwoning 1980 · 120 m²", daaronder knoppen ← Vorige · ▶ Afspelen · Volgende → en de disclaimer.
- Rechts (±40%): energielabel-ladder (A++++ t/m G, officiële labelkleuren, actief label omlijnd + "nu"), twee cijferkaarten (energiekosten/jaar, indicatieve woningwaarde, met bronnummer), en een donkerblauwe toelichtingskaart per stap.
- Onderaan de bestaande "Drie stappen naar een sterkere woning" (Gripscan/Gripplan/Uitvoering) en de CTA.

**Gedrag**
- Stapwissel: renders **crossfaden** (300ms); het nieuwe onderdeel krijgt een korte zachte gloed/pulse + label-chip. Cijfers tellen animerend op/af (600ms, ease-out). Labelmarkering schuift naar de nieuwe klasse.
- "Afspelen" loopt automatisch door alle stappen (3s per stap), pauzeert bij interactie, toont "Pauze".
- Toetsenbord: pijltjes links/rechts wisselen stap; stappenbalk is een `role="tablist"` met correcte `aria-selected`; wijzigingen in cijfers via `aria-live="polite"`.
- Stap in de URL (`/zo-werkt-het?stap=4`) zodat je direct kunt linken (o.a. vanaf de hotspots op de homepage).
- `prefers-reduced-motion`: geen crossfade/teller, direct wisselen; Afspelen uit.
- Alle stapdata in één bestand (bijv. `content/stappenplan.json`): id, titel, beschrijving, render-bestand, label, energiekosten, woningwaarde, bron-ids. Geen cijfers hardcoded in componenten.
- Preload de render van de volgende stap.

---

## 7. Contact — gegevens en formulier

De contactgegevens en het formulier zijn gelijk aan die van solarisprime.nl (formulier "Huiseigenaren").

**Bedrijfsgegevens (in contactblok, contactpagina en footer)**

```
Grip op Stroom B.V.
Handelsweg 14
7041 GX 's-Heerenberg
Telefoon: 026 205 6179        → <a href="tel:+31262056179">
E-mail:   klantenservice@solarisprime.nl   → zie open punt §10
Bereikbaar: iedere werkdag van 08:00 tot 17:00
KvK: [INVULLEN — zie §10]
```

Voeg `LocalBusiness`/`Organization` structured data (JSON-LD) toe met deze gegevens.

**Formulier (alle velden verplicht)**

| Label | Type | name | autocomplete |
|---|---|---|---|
| Naam | text | `naam` | `name` |
| E-mail | email | `email` | `email` |
| Telefoon | tel | `telefoon` | `tel` |
| Postcode | text (NL-patroon `^[1-9][0-9]{3}\s?[A-Za-z]{2}$`) | `postcode` | `postal-code` |
| Bericht | textarea (5 rijen) | `bericht` | — |

Knop: **Verzenden**. Onder het formulier: "We gebruiken je gegevens alleen om contact met je op te nemen." + link naar de privacyverklaring.

- Zichtbare `<label>`s (geen placeholder-als-label), foutmeldingen inline per veld in het Nederlands, focus naar het eerste foute veld, succesmelding in een `aria-live`-regio.
- Spam: honeypot-veld + rate limiting; geen captcha die toegankelijkheid breekt.
- Verzending: gebruik de bestaande formulier-backend/e-mailkoppeling van het project. Is die er niet, maak een server-route die de inzending mailt naar het adres hierboven en schrijf de afhandeling zo dat het doeladres in een env-variabele staat (`CONTACT_TO`). Als HubSpot-formulieren al worden gebruikt, koppel hieraan en voeg verborgen velden toe voor `lead_source` en UTM-parameters.
- Plaatsing: homepage-sectie "Contact" (links adreskaart, rechts formulier in witte kaart) én `/contact`. De huidige contactpagina ("Start de Gripscan. Dan nemen wij contact met je op.") wordt vervangen door deze opzet; behoud de kop *"Jij neemt het initiatief"* en de belofte dat er niet ongevraagd gebeld wordt.

---

## 8. Overige pagina's

- **Over ons**: hero met `spelavond-gezin`, verhaal "Waarom Grip op Stroom bestaat" in twee kolommen, de vier werkprincipes als iconen-grid, CTA-band.
- **Pakketten**: pakketkaarten groot, vergelijkingstabel eronder, Griptegoed en "Hulp bij het betalen" (financieringsinfo met bronnen) hier.
- **Vragen**: alle FAQ's, gegroepeerd, met zoekveld.
- CTA-band onderaan pagina's: zachtgroen vlak in plaats van het huidige vlakke donkerblauw, zodat de footer (donkerblauw) zich onderscheidt.

---

## 9. Kwaliteit & oplevering (checklist)

- [ ] Alle kleuren/typografie via tokens; fonts Bricolage Grotesque + Figtree geladen.
- [ ] Homepage bevat géén interactieve stappenplan-module meer; wél het Gripplan-blok met screenshot en knop naar `/zo-werkt-het`.
- [ ] "Zo werkt het" in het hoofdmenu; stappenplan werkt met muis, toetsenbord en touch; `?stap=` deeplinks werken.
- [ ] Geen plat/grafisch huisje meer; renders (of gelabelde placeholders) met airco, thuisbatterij en laadpaal; nergens een warmtepomp in beeld.
- [ ] De vijf lifestyle-foto's staan op de aangegeven plekken, responsive en geoptimaliseerd.
- [ ] Contactgegevens en formulier volgens §7; formulier valideert en verstuurt; JSON-LD aanwezig.
- [ ] Alle bestaande teksten, cijfers en bronvoetnoten behouden en klikbaar naar de bronnen.
- [ ] WCAG 2.2 AA: contrast ≥ 4.5:1 (tekst op beeld alleen op een effen kaart), focus-states zichtbaar, tikdoelen ≥ 44px, `lang="nl"`, landmarks.
- [ ] Responsive gecontroleerd op 390, 768, 1024, 1440 px; geen horizontale scroll.
- [ ] Lighthouse mobiel: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95. LCP (hero-foto) < 2,5s.
- [ ] `prefers-reduced-motion` gerespecteerd.
- [ ] Screenshots desktop + mobiel van alle pagina's in de PR-beschrijving.

---

## 10. Open punten (eerst laten bevestigen door Marco, niet zelf invullen)

1. **E-mailadres**: overnemen van Solaris Prime (`klantenservice@solarisprime.nl`) of een eigen adres op het Grip op Stroom-domein?
2. **KvK-nummer**: Solaris Prime gebruikt 95531602. Grip op Stroom B.V. is mogelijk een eigen entiteit met een eigen nummer — niet zonder bevestiging overnemen.
3. **Warmtepomp in de inhoud**: het pakket *Stevige grip* en de stappen bevatten nu een warmtepomp. Het beeld toont er geen; blijft de warmtepomp inhoudelijk in pakket en stappenplan, of vervalt hij (en wordt de airco de verwarmingsstap)?
4. **Renders**: wie maakt ze (AI-tool of 3D-bureau) en wanneer? Tot die tijd gaan de placeholders live? (Advies: niet live zonder renders.)
5. **Logo**: het huidige logo blijft; lever het als SVG aan als dat nog niet in de repo staat.
