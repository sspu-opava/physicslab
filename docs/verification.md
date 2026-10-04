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
