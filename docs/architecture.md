# Architektura PhysicsLab — základy, editor scény a vazby

```text
Svelte komponenty → PhysicsDocument → SimulationCore → PhysicsEngineAdapter → Planck
                         ↓                 ↓ snapshots
                    PhysicsRenderer ← SceneState
                         ↓
                       PixiJS
```

`document/types.ts` definuje čistá serializovatelná data. Těleso obsahuje oddělený seznam fixtures a vzhled; identita je řetězcové ID. Počáteční dokument je autorská scéna a běh simulace jej nemění. Pro budoucí moduly jsou připravené datové typy, nikoli předstírané implementace.

`PhysicsEngineAdapter` je rozhraní pouze pro aktuálně podporované operace. `PlanckPhysicsAdapter` vlastní Planck objekty a mapuje ID na interní tělesa a vazby. Explicitní hmotnost má přednost před hustotou; moment setrvačnosti z fixtures se přepočítá poměrem hmotností.

`SimulationCore` vlastní stav STOPPED / RUNNING / PAUSED. `SimulationClock` akumuluje čas a provádí pouze kroky 1/120 s, nezávisle na vykreslování. Jedna prodleva snímku je omezena na 0,25 s proti neomezenému dohánění po uspání. Násobitel času je řízení běhu a nemění počáteční dokument. `previous`, `current` a `clock.alpha` připravují interpolaci; první renderer zobrazuje aktuální stav bez interpolace.

`PhysicsRenderer` dostává dokument a snapshot. Nepočítá síly ani kolize a nemění model. Vlastní Pixi Application a grafiku, ResizeObserver a kameru. Svelte komponenta spravuje její životní cyklus a pointer události pro výběr a posun kamery. Fyzikální algoritmy nejsou v komponentách.

`units/coordinates.ts` je jediný převod svět / obrazovka. Svět: +x doprava, +y nahoru; délka m, hmotnost kg, čas s, úhel rad, rychlost m/s. Obrazovka: +y dolů. Inspector zobrazuje rotaci ve stupních. `pixelsPerMeter` a zoom ovlivňují výhradně zobrazení.

UI je rozdělené na Toolbar, Library, SimulationCanvas, SceneTree, Inspector a Measurements. App spojuje dokument se simulačním jádrem bez přímého přístupu k interním objektům enginu. Measurements čte aktuální odečty i časové řady ze samostatné vrstvy měření.

Rust je pouze minimální Tauri host bez filesystem oprávnění nebo příkazů. Ukládání projektů se bude přidávat v samostatné etapě.

## Rozšiřování

Další práce zachová ID reference, fixtures oddělené od těles, SI jednotky a engine adapter. Síly, senzory a experimenty budou registrované interní moduly s deklarativními parametry. Grafy budou číst záznamy measurement vrstvy, nikoli Pixi objekty. Libovolný externí JavaScript a eval nejsou součástí návrhu.

## Editor scény (fáze 3)

`SceneEditor` vlastní autorský dokument, výběr a historii. `DocumentCommand` implementuje rozhraní příkazu pomocí nezávislých serializovatelných snapshotů před a po změně. `CommandHistory` omezuje historii na 100 příkazů; nová změna zahodí redo větev. Změny fyzikálních snapshotů do historie nevstupují.

Pointer tažení a editace pole Inspectoru používají transakci begin → preview → end. Během preview se model i fyzika aktualizují kvůli odezvě; jediný příkaz se uloží až při dokončení. Escape / pointercancel obnoví původní dokument při tažení. Tlačítka spuštění, historie a strukturálních úprav jsou během pointer tažení blokovaná. Editace pole se dokončí při ztrátě fokusu; po změně lze rovnou kliknout na Undo nebo Play. Jednoduché kliknutí bez přesunu nevytváří příkaz.

`tools/SceneTools.ts` obsahuje hit test otočených těles, obálky, výběr rámečkem, přichycení a čistý `TransformGesture`. Všechny transformace pracují v metrech a vycházejí z původních těles, aby se numerické chyby neakumulovaly s počtem pointer událostí. Přesun přichytává první střed skupiny a zachovává rozestupy. Rotace a proporcionální změna velikosti používají průměr středů výběru. Změna velikosti upravuje všechny fixtures tělesa; explicitní hmotnost zůstává zachovaná.

Canvas pouze převádí pointer souřadnice, řídí capture a deleguje nástrojům; renderer kreslí více vybraných těles a výběrový rámeček bez změny modelu. Inspector pracuje s posledním vybraným tělesem. Mazání odstraní navázané joints, sensors a measurements, a odstraní ID z cílových seznamů sil. Undo obnovuje tyto reference společně s tělesy. Duplikace vytváří nové ID a nezávislé fixtures; nekopíruje budoucí vazby nebo senzory.

## Fyzikální vazby (fáze 4)

`JointDefinition` je typovaná unie čtyř vazeb: revolute, distance, prismatic a weld. Obsahuje ID těles, název, aktivaci, kolize propojených těles, místní kotvy a parametry příslušného typu. Neobsahuje objekty enginu. Jádro obnovuje vazby po vytvoření všech těles při každém resetu.

`physics/joints/joints.ts` sdílí katalog vazeb, jejich tvorbu, validaci, transformaci kotev a hit test. Nový revolute/weld/prismatic spoj vytvoří společnou kotvu ve středu A; distance spoj propojí středy a odvodí délku. Osa posuvu je při tvorbě světové +x, převedené do os A. Lokální kotvy při přesunu a otočení těles zůstávají připojené; ruční změna geometrie může vytvořit počáteční nesoulad, který řešič napraví. Inspector nabízí sjednocení kotev v bodě A. Změna velikosti těles zatím lokální kotvy neškáluje.

`JointCreator` v knihovně vybírá typ a dvě tělesa; tlačítko typu převezme dvojici vybraných těles. `JointInspector` upravuje kotvy, referenční úhel, délku, osu a meze. Výběr ID je společný pro tělesa i vazby. Vazby lze vybrat ve stromu i kliknutím na jejich čáru; transformace plátna se týkají těles. Mazání vazby ponechá tělesa; mazání tělesa odstraní související vazby. Historie obnovuje celé autorské modely, včetně vazeb. Duplikace zůstává dostupná pro tělesa, vazby se automaticky nekopírují.

Renderer získává polohy kotev ze snapshotů těles, vykresluje spojovací čáry, kotvy a osu posuvného kloubu. Vizualizace nevstupuje do řešiče. Validace editoru odmítá neplatnou vazbu před uložením do historie; upozornění je viditelné v UI a pole se při odmítnutí vrací k hodnotám modelu.

## Senzory a měření (fáze 5)

`SensorRegistry` deklaruje skalární veličiny, názvy, jednotky a funkce odečtu. Senzor odkazuje na těleso pomocí ID. Čte snapshot a pro zrychlení předchozí snapshot a dt; energie používá hmotnost a moment setrvačnosti poskytnuté adaptérem. UI ani senzory nečtou interní Planck objekty. Energie odpovídá posuvu a rotaci plus homogenní gravitaci `−m g·r` s referencí v počátku. Síly a kontakty se přidají až s příslušnými vrstvami enginu.

`MeasurementDefinition` odkazuje na ID senzoru a nastavuje interval a limit vzorků. `MeasurementRecorder` udržuje runtime `TimeSeries` s časy, hodnotami, jednotkou a názvem; tyto řady nevstupují do dokumentu ani historie. `SimulationCore` čte senzory a vzorkuje po každém fyzikálním kroku (také Single Step), nikoli po vykreslení. Po resetu zaznamená dostupné hodnoty na t = 0; neurčené nebo vypnuté odečty přeskočí. Plán vzorkování vychází z původního času a pořadí intervalu, aby se nezaokrouhloval opakovaným přičítáním.

Nenásobné intervaly používají první fyzikální krok po plánovaném čase, se skutečným časem kroku a bez interpolace. Pauza nic nevzorkuje. Změna rychlosti ovlivňuje simulační čas, interval zůstává v sekundách světa. Reset / Stop a úpravy autorského dokumentu záznam restartují. Ruční vymazání založí plán v aktuálním čase. Limit 2 až 20 000 vzorků na řadu (výchozí 5000) vypouští nejstarší hodnoty a počítá vypuštěné vzorky.

`Measurements` a `MeasurementSetup` zobrazují aktuální hodnoty, konfiguraci a SVG graf. Křivky se seskupují podle jednotek a lze je skrývat. `graph.ts` redukuje zobrazené body po blocích se zachováním extrémů; export vždy používá všechny dosud uchované vzorky. CSV je dlouhá tabulka ID měření, ID senzoru, názvu, jednotky, času a hodnoty; JSON zachovává samostatné řady a počet vypuštěných vzorků. Export přes Blob nemění model a nepotřebuje nový Rust příkaz. Desktopový dialog a trvalé ukládání přijdou v další fázi.

## Ověření

`npm run check`, `npm test`, `npm run build`. Testy ověřují převod os a zoomu, nezávislost kroku na FPS, volný pád, kontakt s podlahou, impuls v SI, pause/reset, editor a historii, omezení všech čtyř vazeb a neměnnost počátečního dokumentu.
