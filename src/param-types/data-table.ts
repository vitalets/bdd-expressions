/**
 * Defines DataTable step argument options and resolves supplied table values.
 */

/**
 * Structural default for table inputs, compatible with typical runner DataTable classes.
 * Internal typing only: the library neither constructs tables nor exports this interface
 * from its public entry point.
 */
export type IDataTable = {
  hashes(): Record<string, string>[];
  raw(): string[][];
  rows(): string[][];
  rowsHash(): Record<string, string>;
  transpose(): IDataTable;
};

export type DataTableParameterType<T = unknown, Table = IDataTable> = {
  readonly name: string;
  readonly dataTable: true;
  transform(world: unknown, value: Table): T | PromiseLike<T>;
};

export type DataTableParameterTypeOptions<Table = IDataTable, T = Table, World = unknown> = {
  name: string;
  dataTable: true;
  transformer?: (this: World, table: Table) => T | PromiseLike<T>;
};
/**
 * Creates a step argument binding that preserves table identity unless transformed.
 */
export function createDataTableParameterType<Table, T = Table, World = unknown>(
  options: DataTableParameterTypeOptions<Table, T, World>,
) {
  const type: DataTableParameterType<T, Table> = {
    name: options.name,
    dataTable: true,
    transform(world, value) {
      return options.transformer
        ? options.transformer.call(world as World, value)
        : (value as unknown as T);
    },
  };
  return type;
}
