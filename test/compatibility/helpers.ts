/**
 * Supports differential engine checks and the verified playwright-bdd reporter contract.
 */

import assert from 'node:assert/strict';
import {
  CucumberExpression,
  ParameterTypeRegistry as CucumberRegistry,
} from '@cucumber/cucumber-expressions';
import { BddExpression } from '../../src/index.ts';

type ComparableGroup = {
  value: string | undefined;
  start: number | undefined;
  end: number | undefined;
  values: (string | undefined)[] | null;
  children: readonly ComparableGroup[] | undefined;
};
type ReportCapture = {
  start: number | undefined;
  value: string | undefined;
  children: readonly ReportCapture[] | undefined;
};
type ReportArgument = {
  group: ReportCapture;
  parameterType: { name: string | undefined };
};
// Contract inspected in playwright-bdd@9.2.1:
// src/steps/matchedStepDefinition.ts, getStepMatchArguments/mapArgumentGroup.
// This mirrors the field projection so no playwright runtime is needed.
type ReportGroup = {
  start?: number;
  value?: string;
  children?: ReportGroup[];
};
/**
 * Compares both engines on reporter output, capture metadata, type names and values.
 */
export async function compare(source: string, text: string) {
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
/**
 * Normalizes capture classes while preserving undefined, empty values and child structure.
 */
export function metadata(group: ComparableGroup): unknown {
  return {
    value: group.value,
    start: group.start,
    end: group.end,
    values: group.values,
    children: group.children?.map(metadata),
  };
}
/**
 * Serializes reporter fields while preserving no-match results.
 */
export function serialize(args: readonly ReportArgument[] | null) {
  if (args === null) return null;
  return JSON.parse(
    JSON.stringify(
      args.map((arg) => ({
        group: reportGroup(arg.group),
        parameterTypeName: arg.parameterType.name,
      })),
    ),
  );
}
function reportGroup(group: ReportCapture): ReportGroup {
  return { start: group.start, value: group.value, children: group.children?.map(reportGroup) };
}
