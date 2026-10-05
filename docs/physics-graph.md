# Physics Graph

PhysicsLab stores a graph in `PhysicsDocument.physicsGraph`. Nodes and connections are plain serializable data; no graph node retains a renderer or physics-engine object. Projects created before the graph was introduced migrate to an empty graph on import.

## Nodes

- **Sensor** reads one of the document's sensor values and exposes a scalar `value` output.
- **Constant** exposes a finite numeric value.
- **Math** evaluates a registered operation. Binary operations use inputs `a` and `b`; unary operations use `a`.
- **Force** writes scalar `x` and `y` inputs as a force vector in newtons to one dynamic body.
- **Measurement** records its `value` input as a time series with the declared name and unit.

`MathNodeRegistry` currently provides addition, subtraction, multiplication, division, negation, absolute value, square root, sine, and cosine. Invalid domains such as division by zero and the square root of a negative value produce a missing reading instead of a non-finite result.

## Evaluation and editing

`validatePhysicsGraph` checks node and connection identities, sensor/body references, ports, duplicate inputs, graph size, and cycles. The editor applies graph changes as undoable document commands. Removing a sensor or body also removes graph nodes that depend on it.

`evaluatePhysicsGraph` reads current sensor values and evaluates connected nodes. The simulation applies force outputs before each fixed physics step. Measurement outputs are recorded at 30 Hz through the existing measurement recorder, so they can be graphed and exported alongside sensor measurements. Graph changes are included in project JSON and validated during import.

The Measurements panel's **Physics Graph** tab adds sensor, constant, math, force, and measurement nodes and connects compatible ports. A graph is reset with the simulation when edited; runtime readings and series remain outside the project document.
