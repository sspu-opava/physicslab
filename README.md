# PhysicsLab

Desktopová fyzikální laboratoř v Tauri 2, Svelte 5, TypeScriptu, PixiJS 8 a Planck.js. První etapa podle `copilot-instructions.md`, s tmavým rozhraním podle `gui/navrh-gui.png`.

## Spuštění

```powershell
npm install
npm run dev          # prohlížeč: http://127.0.0.1:5173
npm run tauri dev    # desktopové okno
```

Pro desktop jsou potřeba Rust, Microsoft C++ Build Tools a WebView2. Viz [předpoklady Tauri](https://v2.tauri.app/start/prerequisites/).

```powershell
npm run check
npm test
npm run build
npm run tauri build -- --no-bundle
```

## Co je hotové

- Svět s gravitací, statická podlaha, padající a odrážející se koule.
- Play, Pause, Stop, jednotlivý krok a Reset; rychlost 0,1× až 4×.
- PixiJS plátno, metrická mřížka, osy, měřítko, zoom kolem kurzoru a posun pohledu.
- Zobrazení celé scény jedním tlačítkem, včetně upravených a přidaných těles.
- Výběr těles na plátně nebo ve stromu, přidání kruhu a obdélníku.
- Editor scény: přesun tažením, otáčení, proporcionální změna velikosti, výběr více těles a výběrový rámeček.
- Přichycení přesunu k 0,01 / 0,05 / 0,1 / 0,5 / 1 m; Alt přichycení dočasně vypíná.
- Duplikace, mazání a Undo/Redo; celé tažení i úprava jednoho pole Inspectoru tvoří jeden příkaz.
- Inspector pro počáteční polohu, rotaci, hmotnost, tření, restituci, tlumení, rychlost a barvu.
- Odečet skutečné aktuální polohy a rychlosti; žádná ukázková data grafů.
- Serializovatelný model, nezávislý adaptér, fixed timestep, unit testy.

Úpravy scény jsou dostupné ve stavu STOPPED. Stop i Reset vrací autorskou scénu do výchozího stavu. Pause zachovává průběh. Běh simulace nikdy nepřepisuje počáteční hodnoty dokumentu.

## Ovládání editoru

Vybrat (V): kliknutí a tažení tělesa, Shift+klik pro více těles. Tažení prázdné plochy vybere plně obsažená tělesa; Shift zachová předchozí výběr. Skupina se přesouvá se zachováním vzájemných vzdáleností. Rotace (R): táhněte okraj tělesa kolem středu, Shift přichytává úhel po 15°. Velikost (S): táhněte okraj od středu; skupina se otáčí a škáluje kolem průměru středů vybraných těles. Inspector upravuje poslední vybrané těleso a umožňuje zadat přesný poloměr, šířku, výšku a typ tělesa. Posun pohledu: H nebo prostřední tlačítko myši.

Ctrl+Z: zpět, Ctrl+Shift+Z / Ctrl+Y: znovu, Ctrl+D: duplikace, Delete: smazání, Ctrl+A: všechna tělesa, Escape: zrušení probíhajícího tažení. Zkratky editoru nezasahují do psaní ve formulářových polích. Historie uchovává posledních 100 příkazů. Reset simulace historii nemaže.

## Další etapy

Další fáze: vazby (revolute, distance, prismatic, weld), následně senzory a záznam měření s grafy, síly, ukládání projektů, experimenty a registry pluginů. Trvalé skupiny, polygonová tělesa a geometrické úchyty na plátně zatím nejsou implementované. Konfigurace nyní vytváří desktopový executable s vlastní ikonou, bez instalátoru; distribuce přijde později.

Viz [architektura](docs/architecture.md).

