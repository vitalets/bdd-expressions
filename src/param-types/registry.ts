/**
 * Registers parameter types, enforcing valid unique names and installing built-ins.
 */

import type { IDataTable, DataTableParameterTypeOptions } from './data-table.ts';
import type { DocStringParameterTypeOptions } from './doc-string.ts';
import {
  createFromOptions,
  type ParameterType,
  type ParameterTypeOptions,
  type TextParameterTypeOptions,
} from './create-type.ts';
import { defineBuiltins } from './built-ins.ts';
import { validatePrebuiltType } from './validate-type.ts';

export type ParameterTypeRegistry<Table = IDataTable> = {
  lookupByTypeName(name: string): ParameterType<unknown, Table> | undefined;
};
/**
 * Options use transformer; prebuilt types use transform. Keeping these registration
 * paths distinct prevents a prebuilt type from bypassing table-input type checking.
 */
export type MutableParameterTypeRegistry<Table = IDataTable> = ParameterTypeRegistry<Table> & {
  defineParameterType<T = unknown, World = unknown>(
    options: DataTableParameterTypeOptions<Table, T, World> & { transform?: never },
  ): void;
  defineParameterType<T = unknown, World = unknown>(
    options: DocStringParameterTypeOptions<T, World> & { transform?: never },
  ): void;
  defineParameterType<T = unknown, World = unknown>(
    options: TextParameterTypeOptions<T, World> & { transform?: never },
  ): void;
  defineParameterType(type: ParameterType<unknown, Table>): void;
};
/**
 * Creates a registry with built-in types and rejects invalid or duplicate registrations.
 * Table describes externally supplied values: unlike text captures, tables have no
 * universal runtime representation. The default supports typical DataTable classes;
 * a generic override keeps custom transformer inputs and match inputs consistent.
 */
export function createParameterTypeRegistry<Table = IDataTable>() {
  const types = new Map<string, ParameterType<unknown, Table>>();
  const registry: MutableParameterTypeRegistry<Table> = {
    lookupByTypeName: (name) => types.get(name),
    defineParameterType<T = unknown, World = unknown>(
      input: ParameterTypeOptions<T, World, Table> | ParameterType<unknown, Table>,
    ) {
      const type = isPrebuiltParameterType(input)
        ? validatePrebuiltType(input)
        : createFromOptions(input);
      register(type);
    },
  };
  defineBuiltins(registry);
  return registry;

  function register(type: ParameterType<unknown, Table> & { readonly name: string }) {
    if (types.has(type.name)) throw new Error(`Duplicate parameter type "${type.name}"`);
    types.set(type.name, type);
  }
}

/**
 * Prebuilt objects expose transform; options expose the optional transformer callback.
 */
function isPrebuiltParameterType<T, World, Table>(
  input: ParameterTypeOptions<T, World, Table> | ParameterType<unknown, Table>,
): input is ParameterType<unknown, Table> {
  return 'transform' in input;
}
