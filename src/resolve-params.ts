/**
 * Transforms match arguments into separate positional and named parameters.
 */

import type { Argument } from './cucumber-expressions/matching.ts';

/**
 * Resolves named and unnamed parameters, awaiting each transformer with the supplied world.
 * The named parameter map has no prototype.
 */
export async function resolveParams(paramValues: readonly Argument[], world: unknown) {
  const positional: unknown[] = [];
  const named: Record<string, unknown> = Object.create(null);
  for (const argument of paramValues) {
    const value = await argument.getValue(world);
    positional.push(value);
    const name = argument.name;
    if (name !== undefined) named[name] = value;
  }
  return { positional, named };
}
