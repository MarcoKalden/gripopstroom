# Renders van de voorbeeldwoning

Zet hier de fotorealistische renders (zie REDESIGN.md §4b), minimaal 2400×1500, als AVIF:

- woning-stap-0-start.avif
- woning-stap-1-kozijnen.avif
- woning-stap-2-isolatie.avif
- woning-stap-3-zonnepanelen.avif
- woning-stap-4-thuisbatterij.avif
- woning-stap-5-laadpaal.avif

Geen warmtepomp op de renders.
- woning-totaal.avif (homepage, met airco, thuisbatterij en laadpaal)

De namen staan in steps.json (`render`) en content/home.json (`comfort.render`).
Ontbreekt een bestand, dan toont de site een gelabelde placeholder.
Na het toevoegen: `cd tests && npm run screenshot:gripplan`.
