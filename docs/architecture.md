# Architektura PhysicsLab — scéna, fyzika a měření

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

## Síly a pole (fáze 6)

`physics/modules/ForceRegistry.ts` obsahuje deklarativní katalog a samostatnou validaci / aplikaci modulů. Jednorázový impuls se aplikuje před prvním simulačním krokem po Reset / změně scény; Pause/Play jej neopakuje. Konstantní síla zadává složky v N pro vybrané těleso, lineární odpor používá `F = −k v` (k v kg/s) a pružina mezi dvěma tělesy používá `F = k(d−L₀) + c v_rel` po spojnici, včetně opačné síly na druhé těleso. Pružina může působit v tahu i tlaku; oba cíle musí být odlišná ID, alespoň jeden dynamický. Statická tělesa sílu nepřijmou.

`FieldRegistry.ts` přidává vektorové gravitační zrychlení k World gravity a homogenní vítr `F = k (v_wind−v)` na všech dynamických tělesech. Každý krok SimulationCore vyhodnotí právě přítomné a zapnuté síly/pole ze snapshotu před krokem adaptéru; konstantní síla je tedy spojitá, nikoli impuls. Moduly zůstávají typovanými sériovými záznamy v dokumentu a neodkazují na objekty enginu. Validace probíhá před vložením do historie. Smazání tělesa odstraní neúplnou pružinu a sílu bez cíle; změna tělesa na statické je odmítnuta, pokud by síla ztratila všechny dynamické cíle.

`ForceLab` v knihovně nabízí vytvoření, parametrizaci, zapnutí a smazání sil a polí. Úprava autorského dokumentu obnoví simulaci, běh jej nikdy nepřepisuje. Pole je globální a působí na všechna dynamická tělesa. Směrová lokální pole a force sensors čekají na samostatnou etapu.

## Vizualizace (fáze 7)

`PhysicsRenderer` vykresluje volitelné rychlostní, zrychlovací a gravitační vektory, těžiště z adaptéru a právě aktivní kontaktní body. Vektory jsou převáděny z SI jednotek měřítkem v sekundách; délka vykreslení je omezena, aby při vysokých rychlostech neutekla mimo plátno. Kontakty poskytuje adapter z dotýkajících se Planck manifolds jako prosté souřadnice, UI nečte interní kontakty enginu.

Trajektorie zůstává ve rendereru, není to fyzikální ani projektový stav. Vzorkuje simulační čas při nastavitelném intervalu, omezuje počet bodů 2–5000, používá barvu tělesa a volitelně zeslabuje starší úseky. Reset času i vypnutí stopy smaže uložené vykreslovací body; souřadnice zůstanou oddělené od snapshotů simulace. Projekty zatím neukládají nastavení překryvů ani stopy.

## Ověření

`npm run check`, `npm test`, `npm run build`. Testy ověřují převod os a zoomu, nezávislost kroku na FPS, volný pád, kontakt s podlahou, impuls v SI, pause/reset, editor a historii, omezení všech čtyř vazeb a neměnnost počátečního dokumentu.

## Projekty (fáze 8)

`ProjectSerializer.ts` zapisuje obálku `format: "physicslab"`, `version: 1` a validovaný `PhysicsDocument`. Import odmítá nepodporované verze, nesprávné vazby, neplatné fyzikální parametry a soubory větší než 25 MiB. `SceneEditor.replaceDocument` vyčistí undo/redo historii a výběr; SimulationCore resetuje runtime stav. Naměřené časové řady a vykreslovací stopy zůstávají mimo trvalý dokument. V desktopu Rust příkazy otevřou výběrový dialog a čtou/zapisují jen uživatelem vybraný soubor. Ve webovém běhu se použije `<input type=file>` a stažení Blobem.

Project assets are embedded as validated PNG/JPEG/WebP/GIF data URLs, identified by `assetId`, with an 8 MiB per-file and 16 MiB combined source-image limit. `AssetManager` supports import, lookup, background assignment, and removal; the background reference participates in undo/redo and is cleared when its asset is removed. The Pixi canvas remains transparent so its host can render the image behind the physics grid and bodies. Older v1 JSON files without asset metadata migrate to an empty asset collection.

## Internal plugin architecture (phase 10)

`lib/plugins/types.ts` defines the shared plugin metadata contract and numeric parameter schema (`key`, label, unit, default, range, and step). The force and field registries pair that declarative metadata with typed creation, validation, and simulation callbacks; force plugins also declare whether they target one body or a pair. Sensor plugins use the shared identity and label contract while exposing their output unit and snapshot reader. `ForceLab` renders creation and editing controls from these registry definitions, so adding an internal force or field no longer requires a type-specific parameter form.
