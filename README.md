# PhysicsLab

Desktopová fyzikální laboratoř v Tauri 2, Svelte 5, TypeScriptu, PixiJS 8 a Planck.js. Vývoj podle `copilot-instructions.md`, s tmavým rozhraním podle `gui/navrh-gui.png`.

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
- Senzory polohy, rychlosti, zrychlení, úhlu, úhlové rychlosti a energií; záznam v simulačním čase.
- Více křivek v grafu se společnými jednotkami, tabulka hodnot a export CSV/JSON.
- Serializovatelný model, nezávislý adaptér, fixed timestep, unit testy.

Úpravy scény jsou dostupné ve stavu STOPPED. Stop i Reset vrací autorskou scénu do výchozího stavu. Pause zachovává průběh. Běh simulace nikdy nepřepisuje počáteční hodnoty dokumentu.

## Ovládání editoru

Vybrat (V): kliknutí a tažení tělesa, Shift+klik pro více těles. Tažení prázdné plochy vybere plně obsažená tělesa; Shift zachová předchozí výběr. Skupina se přesouvá se zachováním vzájemných vzdáleností. Rotace (R): táhněte okraj tělesa kolem středu, Shift přichytává úhel po 15°. Velikost (S): táhněte okraj od středu; skupina se otáčí a škáluje kolem průměru středů vybraných těles. Inspector upravuje poslední vybrané těleso a umožňuje zadat přesný poloměr, šířku, výšku a typ tělesa. Posun pohledu: H nebo prostřední tlačítko myši.

Ctrl+Z: zpět, Ctrl+Shift+Z / Ctrl+Y: znovu, Ctrl+D: duplikace, Delete: smazání, Ctrl+A: všechna tělesa, Escape: zrušení probíhajícího tažení. Zkratky editoru nezasahují do psaní ve formulářových polích. Historie uchovává posledních 100 příkazů. Reset simulace historii nemaže.

## Ovládání vazeb

V knihovně zvolte typ, Těleso A a Těleso B a stiskněte **Přidat vazbu**. Pokud před volbou typu vyberete dvě tělesa přes Shift, dvojice se převezme do formuláře. Alespoň jedno těleso musí být dynamické. Otočný / posuvný / pevný spoj mají výchozí společnou kotvu ve středu A; pevná vzdálenost spojuje středy obou těles.

Kliknutím na vazbu ve stromu nebo její čáru zobrazíte Inspector. Upravíte místní kotvy, zapnutí, kolize, délku, referenční úhel nebo osu a meze pohybu. Pole úhlů používají stupně, model radiány. Vazby lze vypnout nebo smazat a obnovit přes Undo. Během běhu a pauzy jsou změny blokované, Reset obnoví autorský model včetně vazeb.

Pro jednoduché kyvadlo umístěte statický závěs například do (0, 4) m a kouli do (1, 2) m, vytvořte otočný kloub se závěsem jako A a spusťte simulaci. Závěs může být malý statický obdélník. Čára vazby je vizualizace, nikoli další kolidující tyč.

## Měření a grafy

Ve spodním panelu otevřete **Senzory a záznam**, vyberte těleso, veličinu a interval a přidejte měření. Pro volný pád zkuste polohu y, rychlost vy a zrychlení ay. V **Grafech** přepínejte jednotky a viditelnost křivek; více těles nebo veličin se stejnou jednotkou lze porovnat současně. Záložka **Hodnoty** ukazuje vybrané těleso i všechny vytvořené senzory.

Definice senzorů a měření lze upravovat ve stavu STOPPED, včetně názvu, zapnutí, intervalu a limitu vzorků (výchozí 5000 na křivku). Změny a mazání podporují Undo/Redo. Při smazání tělesa se odstraní související senzory a měření. Pro jiné těleso nebo veličinu vytvořte nové měření.

Záznam se vzorkuje po fyzikálních krocích. Interval je v simulačních sekundách; pokud není násobkem 1/120 s, vzorek se pořídí v prvním kroku po požadovaném čase a uloží skutečný čas. Pauza záznam zachová, Krok může přidat vzorek. **CSV / JSON exportujte při pauze před Stop / Reset**: reset a úprava scény vymažou průběh a začnou na t = 0. Vymazat záznam za běhu nebo pauzy začne nový záznam v aktuálním čase. Překročení limitu postupně vypouští nejstarší vzorky, počet je viditelný v panelu.

Zrychlení je konečná diference rychlostí za jeden fyzikální krok, včetně nárazů; na t = 0 není určeno. Kinetická energie zahrnuje posuv i rotaci podle skutečné hmotnosti a momentu setrvačnosti enginu. Potenciální energie je `−m g·r` pro homogenní gravitaci, s nulou v počátku; mechanická energie nezahrnuje budoucí pružiny či jiná pole. Statická a kinematická tělesa mají v enginu nulovou hmotnost, tedy nulovou energii. Vzorky běhu jsou dočasné a nejsou součástí autorského dokumentu.

## Další etapy

Další fáze: síly a pole, ukládání projektů, experimenty a obecné registry pluginů. Silové a kontaktní senzory potřebují samostatnou vrstvu událostí a sil; zatím nejsou dostupné. Trvalé skupiny, polygonová tělesa, geometrické úchyty na plátně, lanová vazba a motory vazeb zatím nejsou implementované. Konfigurace nyní vytváří desktopový executable s vlastní ikonou, bez instalátoru; distribuce přijde později.

Viz [architektura](docs/architecture.md).

