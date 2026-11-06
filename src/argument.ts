/**
 * Builds matched arguments and resolves their positional and named values.
 */

import type { Slot } from './compiler.ts';
import type { ParameterType, TextParameterType } from './param-types/create-type.ts';
import { buildGroup, type Group } from './cucumber-expressions/group.ts';
import { buildStepArgument, type StepArguments } from './step-argument.ts';

export type Argument = {
  readonly name?: string;
  readonly group: Group;
  readonly parameterType: ParameterType;
  getValue(world?: unknown): unknown;
  getParameterType(): ParameterType;
};

/**
 * Builds a regular or external step argument from a matched parameter slot.
 */
export function buildArgumentForSlot(
  slot: Slot,
  result: RegExpExecArray,
  stepArguments: StepArguments<unknown>,
) {
  const group = buildGroup(slot.capture, result);
  const { type, name } = slot;
  if (isStepArgumentType(type)) {
    return buildStepArgument(group, type, name, stepArguments);
  }
  return buildArgument(group, type, name);
}

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

/**
 * Connects capture metadata to its type, skipping transformation for absent parameters.
 */
function buildArgument(group: Group, parameterType: TextParameterType, name?: string) {
  const argument: Argument = {
    name,
    group,
    parameterType,
    getValue(world) {
      return group.value === undefined ? undefined : parameterType.transform(world, group.values);
    },
    getParameterType() {
      return parameterType;
    },
  };
  return argument;
}

function isStepArgumentType(type: ParameterType) {
  return 'dataTable' in type || 'docString' in type;
}
