/**
 * Parses BDD expression syntax independently of parameter type registration.
 *
 * Grammar overview (language rules and examples: docs/syntax.md):
 *   expression = { parameter | whitespace | run }
 *   run        = rootBranch, { "/", rootBranch }
 *   rootBranch = { rootLiteral | group }
 *   group      = "(", sequence, { "/", sequence }, ")"
 *   sequence   = { literal | parameter | group }
 *   parameter  = [ ":", identifier ], braces | ":", identifier
 *   braces     = "{", braceText, { "/", braceText }, "}"
 *
 * Input:  I have :count{int} cucumbers
 * Output (abbreviated):
 *   { kind: 'sequence', children: [
 *     ...,
 *     { kind: 'parameter', name: 'count', type: 'int', ... },
 *     ...
 *   ] }
 */

export type SourceRange = {
  readonly start: number;
  readonly end: number;
};
export type Node = SourceRange &
  (
    | { readonly kind: 'literal'; readonly value: string }
    | {
        readonly kind: 'parameter';
        readonly name?: string;
        readonly type: string;
        readonly alternatives?: readonly string[];
      }
    | { readonly kind: 'sequence'; readonly children: readonly Node[] }
    | { readonly kind: 'optional'; readonly body: Node }
    | { readonly kind: 'choice'; readonly branches: readonly Node[] }
  );

type Part = Node | (SourceRange & { kind: 'slash' | 'space'; value: string });

/**
 * Reports invalid expression syntax with its original source range.
 */
export class ExpressionError extends Error {
  public readonly source: string;
  public readonly start: number;
  public readonly end: number;

  constructor(message: string, source: string, start: number, end = start + 1) {
    super(`${message} at offset ${start} in ${JSON.stringify(source)}`);
    this.source = source;
    this.start = start;
    this.end = end;
    this.name = 'ExpressionError';
  }
}

/**
 * Parses expression syntax into an AST with original UTF-16 source ranges.
 */
export function parseExpression(source: string) {
  let pos = 0;
  const names = new Set<string>();
  const fail = (message: string, start = pos) => {
    throw new ExpressionError(message, source, start, Math.min(source.length, start + 1));
  };
  const items = parts(false);
  const children: Node[] = [];
  let run: Part[] = [];
  for (const item of items) {
    if (item.kind === 'space' || item.kind === 'parameter') {
      flush();
      children.push(...nodes([item]));
    } else run.push(item);
  }
  flush();
  return sequence(children, 0, source.length) as Node;

  function flush() {
    if (run.length) children.push(split(run, run[0]!.start, run[run.length - 1]!.end, false));
    run = [];
  }

  function parts(inGroup: boolean) {
    const result: Part[] = [];
    while (pos < source.length && !(inGroup && source[pos] === ')')) {
      const start = pos;
      const char = source[pos]!;
      if (char === '(') result.push(group());
      else if (char === '{' || (char === ':' && nameStart(source[pos + 1] ?? '')))
        result.push(parameter());
      else if (char === ')' || char === '}') fail(`Unexpected "${char}"`);
      else if (char === '\\') result.push({ kind: 'literal', value: escaped(), start, end: pos });
      else {
        pos++;
        result.push({
          kind: char === '/' ? 'slash' : /\s/.test(char) ? 'space' : 'literal',
          value: char,
          start,
          end: pos,
        });
      }
    }
    return result;
  }

  function group() {
    const start = pos++;
    const items = parts(true);
    if (source[pos] !== ')') fail('Unclosed group', start);
    const endContent = pos++;
    const body = split(items, start + 1, endContent, true);
    const node: Node =
      body.kind === 'choice'
        ? { ...body, start, end: pos }
        : { kind: 'optional', body, start, end: pos };
    return node;
  }

  function parameter() {
    const start = pos;
    let name: string | undefined;
    if (source[pos] === ':') {
      pos++;
      const begin = pos++;
      while (/[A-Za-z0-9_$]/.test(source[pos] ?? '') && pos < source.length) pos++;
      name = source.slice(begin, pos);
      if (names.has(name)) fail(`Duplicate parameter name "${name}"`, start);
      names.add(name);
    }
    let type = 'string';
    let alternatives: string[] | undefined;
    if (source[pos] === '{') {
      const open = pos++;
      const branches = [''];
      while (pos < source.length && source[pos] !== '}') {
        const char = source[pos]!;
        if (char === '/') {
          branches.push('');
          pos++;
        } else if (char === '\\') branches[branches.length - 1] += escaped();
        else if ('{()'.includes(char)) fail('Escape literal delimiters inside braces');
        else {
          branches[branches.length - 1] += char;
          pos++;
        }
      }
      if (source[pos] !== '}') fail('Unclosed parameter', open);
      pos++;
      if (branches.length > 1) {
        if (branches.some((branch) => branch === '')) fail('Inline choices must be nonempty', open);
        type = 'inline-choice';
        alternatives = branches;
      } else {
        type = branches[0]!;
        if (!validTypeName(type)) fail(`Invalid parameter type name "${type}"`, open);
      }
    }
    const node: Node = { kind: 'parameter', name, type, alternatives, start, end: pos };
    return node;
  }

  function split(items: Part[], start: number, end: number, grouped: boolean) {
    if (!items.some((item) => item.kind === 'slash')) return sequence(nodes(items), start, end);
    const branches: Node[] = [];
    let branch: Part[] = [];
    let begin = start;
    function add(finish: number) {
      if (branch.length === 0 && !grouped) fail('Empty alternative', begin);
      if (!grouped && !branch.some((item) => item.kind === 'literal' && item.value.length > 0)) {
        fail('Bare alternatives need literal text', begin);
      }
      branches.push(sequence(nodes(branch), begin, finish));
      branch = [];
    }
    for (const item of items) {
      if (item.kind === 'slash') {
        add(item.start);
        begin = item.end;
      } else branch.push(item);
    }
    add(end);
    const node: Node = { kind: 'choice', branches, start, end };
    return node;
  }

  function nodes(items: Part[]) {
    const output: Node[] = [];
    for (const item of items) {
      if (item.kind === 'slash') fail('Unexpected slash', item.start);
      const node: Node = item.kind === 'space' ? { ...item, kind: 'literal' } : (item as Node);
      const last = output[output.length - 1];
      if (last?.kind === 'literal' && node.kind === 'literal') {
        output[output.length - 1] = { ...last, value: last.value + node.value, end: node.end };
      } else output.push(node);
    }
    return output;
  }

  function escaped() {
    const start = pos++;
    const char = source[pos++];
    if (char === undefined || !/[\\/:(){}\s]/.test(char)) fail('Invalid escape', start);
    return char!;
  }
}

/**
 * Checks registered type identifiers, including the anonymous empty name.
 */
export const validTypeName = (s: string) => s === '' || /^[A-Za-z_$][A-Za-z0-9_$.-]*$/.test(s);

function nameStart(s: string) {
  return /^[A-Za-z_$]$/.test(s);
}

function sequence(children: readonly Node[], start: number, end: number) {
  const node: Node = {
    kind: 'sequence',
    children,
    start,
    end,
  };
  return node;
}
