/**
 * Prepares literal text and custom parameter patterns for safe regexp composition.
 */

/**
 * Escapes literal text for inclusion in a regexp pattern.
 */
export const escapeRegexp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Validates a parameter pattern before embedding it and removes named capture labels.
 * Rejects flags and backreferences that cannot be preserved during composition.
 */
export function normalizePattern(pattern: string | RegExp) {
  if (pattern instanceof RegExp && pattern.flags !== '') {
    throw new Error('Parameter regexps must not use flags');
  }
  const source = typeof pattern === 'string' ? pattern : pattern.source;
  new RegExp(source);
  let output = '';
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
      output += char + next;
      continue;
    }
    if (char === '[') inClass = true;
    if (char === ']') inClass = false;
    if (
      !inClass &&
      char === '(' &&
      source.slice(i + 1, i + 3) === '?<' &&
      source[i + 3] !== '=' &&
      source[i + 3] !== '!'
    ) {
      i = source.indexOf('>', i + 3);
    }
    output += char;
  }
  return output;
}
