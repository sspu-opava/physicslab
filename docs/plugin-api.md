# Built-in plugin extension points

PhysicsLab's built-in plugins are TypeScript registry entries. They operate on serializable document definitions and narrow runtime contexts. A plugin must not retain an engine object, scene instance, DOM node, or other transient application state in the saved document.

## Math graph nodes

Add a `MathNodePlugin` entry to `src/lib/graph/MathNodeRegistry.ts` and add its operation string to `MathOperation` in `src/lib/graph/types.ts`. Each plugin declares its input port names, infers an output unit from those inputs, and evaluates finite numbers. Unit inference should return `undefined` for incompatible inputs; graph validation then gives the user a clear error. Evaluation should return a finite number or `NaN` for an invalid mathematical domain. The graph evaluator converts non-finite results into missing readings and reports a diagnostic without stopping the simulation.

Use helpers from `src/lib/graph/units.ts` for unit compatibility and multiplication, division, integer powers, and square roots. Keep the plugin pure: it receives values and returns a value, with no direct simulation-engine access.

## Forces and fields

Force plugins implement `ForcePlugin` in `src/lib/physics/modules/ForceRegistry.ts`; field plugins implement `FieldPlugin` in `src/lib/physics/modules/FieldRegistry.ts`. Each registry entry supplies its document type, editor metadata, defaults, validation, and runtime behavior. Force plugins apply forces or impulses through `PhysicsEngineAdapter`. Field plugins return an acceleration vector for one dynamic body; the simulation converts it to force using that body's mass.

Validate all persisted parameters before execution. Runtime exceptions and non-finite field vectors are reported against the failing module/body, and other modules continue to run. Keep target selection and saved parameters in the corresponding document definition rather than capturing editor state in a closure.

## Sensors

Sensor plugins implement `SensorPlugin` in `src/lib/measurements/SensorRegistry.ts`. Declare the physical unit and a pure `read` function that accepts the current/previous body state, timestep, and world gravity. A reader can return `null` when the value is unavailable; exceptions are isolated to that sensor and exposed as simulation diagnostics.

## Verification

After adding a registry entry, run `npm run check` and `npm run build`. If the plugin adds fields to persisted project data, update `ProjectSerializer` migration and validation as needed. Avoid dynamic code evaluation and keep project imports bounded by the existing serializer limits.
