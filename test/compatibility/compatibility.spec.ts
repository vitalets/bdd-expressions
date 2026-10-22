import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import {
  CucumberExpression,
  ParameterTypeRegistry as CucumberRegistry,
} from '@cucumber/cucumber-expressions';
import { BddExpression, createParameterTypeRegistry } from '../../src/index.ts';
import { differences } from './differences.ts';

import { normalizeReporterData } from './helpers.ts';

type UpstreamCase = {
  file: string;
  expression: string;
  text?: string;
  expected_args?: unknown[] | null;
  exception?: string;
};

for (const testCase of loadUpstreamCases()) {
  test(`upstream ${testCase.file}`, async () => {
    await checkUpstreamCase(testCase);
  });
}

/**
 * Loads unchanged upstream test cases and rejects stale difference entries.
 */
function loadUpstreamCases() {
  const directory = new URL('./testdata/', import.meta.url);
  const files = readdirSync(directory)
    .filter((file) => file.endsWith('.yaml'))
    .sort();
  assert.ok(files.length > 0, 'No upstream matching test cases found');
  for (const file of Object.keys(differences)) {
    assert.ok(files.includes(file), `Stale compatibility difference: ${file}`);
  }
  return files.map((file) => {
    const data: unknown = parse(readFileSync(new URL(file, directory), 'utf8'));
    assert.ok(data && typeof data === 'object', `${file}: expected a test case object`);
    assert.ok('expression' in data && typeof data.expression === 'string', file);
    const hasArgs = 'expected_args' in data;
    const hasException = 'exception' in data;
    assert.notEqual(hasArgs, hasException, `${file}: expected args or exception`);
    if (hasArgs) {
      assert.ok(data.expected_args === null || Array.isArray(data.expected_args), file);
      assert.ok('text' in data && typeof data.text === 'string', file);
    } else {
      assert.ok('exception' in data && typeof data.exception === 'string', file);
    }
    return { ...data, file } as UpstreamCase;
  });
}

/**
 * Checks the upstream expectation, then local compatibility or an explicit difference.
 */
async function checkUpstreamCase(testCase: UpstreamCase) {
  const { expression, text, exception, expected_args, file } = testCase;
  const upstream = () => new CucumberExpression(expression, new CucumberRegistry());
  const local = () => new BddExpression(expression, createParameterTypeRegistry());
  if (exception !== undefined) {
    assert.throws(upstream, { message: exception });
  } else {
    assert.deepEqual(await testCaseValues(upstream(), text!), expected_args);
  }

  const difference = differences[file];
  if (difference) {
    assert.equal(expression, difference.expression, `${file}: upstream expression changed`);
    if (difference.outcome === 'accept') {
      assert.notEqual(exception, undefined, `${file}: upstream now accepts this syntax`);
      assert.doesNotThrow(local, difference.reason);
    } else {
      assert.equal(exception, undefined, `${file}: upstream now rejects this syntax`);
      assert.throws(local, /Unexpected "\)"/, difference.reason);
    }
    return;
  }
  if (exception !== undefined) {
    assert.throws(local);
    return;
  }
  assert.deepEqual(await testCaseValues(local(), text!), expected_args);
  compareReporterData(expression, text!);
}

/**
 * Compares both engines using the same normalized reporter data.
 */
function compareReporterData(source: string, text: string) {
  const upstream = new CucumberExpression(source, new CucumberRegistry()).match(text);
  const local = new BddExpression(source, createParameterTypeRegistry()).match(text);
  assert.deepEqual(
    normalizeReporterData(local),
    normalizeReporterData(upstream),
    `Reporter output for ${JSON.stringify(source)} matching ${JSON.stringify(text)}`,
  );
}

async function testCaseValues(expression: BddExpression | CucumberExpression, text: string) {
  const args = expression.match(text);
  const values = args ? await Promise.all(args.map((arg) => arg.getValue(null))) : null;
  // Upstream test cases encode BigInts as strings and use JSON-normalized values.
  return JSON.parse(
    JSON.stringify(values, (_key, value: unknown) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
  );
}
