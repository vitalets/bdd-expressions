import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createParameterType, createParameterTypeRegistry } from '../src/parameter-types.ts';

void test('all builtins and deliberate conversions are available', () => {
  const registry = createParameterTypeRegistry();
  for (const name of [
    'int',
    'byte',
    'short',
    'long',
    'float',
    'double',
    'bigdecimal',
    'biginteger',
    'word',
    'string',
    '',
  ]) {
    assert.equal(registry.lookupByTypeName(name)?.name, name);
  }
  assert.equal(
    registry.lookupByTypeName('biginteger')!.transform(null, ['9007199254740993']),
    9007199254740993n,
  );
  assert.equal(registry.lookupByTypeName('bigdecimal')!.transform(null, ['1.20']), '1.20');
  assert.equal(
    registry.lookupByTypeName('string')!.transform(null, [undefined, String.raw`a\'b`]),
    "a'b",
  );
});
void test('registration validates patterns, names and duplicates', () => {
  const registry = createParameterTypeRegistry();
  const type = createParameterType({ name: 'Custom', regexp: /a/ });
  registry.defineParameterType(type);
  assert.equal(registry.lookupByTypeName('Custom'), type);
  assert.throws(() => registry.defineParameterType(type), /Duplicate/);
  for (const regexp of [/a/i, '(a)\\1', '(?<a>x)\\k<a>', '\\01', '[', []]) {
    assert.throws(() => createParameterType({ name: 'Bad', regexp }));
  }
  assert.throws(() => createParameterType({ name: 'inline-choice', regexp: /a/ }), /reserved/);
});
