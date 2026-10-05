# Ověření první etapy

Ověřeno 4. 10. 2026 na Windows:

- `npm run check`: 0 chyb, 0 varování.
- `npm test`: 7 úspěšných testů; Vitest 4.1.11.
- `npm run build`: úspěšný produkční frontend build. Vite upozorňuje na hlavní bundle kolem 510 kB před gzip; jde o výkonnostní doporučení, nikoli chybu sestavení.
- `cargo check --manifest-path src-tauri/Cargo.toml`: úspěšné.
- `cargo run --manifest-path src-tauri/Cargo.toml --quiet`: desktopová aplikace zkompilována a spuštěna, nalezeno nativní okno PhysicsLab. WebView2 potřebuje přístup k profilu v AppData mimo omezený sandbox.
- Audit po aktualizaci testovací závislosti: 0 zranitelností.

V Chrome na `http://127.0.0.1:5173` bylo vizuálně ověřeno PixiJS plátno, mřížka, podlaha a koule. Interaktivně ověřeno Play, Pause, jednotlivý krok (čas 0,008 s, vy −0,082 m/s), Reset (čas 0 s, y 4 m), přidání tělesa a okamžitá změna y v Inspectoru. Odečty simulace odpovídají skutečnému stavu.

Náhled: `artifacts/physicslab-preview.png` (lokální, mimo verzování).

Port 1420 byl na tomto počítači odmítnut chybou EACCES; frontend i Tauri proto používají 5173. Přímé vizuální ověření nativního okna přes computer-use se nepodařilo kvůli vypršení schválení nástroje; vizuální a interakční kontrola proběhla v prohlížeči nad stejným frontendem.

## Fáze 3 — editor scény (4. 10. 2026)

- `npm run check`: 0 chyb, 0 varování.
- `npm test`: 14 úspěšných testů ve 2 souborech.
- `npm run build`: úspěšný produkční build; nadále pouze doporučení Vite k velikosti hlavního bundle.
- Nové testy: jedna historie pro celé tažení, zrušení transakce, duplikace nezávislých fixtures, odstranění referencí při mazání a obnova přes Undo, izolace simulace od historie, skupinové přichycení / rotace / velikost, hit test otočeného obdélníku a výběrový rámeček.
- Chrome: tažení koule z (0, 4) do (2, 3) m a jedním Undo zpět; zvětšení poloměru přibližně z 0,3 na 0,6 m; otočení tažením přibližně o 89°; duplikace a Shift výběr více těles.
- Inspector: změna poloměru a přímé Undo; přidání obdélníku, zadání rotace 30°, přímé spuštění simulace, Reset a následné Undo autorské rotace. Simulace nepřidala příkazy do historie.
- Celá scéna: automatické přiblížení, rámeček kolem koule a obdélníku vybral dvě tělesa; Smazat ponechalo podlahu, Undo obnovilo obě tělesa.
- Finální náhled: `artifacts/physicslab-editor.png`. Nativní Rust část se v této fázi neměnila; kontrola rozhraní proběhla v prohlížeči.

## Fáze 4 — fyzikální vazby (4. 10. 2026)

- `npm run check`: 0 chyb, 0 varování.
- `npm test`: 25 úspěšných testů ve 3 souborech.
- `npm run build`: úspěšný produkční build; Vite pouze doporučuje rozdělit hlavní bundle (přibližně 540 kB před gzip).
- Testy fyziky: kyvadlo a společné kotvy, pevná vzdálenost, normalizovaná osa posuvu a meze, pevné spojení a referenční úhel, úhlové meze, vypnutí a odstranění vazby, odstranění navázaného tělesa a reset.
- Testy modelu a historie: místní souřadnice otočených těles, serializace, neplatné reference / délka / osa, vytvoření a změna vazby, mazání a Undo včetně referencí, odmítnutí změny obou těles na statická bez změny historie.
- Chrome: vytvořen závěs (0, 4) m a koule (1, 2) m, přidán otočný kloub; skutečná simulace kyvadla v čase 3,433 s ukázala polohu (0,716; 1,882) m a rychlost 1,490 m/s. Kotvy a čára vazby sledují simulovaná tělesa.
- Inspector: propojení tělesa se sebou bylo odmítnuto viditelným upozorněním a výběr B se vrátil na kouli. Vypnutí vazby bylo obnoveno přes Undo; smazání ponechalo obě tělesa, Undo obnovilo aktivní kloub a jeho funkci.
- Náhled: `artifacts/physicslab-joints.png`. Rust host se neměnil; rozhraní ověřeno v prohlížeči nad stejným frontendem.

## Fáze 5 — senzory, záznam a grafy (5. 10. 2026)

- `npm run check`: 0 chyb, 0 varování.
- `npm test`: 34 úspěšných testů ve 4 souborech, z toho 9 nových pro měření.
- `npm run build`: úspěšný produkční build; hlavní bundle 556,56 kB (159,37 kB gzip), nadále doporučení Vite k rozdělení bundle.
- `git diff --check`: bez chyb whitespace.
- Shodné vzorky při 30 a 144 FPS, interval 0,02 s bez kumulativního posunu, zrychlení volného pádu −9,81 m/s², změna rychlosti běhu na 2× bez změny intervalu.
- Pauza nezaznamenává, jednotlivý krok zaznamenává, Reset obnovuje t = 0 a neurčené zrychlení. Vypnutý senzor neposkytuje hodnoty. Dokument simulace zůstává nezměněný.
- Energie kruhu i obdélníku ověřena se skutečnou hmotností a momentem setrvačnosti, počáteční rotací a šikmým vektorem gravitace.
- Limit vzorků vypouští nejstarší data, počítá vypuštěné vzorky a ruční vymazání zachovává aktuální simulační čas.
- Definice mají Undo/Redo, odstranění tělesa čistí reference, neplatné intervaly / limity / reference jsou odmítnuty.
- Export CSV ověřuje escapování názvu, jednotky a počet řádků; JSON zachovává data i chybějící počáteční vzorek zrychlení. Graf pracuje s prázdnými a konstantními daty a při redukci zachová krátkou špičku.
- Vizuální a interakční kontrola panelu a stažení exportu v prohlížeči nebyly provedeny: nástroj v této relaci vrací prázdný seznam prohlížečů, Chrome ani vestavěný prohlížeč nejsou dostupné. Rust host se neměnil; nativní export nebyl ověřen. Lokální Vite server byl spuštěn na `http://127.0.0.1:5173/` pro ruční kontrolu.

## Fáze 6 — síly a pole (5. 10. 2026)

- `npm run check`: 0 chyb, 0 varování.
- `npm run build`: úspěšný produkční build; hlavní bundle 570,28 kB (163,22 kB gzip), Vite upozorňuje na doporučené rozdělení velkého bundlu.
- `git diff --check`: bez chyb whitespace.
- Kontrola testů v této fázi nebyla provedena.
- Knihovna nabízí konstantní sílu, jednorázový impuls, lineární odpor a pružinu se dvěma tělesy, klidovou délkou, tuhostí a tlumením. Nastavení parametrů, zapnutí, smazání a historie jsou součástí autorského dokumentu.
- Gravitační pole přičítá zadané zrychlení ke gravitaci světa; vítr uplatňuje lineární odpor podle relativní rychlosti prostředí.
- Vizuální kontrolu aplikace nebylo možné provést, protože prohlížečové nástroje nejsou v této relaci dostupné.
- Editor umožňuje také jednorázový impuls: aplikuje se při prvním simulačním kroku po resetu, opětovné spuštění po pauze ho neopakuje.

## Fáze 7 — vizualizace (5. 10. 2026)

- `npm run check`: 0 chyb, 0 varování.
- `npm run build`: úspěšný produkční build; hlavní bundle 575,77 kB (164,82 kB gzip), Vite upozorňuje na doporučené rozdělení bundlu.
- `git diff --check`: bez chyb whitespace.
- Překryvy plátna: rychlost, zrychlení, vektor gravitace, těžiště a Planck kontaktní body s přepínači; měřítko šipek lze upravit.
- Trajektorie má nastavitelné simulační vzorkování, limit 2–5000 bodů a volitelné zeslabení. Vzorky drží renderer mimo fyzikální dokument; Reset i vypnutí je smaže.
- `npm test` v této fázi nebyl spuštěn. Prohlížečové rozhraní nebylo možné ručně ověřit, protože nástroje prohlížeče jsou nedostupné v této relaci.

## Fáze 8 — projektový systém (5. 10. 2026)

- `npm run check`: 0 chyb, 0 varování.
- `npm run build`: úspěšný produkční build; Vite upozorňuje na hlavní bundle nad 500 kB.
- `cargo check`: úspěšná kompilace Tauri dialog pluginu a příkazů pro výběr, načtení a uložení projektu.
- Testy nebyly spuštěny.
- Import ověřuje obálku/verzi projektu, limity souboru, tvar těles, parametry modulů a návaznost vazeb, senzorů i měření; před výměnou scény deserializace nejprve dokončí validaci.
- Nový a načtený projekt vyčistí historii úprav a resetují simulaci. Browser ukládá JSON přes Blob, desktop používá nativní dialogy.
- AssetManager vloží PNG/JPEG/WebP/GIF do dokumentu jako data URL s ID assetu, ověřeným MIME typem a limitem 8 MiB na soubor; pozadí odkazuje přes `assetId` a jeho odstranění reference vyčistí.
