/**
 * Scans regex capture nesting so matches can be mapped to a tree of capture groups.
 * Adapts Cucumber Expressions 20.1.0's TreeRegexp/GroupBuilder mechanism.
 * See THIRD_PARTY_NOTICES.md for attribution.
 */

export type Capture = {
  readonly index: number;
  readonly children: Capture[];
};

/**
 * Maps a validated, normalized pattern to capture nesting, flattening noncapturing groups.
 */
export function captureTree(source: string, offset: number) {
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
