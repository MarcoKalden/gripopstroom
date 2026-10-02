# Grip op Stroom: brandingpagina

Statische pagina (HTML, CSS, vanilla JavaScript) met de labelanimatie als kern.

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
| `content.json` | Alle teksten. Bronverwijzing: `[[bron-id]]` |
| `steps.json` | Stappen, labels en bedragen (placeholders, `"validated": false`) |
| `sources.json` | Bronnenlijst; nummering volgt de volgorde in dit bestand |
| `assets/logo-gos.png` | Logo zonder "B.V.", transparante achtergrond |
| `assets/house.svg` | Woning met componentgroepen `#kozijnen`, `#isolatie`, `#warmtepomp`, `#zonnepanelen`, `#batterij`, `#laadpaal` |

De optionele laadpaalstap staat in `steps.json` met `"enabled": false`. Zet hem op `true` om hem te tonen.

## Voor livegang

- Stappen, bedragen en labelsprongen valideren met een EP-adviseur.
- Bevestigen dat batterij, energiemanagement en laadpaal niet meetellen in NTA 8800.
- Bron-URL's in `sources.json` controleren.
