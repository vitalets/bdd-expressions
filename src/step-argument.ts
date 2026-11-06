/**
 * Builds runtime step arguments without mixing external values into matched text.
 */

import type { Argument } from './argument.ts';
import type { Group } from './cucumber-expressions/group.ts';
import type { ParameterType, TextParameterType } from './param-types/create-type.ts';
import type { IDataTable } from './param-types/data-table.ts';

/**
 * Carries external step argument values; the table generic supports runner-specific
 * classes or alternative representations while defaulting to the common class shape.
 */
export type StepArguments<Table = IDataTable> = {
  dataTable?: Table;
  docString?: string;
};

/**
 * Connects an external step value to its type while preserving absent parameters.
 */
export function buildStepArgument(
  group: Group,
  type: Exclude<ParameterType, TextParameterType>,
  name: string | undefined,
  stepArguments: StepArguments<unknown>,
) {
  const argument: Argument = {
    name,
    parameterType: type,
    getParameterType: () => type,
    group: {
      value: undefined,
      start: undefined,
      end: undefined,
      children: undefined,
      values: [undefined],
    },
    getValue(world?: unknown) {
      if (group.value === undefined) return undefined;
      if ('dataTable' in type) {
        return stepArguments.dataTable === undefined
          ? undefined
          : type.transform(world, stepArguments.dataTable);
      }
      return stepArguments.docString === undefined
        ? undefined
        : type.transform(world, stepArguments.docString);
    },
  };
  return argument;
}
