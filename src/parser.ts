export interface SourceRange {
  readonly start: number;
  readonly end: number;
}
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

type Part = Node | (SourceRange & { kind: 'slash' | 'space'; value: string });
const nameStart = (s: string) => /^[A-Za-z_$]$/.test(s);
export const validTypeName = (s: string) => s === '' || /^[A-Za-z_$][A-Za-z0-9_$.-]*$/.test(s);
const sequence = (children: readonly Node[], start: number, end: number): Node => ({
  kind: 'sequence',
  children,
  start,
  end,
});

export function parseExpression(source: string): Node {
  let pos = 0;
  const names = new Set<string>();
  const fail = (message: string, start = pos): never => {
    throw new ExpressionError(message, source, start, Math.min(source.length, start + 1));
  };
  function escaped(): string {
    const start = pos++;
    const char = source[pos++];
    if (char === undefined || !/[\\/:(){}\s]/.test(char)) fail('Invalid escape', start);
    return char!;
  }
  function parameter(): Node {
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
        if (branches.some((branch) => branch === ''))
          fail('Inline alternatives must be nonempty', open);
        type = 'inline-choice';
        alternatives = branches;
      } else {
        type = branches[0]!;
        if (!validTypeName(type)) fail(`Invalid parameter type name "${type}"`, open);
      }
    }
    return { kind: 'parameter', name, type, alternatives, start, end: pos };
  }
  function parts(inGroup: boolean): Part[] {
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
  function nodes(items: Part[]): Node[] {
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
  function split(items: Part[], start: number, end: number, grouped: boolean): Node {
    if (!items.some((item) => item.kind === 'slash')) return sequence(nodes(items), start, end);
    const branches: Node[] = [];
    let branch: Part[] = [];
    let begin = start;
    function add(finish: number) {
      if (branch.length === 0 && !(grouped && branches.length === 0))
        fail('Empty alternative', begin);
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
    return { kind: 'choice', branches, start, end };
  }
  function group(): Node {
    const start = pos++;
    const items = parts(true);
    if (source[pos] !== ')') fail('Unclosed group', start);
    const endContent = pos++;
    if (!items.length) fail('Empty group', start);
    const body = split(items, start + 1, endContent, true);
    return body.kind === 'choice'
      ? { ...body, start, end: pos }
      : { kind: 'optional', body, start, end: pos };
  }
  const items = parts(false);
  const children: Node[] = [];
  let run: Part[] = [];
  function flush() {
    if (run.length) children.push(split(run, run[0]!.start, run[run.length - 1]!.end, false));
    run = [];
  }
  for (const item of items) {
    if (item.kind === 'space' || item.kind === 'parameter') {
      flush();
      children.push(...nodes([item]));
    } else run.push(item);
  }
  flush();
  return sequence(children, 0, source.length);
}
