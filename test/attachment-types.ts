import { BddExpression, createParameterType, createParameterTypeRegistry } from '../src/index.ts';

const registry = createParameterTypeRegistry<string[][]>();
const expression = new BddExpression('Create{DataTable}', registry);
expression.match('Create', { dataTable: [['Alice']] });
expression.match('Create', { docString: '' });
// @ts-expect-error The registry determines the table input type.
expression.match('Create', { dataTable: 42 });
// @ts-expect-error DocStrings are strings.
expression.match('Create', { docString: 42 });
// @ts-expect-error Attachment types cannot match text regexps.
createParameterType({ name: 'Invalid', dataTable: true, regexp: /x/ });
// @ts-expect-error An attachment type cannot consume both kinds.
createParameterType({ name: 'Invalid', dataTable: true, docString: true });

registry.defineParameterType(
  createParameterType({
    dataTable: true,
    name: 'UsersDataTable',
    transformer: (table: string[][]) => {
      const rows: string[][] = table;
      return rows.flat();
    },
  }),
);
registry.defineParameterType(
  createParameterType({
    docString: true,
    name: 'UpperDocString',
    transformer: (text) => text.toUpperCase(),
  }),
);
registry.defineParameterType(
  // @ts-expect-error The table transformer must accept the registry's table type.
  createParameterType({ dataTable: true, name: 'Wrong', transformer: (table: number) => table }),
);
// @ts-expect-error No regexp on attachment types.
registry.defineParameterType(createParameterType({ docString: true, name: 'Wrong', regexp: /x/ }));

async function checkInferredAttachmentResults() {
  const expression = new BddExpression('Create(:users{DataTable})(:body{DocString})', registry);
  const result = await expression.matchAndResolve('Create', undefined, {
    dataTable: [['Alice']],
    docString: '',
  });
  const users: string[][] | undefined = result!.params.users;
  const body: string | undefined = result!.params.body;
  // @ts-expect-error The optional table result is not numeric.
  const invalid: number = result!.params.users;
  return { users, body, invalid };
}
void checkInferredAttachmentResults;

registry.defineParameterType({
  name: 'DirectUsersDataTable',
  dataTable: true,
  transformer: (table) => {
    const rows: string[][] = table;
    return rows.flat();
  },
});
registry.defineParameterType({
  name: 'DirectDocString',
  docString: true,
  transformer: (text) => text.toUpperCase(),
});
registry.defineParameterType({
  name: 'DirectText',
  regexp: /(\d+)/,
  transformer: (text) => {
    const capture: string | undefined = text;
    return Number(capture);
  },
});
// @ts-expect-error Direct attachment options cannot include a regexp.
registry.defineParameterType({ name: 'Invalid', docString: true, regexp: /x/ });
registry.defineParameterType({
  name: 'Invalid',
  dataTable: true,
  // @ts-expect-error The registry supplies string[][] to table transformers.
  transformer: (table: number) => table,
});
// @ts-expect-error Text options require a regexp.
registry.defineParameterType({ name: 'MissingPattern' });

const defaultRegistry = createParameterTypeRegistry();
defaultRegistry.defineParameterType({
  name: 'DefaultUsersDataTable',
  dataTable: true,
  transformer: (table) => {
    const hashes: Record<string, string>[] = table.hashes();
    const raw: string[][] = table.raw();
    const rows: string[][] = table.rows();
    const rowsHash: Record<string, string> = table.rowsHash();
    const transposed: string[][] = table.transpose().raw();
    return { hashes, raw, rows, rowsHash, transposed };
  },
});

async function checkDefaultTableShape() {
  // A runner-owned class is structurally compatible, including its private storage.
  class RunnerTable {
    private values = [['name'], ['Alice']];
    hashes() {
      return [{ name: 'Alice' }];
    }
    raw() {
      return this.values;
    }
    rows() {
      return this.values.slice(1);
    }
    rowsHash() {
      return { name: 'Alice' };
    }
    transpose() {
      return new RunnerTable();
    }
  }
  const expression = new BddExpression(':table{DataTable}', defaultRegistry);
  const result = await expression.matchAndResolve('', undefined, { dataTable: new RunnerTable() });
  const hashes: Record<string, string>[] = result!.params.table.transpose().hashes();
  // @ts-expect-error Arrays require an explicit registry generic override.
  expression.match('', { dataTable: [['Alice']] });
  // @ts-expect-error The default table shape requires every method.
  expression.match('', { dataTable: { raw: () => [['Alice']] } });
  return hashes;
}
void checkDefaultTableShape;

function checkParameterUnion(type: import('../src/index.ts').ParameterType<unknown, string[][]>) {
  if ('dataTable' in type) {
    type.transform(undefined, [['Alice']]);
    // @ts-expect-error DataTable types do not have text regexp fields.
    void type.regexpStrings;
    // @ts-expect-error DataTable types have no DocString flag.
    void type.docString;
    // @ts-expect-error Table transforms require the actual table input.
    type.transform(undefined, 'text');
  } else if ('docString' in type) {
    type.transform(undefined, 'body');
    // @ts-expect-error DocString types have no DataTable flag.
    void type.dataTable;
  } else {
    type.transform(undefined, ['capture']);
    const patterns: readonly string[] = type.regexpStrings;
    return patterns;
  }
}
void checkParameterUnion;

function checkBuiltinRegistrationBoundary(
  builtins: Parameters<typeof import('../src/parameter-types/built-ins.ts').defineBuiltins>[0],
) {
  builtins.defineParameterType({ name: 'IdentityDataTable', dataTable: true });
  builtins.defineParameterType({ name: 'Text', regexp: /text/ });
  builtins.defineParameterType({
    name: 'UnsafeDataTable',
    dataTable: true,
    // @ts-expect-error Built-in registration cannot assume a runner-specific table shape.
    transformer: (table: string[][]) => table.flat(),
  });
  // @ts-expect-error Built-ins only need registration, not type lookup.
  builtins.lookupByTypeName('DataTable');
}
void checkBuiltinRegistrationBoundary;
