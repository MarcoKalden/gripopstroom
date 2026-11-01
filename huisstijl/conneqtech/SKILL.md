---
name: conneqtech-huisstijl
description: Apply the Conneqtech brand (colours, Neris/Cera Pro fonts, logo, graphic style, NL/CH language rules) to any Conneqtech design, document, page or print piece.
---

# Conneqtech huisstijl

Gebruik deze skill bij alles wat voor Conneqtech wordt gemaakt: designs, drukwerk (roll-ups, flyers), landingspagina's, lead magnets, presentaties, documenten, e-mails, e-mailhandtekeningen en social posts.
Bronnen: Conneqtech Brand Guidelines (januari 2026, CT_BRANDBOOK_DE.pdf), whitepaper "Ritregistratie zonder risico" (referentie voor de vormentaal), logo CONNEQTECH_LOGO_Q_DEF (.ai/.svg).

## 1. Kleuren (brandbook jan. 2026)

Gebruik uitsluitend deze kleuren. **Drukwerk altijd in CMYK met exact deze waarden** (niet laten omrekenen vanuit RGB).

| Rol | HEX | RGB | CMYK |
|---|---|---|---|
| Primair blauw (hoofdkleur, koppen, vlakken) | #1E71B7 | 30 113 183 | 85 50 1 0 |
| Donkerblauw (accenten, schaduwvlakken) | #03558D | 3 85 141 | 96 65 20 4 |
| Middenblauw | #0B66AB | 11 102 171 | 90 56 5 0 |
| Lichtgrijs | #D0D0D2 | 208 208 210 | 22 16 16 0 |
| Grijs licht-midden | #B5B5B5 | 181 181 181 | 32 24 25 4 |
| Grijs | #9D9D9C | 157 157 156 | 40 31 32 10 |

- Achtergronden: wit of zeer lichtgrijs #EDEDED (CMYK ca. 7 5 5 0) voor rustige vlakken.
- Het brandbook vermeldt voor lichtgrijs de typo "#2D0D0D2"; correct is #D0D0D2.
- **Geen roze, rood of paars als Conneqtech-kleur**, ook niet als verloop of overlay. Altijd blauw. (Uitzondering: logo's van derden, zoals het paarse Fleet Expo-logo, blijven in hun eigen kleuren, maar alleen binnen dat logo.)
- Witte tekst op #1E71B7 is toegestaan (contrast ca. 4,9:1); kleine grijze tekst op wit vermijden.
- Donkere broodtekst in print: koel bijna-zwart, bijv. CMYK 80 60 45 60.

CSS-tokens:
```css
:root{
  --ct-blue:#1E71B7; --ct-blue-dark:#03558D; --ct-blue-mid:#0B66AB;
  --ct-grey-light:#D0D0D2; --ct-grey-mid:#B5B5B5; --ct-grey:#9D9D9C; --ct-bg-grey:#EDEDED;
}
```

## 2. Typografie

| Gebruik | Lettertype | Gewichten |
|---|---|---|
| Koppen, titels, opvallende teksten | **Neris** | Black (grote titels), SemiBold (tussenkoppen), Light (subkoppen) |
| Broodtekst, langere teksten | **Cera Pro** | Regular, Medium, Bold |
| Digitale teksten (UI, mail, web waar Cera niet kan) | **Segoe UI** | — |

- Beschikbare Neris-bestanden (neris.zip van de gebruiker): Thin, Light, SemiBold, Black (+ italics) en BoldItalic. **Er is geen Neris Regular of Bold (rechtop)**: gebruik Black voor grote koppen, SemiBold voor tussenkoppen.
- Cera Pro (CeraPro.zip van de gebruiker): .ttf/.woff/.eot in Thin t/m Black.
- Grote koppen in het brandbook vaak in HOOFDLETTERS; in campagne-uitingen (whitepaper, roll-up) zinsopbouw in Neris Black is ook goed.
- Reservefonts als de merkfonts niet beschikbaar zijn: koppen `'Neris','Signika',sans-serif`, tekst `'Cera Pro','Outfit',sans-serif`. Nooit Lexend, Roboto, Inter of Arial als vervanger voor Neris. Noem bij een proef altijd welke reservefonts zijn gebruikt.
- **Licenties**: Neris (Eimantas Paškonis) is gratis commercieel bruikbaar, maar fontbestanden mogen niet gedeeld/downloadbaar gemaakt worden; Cera Pro is betaald. Dus: fonts **nooit** committen in git, uploaden naar een gedeelde pagina/artifact of als webfont publiceren. Alleen lokaal gebruiken en als subset insluiten in PDF's (toegestaan). Vraag de zips opnieuw op bij de gebruiker in een nieuwe sessie.
- Technisch: Neris is OTF (CFF). Voor PDF-productie met ReportLab eerst omzetten naar TTF met `tools/otf2ttf.py` (fontTools). Chromium kan de .otf direct gebruiken via @font-face (alleen lokaal).

## 3. Logo

- Huidig logo: **CONNEQTECH_LOGO_Q_DEF** = beeldmerk hexagon + woordmerk CONNEQTECH met de "Power Q" + slogan CONNECTING MOBILITY. Bestanden: `logo/CONNEQTECH_LOGO_Q_DEF.svg` en `.ai` in deze map. Altijd als vector gebruiken (nooit een uitsnede/screenshot).
- De SVG is in RGB opgebouwd. Voor drukwerk de vulkleuren omzetten naar de CMYK-waarden uit §1:
  - #D0CFD0/#D0D0D2 → 22 16 16 0 · #1E71B7/#1F71B8 → 85 50 1 0 · #B5B4B3/#B5B5B5 → 32 24 25 4
  - #03558D → 96 65 20 4 · #0B66AB → 90 56 5 0 · #9C9B9A/#9D9D9C → 40 31 32 10
  - Slogan-grijs #7D7C7C staat niet in het brandbook; benadering CMYK 52 43 43 30 (navragen bij Conneqtech als exacte waarde nodig is).
  - Let op: de SVG bevat elk hexagon-vlak dubbel (twee nagenoeg gelijke kleuren); dat is zo bedoeld/onschuldig.
  - Met svglib: `svg2rlg` schaalt px→pt (×0,75); gebruik `drawing.getBounds()` voor de logo-uitsnede.
- Toegestaan: volledig logo; op donkere achtergrond mits leesbaar; diapositief (wit) op een contrasterende huisstijlkleur (blauw).
- Niet toegestaan: logo zonder beeldmerk; logo zonder Power Q; op felle achtergrondkleur (bijv. rood); diapositief op grijs waardoor een deel wegvalt. Nooit vervormen of hertekenen.
- **Grafische Q** (ringsegmenten donkerblauw, lichtgrijs, grijs, blauw + staart) mag de letter Q vervangen in koppen met woordspel, bijv. "CONNEQTING TRADITIONS". Hoogte ca. 0,76× de korpsgrootte, op de basislijn.

## 4. Vormentaal

- Kernwaarden: heldere typografie, geometrische vormen, strakke lijnen, zakelijk kleurgebruik.
- **Schuine vlakken**: brede banden/vlakken met een licht schuine boven- of onderrand (ca. 5–10°), afgeleid van de hexagon. Op covers grote overlappende vlakken in blauw, donkerblauw en lichtgrijs, soms met afgeronde hoeken (hexagonvorm).
- **Hoekdriehoeken**: in een hoek een middenblauwe en een donkerblauwe driehoek over elkaar; lichtgrijze/zeer lichtgrijze driehoeken in de tegenoverliggende hoek.
- **Foto met blauw verloop** (whitepaper-stijl): foto in een vlak met schuine boven-/onderrand; daaroverheen een verloop van transparant naar #1E71B7 / #03558D aan de tekstkant; witte kop in Neris Black op het blauwe deel. Foto's licht ontzadigd/koel.
- **Labels en knoppen in pilvorm**: wit omlijnd pil-label met spatiëring in hoofdletters (bijv. "WHITEPAPER", "FLEET EXPO 2026"); knoppen als gevulde blauwe pil met pijl →.
- **Iconen**: lijniconen in blauwe cirkels (outline-stijl); vinkjes in een blauwe cirkel voor voordelenlijsten.
- "conneqtech.com" klein, vet, blauw linksboven op pagina's/slides.
- Claim: **"Slim verbonden. Altijd in controle."** (DE: "Smart vernetzt. Immer unter Kontrolle.")

## 5. Taal en landen

- Twee vestigingen: **Nederland** en **Zwitserland**. NL: www.conneqtech.com · CH: **conneqtech.ch**.
- Zwitserse teksten in Zwitsers Duits: **nooit ß, altijd ss** (Grüsse, schliessen, gross). Controleer de eindtekst hier expliciet op.
- Zwitserse aanspreekvorm standaard "Sie"; Nederlandse teksten mogen "je/jou".
- In tweetalige NL/CH-uitingen in de CH-versie Zwitserland eerst noemen ("aus der Schweiz & den Niederlanden").

## 6. Contactgegevens

Conneqtech · Hamseweg 22, 3828 AD Hoogland · +31 (0)33 205 3400 · info@conneqtech.com · www.conneqtech.com
(Let op: in de huidige e-mailhandtekening staat "Harmseweg"; het brandbook zegt "Hamseweg".)

## 7. Producten en zustermerken

- Productnamen (exact zo schrijven): **RentWise**, **LeaseWise**, **Plan-IT** (integraties van Conneqtech met deze software van CarWise Group).
- Zustermerken, niet mengen met Conneqtech:
  - **AutoConneqt**: eigen logo; Core Rhino voor koppen, TT Commons Pro voor broodtekst.
  - **SecureTrack**: eigen logo; Roboto.

## 8. Drukwerk

- CMYK met de waarden uit §1, 3 mm afloop rondom, TrimBox/BleedBox in de PDF zetten; fonts als subset insluiten; geen RGB-objecten.
- Beelden: minimaal 300 dpi op eindformaat voor klein drukwerk; voor roll-ups/grootformaat is 100–150 dpi op eindformaat acceptabel. Meld het als een aangeleverd beeld daaronder zit.
- **Roll-up 85×200 cm**: bestand 856×2006 mm (incl. afloop). Onderste ±150 mm verdwijnt in de cassette: geen tekst. Logo bovenaan (ooghoogte), kernboodschap in het bovenste/middelste deel, tekst in steekwoorden. Geen datum/standnummer als de banner herbruikbaar moet zijn.
- Werkwijze CMYK-PDF zonder Illustrator: ReportLab met `CMYKColor`, logo via svglib met kleuren omgezet naar CMYK, foto + blauw verloop gerasterd in CMYK (overlay met exacte merkwaarden). Voorbeeld: `tools/voorbeeld_rollup_cmyk.py`. Controle: `pdffonts` (alles ingesloten), `pdfimages -list` (kleur cmyk), `pdfinfo -box` (TrimBox), geen `rg/RG`-operators.

## 9. Digitaal

- **E-mailhandtekening-banner**: 600 px breed (ook 500 px variant), 3:1 (600×200). Lever een 2×-versie (1200×400 JPG, < 100 kB) voor retina, weergegeven op width=600. Geen Conneqtech-logo in de banner als het logo al in de handtekening staat. Alt-tekst met de volledige boodschap.
- Huidige handtekening: naam in blauw, functie, lijn, logo, adres/telefoon/mail/website, disclaimer, CCV Keurmerk Voertuigbeveiliging.

## Werkwijze

1. Pas kleuren, fonts en vormentaal hierboven toe vóór je een eigen stijl kiest.
2. Vraag ontbrekende assets op bij de gebruiker (fontbestanden in elke nieuwe sessie, foto's in hoge resolutie, exacte CMYK voor niet-brandbook-kleuren).
3. Controleer bij oplevering: alleen huisstijlkleuren (CMYK exact voor print), geen rood/roze, juiste logo-versie als vector, Neris/Cera Pro (of genoemde reservefonts), fonts niet gedeeld, CH-tekst zonder ß en met conneqtech.ch.
