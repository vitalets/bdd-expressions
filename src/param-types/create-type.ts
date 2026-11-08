/**
 * Defines the shared parameter contract and creates text or block argument parameter types.
 */

import type { IDataTable } from './data-table.ts';
import { validateParameterTypeName, validateParameterTypeKind } from './validate-type.ts';
import { normalizeParameterPatterns } from './normalize-pattern.ts';
import {
  createDataTableParameterType,
  type DataTableParameterTypeOptions,
  type DataTableParameterType,
} from './data-table.ts';
import {
  createDocStringParameterType,
  type DocStringParameterTypeOptions,
  type DocStringParameterType,
} from './doc-string.ts';

export type ParameterType<T = unknown, Table = unknown> =
  | TextParameterType<T>
  | DataTableParameterType<T, Table>
  | DocStringParameterType<T>;

export type TextParameterType<T = unknown> = {
  readonly name: string | undefined;
  readonly regexpStrings: readonly string[];
  /**
   * Method syntax accepts upstream types whose typings omit undefined,
   * although unmatched native capture values can be undefined.
   */
  transform(world: unknown, values: (string | undefined)[] | null): T | PromiseLike<T>;
};
export type TextParameterTypeOptions<T, World = unknown> = {
  name: string;
  regexp: string | RegExp | readonly (string | RegExp)[];
  transformer?: (this: World, ...captures: (string | undefined)[]) => T | PromiseLike<T>;
};
export type ParameterTypeOptions<T, World = unknown, Table = IDataTable> =
  | TextParameterTypeOptions<T, World>
  | DataTableParameterTypeOptions<Table, T, World>
  | DocStringParameterTypeOptions<T, World>;

/**
 * Creates a custom parameter type with validated patterns and an optional transformer.
 */
export function createParameterType<T = string, World = unknown>(
  options: DocStringParameterTypeOptions<T, World>,
): DocStringParameterType<T>;
export function createParameterType<Table = IDataTable, T = Table, World = unknown>(
  options: DataTableParameterTypeOptions<Table, T, World>,
): DataTableParameterType<T, Table>;
export function createParameterType<T = string | undefined, World = unknown>(
  options: TextParameterTypeOptions<T, World>,
): TextParameterType<T>;
export function createParameterType<T, World, Table>(
  options: ParameterTypeOptions<T, World, Table>,
): ParameterType<T, Table> {
  return createFromOptions(options);
}

/**
 * Constructs a validated type from the options union without overload selection.
 * Shared by the public factory and direct registry registration.
 */
export function createFromOptions<T, World, Table>(options: ParameterTypeOptions<T, World, Table>) {
  validateParameterTypeName(options.name);
  validateParameterTypeKind(options);
  if ('dataTable' in options) return createDataTableParameterType(options);
  if ('docString' in options) return createDocStringParameterType(options);
  const patterns = Array.isArray(options.regexp)
    ? options.regexp
    : [options.regexp as string | RegExp];
  const regexpStrings = normalizeParameterPatterns(patterns);
  const type: TextParameterType<T> & { readonly name: string } = {
    name: options.name,
    regexpStrings,
    transform(world, values) {
      return options.transformer
        ? options.transformer.apply(world as World, values ?? [])
        : (values?.[0] as T);
    },
  };
  return type;
}
