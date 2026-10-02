# Beelden van de voorbeeldwoning

Nu staan hier schetsen (SVG), gemaakt met `python3 tests/woning-schetsen.py`. Ze tonen
dezelfde woning per stap, zonder warmtepomp. De site gebruikt ze tot de fotorealistische
renders er zijn (REDESIGN.md §4b).

Renders aanleveren: minimaal 2400×1500 (16:10), AVIF, dezelfde compositie als de schetsen:

- woning-stap-0-start.avif
- woning-stap-1-kozijnen.avif
- woning-stap-2-isolatie.avif
- woning-stap-3-zonnepanelen.avif
- woning-stap-4-thuisbatterij.avif
- woning-stap-5-laadpaal.avif
- woning-totaal.avif (homepage, met airco, thuisbatterij en laadpaal)

Zet daarna in steps.json (`render`) en content/home.json (`comfort.render`) de .avif-namen
in plaats van de .svg-namen, en draai `cd tests && npm run screenshot:gripplan`.
