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
- Čtyři fyzikální vazby: otočný kloub, pevná vzdálenost, posuvný kloub a pevné spojení; tvorba, výběr, vlastnosti a Undo/Redo.
- Inspector pro počáteční polohu, rotaci, hmotnost, tření, restituci, tlumení, rychlost a barvu.
- Odečet skutečné aktuální polohy a rychlosti; žádná ukázková data grafů.
- Serializovatelný model, nezávislý adaptér, fixed timestep, unit testy.

Úpravy scény jsou dostupné ve stavu STOPPED. Stop i Reset vrací autorskou scénu do výchozího stavu. Pause zachovává průběh. Běh simulace nikdy nepřepisuje počáteční hodnoty dokumentu.

## Ovládání editoru

Vybrat (V): kliknutí a tažení tělesa, Shift+klik pro více těles. Tažení prázdné plochy vybere plně obsažená tělesa; Shift zachová předchozí výběr. Skupina se přesouvá se zachováním vzájemných vzdáleností. Rotace (R): táhněte okraj tělesa kolem středu, Shift přichytává úhel po 15°. Velikost (S): táhněte okraj od středu; skupina se otáčí a škáluje kolem průměru středů vybraných těles. Inspector upravuje poslední vybrané těleso a umožňuje zadat přesný poloměr, šířku, výšku a typ tělesa. Posun pohledu: H nebo prostřední tlačítko myši.

Ctrl+Z: zpět, Ctrl+Shift+Z / Ctrl+Y: znovu, Ctrl+D: duplikace, Delete: smazání, Ctrl+A: všechna tělesa, Escape: zrušení probíhajícího tažení. Zkratky editoru nezasahují do psaní ve formulářových polích. Historie uchovává posledních 100 příkazů. Reset simulace historii nemaže.

## Ovládání vazeb

V knihovně zvolte typ, Těleso A a Těleso B a stiskněte **Přidat vazbu**. Pokud před volbou typu vyberete dvě tělesa přes Shift, dvojice se převezme do formuláře. Alespoň jedno těleso musí být dynamické. Otočný / posuvný / pevný spoj mají výchozí společnou kotvu ve středu A; pevná vzdálenost spojuje středy obou těles.

Kliknutím na vazbu ve stromu nebo její čáru zobrazíte Inspector. Upravíte místní kotvy, zapnutí, kolize, délku, referenční úhel nebo osu a meze pohybu. Pole úhlů používají stupně, model radiány. Vazby lze vypnout nebo smazat a obnovit přes Undo. Během běhu a pauzy jsou změny blokované, Reset obnoví autorský model včetně vazeb.

Pro jednoduché kyvadlo umístěte statický závěs například do (0, 4) m a kouli do (1, 2) m, vytvořte otočný kloub se závěsem jako A a spusťte simulaci. Závěs může být malý statický obdélník. Čára vazby je vizualizace, nikoli další kolidující tyč.

## Další etapy

Další fáze: senzory a záznam měření s grafy, následně síly, ukládání projektů, experimenty a registry pluginů. Trvalé skupiny, polygonová tělesa, geometrické úchyty na plátně a motory vazeb zatím nejsou implementované. Konfigurace nyní vytváří desktopový executable s vlastní ikonou, bez instalátoru; distribuce přijde později.

Viz [architektura](docs/architecture.md).

