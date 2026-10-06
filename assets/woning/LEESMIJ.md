# Beelden van de voorbeeldwoning

De voorbeeldwoning is een hoekwoning uit circa 1980 van circa 120 m².

| Stap | Bestand | Origineel in grip-op-stroom-renders/ | Status |
| --- | --- | --- | --- |
| 0 Start | woning-stap-0-start.webp | 0-start.webp | aangeleverd, zonder nummer en titel in beeld |
| 1 Kozijnen | woning-stap-1-kozijnen.webp | 1-kozijnen.webp | aangeleverd |
| 2 Isolatie | woning-stap-2-isolatie.webp | 2-isolatie.webp | aangeleverd |
| 3 Zonnepanelen | woning-stap-3-zonnepanelen.webp | 3-zonnepanelen.webp | aangeleverd |
| 4 Thuisbatterij | woning-stap-4-thuisbatterij.webp | 4-thuisbatterij.webp | aangeleverd |
| 5 Laadpaal | woning-stap-5-laadpaal.webp | 5-laadpaal.webp | aangeleverd |
| 6 Airco | woning-stap-6-airco.webp | 6-airco.webp | aangeleverd, buitenunit op het platte dak |
| 7 Warmtepomp | woning-stap-7-warmtepomp.webp | 7-warmtepomp.webp | aangeleverd |
| Totaal (homepage, 8) | woning-totaal.webp | 8-totaal.webp | aangeleverd |

Alle beelden zijn groot genoeg (1122 tot 1586 px breed). Stap 1 tot en met 7 en het totaalbeeld
staan rechtop, ongeveer 4:5; de startfoto is liggend (16:10). Voor de site zijn ze opgeslagen
als WebP (maximaal 1280 tot 1400 px breed, kwaliteit 75 tot 78).

Nieuwe beelden: zet ze hier neer en pas de naam aan in steps.json (`render`) of
content/home.json (`comfort.render`). Heeft het beeld zelf al een nummer en titel, zet dan
`renderHasLabel: true`. Verandert het totaalbeeld, controleer dan ook de plek van de nummers
(`comfort.items[].x` en `y` in content/home.json). Daarna `cd tests && npm run screenshot:gripplan`.
