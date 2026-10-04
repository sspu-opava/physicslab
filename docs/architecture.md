# Architektura PhysicsLab — první etapa

```text
Svelte komponenty → PhysicsDocument → SimulationCore → PhysicsEngineAdapter → Planck
                         ↓                 ↓ snapshots
                    PhysicsRenderer ← SceneState
                         ↓
                       PixiJS
```

`document/types.ts` definuje čistá serializovatelná data. Těleso obsahuje oddělený seznam fixtures a vzhled; identita je řetězcové ID. Počáteční dokument je autorská scéna a běh simulace jej nemění. Pro budoucí moduly jsou připravené datové typy, nikoli předstírané implementace.

`PhysicsEngineAdapter` je rozhraní pouze pro aktuálně podporované operace. `PlanckPhysicsAdapter` vlastní Planck objekty a mapuje ID na interní tělesa. Explicitní hmotnost má přednost před hustotou; moment setrvačnosti z fixtures se přepočítá poměrem hmotností. V další etapě se přidá rozhraní vazeb spolu s reálnou implementací.

`SimulationCore` vlastní stav STOPPED / RUNNING / PAUSED. `SimulationClock` akumuluje čas a provádí pouze kroky 1/120 s, nezávisle na vykreslování. Jedna prodleva snímku je omezena na 0,25 s proti neomezenému dohánění po uspání. Násobitel času je řízení běhu a nemění počáteční dokument. `previous`, `current` a `clock.alpha` připravují interpolaci; první renderer zobrazuje aktuální stav bez interpolace.

`PhysicsRenderer` dostává dokument a snapshot. Nepočítá síly ani kolize a nemění model. Vlastní Pixi Application a grafiku, ResizeObserver a kameru. Svelte komponenta spravuje její životní cyklus a pointer události pro výběr a posun kamery. Fyzikální algoritmy nejsou v komponentách.

`units/coordinates.ts` je jediný převod svět / obrazovka. Svět: +x doprava, +y nahoru; délka m, hmotnost kg, čas s, úhel rad, rychlost m/s. Obrazovka: +y dolů. Inspector zobrazuje rotaci ve stupních. `pixelsPerMeter` a zoom ovlivňují výhradně zobrazení.

UI je rozdělené na Toolbar, Library, SimulationCanvas, SceneTree, Inspector a Measurements. App spojuje dokument se simulačním jádrem bez přímého přístupu k interním objektům enginu. Zobrazené aktuální hodnoty nejsou dosud senzory ani zaznamenané časové řady.

Rust je pouze minimální Tauri host bez filesystem oprávnění nebo příkazů. Ukládání projektů se bude přidávat v samostatné etapě.

## Rozšiřování

Další práce zachová ID reference, fixtures oddělené od těles, SI jednotky a engine adapter. Nástroje přímé manipulace budou ve vlastní vrstvě `tools/`, historie bude používat Command Pattern. Síly, senzory a experimenty budou registrované interní moduly s deklarativními parametry. Grafy budou číst záznamy measurement vrstvy, nikoli Pixi objekty. Libovolný externí JavaScript a eval nejsou součástí návrhu.

## Ověření

`npm run check`, `npm test`, `npm run build`. Testy ověřují převod os a zoomu, nezávislost kroku na FPS, volný pád, kontakt s podlahou, impuls v SI, pause/reset a neměnnost počátečního dokumentu.
