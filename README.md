# Grip op Stroom: brandingpagina

Statische pagina (HTML, CSS, vanilla JavaScript) met de labelanimatie als kern.

Opbouw: hero, labelanimatie, hoe het gripplan werkt, pakketten, griptegoed,
vertrouwen, afsluiting en footer met bronnenlijst.

## Bekijken

De pagina laadt JSON en de SVG met `fetch`, dus open hem via een webserver:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Bestanden

| Bestand | Inhoud |
| --- | --- |
| `index.html` | Opbouw van de pagina |
| `styles.css` | Huisstijl (CSS-variabelen op `:root`) en layout |
| `animation.js` | Laadt teksten en bronnen, stuurt de labelanimatie aan |
| `content.json` | Alle teksten, ook lijsten zoals pakketten en stappen. Bronverwijzing: `[[bron-id]]` |
| `steps.json` | Stappen, labels en bedragen (placeholders, `"validated": false`) |
| `sources.json` | Bronnenlijst; nummering volgt de volgorde in dit bestand |
| `assets/logo-gos.png` | Logo zonder "B.V.", transparante achtergrond |
| `assets/house.svg` | Woning met componentgroepen `#kozijnen`, `#isolatie`, `#warmtepomp`, `#zonnepanelen`, `#batterij`, `#laadpaal` |

Lijsten in `content.json` (stappen, pakketten, vertrouwenspunten) mogen langer of korter worden; de pagina past zich aan.
Reviews staan uit (`trust.reviews.enabled: false`) en verschijnen pas als je echte reviews invult en de schakelaar aanzet.

Op desktop loopt de animatie mee met scrollen als de hele sectie in één schermhoogte past. Op lagere schermen en op mobiel werkt hij met knoppen, swipe en pijltjestoetsen.

De optionele laadpaalstap staat in `steps.json` met `"enabled": false`. Zet hem op `true` om hem te tonen.

## Voor livegang

- Stappen, bedragen en labelsprongen valideren met een EP-adviseur.
- Bevestigen dat batterij, energiemanagement en laadpaal niet meetellen in NTA 8800.
- Bron-URL's in `sources.json` controleren.
- `links.gripscan` in `content.json` vervangen door de echte link naar de Gripscan (nu `#gripscan`).
- `links.privacy` en het KvK-nummer in `content.json` invullen.
- Labeleffecten per pakket laten valideren.
