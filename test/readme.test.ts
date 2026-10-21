import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BddExpression, createParameterType, createParameterTypeRegistry } from '../src/index.ts';

void test('README examples execute with documented results', async () => {
  const expression = new BddExpression(
    'I create :item( as :owner( in :workspace))',
    createParameterTypeRegistry(),
  );
  const values = (await expression.matchValues('I create "document" as "Alice"'))!;
  assert.equal(values[0], 'document');
  assert.equal(values.params.owner, 'Alice');
  assert.equal(values.params.workspace, undefined);
  const url = new BddExpression(
    String.raw`Visit https:\/\/example.com label\:value`,
    createParameterTypeRegistry(),
  );
  assert.deepEqual(url.match('Visit https://example.com label:value'), []);
  const registry = createParameterTypeRegistry();
  registry.defineParameterType(
    createParameterType({
      name: 'Point',
      regexp: /(-?\d+),(-?\d+)/,
      transformer(x, y) {
        return { x: Number(x), y: Number(y) };
      },
    }),
  );
  const point = new BddExpression('Move to :point{Point}', registry);
  assert.deepEqual((await point.matchValues('Move to 3,-2'))!.params.point, { x: 3, y: -2 });
  const argument = new BddExpression('😀 :count{int}', createParameterTypeRegistry()).match(
    '😀 002',
  )![0]!;
  assert.equal(argument.group.value, '002');
  assert.equal(argument.group.start, 3);
  assert.equal(argument.group.end, 6);
  assert.equal(argument.getValue(), 2);
  assert.equal(argument.getParameterType().name, 'int');
});
