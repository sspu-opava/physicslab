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
- Výběr těles na plátně nebo ve stromu, přidání kruhu a obdélníku.
- Inspector pro počáteční polohu, rotaci, hmotnost, tření, restituci, tlumení, rychlost a barvu.
- Odečet skutečné aktuální polohy a rychlosti; žádná ukázková data grafů.
- Serializovatelný model, nezávislý adaptér, fixed timestep, unit testy.

Úpravy scény jsou dostupné ve stavu STOPPED. Stop i Reset vrací autorskou scénu do výchozího stavu. Pause zachovává průběh. Běh simulace nikdy nepřepisuje počáteční hodnoty dokumentu.

## Další etapy

Přímé přesouvání / otáčení / změna velikosti, historie příkazů, vazby, senzory a záznam měření s grafy, síly, ukládání projektů, experimenty a registry pluginů. Tyto funkce zatím nejsou implementované. Konfigurace nyní vytváří desktopový executable s vlastní ikonou, bez instalátoru; distribuce přijde později.

Viz [architektura](docs/architecture.md).

