import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression, ExpressionError, type Node } from '../src/parser.js';

function flatten(node: Node): Node[] {
  return [
    node,
    ...('children' in node
      ? node.children.flatMap(flatten)
      : 'branches' in node
        ? node.branches.flatMap(flatten)
        : 'body' in node
          ? flatten(node.body)
          : []),
  ];
}
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
void test('group and bare choices, escaped whitespace and source boundaries', () => {
  for (const source of [
    'belly/stomach',
    '(click/tap on/press and hold)',
    '(/ again/ once more)',
    String.raw`a\ b/c`,
    '(a/(b/c))',
    '{int}st/nd',
  ]) {
    assert.ok(flatten(parseExpression(source)).some((n) => n.kind === 'choice'));
  }
});
for (const [source, offset] of [
  ['()', 0],
  ['(a/)', 3],
  ['(/)', 2],
  ['(a//b)', 3],
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
