/**
 * Normalizes and validates custom text patterns before regexp composition.
 */

import { stripGroupNames } from '../utils/regexp.ts';

/**
 * Normalizes a nonempty pattern list for type construction or prebuilt validation.
 */
export function normalizeParameterPatterns(patterns: readonly (string | RegExp)[]) {
  if (!patterns.length) throw new Error('A parameter type needs at least one regexp');
  return Object.freeze(patterns.map(normalizeParameterPattern));
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
