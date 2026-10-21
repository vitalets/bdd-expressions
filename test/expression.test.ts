import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BddExpression, createExpression, createParameterTypeRegistry } from '../src/index.ts';

void test('constructor exposes the compiled expression and synchronous match contract', () => {
  const registry = createParameterTypeRegistry();
  const expression = new BddExpression('hello', registry);
  assert.ok(expression instanceof BddExpression);
  assert.equal(expression.source, 'hello');
  assert.ok(expression.regexp instanceof RegExp);
  assert.deepEqual(expression.match('hello'), []);
  assert.equal(expression.match('other'), null);
  assert.deepEqual(expression.match('hello'), []);
  assert.throws(() => new BddExpression('{Unknown}', registry), /Unknown parameter type/);
  assert.throws(() => new BddExpression('(', registry));
  assert.ok(createExpression('{int}') instanceof BddExpression);
});
