Pro PhysicsLab bych katalog rozdělil do několika typů pluginů: fyzikální moduly, síly a pole, senzory, generátory a analytické moduly. Důležité je, aby každý modul měl jasně definované vstupy, parametry a výstupy, takže jej později půjde použít i v plánovaném Physics Graphu.

## 1. Tělesa a mechanické moduly

| # | Modul | Funkce | Hlavní parametry |
|---|---|---|---|
| 1 | **Rigid Body** | Obecné tuhé těleso | mass, density, friction, restitution |
| 2 | **Circle Body** | Kruhové těleso | radius, mass/density |
| 3 | **Rectangle Body** | Obdélník | width, height |
| 4 | **Polygon Body** | Libovolný konvexní polygon | vertices, density |
| 5 | **Compound Body** | Těleso složené z více částí | fixtures, center of mass |
| 6 | **Particle Body** | Malý bodový objekt pro zjednodušené modely | mass, radius |
| 7 | **Pendulum** | Hotový parametrický model kyvadla | length, mass, angle |
| 8 | **Spring Oscillator** | Hmotný bod nebo těleso na pružině | mass, stiffness, damping |

U posledních dvou bych je chápal jako vyšší „construction modules“: interně vytvářejí několik standardních objektů a vazeb.

## 2. Vazby a mechanismy

| # | Modul | Funkce | Hlavní parametry |
|---|---|---|---|
| 9 | **Revolute Joint** | Otočný kloub | anchor, limits, motor |
| 10 | **Distance Joint** | Udržuje vzdálenost dvou bodů | length, stiffness, damping |
| 11 | **Prismatic Joint** | Posuvný kloub | axis, limits |
| 12 | **Weld Joint** | Pevně spojuje dvě tělesa | anchor, reference angle |
| 13 | **Rope Joint** | Omezení maximální vzdálenosti | max length |
| 14 | **Pulley System** | Kladková soustava | anchors, ratio |
| 15 | **Gear Coupling** | Svázání rotačního pohybu | ratio |
| 16 | **Motor** | Aktivně řídí joint nebo těleso | speed, torque, target |

Motor bych od jointu oddělil logicky, protože později může být řízen generátorem nebo regulačním uzlem.

## 3. Síly a fyzikální pole

| # | Modul | Funkce | Hlavní parametry |
|---|---|---|---|
| 17 | **Uniform Gravity** | Konstantní gravitační pole | gx, gy |
| 18 | **Radial Gravity** | Přitažlivost k bodu | center, strength, falloff |
| 19 | **Constant Force** | Stálá síla působící na objekt | Fx, Fy |
| 20 | **Impulse** | Jednorázová změna hybnosti | impulse vector |
| 21 | **Linear Drag** | Odpor úměrný rychlosti | drag coefficient |
| 22 | **Quadratic Drag** | Aerodynamický odpor ∝ v² | ρ, Cd, area |
| 23 | **Spring Force** | Hookeův zákon mezi dvěma body | k, rest length, damping |
| 24 | **Wind Field** | Směrové pole proudění | velocity, turbulence |
| 25 | **Attractor / Repulsor** | Přitahující nebo odpuzující bod | strength, exponent, radius |
| 26 | **Buoyancy** | Zjednodušený vztlak v kapalině | density, surface level, drag |

Právě zde začíná PhysicsLab překračovat možnosti samotného rigid-body enginu. Planck.js může řešit pohyb a kolize, ale síly jako aerodynamický odpor nebo vztlak dopočítá plugin před každým simulačním krokem.

## 4. Senzory

| # | Sensor | Výstup |
|---|---|---|
| 27 | **Position Sensor** | x, y |
| 28 | **Velocity Sensor** | vx, vy, \|v\| |
| 29 | **Acceleration Sensor** | ax, ay, \|a\| |
| 30 | **Angle Sensor** | úhel tělesa |
| 31 | **Angular Velocity Sensor** | ω |
| 32 | **Force Sensor** | síla nebo reakce v jointu |
| 33 | **Energy Sensor** | Ek, Ep, případně celková energie |
| 34 | **Contact Sensor** | collision begin/end, druhé těleso |
| 35 | **Distance Sensor** | vzdálenost mezi dvěma body |
| 36 | **Period Sensor** | perioda a frekvence opakovaného pohybu |

`Period Sensor` je podle mě zvlášť cenný pro školní experimenty. Nemusel by jen číst Planck.js stav, ale analyzovat časovou řadu a automaticky detekovat maxima, průchody nulou nebo opakování fáze.

## 5. Generátory a řízení

| # | Generátor | Výstup / použití |
|---|---|---|
| 37 | **Constant Generator** | konstantní skalární nebo vektorová hodnota |
| 38 | **Sine Generator** | \(A \sin(2\pi ft+\phi)\) |
| 39 | **Pulse Generator** | periodické impulzy |
| 40 | **Noise Generator** | deterministický šum se seedem |

Tyto generátory jsou zdánlivě jednoduché, ale pro budoucí Physics Graph jsou zásadní. Například:

```text
Sine Generator
      │
      ▼
Motor
      │
      ▼
Wheel
      │
      ▼
Angular Velocity Sensor
      │
      ▼
Graph
```

nebo:

```text
Noise Generator
      │
      ▼
Wind Field
      │
      ▼
Pendulum
```

Tím dostaneme od jednoduché fyzikální demonstrace systém pro experimentování s řízenými dynamickými soustavami.

### Druhá etapa katalogu

Po těchto prvních 40 bych připravil další vrstvu modulů, která už bude přesahovat klasickou mechaniku:

**Electric Field** a **Coulomb Force** pro nábojové interakce, **Magnetic Field** a Lorentzovu sílu, **Vector Field** definované funkcí \(F(x,y,t)\), **Fluid Region** pro zjednodušené prostředí, **Collision Counter**, **Momentum Sensor**, **Center of Mass Sensor**, **Torque Sensor**, **Path Length Sensor**, **Phase Sensor** a **Frequency Analyzer**.

Pak bych přidal generátory **Ramp**, **Triangle**, **Square Wave**, **Sawtooth**, **Envelope**, **Step Sequence** a jednoduchý **PID Controller**. PhysicsLab by se tím začal přibližovat také laboratoři dynamických systémů a automatického řízení.

### Co implementovat jako první

Pro první použitelnou verzi bych nebral všech čtyřicet modulů. Vybral bych reprezentativní jádro:

**Circle/Rectangle Body**, **Revolute + Distance Joint**, **Uniform Gravity**, **Constant Force**, **Spring Force**, **Linear Drag**, **Position Sensor**, **Velocity Sensor**, **Energy Sensor**, **Contact Sensor**, **Sine Generator** a **Constant Generator**.

Na této sadě lze vytvořit volný pád, šikmý vrh, srážky, jednoduché i dvojité kyvadlo, pružinový oscilátor, motorizovaný mechanismus i experiment se zachováním energie. Především se na ní ověří všechny hlavní architektonické kategorie PhysicsLabu ještě před tím, než se začne katalog rychle rozšiřovat.