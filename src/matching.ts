import type { ParameterType } from './parameter-types.js';
import type { Capture } from './regexp.js';

export interface Group {
  readonly value: string | undefined;
  readonly start: number | undefined;
  readonly end: number | undefined;
  readonly children: readonly Group[] | undefined;
  readonly values: (string | undefined)[];
}
export interface Argument {
  readonly group: Group;
  readonly parameterType: ParameterType;
  getValue(world?: unknown): unknown;
  getParameterType(): ParameterType;
}
export type Values = unknown[] & { readonly params: Record<string, unknown> };

export function buildGroup(capture: Capture, match: RegExpExecArray): Group {
  const range = match.indices![capture.index];
  const children = capture.children.length
    ? capture.children.map((child) => buildGroup(child, match))
    : undefined;
  return {
    value: match[capture.index],
    start: range?.[0],
    end: range?.[1],
    children,
    get values() {
      return (children ?? [this]).map((group) => group.value);
    },
  };
}
export function buildArgument(group: Group, parameterType: ParameterType): Argument {
  return {
    group,
    parameterType,
    getValue(world) {
      return group.value === undefined ? undefined : parameterType.transform(world, group.values);
    },
    getParameterType() {
      return parameterType;
    },
  };
}

export async function transformArguments(
  args: readonly Argument[],
  names: readonly (string | undefined)[],
  world: unknown,
): Promise<Values> {
  const values = [] as unknown as Values;
  const params: Record<string, unknown> = Object.create(null);
  Object.defineProperty(values, 'params', { value: params, enumerable: false });
  for (let i = 0; i < args.length; i++) {
    const value = await args[i]!.getValue(world);
    values.push(value);
    const name = names[i];
    if (name !== undefined) params[name] = value;
  }
  return values;
}
