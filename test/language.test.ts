import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createExpression,
  createParameterType,
  createParameterTypeRegistry,
  ExpressionError,
  type Group,
} from '../src/index.ts';

async function values(source: string, text: string) {
  const result = await createExpression(source).matchValues(text);
  return result && [...result];
}
void test('named parameters default to quoted strings, remain positional and safely indexed', async () => {
  const expression = createExpression('I open :page with :count{int} :__proto__ :constructor');
  const result = (await expression.matchValues(`I open "Settings" with 2 'safe' ""`))!;
  assert.deepEqual([...result], ['Settings', 2, 'safe', '']);
  assert.equal(result.params.page, result[0]);
  assert.equal(result.params.__proto__, 'safe');
  assert.equal(result.params.constructor, '');
  assert.equal(Object.getPrototypeOf(result.params), null);
  assert.equal(Object.keys(result).includes('params'), false);
  assert.equal(await createExpression(':page').matchValues('123'), null);
  assert.equal(await createExpression('":page"').matchValues('"Settings"'), null);
  assert.deepEqual(await values('":page"', '""Settings""'), ['Settings']);
});
void test('nested optional parameters keep absent slots and positions', async () => {
  const expression = createExpression('I create :item( as :owner( in :workspace))');
  for (const [text, expected] of [
    ['I create "x"', ['x', undefined, undefined]],
    ['I create "x" as "y"', ['x', 'y', undefined]],
    ['I create "x" as "y" in "z"', ['x', 'y', 'z']],
  ] as const) {
    const result = (await expression.matchValues(text))!;
    assert.deepEqual([...result], expected);
    assert.equal(result.params.workspace, expected[2]);
  }
  const args = expression.match('I create "x"')!;
  assert.equal(args.length, 3);
  assert.equal(args[1]!.group.value, undefined);
  assert.equal(args[1]!.group.start, undefined);
  assert.equal(args[1]!.group.end, undefined);
  assert.ok(args[1]!.group.children!.every((child) => child.start === undefined));
  assert.equal(expression.match('I create "x" in "z"'), null);
});
for (const { name, source, text, expected } of [
  {
    name: 'neither group present',
    source: 'I send( :message)( :recipient)',
    text: 'I send',
    expected: [undefined, undefined],
  },
  {
    name: 'only the first group present',
    source: 'I send( message :message)( to :recipient)',
    text: 'I send message "Hello"',
    expected: ['Hello', undefined],
  },
  {
    name: 'only the second group present, distinguished by literal text',
    source: 'I send( message :message)( to :recipient)',
    text: 'I send to "Alice"',
    expected: [undefined, 'Alice'],
  },
  {
    name: 'both groups present',
    source: 'I send( :message)( :recipient)',
    text: 'I send "Hello" "Alice"',
    expected: ['Hello', 'Alice'],
  },
  {
    name: 'ambiguous input assigned to the first group',
    source: 'I send( :message)( :recipient)',
    text: 'I send "Alice"',
    expected: ['Alice', undefined],
  },
  {
    name: 'backtracking skips an earlier group to complete the match',
    source: 'I send( :message)( :recipient confirmed)',
    text: 'I send "Alice" confirmed',
    expected: [undefined, 'Alice'],
  },
] as const) {
  void test(`consecutive optional parameters: ${name}`, async () => {
    const registry = createParameterTypeRegistry();
    const stringType = registry.lookupByTypeName('string')!;
    let calls = 0;
    const expression = createExpression(source, {
      lookupByTypeName: (typeName) =>
        typeName === 'string'
          ? {
              ...stringType,
              transform(world, captures) {
                calls++;
                return stringType.transform(world, captures);
              },
            }
          : registry.lookupByTypeName(typeName),
    });
    const result = (await expression.matchValues(text))!;
    assert.deepEqual([...result], expected);
    assert.deepEqual({ ...result.params }, { message: expected[0], recipient: expected[1] });
    assert.equal(calls, expected.filter((value) => value !== undefined).length);

    const args = expression.match(text)!;
    assert.equal(args.length, 2);
    function assertAbsent(group: Group) {
      assert.equal(group.value, undefined);
      assert.equal(group.start, undefined);
      assert.equal(group.end, undefined);
      group.children?.forEach(assertAbsent);
    }
    for (const [index, value] of expected.entries()) {
      const group = args[index]!.group;
      if (value === undefined) {
        assertAbsent(group);
      } else {
        assert.equal(group.value, `"${value}"`);
        assert.equal(group.start, text.indexOf(`"${value}"`));
        assert.equal(group.end, group.start! + group.value!.length);
      }
    }
  });
}
void test('choice branches keep stable source-order slots', async () => {
  const expression = createExpression('(create :item/delete :id{int}/nothing)');
  assert.deepEqual([...(await expression.matchValues('create "x"'))!], ['x', undefined]);
  const result = (await expression.matchValues('delete 42'))!;
  assert.deepEqual([...result], [undefined, 42]);
  assert.equal(result.params.item, undefined);
  assert.equal(result.params.id, 42);
  assert.deepEqual([...(await expression.matchValues('nothing'))!], [undefined, undefined]);
  assert.throws(() => createExpression('(:x/:x)'), /Duplicate/);
});
void test('structural and inline choices, optional first branch, overlap', async () => {
  for (const action of ['click', 'tap on', 'press and hold']) {
    assert.deepEqual(await values('I (click/tap on/press and hold) :target', `I ${action} "x"`), [
      'x',
    ]);
    assert.deepEqual(await values(':action{click/tap on/press and hold}', action), [action]);
  }
  for (const suffix of ['', ' again', ' once more']) {
    assert.deepEqual(await values('I open :page(/ again/ once more)', `I open "x"${suffix}`), [
      'x',
    ]);
  }
  assert.deepEqual(await values('{int/float}', 'int'), ['int']);
  assert.equal(await values('{int/float}', '42'), null);
  assert.deepEqual(await values('{a/ab}b', 'abb'), ['ab']);
  assert.deepEqual(await values('( with :status{pending/approved})', ''), [undefined]);
  assert.deepEqual(await values('( with :status{pending/approved})', ' with approved'), [
    'approved',
  ]);
  assert.equal(
    createExpression(':status{a/b}').match('a')![0]!.parameterType.name,
    'inline-choice',
  );
});
void test('whitespace, all literal regex metacharacters, escaped colons and URLs', async () => {
  assert.deepEqual(await values('I create :item( as :owner)', 'I create "x"'), ['x', undefined]);
  assert.equal(await values('I create :item (as :owner)', 'I create "x"'), null);
  assert.deepEqual(await values('I create :item (as :owner)', 'I create "x" '), ['x', undefined]);
  for (const text of [' a  b ', 'a\tb\n', 'a|b', '[a].*+?$^']) {
    assert.deepEqual(await values(text, text), []);
  }
  assert.deepEqual(
    await values(
      String.raw`https:\/\/example.com label\:value 12:30`,
      'https://example.com label:value 12:30',
    ),
    [],
  );
  assert.deepEqual(await values(String.raw`\{\}\(\)\\\/\:`, '{}()\\/:'), []);
  assert.deepEqual(await values(String.raw`{a\/b/c\:d}`, 'a/b'), ['a/b']);
  assert.deepEqual(await values(String.raw`{a\/b/c\:d}`, 'c:d'), ['c:d']);
  assert.equal(await values('a b', 'a\tb'), null);
});
void test('full-input anchoring includes final newlines only if explicitly matched', async () => {
  for (const tail of ['\n', '\r', '\r\n', '\u2028', '\u2029']) {
    assert.equal(createExpression('x').match('x' + tail), null);
    assert.deepEqual(createExpression('x' + tail).match('x' + tail), []);
  }
  assert.deepEqual(createExpression('').match(''), []);
  assert.equal(createExpression('').match('\n'), null);
  assert.equal(await createExpression('x').matchValues('no'), null);
});
void test('empty strings, absent captures and greedy arbitrary text are distinct', async () => {
  const empty = createExpression('{}').match('')![0]!.group;
  assert.equal(empty.value, '');
  assert.equal(empty.start, 0);
  assert.equal(empty.end, 0);
  assert.deepEqual(await values('{}', ''), ['']);
  assert.deepEqual(await values('{string}', '""'), ['']);
  assert.deepEqual(await values('I send {} to {}', 'I send a to b to c'), ['a to b', 'c']);
});
void test('raw UTF-16 captures and nested custom groups use native indices', async () => {
  const registry = createParameterTypeRegistry();
  registry.defineParameterType(
    createParameterType({
      name: 'Pair',
      regexp: /((a)(b))-(?<last>ab)/,
      transformer: (first, last) => [first, last],
    }),
  );
  const expression = createExpression('😀 :pair{Pair} {word}', registry);
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
void test('capture scanner handles classes, escaped parentheses, lookarounds, repeated named types', () => {
  const registry = createParameterTypeRegistry();
  registry.defineParameterType(
    createParameterType({ name: 'Complex', regexp: /(?<= )(?=(a))(?<value>a)[()]\((?:b)(c)(?!x)/ }),
  );
  const expression = createExpression(' {Complex} {Complex}', registry);
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
void test('world context, PromiseLike, ordered transformations, no calls for absent parameters or failures', async () => {
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
  const expression = createExpression(':a{Async}( :b{Async})( :c{Async})', registry);
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
void test('transformer errors propagate and unknown type errors identify expression ranges', async () => {
  const registry = createParameterTypeRegistry();
  registry.defineParameterType(
    createParameterType({
      name: 'Fail',
      regexp: /x/,
      transformer: () => Promise.reject(new Error('transform failed')),
    }),
  );
  await assert.rejects(createExpression('{Fail}', registry).matchValues('x'), /transform failed/);
  assert.throws(
    () => createExpression('I {unknown}'),
    (error) =>
      error instanceof ExpressionError &&
      error.start === 2 &&
      error.end === 11 &&
      /Unknown/.test(error.message),
  );
});

void test('parenthesized alternatives allow empty branches anywhere', async () => {
  for (const source of [
    '(/again/once more)',
    '(again//once more)',
    '(again/once more/)',
    '(/again///once more/)',
  ]) {
    for (const input of ['', 'again', 'once more']) {
      assert.deepEqual(await values(source, input), [], `${source}: ${input}`);
    }
    assert.equal(createExpression(source).match('other'), null);
  }
  for (const source of ['()', '(/)', '(//)', '(()/())']) {
    assert.deepEqual(await values(source, ''), []);
    assert.equal(createExpression(source).match('x'), null);
    assert.deepEqual(await values(`before${source}after`, 'beforeafter'), []);
  }
});

void test('empty branches preserve parameter slots, positions and transformation behavior', async () => {
  const calls: string[] = [];
  const registry = createParameterTypeRegistry();
  registry.defineParameterType(
    createParameterType({
      name: 'Tracked',
      regexp: /[a-z]+/,
      transformer(value) {
        calls.push(value!);
        return value;
      },
    }),
  );
  const expression = createExpression('(:first{Tracked}//:second{int}/)', registry);
  for (const [input, expected] of [
    ['', [undefined, undefined]],
    ['abc', ['abc', undefined]],
    ['2', [undefined, 2]],
  ] as const) {
    const result = (await expression.matchValues(input))!;
    assert.deepEqual([...result], expected);
    assert.deepEqual({ ...result.params }, { first: expected[0], second: expected[1] });
    const args = expression.match(input)!;
    for (const [index, value] of expected.entries()) {
      assert.equal(args[index]!.group.start, value === undefined ? undefined : 0);
      assert.equal(args[index]!.group.end, value === undefined ? undefined : input.length);
    }
  }
  assert.deepEqual(calls, ['abc']);
  assert.deepEqual(await values('(a/)(:value{word}/)', 'a'), [undefined]);
  assert.deepEqual(await values('(/a)(:value{word}/)', 'a'), ['a']);
  assert.deepEqual(await values('(a/)(/:value{word})', 'a'), [undefined]);
});
