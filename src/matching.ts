import type { Argument } from './cucumber-expressions/matching.ts';

export type Values = unknown[] & { readonly params: Record<string, unknown> };

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
