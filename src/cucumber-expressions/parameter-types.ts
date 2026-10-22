/**
 * Defines parameter types and their registry, including factories for custom types
 * and built-in patterns and conversions ported from Cucumber Expressions 20.1.0.
 * See THIRD_PARTY_NOTICES.md for attribution.
 */

import { validTypeName } from '../parser.ts';
import { stripGroupNames } from '../utils/regexp.ts';

export type ParameterType<T = unknown> = {
  readonly name: string | undefined;
  readonly regexpStrings: readonly string[];
  /**
   * Method syntax accepts upstream types whose typings omit undefined,
   * although unmatched native capture values can be undefined.
   */
  transform(world: unknown, values: (string | undefined)[] | null): T | PromiseLike<T>;
};
export type ParameterTypeRegistry = {
  lookupByTypeName(name: string): ParameterType | undefined;
};
export type MutableParameterTypeRegistry = ParameterTypeRegistry & {
  defineParameterType(type: ParameterType): void;
};
export type ParameterTypeOptions<T, World = unknown> = {
  name: string;
  regexp: string | RegExp | readonly (string | RegExp)[];
  transformer?: (this: World, ...captures: (string | undefined)[]) => T | PromiseLike<T>;
};
/**
 * Creates a custom parameter type with validated patterns and an optional transformer.
 */
export function createParameterType<T = string | undefined, World = unknown>(
  options: ParameterTypeOptions<T, World>,
) {
  if (!validTypeName(options.name) || options.name === 'inline-choice') {
    throw new Error(`Invalid or reserved parameter type name "${options.name}"`);
  }
  const patterns = Array.isArray(options.regexp)
    ? options.regexp
    : [options.regexp as string | RegExp];
  if (!patterns.length) throw new Error('A parameter type needs at least one regexp');
  const regexpStrings = Object.freeze(patterns.map(normalizeParameterPattern));
  const type: ParameterType<T> = {
    name: options.name,
    regexpStrings,
    transform(world, values) {
      return options.transformer
        ? options.transformer.apply(world as World, values ?? [])
        : (values?.[0] as T);
    },
  };
  return type;
}

/**
 * Creates a registry with built-in types and rejects invalid or duplicate registrations.
 */
export function createParameterTypeRegistry() {
  const types = new Map<string, ParameterType>();
  const registry: MutableParameterTypeRegistry = {
    lookupByTypeName: (name) => types.get(name),
    defineParameterType(type) {
      const name = type.name;
      if (name === undefined || !validTypeName(name) || name === 'inline-choice') {
        throw new Error(`Invalid or reserved parameter type name "${name}"`);
      }
      if (types.has(name)) throw new Error(`Duplicate parameter type "${name}"`);
      if (!type.regexpStrings.length) throw new Error('A parameter type needs at least one regexp');
      type.regexpStrings.forEach(normalizeParameterPattern);
      types.set(name, type);
    },
  };
  defineBuiltins(registry);
  return registry;
}

/**
 * Validates parameter regexps before composition and removes capture names so a
 * custom type can be repeated without duplicate-name errors.
 */
export function normalizeParameterPattern(pattern: string | RegExp) {
  if (pattern instanceof RegExp && pattern.flags !== '') {
    throw new Error('Parameter regexps must not use flags');
  }
  const source = typeof pattern === 'string' ? pattern : pattern.source;
  new RegExp(source);
  validateParameterEscapes(source);
  return stripGroupNames(source);
}

/**
 * Patterns and conversions ported from @cucumber/cucumber-expressions 20.1.0.
 * Copyright (c) 2016 Cucumber Ltd and contributors (MIT).
 * See THIRD_PARTY_NOTICES.md.
 */
function defineBuiltins(registry: MutableParameterTypeRegistry) {
  const integers = [/-?\d+/, /\d+/];
  const float = /[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:[E][+-]?\d+)?/;
  const add = (
    name: string,
    regexp: ParameterTypeOptions<unknown>['regexp'],
    transformer: NonNullable<ParameterTypeOptions<unknown>['transformer']>,
  ) => registry.defineParameterType(createParameterType({ name, regexp, transformer }));
  for (const name of ['int', 'byte', 'short', 'long']) {
    add(name, integers, (s) => (s === undefined ? null : Number(s)));
  }
  for (const name of ['float', 'double'])
    add(name, float, (s) => (s === undefined ? null : parseFloat(s)));
  add('bigdecimal', float, (s) => (s === undefined ? null : s));
  add('biginteger', integers, (s) => (s === undefined ? null : BigInt(s)));
  add('word', /[^\s]+/, (s) => s);
  add('string', /"([^"\\]*(\\.[^"\\]*)*)"|'([^'\\]*(\\.[^'\\]*)*)'/, (s1, s2) =>
    (s1 || s2 || '').replace(/\\"/g, '"').replace(/\\'/g, "'"),
  );
  add('', /.*/, (s) => s);
}

/**
 * Rejects references and numeric escapes whose meaning could change when captures
 * from multiple parameter patterns are combined.
 */
function validateParameterEscapes(source: string) {
  let inClass = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i]!;
    if (char === '\\') {
      const next = source[++i]!;
      if (
        !inClass &&
        (/[1-9]/.test(next) ||
          (next === '0' && /\d/.test(source[i + 1] ?? '')) ||
          (next === 'k' && source[i + 1] === '<'))
      ) {
        throw new Error('Backreferences and legacy numeric escapes are not supported');
      }
      continue;
    }
    if (char === '[') inClass = true;
    if (char === ']') inClass = false;
  }
}
