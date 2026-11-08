/**
 * Builds runtime block arguments without mixing external values into matched text.
 */

import type { Argument } from './argument.ts';
import type { Group } from './cucumber-expressions/group.ts';
import type { ParameterType, TextParameterType } from './param-types/create-type.ts';
import type { IDataTable } from './param-types/data-table.ts';

/**
 * Carries external block argument values; the table generic supports runner-specific
 * classes or alternative representations while defaulting to the common class shape.
 */
export type BlockArguments<Table = IDataTable> = {
  dataTable?: Table;
  docString?: string;
};

/**
 * Connects an external step value to its type while preserving absent parameters.
 */
export function buildBlockArgument(
  group: Group,
  type: Exclude<ParameterType, TextParameterType>,
  name: string | undefined,
  blockArguments: BlockArguments<unknown>,
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
        return blockArguments.dataTable === undefined
          ? undefined
          : type.transform(world, blockArguments.dataTable);
      }
      return blockArguments.docString === undefined
        ? undefined
        : type.transform(world, blockArguments.docString);
    },
  };
  return argument;
}
