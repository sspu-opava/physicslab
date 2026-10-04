# PhysicsLab

Vytvoř desktopovou aplikaci **PhysicsLab** určenou pro tvorbu, experimentování, měření a sdílení interaktivních fyzikálních modelů.

Aplikace nemá být pouze sandbox pro rigid-body fyziku. Má fungovat jako obecnější vizuální fyzikální laboratoř, ve které lze sestavit scénu, definovat tělesa, vazby, síly a pole, spustit simulaci, sledovat fyzikální veličiny a zobrazovat je v grafech.

Primární cílovou skupinou jsou studenti, učitelé a uživatelé, kteří chtějí experimentovat s fyzikálními modely bez nutnosti programovat celý experiment od nuly.

Aplikace musí být navržena modulárně tak, aby bylo možné později přidávat nové fyzikální moduly, senzory, síly, pole, experimenty a případně i další simulační enginy.

---

# 1. Technologický stack

Použij:

- Tauri 2
- Svelte
- TypeScript
- Vite
- PixiJS 8
- Planck.js jako první fyzikální engine
- vhodnou knihovnu pro grafy, pokud bude skutečně potřeba

Nepřidávej rozsáhlý framework pro state management bez důvodu.

Používej strict TypeScript.

Rust část Tauri drž co nejmenší. Používej ji zejména pro práci se soubory a desktopové funkce.

---

# 2. Základní architektonický princip

Důsledně odděluj:

```text
UI
↓
Scene Model
↓
Simulation Core
↓
Physics Engine Adapter
↓
Planck.js
```

a paralelně:

```text
Scene Model
↓
Renderer
↓
PixiJS
```

PixiJS objekty nesmějí být fyzikálními objekty.

Planck.js objekty nesmějí být přímo používány jako aplikační datový model.

Aplikace musí mít vlastní serializovatelný model.

---

# 3. PhysicsEngineAdapter

Nevaz celý PhysicsLab přímo na Planck.js.

Vytvoř obecné rozhraní například:

```ts
interface PhysicsEngineAdapter {
    initialize(world: PhysicsWorldDefinition): void;

    createBody(definition: BodyDefinition): BodyHandle;
    removeBody(id: string): void;

    createJoint(definition: JointDefinition): JointHandle;
    removeJoint(id: string): void;

    applyForce(
        bodyId: string,
        force: Vector2,
        point?: Vector2
    ): void;

    applyImpulse(
        bodyId: string,
        impulse: Vector2,
        point?: Vector2
    ): void;

    setBodyTransform(
        bodyId: string,
        position: Vector2,
        angle: number
    ): void;

    step(dt: number): void;

    getBodyState(bodyId: string): BodyState;

    reset(): void;
}
```

První implementace:

```text
PlanckPhysicsAdapter
```

Později musí být možné vytvořit například:

```text
MatterPhysicsAdapter
ParticlePhysicsAdapter
WavePhysicsAdapter
```

bez přepisování editoru.

---

# 4. Fyzikální jednotky

Používej fyzikální jednotky.

Interně:

```text
length          m
mass            kg
time            s
velocity        m/s
acceleration    m/s²
force           N
energy          J
angle           rad
angular speed   rad/s
```

Nepoužívej pixely jako fyzikální jednotku.

Renderer musí mít převod:

```ts
pixelsPerMeter
```

například:

```text
100 px = 1 m
```

Toto nastavení ovlivňuje pouze zobrazení, nikoli fyzikální model.

---

# 5. Scene Model

Vytvoř hlavní serializovatelný objekt:

```ts
interface PhysicsDocument {
    id: string;
    name: string;
    version: number;

    world: WorldDefinition;

    bodies: BodyDefinition[];
    joints: JointDefinition[];

    forces: ForceDefinition[];
    fields: FieldDefinition[];

    sensors: SensorDefinition[];
    measurements: MeasurementDefinition[];

    createdAt: string;
    modifiedAt: string;
}
```

Model nesmí obsahovat:

- PixiJS objekty,
- Planck.js objekty,
- DOM objekty.

---

# 6. World

World musí obsahovat minimálně:

```ts
interface WorldDefinition {
    gravity: Vector2;

    timeScale: number;

    pixelsPerMeter: number;

    background?: string;
}
```

Později připrav prostor pro:

```text
air density
global damping
simulation precision
solver parameters
```

---

# 7. Bodies

Implementuj minimálně:

```text
CircleBody
RectangleBody
PolygonBody
StaticBody
```

Každé těleso musí podporovat:

```text
name
position
rotation

mass
density

friction
restitution

linear damping
angular damping

initial velocity
initial angular velocity

body type:
    static
    dynamic
    kinematic

collision category
collision mask
```

Datový model tělesa musí být nezávislý na Planck.js.

---

# 8. Fixtures a geometrie

Odděl:

```text
Body
```

od:

```text
Fixture / Shape
```

tak, aby jedno těleso mohlo později obsahovat více tvarů.

Připrav podporu pro:

```text
CircleShape
BoxShape
PolygonShape
EdgeShape
ChainShape
```

---

# 9. Joints

Implementuj minimálně:

```text
Revolute Joint
Distance Joint
Prismatic Joint
Weld Joint
Rope Joint
```

Později:

```text
Pulley Joint
Gear Joint
Wheel Joint
Motor Joint
```

Joint musí být serializovatelný.

Musí odkazovat na tělesa pomocí jejich ID.

Nikdy neukládej přímou referenci na Planck body.

---

# 10. Scene Editor

Vytvoř vizuální editor scény.

Rozhraní přibližně:

```text
┌────────────────────────────────────────────────────────────┐
│ File Edit Scene Simulation View       ▶ ❚❚ ■ Step Reset   │
├──────────────┬──────────────────────────┬──────────────────┤
│ LIBRARY      │                          │ SCENE            │
│              │                          │ World            │
│ Bodies       │                          │ ├ Ground         │
│ Circle       │       SIMULATION         │ ├ Ball           │
│ Rectangle    │                          │ └ Pendulum       │
│ Polygon      │                          │                  │
│              │                          ├──────────────────┤
│ Joints       │                          │ PROPERTIES       │
│ Forces       │                          │                  │
│ Sensors      │                          │ Mass       1 kg  │
│              │                          │ Friction   0.3   │
├──────────────┴──────────────────────────┴──────────────────┤
│ GRAPH / TIMELINE / MEASUREMENTS                           │
└────────────────────────────────────────────────────────────┘
```

---

# 11. Canvas

Centrální canvas musí podporovat:

```text
zoom
pan
fit to scene
reset view
grid
snap to grid
axes
origin
scale ruler
```

Grid musí být navázán na fyzikální jednotky.

Například:

```text
1 velký dílek = 1 m
0.1 m menší dílek
```

---

# 12. Edit režim

V Edit režimu simulace neběží.

Uživatel musí moci:

```text
vkládat tělesa
vybírat tělesa
přesouvat je
otáčet
měnit velikost
duplikovat
mazat
seskupovat
```

Transformace editoru musí měnit datový model.

---

# 13. Simulation režim

Implementuj stavy:

```text
STOPPED
RUNNING
PAUSED
```

Ovládání:

```text
Play
Pause
Stop
Single Step
Reset
```

Reset vrátí scénu do počátečního stavu.

---

# 14. SimulationClock

Nevaz fyziku přímo na render FPS.

Implementuj:

```ts
SimulationClock
```

s fixed timestep.

Například:

```text
physics dt = 1/120 s
```

Rendering může běžet nezávisle.

Podporuj:

```text
0.1×
0.25×
0.5×
1×
2×
4×
```

time scale.

---

# 15. Interpolace

Pokud je renderovací FPS jiné než fyzikální timestep, připrav možnost interpolovat vizuální stav mezi posledními dvěma fyzikálními kroky.

Není nutné implementovat komplikovanou interpolaci v první fázi, ale architektura ji musí umožnit.

---

# 16. Renderer

Vytvoř samostatnou vrstvu:

```text
PhysicsRenderer
```

Použij PixiJS.

Renderer dostává pouze stav scény.

Renderer nesmí:

```text
řešit kolize
počítat síly
měnit fyzikální stav
```

Musí pouze vizualizovat výsledky.

---

# 17. Render styles

Každé těleso může mít vizuální parametry:

```text
fill color
stroke color
stroke width
opacity
texture
```

Později:

```text
sprite
image texture
vector arrows
heatmap
trail
```

Fyzikální vlastnosti a vzhled musí být odděleny.

---

# 18. Inspector

Po výběru objektu zobraz Properties panel.

Například:

```text
Transform
    x
    y
    angle

Physics
    mass
    density
    friction
    restitution
    damping

Velocity
    vx
    vy
    angularVelocity

Collision
    category
    mask

Appearance
    fill
    stroke
```

Parametry musí být editovatelné.

---

# 19. Vector visualization

Připrav vizualizační overlay pro:

```text
velocity vector
acceleration vector
force vector
gravity vector
angular velocity
center of mass
```

Každý overlay musí být možné vypnout.

---

# 20. Trajectory

Implementuj volitelnou stopu pohybu.

Parametry:

```text
enabled
max points
sample interval
line width
fade
```

Stopa není součástí fyziky, pouze vizualizace.

---

# 21. Forces

Vytvoř obecný systém externích sil.

Například:

```ts
interface ForceDefinition {
    id: string;
    type: string;
    enabled: boolean;

    targetBodyIds: string[];

    parameters: Record<string, unknown>;
}
```

První síly:

```text
ConstantForce
Impulse
SpringForce
DragForce
```

---

# 22. Fields

Vytvoř obecný systém polí.

Například:

```ts
interface FieldDefinition {
    id: string;
    type: string;
    enabled: boolean;

    parameters: Record<string, unknown>;
}
```

První:

```text
UniformGravityField
RadialGravityField
WindField
```

Později:

```text
ElectricField
MagneticField
CustomVectorField
```

---

# 23. Gravity

Globální gravitace musí být pouze jednou možností.

Umožni:

```text
Earth-like gravity
Moon-like gravity
zero gravity
custom vector
```

Například:

```text
Earth:
g = 9.81 m/s²
```

---

# 24. Air resistance

Vytvoř samostatný modul pro odpor prostředí.

První jednoduchá varianta:

```text
F = -k v
```

Později:

```text
F = 1/2 ρ Cd A v²
```

Nepiš jej přímo do BodyDefinition.

Má být implementován jako Force plugin.

---

# 25. Plugin architecture

PhysicsLab musí být plugin-ready.

Nepovoluj v první verzi načítání libovolného externího JavaScriptu.

Použij interní registry.

Připrav typy:

```text
BodyPlugin
JointPlugin
ForcePlugin
FieldPlugin
SensorPlugin
ExperimentPlugin
RendererPlugin
AnalysisPlugin
```

---

# 26. Registry

Vytvoř například:

```ts
PhysicsPluginRegistry
```

s metodami:

```ts
register(plugin);
unregister(id);
get(id);
list();
listByCategory(category);
```

Editor nesmí obsahovat hardcoded seznam všech dostupných modulů.

---

# 27. Plugin Definition

Například:

```ts
interface PhysicsPluginDefinition {
    id: string;
    name: string;
    version: string;

    category: string;

    parameters: ParameterDefinition[];

    initialize(context: PhysicsPluginContext): PhysicsPluginInstance;
}
```

UI parametrů generuj deklarativně.

---

# 28. Parametry pluginů

Podporuj:

```text
float
integer
boolean
select
vector2
color
body reference
joint reference
field reference
expression
```

Například:

```ts
{
    id: "dragCoefficient",
    label: "Drag coefficient",
    type: "float",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0.47
}
```

---

# 29. Sensors

Vytvoř systém senzorů.

První senzory:

```text
PositionSensor
VelocitySensor
AccelerationSensor
AngleSensor
AngularVelocitySensor
ForceSensor
EnergySensor
ContactSensor
```

Sensor musí odkazovat na objekt pomocí jeho ID.

---

# 30. Measurements

Odděl sensor od measurement.

Sensor poskytuje aktuální hodnotu.

Measurement zaznamenává hodnoty v čase.

Například:

```text
VelocitySensor
        ↓
VelocityMeasurement
        ↓
time series
        ↓
Graph
```

---

# 31. Time Series

Implementuj:

```ts
interface TimeSeries {
    timestamps: number[];
    values: number[];
}
```

Později může být value také Vector2.

Připrav sampling interval.

Například:

```text
sample every 0.01 s
```

---

# 32. Graph panel

Umožni zobrazit:

```text
x(t)
y(t)

vx(t)
vy(t)

v(t)

ax(t)
ay(t)

angle(t)

angular velocity(t)

kinetic energy(t)
potential energy(t)
total energy(t)
```

Graf musí podporovat více křivek současně.

---

# 33. Energy calculations

Pro základní rigid body implementuj minimálně:

```text
translational kinetic energy
rotational kinetic energy
gravitational potential energy
```

Celková kinetická energie:

```text
Ek = 1/2 m v² + 1/2 I ω²
```

Gravitační potenciální energie:

```text
Ep = m g h
```

Při nestandardním gravitačním poli jasně odděl zjednodušený výpočet od obecnějšího případu.

---

# 34. Data table

Vedle grafu vytvoř tabulku aktuálních hodnot.

Například:

```text
t          2.430 s
x          1.42 m
y          3.87 m
vx         2.13 m/s
vy        -4.74 m/s
v          5.19 m/s
Ek        13.47 J
Ep        37.96 J
```

---

# 35. Export dat

Umožni export měření:

```text
CSV
JSON
```

Export musí obsahovat:

```text
time
measured values
units
sensor names
```

---

# 36. Experiment mode

Vedle Edit režimu vytvoř:

```text
Experiment Mode
```

V tomto režimu může autor model uzamknout a povolit studentovi pouze některé parametry.

Například:

```text
Allowed controls:

initial velocity
launch angle
mass
gravity
```

Student nemůže změnit geometrii scény.

---

# 37. Parameter Control Panel

Experiment může definovat speciální ovládací panel.

Například:

```text
Launch angle        45°
Initial velocity    10 m/s
Mass                1 kg

[ Reset ] [ Run ]
```

Tento panel musí vznikat deklarativně.

---

# 38. Experiment definition

Například:

```ts
interface ExperimentDefinition {
    id: string;
    name: string;

    sceneTemplate: PhysicsDocument;

    controls: ExperimentControlDefinition[];

    measurements: MeasurementDefinition[];
}
```

---

# 39. Experiment library

Připrav systém knihovny experimentů.

První příklady:

```text
Free Fall
Projectile Motion
Inclined Plane
Simple Pendulum
Spring Oscillator
Elastic Collision
Inelastic Collision
Momentum Conservation
Double Pendulum
Newton's Cradle
Lever
Pulley
Rolling Body
Friction Experiment
Chain
Bridge
Rube Goldberg Machine
```

Neimplementuj všechny ihned.

---

# 40. První experimenty

Pro první použitelnou verzi vytvoř pouze:

```text
Free Fall
Projectile Motion
Simple Pendulum
Spring Oscillator
Collision
```

Každý musí obsahovat:

```text
scene
edit mode
experiment mode
measurements
graph
reset
```

---

# 41. Physics Graph

Připrav datový koncept Physics Graph.

Nemusí mít v první verzi vizuální node editor.

Interně ale musí být možné reprezentovat například:

```text
Gravity
   ↓
Ball
   ↓
Velocity Sensor
   ↓
Measurement
   ↓
Graph
```

nebo:

```text
Sine Generator
   ↓
Motor
   ↓
Wheel
   ↓
Angular Velocity Sensor
```

---

# 42. Node editor

Vizuální node editor implementuj až později.

Architektura ale nesmí znemožnit tento typ workflow.

Budoucí uzly:

```text
Body
Joint
Force
Field
Generator
Sensor
Measurement
Math
Graph
```

---

# 43. Math nodes

Připrav možnost pozdějšího přidání uzlů:

```text
Add
Subtract
Multiply
Divide
Absolute
Sin
Cos
Derivative
Integral
Threshold
Map Range
```

To umožní tvořit komplexnější experimenty bez skriptování.

---

# 44. Expressions

Později chceme podporovat výrazy například:

```text
F = -k * x
```

nebo:

```text
force.x = A * sin(2*pi*f*t)
```

Pro první verzi stačí připravit architekturu.

Neimplementuj nebezpečný `eval()`.

---

# 45. Contact events

Vytvoř vlastní vrstvu událostí nad Planck.js kontakty.

Například:

```text
BODY_CONTACT_BEGIN
BODY_CONTACT_END
BODY_SENSOR_ENTER
BODY_SENSOR_EXIT
```

UI a pluginy nesmějí přímo poslouchat Planck.js interní objekty.

---

# 46. Collision visualization

Volitelně zobraz:

```text
contact points
contact normals
collision bounds
AABB
center of mass
```

To bude důležité pro debugging i výuku.

---

# 47. Undo / Redo

Použij Command Pattern.

Například:

```text
AddBodyCommand
DeleteBodyCommand
MoveBodyCommand
RotateBodyCommand
ResizeBodyCommand
ChangePropertyCommand

AddJointCommand
DeleteJointCommand

AddSensorCommand
DeleteSensorCommand
```

Během běžící simulace se historie editoru nemá zaplňovat změnami fyzikálních souřadnic.

Undo/Redo se týká autorování scény.

---

# 48. Save / Load

Projekt ukládej serializovatelně.

První verze:

```text
project.json
assets/
```

Později:

```text
*.phlab
```

jako kontejner.

---

# 49. Formát projektu

Projekt musí začínat například:

```json
{
    "format": "physicslab",
    "version": 1
}
```

Připrav:

```text
ProjectSerializer
ProjectDeserializer
ProjectMigration
```

---

# 50. Assets

PhysicsLab může používat:

```text
textures
background images
sprites
icons
reference images
```

Vytvoř AssetManager podobně jako u grafického editoru.

Datový model musí používat:

```text
assetId
```

nikoli absolutní cestu.

---

# 51. Coordinate systems

Jasně definuj:

```text
world coordinates
screen coordinates
```

World:

```text
meters
```

Screen:

```text
pixels
```

Vytvoř utility:

```ts
worldToScreen()
screenToWorld()
```

Nepřepočítávej jednotky ručně na různých místech aplikace.

---

# 52. Y axis

Rozhodni a zdokumentuj orientaci os.

Doporučení:

```text
world:
+x doprava
+y nahoru
```

Renderer provede převod na obrazovkové souřadnice.

Fyzikální model by měl používat běžnou matematickou orientaci.

---

# 53. Grid snapping

Při editaci podporuj:

```text
Snap off
0.01 m
0.05 m
0.1 m
0.5 m
1 m
```

Snap se týká pouze editoru.

---

# 54. Selection

Implementuj:

```text
single select
multi select
box select
```

Později:

```text
align
distribute
group
```

---

# 55. Tool system

Vytvoř obecný systém nástrojů:

```text
SelectTool
PanTool
BodyTool
JointTool
ForceTool
SensorTool
MeasureTool
```

Tool systém nesmí být hardcoded do jedné Svelte komponenty.

---

# 56. Measure Tool

Přidej nástroj pro měření:

```text
distance
angle
```

Později:

```text
velocity probe
force probe
```

---

# 57. Numerical stability

Odděl fyzikální přesnost od renderingu.

Připrav nastavení:

```text
physics timestep
velocity iterations
position iterations
```

Nevystavuj je běžnému uživateli v základním režimu.

Mohou být v:

```text
Advanced Simulation Settings
```

---

# 58. Performance

Aplikace musí zvládat interaktivně běžné scény s desítkami až stovkami těles.

Neoptimalizuj předčasně.

Nejprve měř.

Připrav jednoduchý performance overlay:

```text
FPS
physics steps/s
body count
joint count
sensor count
render time
physics time
```

---

# 59. Error handling

Plugin nebo sensor nesmí shodit celou simulaci.

Pokud některý modul selže:

```text
log error
disable problematic module
continue simulation if possible
```

---

# 60. Logging

Používej strukturované kategorie:

```text
APP
DOCUMENT
PHYSICS
RENDER
PLUGIN
SENSOR
MEASUREMENT
PROJECT
PERFORMANCE
```

Nevkládej nahodile `console.log()` po projektu.

---

# 61. Testy

Piš unit testy zejména pro:

```text
unit conversion
world/screen conversion
simulation clock
fixed timestep
plugin registry
document serialization
undo/redo
sensor sampling
measurement recording
energy calculations
project migrations
```

---

# 62. Determinismus

Pokud experiment používá náhodu, používej seed.

Například:

```text
random particle distribution
random initial velocities
procedural terrain
```

Stejný seed musí produkovat stejný výchozí stav.

---

# 63. První roadmapa

Projekt implementuj po fázích.

## Phase 1 — Foundation

- Tauri
- Svelte
- TypeScript
- PixiJS
- základní layout
- canvas
- grid
- world/screen coordinates
- empty PhysicsDocument

## Phase 2 — Basic physics

- PlanckPhysicsAdapter
- gravity
- circle
- rectangle
- static ground
- simulation clock
- Play / Pause / Reset

## Phase 3 — Scene editor

- selection
- move
- rotate
- resize
- properties inspector
- multiple bodies
- scene tree

## Phase 4 — Joints

- revolute
- distance
- prismatic
- weld

## Phase 5 — Measurements

- position
- velocity
- acceleration
- energy
- time-series recorder
- graph panel

## Phase 6 — External forces

- ConstantForce
- Impulse
- SpringForce
- DragForce

## Phase 7 — Visualization

- vectors
- trails
- contact points
- center of mass
- axes
- scale

## Phase 8 — Project system

- save
- load
- assets
- project serialization
- export CSV / JSON

## Phase 9 — Experiment mode

- lock scene
- exposed controls
- predefined experiments
- resettable experiments

## Phase 10 — Plugin architecture

- registries
- plugin interfaces
- declarative parameters
- internal plugin modules

## Phase 11 — Advanced fields

- radial gravity
- wind
- custom vector field architecture

## Phase 12 — Physics Graph foundation

- internal graph representation
- sensors
- forces
- measurements
- math-node abstraction

---

# 64. První konkrétní úkol

Neimplementuj celý PhysicsLab najednou.

Nejprve vytvoř pouze funkční základ:

1. vytvoř projekt Tauri + Svelte + TypeScript,
2. přidej PixiJS,
3. vytvoř základní layout,
4. vytvoř PhysicsDocument,
5. vytvoř coordinate conversion utility,
6. vykresli grid,
7. vytvoř PlanckPhysicsAdapter,
8. vytvoř World s gravitací,
9. vlož statickou podlahu,
10. vlož jedno kruhové dynamické těleso,
11. implementuj Play / Pause / Reset,
12. synchronizuj Planck stav s PixiJS rendererem,
13. přidej fixed timestep,
14. přidej jednoduchý Inspector,
15. vytvoř `docs/architecture.md`.

Potom:

- spusť TypeScript kontrolu,
- spusť testy,
- spusť build,
- oprav chyby,
- ověř skutečný běh aplikace.

Teprve potom pokračuj dalšími fázemi.

---

# 65. Doporučená struktura projektu

```text
src/
  lib/
    document/
    physics/
      adapters/
      bodies/
      joints/
      forces/
      fields/
    simulation/
    renderer/
    scene/
    tools/
    sensors/
    measurements/
    experiments/
    plugins/
    project/
    history/
    units/
    utils/

  components/
    canvas/
    toolbar/
    scene/
    inspector/
    library/
    graphs/
    timeline/
    experiments/
```

Nedávej fyzikální algoritmy do Svelte komponent.

---

# 66. Dokumentace

Průběžně udržuj:

```text
README.md

docs/
    architecture.md
    physics-engine-adapter.md
    plugin-api.md
    project-format.md
    units.md
    measurements.md
    experiments.md
```

Dokumentace plugin API musí umožnit později přidat nový Force, Sensor nebo Experiment bez studování celého projektu.

---

# 67. UX zásady

PhysicsLab má být nástroj pro experimentování.

Preferuj:

```text
přímou manipulaci
okamžitou vizuální odezvu
jednoduché ovládání
reálné fyzikální jednotky
měření
grafy
resetovatelné experimenty
```

Nepřetěžuj UI technickými parametry fyzikálního enginu.

Pokročilé parametry schovej do Advanced sekcí.

---

# 68. Klíčové architektonické priority

Priorita projektu:

1. čistý fyzikální datový model,
2. správné jednotky,
3. deterministická simulace s fixed timestep,
4. oddělení fyziky od renderingu,
5. měření a práce s daty,
6. rozšiřitelný pluginový systém,
7. experiment mode,
8. až potom množství hotových experimentů.

Nevytvářej monolitický `PhysicsEditor.svelte`.

Nevaz UI přímo na Planck.js.

Nevaz fyzikální logiku na PixiJS.

Nevkládej speciální logiku každého experimentu do hlavní aplikace.

Preferuj obecné mechanismy použitelné pro další experimenty.

Cílem není vytvořit jednu fyzikální demonstraci.

Cílem je vytvořit **obecnou desktopovou platformu pro tvorbu, simulaci, měření a výuku interaktivních fyzikálních modelů**.