import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CucumberExpression,
  ParameterType as CucumberType,
  ParameterTypeRegistry as CucumberRegistry,
} from '@cucumber/cucumber-expressions';
import {
  BddExpression,
  createParameterType,
  createParameterTypeRegistry,
} from '../../src/index.ts';

import { normalizeReporterData } from './helpers.ts';

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
    const b = new BddExpression('😀 {Custom}', local).match(text)!;
    const adapted = new BddExpression('😀 {Custom}', upstream).match(text)!;
    assert.deepEqual(
      normalizeReporterData(b),
      normalizeReporterData(a),
      `Reporter output for ${JSON.stringify(text)}`,
    );
    assert.deepEqual(normalizeReporterData(adapted), normalizeReporterData(a));
    assert.deepEqual(b[0]!.getValue({ prefix: 'world' }), a[0]!.getValue({ prefix: 'world' }));
  }
});
test('reporter keeps raw string quotes, numeric text and independent inline type names', async () => {
  const expression = new BddExpression(
    '😀 :page :count{int} :status{pending/approved}',
    createParameterTypeRegistry(),
  );
  const text = '😀 "same" 002 approved';
  const args = expression.match(text)!;
  assert.deepEqual(normalizeReporterData(args), [
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

test('reporter distinguishes absent optional parameters from empty matches', () => {
  const args = new BddExpression('x( :count{int}) {}', createParameterTypeRegistry()).match('x ')!;
  assert.deepEqual(normalizeReporterData(args), [
    { group: {}, parameterTypeName: 'int' },
    { group: { start: 2, value: '' }, parameterTypeName: '' },
  ]);
});
