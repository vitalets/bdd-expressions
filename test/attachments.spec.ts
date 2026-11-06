import assert from 'node:assert/strict';
import test from 'node:test';
import { BddExpression, createParameterTypeRegistry } from '../src/index.ts';

const table = [['Alice']];
function registry() {
  return createParameterTypeRegistry<string[][]>();
}

test('optional attachment couples colon and presence without exposing input to text captures', async () => {
  const types = registry();
  types.defineParameterType({ name: 'Everything', regexp: /[\s\S]*/ });
  const expression = new BddExpression('I create :name{Everything}(::users{DataTable})', types);
  const result = await expression.matchAndResolve('I create Alice:', undefined, {
    dataTable: table,
  });
  assert.deepEqual([...result!], ['Alice', table]);
  assert.equal(result!.params.users, table);
  assert.equal(expression.match('I create Alice', { dataTable: table }), null);
  assert.equal((await expression.matchAndResolve('I create Alice'))!.params.users, undefined);
});

test('four variants bind both attachments in expression order, including empty docstrings', async () => {
  const expression = new BddExpression('Create(::table{DataTable})(::body{DocString})', registry());
  for (const [text, inputs, expected] of [
    ['Create', {}, [undefined, undefined]],
    ['Create:', { dataTable: table }, [table, undefined]],
    ['Create:', { docString: '' }, [undefined, '']],
    ['Create::', { dataTable: table, docString: 'body' }, [table, 'body']],
  ] as const) {
    const result = await expression.matchAndResolve(text, undefined, inputs);
    assert.deepEqual([...result!], expected);
    assert.equal(result!.dataTable, expected[0]);
    assert.equal(result!.docString, expected[1]);
    assert.deepEqual(Object.keys(result!), ['0', '1']);
  }
  assert.equal(expression.match('Create:', {}), null);
});

test('required attachments, independent optionals and nested groups', () => {
  const required = new BddExpression('Create(:){DataTable}{DocString}', registry());
  assert.equal(required.match('Create', { dataTable: table }), null);
  assert.ok(required.match('Create', { dataTable: table, docString: '' }));
  assert.ok(required.match('Create:', { dataTable: table, docString: '' }));
  const nested = new BddExpression('Create(:{DataTable}(:{DocString}))', registry());
  assert.equal(nested.match('Create:', { docString: '' }), null);
  assert.ok(nested.match('Create::', { dataTable: table, docString: '' }));
});

test('alternatives retain argument slots and select branches by attachment kind', async () => {
  const expression = new BddExpression('Create(table:{DataTable}/body:{DocString})', registry());
  assert.deepEqual(
    [...(await expression.matchAndResolve('Createtable:', undefined, { dataTable: table }))!],
    [table, undefined],
  );
  assert.deepEqual(
    [...(await expression.matchAndResolve('Createbody:', undefined, { docString: '' }))!],
    [undefined, ''],
  );
  assert.equal(expression.match('Createtable:', { dataTable: table, docString: '' }), null);
});

test('custom attachment transformers preserve world and skip absent values', async () => {
  const types = registry();
  let calls = 0;
  types.defineParameterType({
    dataTable: true,
    name: 'UsersDataTable',
    transformer(this: { prefix: string }, value) {
      calls++;
      return this.prefix + value[0]![0];
    },
  });
  const expression = new BddExpression('Create(::users{UsersDataTable})', types);
  await expression.matchAndResolve('Create', { prefix: 'Hello ' });
  assert.equal(calls, 0);
  const result = await expression.matchAndResolve(
    'Create:',
    { prefix: 'Hello ' },
    { dataTable: table },
  );
  assert.equal(result!.params.users, 'Hello Alice');
  assert.equal(result!.dataTable, table);
  assert.equal(calls, 1);
});

test('reject invalid placement and duplicate attachment kinds at construction', () => {
  for (const pattern of [
    'Create {DataTable} now',
    'Create {DataTable}:name',
    'Create {DataTable}:',
    'Create({DataTable}) text',
    '{DataTable}({DataTable})',
  ]) {
    assert.throws(() => new BddExpression(pattern, registry()), /last|follow|only once/);
  }
});

test('attachment metadata has no fabricated text positions and extra input cannot be ignored', () => {
  const expression = new BddExpression('Create{DataTable}', registry());
  const [argument] = expression.match('Create', { dataTable: table })!;
  assert.equal(argument!.group.start, undefined);
  assert.equal(argument!.group.value, undefined);
  assert.equal(argument!.getValue(), table);
  assert.equal(expression.match('Create', { dataTable: table, docString: '' }), null);
  assert.equal(new BddExpression('Create', registry()).match('Create', { dataTable: table }), null);
});

test('a supplied attachment cannot choose an alternative that leaves it unconsumed', () => {
  const expression = new BddExpression('Create( plain/:{DataTable})', registry());
  assert.ok(expression.match('Create plain'));
  assert.equal(expression.match('Create plain', { dataTable: table }), null);
  assert.ok(expression.match('Create:', { dataTable: table }));
  assert.equal(expression.match('Create:'), null);
});

test('attachment order is independent of input object order and parameter slots stay stable', async () => {
  const expression = new BddExpression('Create :count{int}{DocString}{DataTable}', registry());
  const result = await expression.matchAndResolve('Create 2', undefined, {
    dataTable: table,
    docString: 'body\ntext',
  });
  assert.deepEqual([...result!], [2, 'body\ntext', table]);
});

test('attachment transformers can be asynchronous and failures propagate during resolution only', async () => {
  const types = registry();
  types.defineParameterType({
    docString: true,
    name: 'JsonDocString',
    transformer: async (text) => JSON.parse(text) as unknown,
  });
  const expression = new BddExpression('Read{JsonDocString}', types);
  assert.ok(expression.match('Read', { docString: 'invalid' }));
  await assert.rejects(
    expression.matchAndResolve('Read', undefined, { docString: 'invalid' }),
    SyntaxError,
  );
  assert.deepEqual(
    [...(await expression.matchAndResolve('Read', undefined, { docString: '{"ok":true}' }))!],
    [{ ok: true }],
  );
});

test('attachment registration validates options, names, and duplicate built-ins', () => {
  const types = registry();
  assert.throws(
    () =>
      types.defineParameterType(
        // @ts-expect-error Attachment kinds are mutually exclusive.
        { dataTable: true, name: 'Bad', docString: true },
      ),
    /exactly one attachment flag and no regexp/,
  );
  assert.throws(
    () =>
      // @ts-expect-error Attachment types do not accept regexps.
      types.defineParameterType({ docString: true, name: 'Bad', regexp: /x/ }),
    /exactly one attachment flag and no regexp/,
  );
  assert.throws(
    () => types.defineParameterType({ dataTable: true, name: 'DataTable' }),
    /Duplicate/,
  );
  assert.throws(
    () => types.defineParameterType({ docString: true, name: 'DocString' }),
    /Duplicate/,
  );
  assert.throws(
    () => types.defineParameterType({ docString: true, name: 'inline-choice' }),
    /reserved/,
  );
});

test('attachment flags provide identity defaults for custom names', async () => {
  const types = registry();
  types.defineParameterType({ dataTable: true, name: 'UsersDataTable' });
  types.defineParameterType({ docString: true, name: 'BodyDocString' });
  const expression = new BddExpression('Create{UsersDataTable}{BodyDocString}', types);
  const result = await expression.matchAndResolve('Create', undefined, {
    dataTable: table,
    docString: '',
  });
  assert.equal(result![0], table);
  assert.equal(result![1], '');
});

test('direct text options preserve captures and world context', async () => {
  const types = registry();
  types.defineParameterType<string, { prefix: string }>({
    name: 'Point',
    regexp: /(\d+),(\d+)/,
    transformer(x, y) {
      return `${this.prefix}${x}:${y}`;
    },
  });
  const expression = new BddExpression('Move {Point}', types);
  assert.deepEqual(
    [...(await expression.matchAndResolve('Move 1,2', { prefix: 'point:' }))!],
    ['point:1:2'],
  );
  assert.throws(() => types.defineParameterType({ name: 'Point', regexp: /x/ }), /Duplicate/);
  assert.throws(() => types.defineParameterType({ name: 'Invalid', regexp: /x/i }), /flags/);
});

test('parameter variants expose only their own fields and one working transform', () => {
  const types = registry();
  const tableType = types.lookupByTypeName('DataTable')!;
  assert.ok('dataTable' in tableType);
  assert.equal(tableType.transform(undefined, table), table);
  assert.deepEqual(Object.keys(tableType).sort(), ['dataTable', 'name', 'transform']);
  const docType = types.lookupByTypeName('DocString')!;
  assert.ok('docString' in docType);
  assert.equal(docType.transform(undefined, ''), '');
  assert.deepEqual(Object.keys(docType).sort(), ['docString', 'name', 'transform']);
  const textType = types.lookupByTypeName('int')!;
  assert.ok('regexpStrings' in textType);
  assert.equal(textType.transform(undefined, ['42']), 42);
});
