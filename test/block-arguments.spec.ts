import assert from 'node:assert/strict';
import test from 'node:test';
import { BddExpression, createParameterTypeRegistry } from '../src/index.ts';

const table = [['Alice']];
function registry() {
  return createParameterTypeRegistry<string[][]>();
}

test('attachment flags identify declarations independently of requiredness and type names', () => {
  const types = registry();
  types.defineParameterType({ name: 'Users', dataTable: true });
  types.defineParameterType({ name: 'Body', docString: true });
  for (const [pattern, hasDocString, hasDataTable] of [
    ['Create{DataTable}', false, true],
    ['Create{DocString}', true, false],
    ['Create{DataTable}{DocString}', true, true],
    ['Create(:{DataTable})', false, true],
    ['Create(:{DocString})', true, false],
    ['Create(:{DataTable}(:{DocString}))', true, true],
    ['Create[table:{DataTable}/body:{DocString}]', true, true],
    ['Create[plain/table:{DataTable}]', false, true],
    ['Create[plain/body:{DocString}]', true, false],
    ['Create{Users}', false, true],
    ['Create(:{Users})', false, true],
    ['Create{Body}', true, false],
    ['Create(:{Body})', true, false],
  ] as const) {
    const expression = new BddExpression(pattern, types);
    assert.equal(expression.hasDocString, hasDocString, pattern);
    assert.equal(expression.hasDataTable, hasDataTable, pattern);
  }
  for (const pattern of [
    '',
    'Create',
    'Create :count{int}',
    'Create \\{DataTable\\}',
    '{=DocString}',
  ]) {
    const expression = new BddExpression(pattern, types);
    assert.equal(expression.hasDocString, false, pattern);
    assert.equal(expression.hasDataTable, false, pattern);
  }
});

test('optional block argument couples colon and presence without exposing input to text captures', async () => {
  const types = registry();
  types.defineParameterType({ name: 'Everything', regexp: /[\s\S]*/ });
  const expression = new BddExpression('I create :name{Everything}(::users{DataTable})', types);
  const result = await expression.matchAndResolve('I create Alice:', {
    dataTable: table,
  });
  assert.deepEqual([...result!], ['Alice', table]);
  assert.equal(result!.params.users, table);
  assert.equal(expression.match('I create Alice', { dataTable: table }), null);
  assert.equal((await expression.matchAndResolve('I create Alice'))!.params.users, undefined);
});

test('four variants bind both block arguments in expression order, including empty docstrings', async () => {
  const expression = new BddExpression('Create(::table{DataTable})(::body{DocString})', registry());
  for (const [text, blockArguments, expected] of [
    ['Create', {}, [undefined, undefined]],
    ['Create:', { dataTable: table }, [table, undefined]],
    ['Create:', { docString: '' }, [undefined, '']],
    ['Create::', { dataTable: table, docString: 'body' }, [table, 'body']],
  ] as const) {
    const result = await expression.matchAndResolve(text, blockArguments);
    assert.deepEqual([...result!], expected);
    assert.equal(result!.dataTable, expected[0]);
    assert.equal(result!.docString, expected[1]);
    assert.deepEqual(Object.keys(result!), ['0', '1']);
  }
  assert.equal(expression.match('Create:', {}), null);
});

test('required block arguments, independent optionals and nested groups', () => {
  const required = new BddExpression('Create(:){DataTable}{DocString}', registry());
  assert.equal(required.match('Create', { dataTable: table }), null);
  assert.ok(required.match('Create', { dataTable: table, docString: '' }));
  assert.ok(required.match('Create:', { dataTable: table, docString: '' }));
  const nested = new BddExpression('Create(:{DataTable}(:{DocString}))', registry());
  assert.equal(nested.match('Create:', { docString: '' }), null);
  assert.ok(nested.match('Create::', { dataTable: table, docString: '' }));
});

test('alternatives retain argument slots and select branches by block argument kind', async () => {
  const expression = new BddExpression('Create[table:{DataTable}/body:{DocString}]', registry());
  assert.deepEqual(
    [...(await expression.matchAndResolve('Createtable:', { dataTable: table }))!],
    [table, undefined],
  );
  assert.deepEqual(
    [...(await expression.matchAndResolve('Createbody:', { docString: '' }))!],
    [undefined, ''],
  );
  assert.equal(expression.match('Createtable:', { dataTable: table, docString: '' }), null);
});

test('custom block argument transformers preserve world and skip absent values', async () => {
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
  await expression.matchAndResolve('Create', { world: { prefix: 'Hello ' } });
  assert.equal(calls, 0);
  const result = await expression.matchAndResolve('Create:', {
    world: { prefix: 'Hello ' },
    dataTable: table,
  });
  assert.equal(result!.params.users, 'Hello Alice');
  assert.equal(result!.dataTable, table);
  assert.equal(calls, 1);
});

test('reject invalid placement and duplicate block argument kinds at construction', () => {
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

test('block argument metadata has no fabricated text positions and extra input cannot be ignored', () => {
  const expression = new BddExpression('Create{DataTable}', registry());
  const [argument] = expression.match('Create', { dataTable: table })!;
  assert.equal(argument!.group.start, undefined);
  assert.equal(argument!.group.value, undefined);
  assert.equal(argument!.getValue(), table);
  assert.equal(expression.match('Create', { dataTable: table, docString: '' }), null);
  assert.equal(new BddExpression('Create', registry()).match('Create', { dataTable: table }), null);
});

test('a supplied block argument cannot choose an alternative that leaves it unconsumed', () => {
  const expression = new BddExpression('Create[ plain/:{DataTable}]', registry());
  assert.ok(expression.match('Create plain'));
  assert.equal(expression.match('Create plain', { dataTable: table }), null);
  assert.ok(expression.match('Create:', { dataTable: table }));
  assert.equal(expression.match('Create:'), null);
});

test('block argument order is independent of input object order and parameter slots stay stable', async () => {
  const expression = new BddExpression('Create :count{int}{DocString}{DataTable}', registry());
  const result = await expression.matchAndResolve('Create 2', {
    dataTable: table,
    docString: 'body\ntext',
  });
  assert.deepEqual([...result!], [2, 'body\ntext', table]);
});

test('block argument transformers can be asynchronous and failures propagate during resolution only', async () => {
  const types = registry();
  types.defineParameterType({
    docString: true,
    name: 'JsonDocString',
    transformer: async (text) => JSON.parse(text) as unknown,
  });
  const expression = new BddExpression('Read{JsonDocString}', types);
  assert.ok(expression.match('Read', { docString: 'invalid' }));
  await assert.rejects(expression.matchAndResolve('Read', { docString: 'invalid' }), SyntaxError);
  assert.deepEqual(
    [...(await expression.matchAndResolve('Read', { docString: '{"ok":true}' }))!],
    [{ ok: true }],
  );
});

test('block argument registration validates options, names, and duplicate built-ins', () => {
  const types = registry();
  assert.throws(
    () =>
      types.defineParameterType(
        // @ts-expect-error Block argument kinds are mutually exclusive.
        { dataTable: true, name: 'Bad', docString: true },
      ),
    /docString and dataTable are mutually exclusive/,
  );
  assert.throws(
    () =>
      // @ts-expect-error Block argument types do not accept regexps.
      types.defineParameterType({ docString: true, name: 'Bad', regexp: /x/ }),
    /DocString types cannot define a regexp/,
  );
  assert.throws(
    () =>
      // @ts-expect-error DataTable types do not accept regexps.
      types.defineParameterType({ dataTable: true, name: 'Bad', regexp: /x/ }),
    /DataTable types cannot define a regexp/,
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

test('block argument flags provide identity defaults for custom names', async () => {
  const types = registry();
  types.defineParameterType({ dataTable: true, name: 'UsersDataTable' });
  types.defineParameterType({ docString: true, name: 'BodyDocString' });
  const expression = new BddExpression('Create{UsersDataTable}{BodyDocString}', types);
  const result = await expression.matchAndResolve('Create', {
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
    [...(await expression.matchAndResolve('Move 1,2', { world: { prefix: 'point:' } }))!],
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

test('required and optional choice groups preserve block argument presence', async () => {
  const required = new BddExpression('Create[:{DataTable}]', registry());
  assert.equal(required.match('Create'), null);
  assert.equal(required.match('Create:'), null);
  assert.ok(required.match('Create:', { dataTable: table }));
  const optional = new BddExpression('Create(:{DataTable}/:{DocString})', registry());
  assert.ok(optional.match('Create'));
  assert.ok(optional.match('Create:', { dataTable: table }));
  assert.ok(optional.match('Create:', { docString: '' }));
  assert.equal(optional.match('Create:', { dataTable: table, docString: '' }), null);
  const empty = new BddExpression('Create[:{DataTable}/]', registry());
  assert.ok(empty.match('Create'));
  assert.ok(empty.match('Create:', { dataTable: table }));
  assert.equal(empty.match('Create', { dataTable: table }), null);
  assert.deepEqual([...(await empty.matchAndResolve('Create'))!], [undefined]);
});
