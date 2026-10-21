import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createParameterType,
  createParameterTypeRegistry,
} from '../src/cucumber-expressions/parameter-types.ts';

test('registers a custom parameter type', () => {
  const registry = createParameterTypeRegistry();
  const type = createParameterType({ name: 'Custom', regexp: /a/ });
  registry.defineParameterType(type);
  assert.equal(registry.lookupByTypeName('Custom'), type);
});

test('rejects duplicate custom parameter types', () => {
  const registry = createParameterTypeRegistry();
  const type = createParameterType({ name: 'Custom', regexp: /a/ });
  registry.defineParameterType(type);
  assert.throws(() => registry.defineParameterType(type), /Duplicate/);
});

test('rejects invalid custom parameter patterns', () => {
  for (const regexp of [/a/i, '(a)\\1', '(?<a>x)\\k<a>', '\\01', '[', []]) {
    assert.throws(() => createParameterType({ name: 'Bad', regexp }));
  }
});

test('rejects reserved custom parameter type names', () => {
  assert.throws(() => createParameterType({ name: 'inline-choice', regexp: /a/ }), /reserved/);
});
