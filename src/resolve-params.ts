/**
 * Transforms match arguments into separate positional and named parameters.
 */

import type { Argument } from './cucumber-expressions/matching.ts';

/**
 * Resolves named and unnamed parameters, awaiting each transformer with the supplied world.
 * The named parameter map has no prototype.
 *
 * @example
 * paramValues: ['3', '"apples"'],
 * paramNames:  ['count', undefined]
 * → {
 *      positional: [3, 'apples'],
 *      named: { count: 3 }
 *   }
 */
export async function resolveParams(
  paramValues: readonly Argument[],
  paramNames: readonly (string | undefined)[],
  world: unknown,
) {
  const positional: unknown[] = [];
  const named: Record<string, unknown> = Object.create(null);
  for (let i = 0; i < paramValues.length; i++) {
    const value = await paramValues[i]!.getValue(world);
    positional.push(value);
    const name = paramNames[i];
    if (name !== undefined) named[name] = value;
  }
  return { positional, named };
}
