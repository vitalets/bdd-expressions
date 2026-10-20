import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createExpression, type Group, type Argument } from '../src/index.js';

// Contract inspected in playwright-bdd@9.2.1:
// src/steps/matchedStepDefinition.ts, getStepMatchArguments/mapArgumentGroup.
// This mirrors the field projection so no playwright runtime is needed.
interface ReportGroup {
  start?: number;
  value?: string;
  children?: ReportGroup[];
}
function reportGroup(group: Group): ReportGroup {
  return { start: group.start, value: group.value, children: group.children?.map(reportGroup) };
}
function serialize(args: readonly Argument[]) {
  return JSON.parse(
    JSON.stringify(
      args.map((arg) => ({
        group: reportGroup(arg.group),
        parameterTypeName: arg.parameterType.name,
      })),
    ),
  );
}
void test('reporter keeps raw string quotes, numeric text and independent inline type names', async () => {
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
void test('absent parameters serialize no fabricated positions or values', () => {
  const args = createExpression('x( :count{int}) {}').match('x ')!;
  assert.deepEqual(serialize(args), [
    { group: {}, parameterTypeName: 'int' },
    { group: { start: 2, value: '' }, parameterTypeName: '' },
  ]);
});
