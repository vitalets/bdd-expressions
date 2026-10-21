import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CucumberExpression,
  ParameterType as CucumberType,
  ParameterTypeRegistry as CucumberRegistry,
} from '@cucumber/cucumber-expressions';
import {
  BddExpression,
  createExpression,
  createParameterType,
  createParameterTypeRegistry,
} from '../src/index.ts';

import { serialize } from './helpers/reporter-serialization.ts';

// Compare every capture, not just transformed user values. Normalize class
// instances into data while preserving undefined vs empty and child structure.
interface ComparableGroup {
  value: string | undefined;
  start: number | undefined;
  end: number | undefined;
  values: (string | undefined)[] | null;
  children: readonly ComparableGroup[] | undefined;
}
function metadata(group: ComparableGroup): unknown {
  return {
    value: group.value,
    start: group.start,
    end: group.end,
    values: group.values,
    children: group.children?.map(metadata),
  };
}
async function compare(source: string, text: string) {
  const upstream = new CucumberExpression(source, new CucumberRegistry()).match(text);
  const local = new BddExpression(source, new CucumberRegistry()).match(text);
  assert.deepEqual(
    serialize(local),
    serialize(upstream),
    `Reporter output for ${JSON.stringify(source)} matching ${JSON.stringify(text)}`,
  );
  assert.equal(local === null, upstream === null, `${source}: ${JSON.stringify(text)}`);
  if (!local || !upstream) return;
  assert.equal(local.length, upstream.length);
  assert.deepEqual(
    local.map((arg) => metadata(arg.group)),
    upstream.map((arg) => metadata(arg.group)),
  );
  assert.deepEqual(
    local.map((arg) => arg.parameterType.name),
    upstream.map((arg) => arg.parameterType.name),
  );
  assert.deepEqual(
    await Promise.all(local.map((arg) => arg.getValue(null))),
    await Promise.all(upstream.map((arg) => arg.getValue(null))),
  );
}
const integerInputs = [
  '',
  '0',
  '-0',
  '-13',
  '+13',
  '0012',
  '9007199254740993',
  '1.2',
  '12a',
  'NaN',
];
const floatInputs = [
  '',
  '.',
  '-',
  '1.',
  '1,000',
  '1',
  '-1.1',
  '.1',
  '+.1',
  '1E2',
  '-.1E-2',
  '1e2',
  'Infinity',
  '1E999',
];
for (const name of [
  'int',
  'byte',
  'short',
  'long',
  'biginteger',
  'float',
  'double',
  'bigdecimal',
]) {
  test(`differential builtin ${name}: values, match/null, capture tree`, async () => {
    const inputs = ['float', 'double', 'bigdecimal'].includes(name) ? floatInputs : integerInputs;
    for (const input of inputs) await compare(`{${name}}`, input);
  });
}
test('differential string quotation and escape semantics', async () => {
  for (const input of [
    '""',
    "''",
    '"hello"',
    "'hello'",
    '"42"',
    'unquoted',
    '"unterminated',
    '"a"b"',
    String.raw`"a\"b"`,
    String.raw`'a\'b'`,
    String.raw`"a\'b"`,
    String.raw`'a\"b'`,
    String.raw`"a\\b"`,
    String.raw`"a\nb"`,
    '"a\nb"',
    '"😀"',
    '"a\\\nb"',
  ])
    await compare('{string}', input);
});
test('differential word and arbitrary text including greediness', async () => {
  for (const text of ['', 'abc', '😀', 'a b', 'a\tb']) {
    await compare('{word}', text);
    await compare('{}', text);
  }
  await compare('I send {} to {}', 'I send a to b to c');
});
test('shared alternatives, optional text and escaping from upstream fixture categories', async () => {
  for (const [source, inputs] of [
    [
      'I have {int} cucumber(s)',
      ['I have 1 cucumber', 'I have 2 cucumbers', 'I have two cucumbers'],
    ],
    ['{int}st/nd/rd/th', ['3rd', '1st', '2nd', '4th']],
    ['a/i{int}n/y', ['i18n', 'a11y']],
    ['{int} rat(s)/mouse/mice', ['3 rats', '1 mouse', '2 mice']],
    [
      'three (brown )mice/rats',
      ['three brown mice', 'three rats', 'three mice', 'three brown rats'],
    ],
    ['I wait {int} second(s)./second(s)?', ['I wait 2 seconds?', 'I wait 1 second.']],
    [String.raw`mice/rats and rats\/mice`, ['rats and rats/mice', 'mice and rats/mice']],
    [String.raw`12\\/2020`, ['12\\', '2020']],
    [String.raw`a\ b/c`, ['a b', 'c']],
    [String.raw`\(x\) \{int\}`, ['(x) {int}']],
    ['😀 {string} {string} {int}', ['😀 "same" "same" 17']],
    ['x|y [z].*', ['x|y [z].*', 'x']],
    ['', ['', 'x']],
  ] as const)
    for (const text of inputs) await compare(source, text);
});
test('custom nested and multi-pattern captures, world, and an existing upstream registry', async () => {
  const upstream = new CucumberRegistry();
  const local = createParameterTypeRegistry();
  const patterns = [/((a)(b))-(ab)/, /([A-Z]+)?(?: )?([0-9]+)?/];
  function transform(this: { prefix: string }, ...args: (string | undefined)[]) {
    return { prefix: this.prefix, args };
  }
  upstream.defineParameterType(new CucumberType('Custom', patterns, null, transform));
  local.defineParameterType(
    createParameterType({ name: 'Custom', regexp: patterns, transformer: transform }),
  );
  for (const text of ['😀 ab-ab', '😀 ABC', '😀 123', '😀 ABC 123', '😀 ']) {
    const a = new CucumberExpression('😀 {Custom}', upstream).match(text)!;
    const b = createExpression('😀 {Custom}', local).match(text)!;
    const adapted = new BddExpression('😀 {Custom}', upstream).match(text)!;
    assert.deepEqual(serialize(b), serialize(a), `Reporter output for ${JSON.stringify(text)}`);
    assert.deepEqual(serialize(adapted), serialize(a));
    assert.deepEqual(
      b.map((arg) => metadata(arg.group)),
      a.map((arg) => metadata(arg.group)),
    );
    assert.deepEqual(
      adapted.map((arg) => metadata(arg.group)),
      a.map((arg) => metadata(arg.group)),
    );
    assert.deepEqual(b[0]!.getValue({ prefix: 'world' }), a[0]!.getValue({ prefix: 'world' }));
  }
});
test('intentional differences are separate from compatibility claims', () => {
  for (const source of ['(:name)', 'a(b(c))', '(a/b)', '{a/b}']) {
    assert.doesNotThrow(() => createExpression(source));
  }
  assert.ok(new CucumberExpression('x)', new CucumberRegistry()).match('x)'));
  assert.throws(() => createExpression('x)'), /Unexpected/);
  for (const source of ['x/{int}', '{int}/x', 'a//b', '(a)/b']) {
    assert.throws(() => createExpression(source));
    assert.throws(() => new CucumberExpression(source, new CucumberRegistry()));
  }
});
test('both implementations reject unconsumed final line terminators', async () => {
  for (const tail of ['\n', '\r', '\r\n', '\u2028', '\u2029']) await compare('x', 'x' + tail);
});

test('reporter keeps raw string quotes, numeric text and independent inline type names', async () => {
  const expression = createExpression('😀 :page :count{int} :status{pending/approved}');
  const text = '😀 "same" 002 approved';
  const args = expression.match(text)!;
  assert.deepEqual(serialize(args), [
    {
      group: {
        start: 3,
        value: '"same"',
        children: [{ start: 4, value: 'same', children: [{}] }, { children: [{}] }],
      },
      parameterTypeName: 'string',
    },
    { group: { start: 10, value: '002' }, parameterTypeName: 'int' },
    { group: { start: 14, value: 'approved' }, parameterTypeName: 'inline-choice' },
  ]);
  assert.deepEqual([...(await expression.matchValues(text))!], ['same', 2, 'approved']);
  assert.equal(args[1]!.group.value, '002');
});
test('absent parameters serialize no fabricated positions or values', () => {
  const args = createExpression('x( :count{int}) {}').match('x ')!;
  assert.deepEqual(serialize(args), [
    { group: {}, parameterTypeName: 'int' },
    { group: { start: 2, value: '' }, parameterTypeName: '' },
  ]);
});
