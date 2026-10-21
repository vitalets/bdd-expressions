import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression, ExpressionError, type Node } from '../src/parser.ts';

void test('nested groups distinguish brace slashes and retain original ranges', () => {
  const source = String.raw`😀 I create :item( as :owner( with :status{pending/approved})) \/`;
  const nodes = flatten(parseExpression(source));
  assert.equal(nodes.filter((n) => n.kind === 'optional').length, 2);
  assert.equal(nodes.filter((n) => n.kind === 'choice').length, 0);
  const parameters = nodes.filter((n) => n.kind === 'parameter');
  assert.deepEqual(
    parameters.map((n) => source.slice(n.start, n.end)),
    [':item', ':owner', ':status{pending/approved}'],
  );
  const slash = nodes.find((n) => n.kind === 'literal' && n.value === '/');
  assert.equal(source.slice(slash!.start, slash!.end), '\\/');
});
for (const { name, source, branches } of [
  { name: 'bare alternatives', source: 'belly/stomach', branches: [['belly', 'stomach']] },
  {
    name: 'multiword grouped alternatives',
    source: '(click/tap on/press and hold)',
    branches: [['click', 'tap on', 'press and hold']],
  },
  {
    name: 'empty first grouped branch',
    source: '(/ again/ once more)',
    branches: [['', ' again', ' once more']],
  },
  {
    name: 'escaped whitespace in a bare branch',
    source: String.raw`a\ b/c`,
    branches: [[String.raw`a\ b`, 'c']],
  },
  {
    name: 'nested choices',
    source: '(a/(b/c))',
    branches: [
      ['a', '(b/c)'],
      ['b', 'c'],
    ],
  },
  {
    name: 'parameter boundary before a bare choice',
    source: '{int}st/nd',
    branches: [['st', 'nd']],
  },
]) {
  void test(`choice branches: ${name}`, () => {
    const choices = flatten(parseExpression(source)).filter((node) => node.kind === 'choice');
    assert.deepEqual(
      choices.map((choice) => choice.branches.map(({ start, end }) => source.slice(start, end))),
      branches,
    );
  });
}

for (const [source, offset] of [
  ['{a/}', 0],
  ['{x', 0],
  ['(x', 0],
  ['x)', 1],
  ['x}', 1],
  ['\\q', 0],
  ['x\\', 1],
  [':a :a', 3],
  ['{bad name}', 0],
  ['a//b', 2],
  ['(a)/b', 0],
] as const) {
  void test(`positioned syntax error ${JSON.stringify(source)}`, () => {
    assert.throws(
      () => parseExpression(source),
      (error) =>
        error instanceof ExpressionError && error.source === source && error.start === offset,
    );
  });
}

void test('empty grouped branches retain source ranges', () => {
  const choices = flatten(parseExpression('(a//b/)')).filter((node) => node.kind === 'choice');
  assert.deepEqual(
    choices[0]!.branches.map(({ start, end }) => [start, end]),
    [
      [1, 2],
      [3, 3],
      [4, 5],
      [6, 6],
    ],
  );
});

void test('empty optional group retains its empty sequence range', () => {
  const empty = flatten(parseExpression('()')).find((node) => node.kind === 'optional')!;
  assert.deepEqual(empty.body, { kind: 'sequence', children: [], start: 1, end: 1 });
});

function flatten(node: Node): Node[] {
  switch (node.kind) {
    case 'sequence':
      return [node, ...node.children.flatMap(flatten)];
    case 'choice':
      return [node, ...node.branches.flatMap(flatten)];
    case 'optional':
      return [node, ...flatten(node.body)];
    default:
      return [node];
  }
}
