/**
 * Transforms match arguments into separate positional and named parameters.
 */

import type { Argument } from './cucumber-expressions/matching.ts';

/**
 * Resolves named and unnamed parameters concurrently with the supplied world.
 * The named parameter map has no prototype.
 *
 * Uses parallel resolution to follow the Cucumber.js implementation:
 * https://github.com/cucumber/cucumber-js/blob/main/src/models/step_definition.ts#L26-L28
 */
export async function resolveParams(paramValues: readonly Argument[], world: unknown) {
  const positional = await Promise.all(paramValues.map((argument) => argument.getValue(world)));
  const named: Record<string, unknown> = Object.create(null);
  for (const [index, argument] of paramValues.entries()) {
    const name = argument.name;
    if (name !== undefined) named[name] = positional[index];
  }
  return { positional, named };
}
