/**
 * Runs YAML syntax cases; see docs/specification.md, section 13.
 * Each entry has name/expression and either text/params, text/match: false,
 * or error: { start, end, message }. Params contain the complete positional
 * array and named mapping. Expected null means actual undefined; actual values
 * are compared directly, never JSON-normalized. Error offsets are exact UTF-16
 * ranges and message is a literal substring. Quote expression/input strings to
 * preserve whitespace; use YAML escapes for tabs, newlines and Unicode separators.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from 'yaml';
import {
  BddExpression,
  createParameterTypeRegistry,
  ExpressionError,
  type MatchValues,
} from '../../src/index.ts';

type Value = string | number | boolean | null;
type Params = { positional: Value[]; named: Record<string, Value> };
type ExpectedError = { start: number; end: number; message: string };
type TestCase = { name: string; expression: string } & (
  | { text: string; params: Params; match?: never; error?: never }
  | { text: string; match: false; params?: never; error?: never }
  | { error: ExpectedError; text?: never; params?: never; match?: never }
);

const directory = new URL('./', import.meta.url);
const files = readdirSync(directory, { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.yaml'))
  .sort();
for (const file of files) {
  for (const testCase of loadTestCases(new URL(file, directory))) {
    test(`${file}: ${testCase.name}`, () => runTestCase(testCase));
  }
}

async function runTestCase(testCase: TestCase) {
  if (testCase.error) {
    assertExpressionError(testCase.expression, testCase.error);
    return;
  }
  const expression = new BddExpression(testCase.expression, createParameterTypeRegistry());
  const args = expression.match(testCase.text);
  const result = await expression.matchValues(testCase.text);
  if (testCase.match === false) {
    assert.equal(args, null);
    assert.equal(result, null);
    return;
  }
  assert.ok(args);
  assert.ok(result);
  assert.equal(args.length, testCase.params.positional.length);
  assertParams(result, testCase.params);
}

function assertExpressionError(source: string, expected: ExpectedError) {
  assert.throws(
    () => new BddExpression(source, createParameterTypeRegistry()),
    (error) => {
      assert.ok(error instanceof ExpressionError);
      assert.equal(error.source, source);
      assert.equal(error.start, expected.start);
      assert.equal(error.end, expected.end);
      assert.ok(error.message.includes(expected.message), error.message);
      return true;
    },
  );
}

function assertParams(actual: MatchValues, expected: Params) {
  assert.equal(actual.length, expected.positional.length);
  expected.positional.forEach((value, index) => {
    assert.ok(Object.hasOwn(actual, index), `missing positional slot ${index}`);
    assert.equal(actual[index], value === null ? undefined : value, `positional[${index}]`);
  });
  assert.deepEqual(Object.keys(actual.params).sort(), Object.keys(expected.named).sort());
  for (const [name, value] of Object.entries(expected.named)) {
    assert.equal(actual.params[name], value === null ? undefined : value, `named.${name}`);
  }
}

function loadTestCases(file: URL) {
  const data: unknown = parse(readFileSync(file, 'utf8'));
  assert.ok(Array.isArray(data) && data.length > 0, `${file.pathname}: expected a nonempty list`);
  const names = new Set<string>();
  return data.map((entry, index) => {
    const testCase = validateTestCase(entry, `${file.pathname}: entry ${index + 1}`);
    assert.ok(!names.has(testCase.name), `${file.pathname}: duplicate name (${testCase.name})`);
    names.add(testCase.name);
    return testCase;
  });
}

function validateTestCase(entry: unknown, context: string): TestCase {
  assert.ok(isRecord(entry), `${context}: expected an object`);
  assert.ok(typeof entry.name === 'string' && entry.name.trim(), `${context}: name is required`);
  context += ` (${entry.name})`;
  assert.equal(typeof entry.expression, 'string', `${context}: expression must be a string`);
  if (Object.hasOwn(entry, 'error')) {
    assertKeys(entry, ['name', 'expression', 'error'], context);
    validateError(entry.error, context);
  } else {
    assert.equal(typeof entry.text, 'string', `${context}: text must be a string`);
    if (Object.hasOwn(entry, 'match')) {
      assert.equal(entry.match, false, `${context}: match may only be false`);
      assertKeys(entry, ['name', 'expression', 'text', 'match'], context);
    } else {
      assertKeys(entry, ['name', 'expression', 'text', 'params'], context);
      validateParams(entry.params, context);
    }
  }
  return entry as TestCase;
}

function validateError(error: unknown, context: string) {
  assert.ok(isRecord(error), `${context}: error must be an object`);
  assertKeys(error, ['start', 'end', 'message'], context);
  const { start, end, message } = error;
  assert.ok(
    Number.isInteger(start) && Number(start) >= 0,
    `${context}: error.start must be a nonnegative integer`,
  );
  assert.ok(
    Number.isInteger(end) && Number(end) >= Number(start),
    `${context}: error.end must be an integer >= start`,
  );
  assert.ok(
    typeof message === 'string' && message.length > 0,
    `${context}: error.message must be nonempty`,
  );
}

function validateParams(params: unknown, context: string) {
  assert.ok(isRecord(params), `${context}: params is required for a successful match`);
  assertKeys(params, ['positional', 'named'], context);
  assert.ok(Array.isArray(params.positional), `${context}: params.positional must be an array`);
  assert.ok(isRecord(params.named), `${context}: params.named must be a mapping`);
  for (const value of [...params.positional, ...Object.values(params.named)]) {
    assert.ok(
      value === null ||
        typeof value === 'string' ||
        typeof value === 'boolean' ||
        (typeof value === 'number' && Number.isFinite(value)),
      `${context}: expected parameter values must be scalar strings, finite numbers, booleans or null`,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertKeys(value: Record<string, unknown>, allowed: string[], context: string) {
  for (const key of Object.keys(value)) {
    assert.ok(
      allowed.includes(key),
      `${context}: unexpected field ${key}; allowed: ${allowed.join(', ')}`,
    );
  }
}
