/**
 * Installs built-in text conversions and identity step argument types.
 * Text patterns are ported from Cucumber Expressions 20.1.0; see THIRD_PARTY_NOTICES.md.
 */

import type { MutableParameterTypeRegistry } from './registry.ts';

/**
 * Built-ins only register types and never use a runner-specific table API.
 * This type is used for clarity n the functions below.
 */
type AnyRegistry = Pick<MutableParameterTypeRegistry<unknown>, 'defineParameterType'>;

/**
 * Patterns and conversions ported from @cucumber/cucumber-expressions 20.1.0.
 * Copyright (c) 2016 Cucumber Ltd and contributors (MIT).
 * See THIRD_PARTY_NOTICES.md.
 */
export function defineBuiltins(registry: AnyRegistry) {
  defineIntegerTypes(registry);
  defineFloatTypes(registry);
  defineStringType(registry);
  defineWordType(registry);
  defineAnonymousType(registry);
  defineDataTableType(registry);
  defineDocStringType(registry);
}

function defineIntegerTypes(registry: AnyRegistry) {
  const regexp = [/-?\d+/, /\d+/];
  for (const name of ['int', 'byte', 'short', 'long']) {
    registry.defineParameterType({
      name,
      regexp,
      transformer: (s) => (s === undefined ? null : Number(s)),
    });
  }
  registry.defineParameterType({
    name: 'biginteger',
    regexp,
    transformer: (s) => (s === undefined ? null : BigInt(s)),
  });
}

function defineFloatTypes(registry: AnyRegistry) {
  const regexp = /[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:[E][+-]?\d+)?/;
  for (const name of ['float', 'double']) {
    registry.defineParameterType({
      name,
      regexp,
      transformer: (s) => (s === undefined ? null : parseFloat(s)),
    });
  }
  registry.defineParameterType({
    name: 'bigdecimal',
    regexp,
    transformer: (s) => (s === undefined ? null : s),
  });
}

function defineStringType(registry: AnyRegistry) {
  const regexp = /"([^"\\]*(\\.[^"\\]*)*)"|'([^'\\]*(\\.[^'\\]*)*)'/;
  registry.defineParameterType({
    name: 'string',
    regexp,
    transformer: (s1, s2) => (s1 || s2 || '').replace(/\\"/g, '"').replace(/\\'/g, "'"),
  });
}

function defineWordType(registry: AnyRegistry) {
  const regexp = /[^\s]+/;
  registry.defineParameterType({ name: 'word', regexp, transformer: (s) => s });
}

/**
 * The empty type name implements {}: arbitrary text, including an empty string.
 * Unlike {string}, this parameter does not require surrounding quotes.
 */
function defineAnonymousType(registry: AnyRegistry) {
  registry.defineParameterType({ name: '', regexp: /.*/, transformer: (s) => s });
}

function defineDataTableType(registry: AnyRegistry) {
  registry.defineParameterType({ name: 'DataTable', dataTable: true });
}

function defineDocStringType(registry: AnyRegistry) {
  registry.defineParameterType({ name: 'DocString', docString: true });
}
