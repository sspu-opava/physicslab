/** Metadata shared by internal physics plugins and consumed by generic authoring UI. */
export interface PluginParameterDefinition {
  key: string;
  label: string;
  unit: string;
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface InternalPluginDefinition {
  type: string;
  label: string;
  description?: string;
  parameters?: readonly PluginParameterDefinition[];
  targetMode?: 'single' | 'pair' | 'many';
}

export function defaultPluginParameters(definitions: readonly PluginParameterDefinition[]): Record<string, number> {
  return Object.fromEntries(definitions.map(parameter => [parameter.key, parameter.defaultValue]));
}
