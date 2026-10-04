# PhysicsEngineAdapter

Rozhraní v `src/lib/physics/PhysicsEngineAdapter.ts` odděluje model a simulační jádro od Planck.js. Handle tělesa i vazby je řetězcové ID. Engine objekty se nikdy nepředávají komponentám nebo rendereru.

Inicializace vyčistí svět. Jádro vytvoří všechna tělesa a poté vazby. `createJoint` a `removeJoint` podporují revolute, distance, prismatic a weld. Adaptér vlastní mapy ID → interní objekty. Při odstranění tělesa odstraní i jeho vazby; reset vyčistí všechny mapy. Vypnutá vazba zůstává v dokumentu, ale v enginu nevznikne.

Kotvy se předávají v místních souřadnicích těles, vzdálenosti v metrech, úhly v radiánech. Osa posuvného kloubu je v místních souřadnicích A; adaptér ji před předáním enginu normalizuje. Referenční úhel je počáteční úhel B minus úhel A. Meze otočného kloubu jsou relativní k referenčnímu úhlu; meze posuvného kloubu se měří od polohy, v níž se světové kotvy shodují.

Planck implementace mapuje čisté discriminated union typy na odpovídající joint definitions. Kontrola modelu odmítá neexistující tělesa, spojení tělesa se sebou, dvojici bez dynamického tělesa, nečíselné parametry, nulovou osu, obrácené meze a vzdálenost kratší než 0,05 m. Stejnou kontrolu používá editor, aby neplatná změna nepoškodila dokument.

Pevné spoje používají výchozí tuhý režim. Motory, pružné vazby, rope, pulley a gear se přidají v dalších etapách. Fyzikální řešič je iterativní; drobné odchylky vazeb jsou očekávané. Viz [oficiální dokumentace Planck.js](https://piqnt.com/planck.js/docs/joint.html).
