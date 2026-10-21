/**
 * Escapes regexp literals and removes capture names from regexp source text.
 */

/**
 * Escapes literal text for inclusion in a regexp pattern.
 */
export const escapeRegexp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Removing capture names prevents duplicate-name errors when patterns are combined
 * repeatedly, while preserving the captures. Expects validated regexp source text.
 *
 * '(?<id>[0-9]+)' → '([0-9]+)'
 */
export function stripGroupNames(source: string) {
  let output = '';
  let inClass = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i]!;
    if (char === '\\') {
      const next = source[++i]!;
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
