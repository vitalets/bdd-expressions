// Capture-tree scanning follows Cucumber Expressions 20.1.0's TreeRegexp/
// GroupBuilder mechanism. See THIRD_PARTY_NOTICES.md.
export interface Capture {
  readonly index: number;
  readonly children: Capture[];
}
export const escapeRegexp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Validate in isolation before removing named labels or embedding the pattern. */
export function normalizePattern(pattern: string | RegExp): string {
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

/** Input is a validated, normalized pattern. Noncapturing groups are flattened. */
export function captureTree(source: string, offset: number): { roots: Capture[]; count: number } {
  const root: Capture = { index: 0, children: [] };
  const stack = [root];
  let inClass = false;
  let count = 0;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '\\') {
      i++;
      continue;
    }
    if (char === '[') inClass = true;
    if (char === ']') inClass = false;
    if (inClass) continue;
    if (char === '(') {
      const parent = stack[stack.length - 1]!;
      if (source[i + 1] === '?') stack.push(parent);
      else {
        const capture: Capture = { index: offset + ++count, children: [] };
        parent.children.push(capture);
        stack.push(capture);
      }
    } else if (char === ')') stack.pop();
  }
  return { roots: root.children, count };
}
