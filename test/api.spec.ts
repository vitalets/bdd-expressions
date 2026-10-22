import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BddExpression,
  createParameterType,
  createParameterTypeRegistry,
  parseExpression,
  type Argument,
  type MatchValues,
  type ParameterTypeRegistry,
  type Node,
  type Group,
} from '../src/index.ts';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

test('public expression members and TypeScript return contracts', async () => {
  const matchContract: Equal<ReturnType<BddExpression['match']>, readonly Argument[] | null> = true;
  const valuesContract: Equal<
    ReturnType<BddExpression['matchValues']>,
    Promise<MatchValues | null>
  > = true;
  const astContract: Equal<BddExpression['ast'], Node> = true;
  const constructorContract: Equal<
    ConstructorParameters<typeof BddExpression>,
    [string, ParameterTypeRegistry]
  > = true;
  assert.ok(matchContract && valuesContract && astContract && constructorContract);

  const source = 'I open :page';
  const expression: BddExpression = new BddExpression(source, createParameterTypeRegistry());
  assert.equal(expression.source, source);
  assert.ok(expression.regexp instanceof RegExp);
  assert.equal(expression.regexp.hasIndices, true);
  assert.deepEqual(expression.ast, parseExpression(source));
  const pending = expression.matchValues('I open "Settings"');
  assert.ok(pending instanceof Promise);
  await pending;
});

test('public AST ranges refer to original UTF-16 source including escapes', () => {
  const source = String.raw`😀 \/`;
  const ast = parseExpression(source);
  assert.equal(ast.kind, 'sequence');
  assert.deepEqual([ast.start, ast.end], [0, source.length]);
  assert.ok(ast.kind === 'sequence');
  const run = ast.children.at(-1)!;
  assert.ok(run.kind === 'sequence');
  const slash = run.children[0]!;
  assert.ok(slash.kind === 'literal');
  assert.equal(slash.value, '/');
  assert.deepEqual([slash.start, slash.end], [3, 5]);
  assert.equal(source.slice(slash.start, slash.end), String.raw`\/`);
});

test('named parameter mapping has a null prototype and is nonenumerable', async () => {
  const expression = new BddExpression(
    'I open :page with :count{int} :__proto__ :constructor',
    createParameterTypeRegistry(),
  );
  const result = (await expression.matchValues(`I open "Settings" with 2 'safe' ""`))!;
  assert.equal(result.params.page, result[0]);
  assert.equal(Object.getPrototypeOf(result.params), null);
  assert.equal(Object.keys(result).includes('params'), false);
});
test('nested optional parameters retain absent capture metadata', () => {
  const expression = new BddExpression(
    'I create :item( as :owner( in :workspace))',
    createParameterTypeRegistry(),
  );
  const args = expression.match('I create "x"')!;
  assert.equal(args.length, 3);
  assert.equal(args[1]!.group.value, undefined);
  assert.equal(args[1]!.group.start, undefined);
  assert.equal(args[1]!.group.end, undefined);
  assert.ok(args[1]!.group.children!.every((child) => child.start === undefined));
});
test('backtracking skips transformers and clears all abandoned capture positions', async () => {
  const registry = createParameterTypeRegistry();
  const stringType = registry.lookupByTypeName('string')!;
  let calls = 0;
  const expression = new BddExpression('I send( :message)( :recipient confirmed)', {
    lookupByTypeName: () => ({
      ...stringType,
      transform(world, captures) {
        calls++;
        return stringType.transform(world, captures);
      },
    }),
  });
  const text = 'I send "Alice" confirmed';
  await expression.matchValues(text);
  assert.equal(calls, 1);
  const args = expression.match(text)!;
  assertAbsent(args[0]!.group);
  assert.equal(args[1]!.group.value, '"Alice"');
  assert.deepEqual([args[1]!.group.start, args[1]!.group.end], [7, 14]);
});

test('empty arbitrary captures have defined zero-width positions', () => {
  const empty = new BddExpression('{}', createParameterTypeRegistry()).match('')![0]!.group;
  assert.equal(empty.value, '');
  assert.equal(empty.start, 0);
  assert.equal(empty.end, 0);
});
test('raw UTF-16 captures and nested custom groups use native indices', async () => {
  const registry = createParameterTypeRegistry();
  registry.defineParameterType(
    createParameterType({
      name: 'Pair',
      regexp: /((a)(b))-(?<last>ab)/,
      transformer: (first, last) => [first, last],
    }),
  );
  const expression = new BddExpression('😀 :pair{Pair} {word}', registry);
  const args = expression.match('😀 ab-ab ab')!;
  const group = args[0]!.group;
  assert.equal(group.value, 'ab-ab');
  assert.deepEqual([group.start, group.end], [3, 8]);
  assert.deepEqual(group.values, ['ab', 'ab']);
  assert.deepEqual(
    group.children![0]!.children!.map((g) => [g.value, g.start, g.end]),
    [
      ['a', 3, 4],
      ['b', 4, 5],
    ],
  );
  assert.deepEqual([args[1]!.group.start, args[1]!.group.end], [9, 11]);
  assert.deepEqual(await args[0]!.getValue(), ['ab', 'ab']);
  assert.equal(args[0]!.getParameterType(), args[0]!.parameterType);
});
test('capture scanner handles classes, escaped parentheses, lookarounds, repeated named types', () => {
  const registry = createParameterTypeRegistry();
  registry.defineParameterType(
    createParameterType({ name: 'Complex', regexp: /(?<= )(?=(a))(?<value>a)[()]\((?:b)(c)(?!x)/ }),
  );
  const expression = new BddExpression(' {Complex} {Complex}', registry);
  const args = expression.match(' a((bc a)(bc')!;
  assert.equal(args.length, 2);
  assert.deepEqual(
    args.map((arg) => arg.group.values),
    [
      ['a', 'a', 'c'],
      ['a', 'a', 'c'],
    ],
  );
  assert.deepEqual(
    args[1]!.group.children!.map((g) => g.start),
    [7, 7, 11],
  );
});
test('world context, PromiseLike, ordered transformations, no calls for absent parameters or failures', async () => {
  const registry = createParameterTypeRegistry();
  const calls: string[] = [];
  registry.defineParameterType(
    createParameterType<string, { prefix: string }>({
      name: 'Async',
      regexp: /\w+/,
      transformer(s) {
        calls.push(s!);
        const output = this.prefix + s;
        return { then: Promise.resolve(output).then.bind(Promise.resolve(output)) };
      },
    }),
  );
  const expression = new BddExpression(':a{Async}( :b{Async})( :c{Async})', registry);
  let execs = 0;
  const originalExec = expression.regexp.exec.bind(expression.regexp);
  expression.regexp.exec = (text) => {
    execs++;
    return originalExec(text);
  };
  const result = (await expression.matchValues('one two', { prefix: '!' }))!;
  assert.deepEqual([...result], ['!one', '!two', undefined]);
  assert.deepEqual(calls, ['one', 'two']);
  assert.equal(execs, 1);
  assert.equal(await expression.matchValues('???', {}), null);
  assert.deepEqual(calls, ['one', 'two']);
});
test('transformer errors propagate', async () => {
  const registry = createParameterTypeRegistry();
  registry.defineParameterType(
    createParameterType({
      name: 'Fail',
      regexp: /x/,
      transformer: () => Promise.reject(new Error('transform failed')),
    }),
  );
  await assert.rejects(new BddExpression('{Fail}', registry).matchValues('x'), /transform failed/);
});

test('transformers can return real null independently of absent parameters', async () => {
  const registry = createParameterTypeRegistry();
  registry.defineParameterType(
    createParameterType({
      name: 'Null',
      regexp: /x/,
      transformer: () => null,
    }),
  );
  const result = (await new BddExpression(':present{Null}( :absent{Null})', registry).matchValues(
    'x',
  ))!;
  assert.deepEqual([...result], [null, undefined]);
  assert.equal(result.params.present, null);
  assert.equal(result.params.absent, undefined);
});

test('registers a custom parameter type', () => {
  const registry = createParameterTypeRegistry();
  const type = createParameterType({ name: 'Custom', regexp: /a/ });
  registry.defineParameterType(type);
  assert.equal(registry.lookupByTypeName('Custom'), type);
});

test('rejects duplicate custom parameter types', () => {
  const registry = createParameterTypeRegistry();
  const type = createParameterType({ name: 'Custom', regexp: /a/ });
  registry.defineParameterType(type);
  assert.throws(() => registry.defineParameterType(type), /Duplicate/);
});

test('rejects invalid custom parameter patterns', () => {
  for (const regexp of [/a/i, '(a)\\1', '(?<a>x)\\k<a>', '\\01', '[', []]) {
    assert.throws(() => createParameterType({ name: 'Bad', regexp }));
  }
});

test('rejects reserved custom parameter type names', () => {
  assert.throws(() => createParameterType({ name: 'inline-choice', regexp: /a/ }), /reserved/);
});

test('biginteger preserves integer precision', async () => {
  // Preserves integer precision as bigint.
  const expression = new BddExpression('{biginteger}', createParameterTypeRegistry());
  for (const [input, expected] of [
    ['0', 0n],
    ['0012', 12n],
    ['9007199254740993', 9007199254740993n],
    ['-9007199254740993', -9007199254740993n],
  ] as const) {
    const args = expression.match(input);
    assert.ok(args);
    assert.equal(args.length, 1);
    assert.equal(args[0]!.parameterType.name, 'biginteger');
    assert.deepEqual(await expression.matchValues(input), [expected]);
  }
});

test('unselected choice parameters do not invoke transformers', async () => {
  let calls = 0;
  const registry = createParameterTypeRegistry();
  registry.defineParameterType(
    createParameterType({
      name: 'Tracked',
      regexp: /[a-z]+/,
      transformer(value) {
        calls++;
        return value;
      },
    }),
  );
  const expression = new BddExpression('(:first{Tracked}//:second{int}/)', registry);
  await expression.matchValues('');
  await expression.matchValues('2');
  assert.equal(calls, 0);
  assertAbsent(expression.match('2')![0]!.group);
  await expression.matchValues('abc');
  assert.equal(calls, 1);
});

function assertAbsent(group: Group) {
  assert.equal(group.value, undefined);
  assert.equal(group.start, undefined);
  assert.equal(group.end, undefined);
  group.children?.forEach(assertAbsent);
}
