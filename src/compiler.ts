import { parseExpression, ExpressionError, type Node } from './parser.js';
import {
  createParameterTypeRegistry,
  type ParameterType,
  type ParameterTypeRegistry,
} from './parameter-types.js';
import { captureTree, escapeRegexp, normalizePattern, type Capture } from './regexp.js';
import {
  buildArgument,
  buildGroup,
  transformArguments,
  type Argument,
  type Values,
} from './matching.js';

export interface Expression {
  readonly source: string;
  readonly ast: Node;
  readonly regexp: RegExp;
  match(text: string): readonly Argument[] | null;
  matchValues(text: string, world?: unknown): Promise<Values | null>;
}
interface Slot {
  name?: string;
  type: ParameterType;
  capture: Capture;
}

export function createExpression(
  source: string,
  registry: ParameterTypeRegistry = createParameterTypeRegistry(),
): Expression {
  const ast = parseExpression(source);
  const slots: Slot[] = [];
  let captureCount = 0;
  function compile(node: Node): string {
    switch (node.kind) {
      case 'literal':
        return escapeRegexp(node.value);
      case 'sequence':
        return node.children.map(compile).join('');
      case 'optional':
        return `(?:${compile(node.body)})?`;
      case 'choice':
        return `(?:${node.branches.map(compile).join('|')})`;
      case 'parameter': {
        const type: ParameterType | undefined = node.alternatives
          ? {
              name: 'inline-choice',
              regexpStrings: node.alternatives.map(escapeRegexp),
              transform: (_world, values) => values?.[0],
            }
          : registry.lookupByTypeName(node.type);
        if (!type)
          throw new ExpressionError(
            `Unknown parameter type "${node.type}"`,
            source,
            node.start,
            node.end,
          );
        let pattern: string;
        try {
          if (!type.regexpStrings.length)
            throw new Error('A parameter type needs at least one regexp');
          pattern = `(${type.regexpStrings.map((p) => `(?:${normalizePattern(p)})`).join('|')})`;
          new RegExp(pattern);
        } catch (error) {
          throw new ExpressionError(
            `Invalid regexp for "${node.type}": ${(error as Error).message}`,
            source,
            node.start,
            node.end,
          );
        }
        const tree = captureTree(pattern, captureCount);
        captureCount += tree.count;
        slots.push({ name: node.name, type, capture: tree.roots[0]! });
        return pattern;
      }
    }
  }
  const regexp = new RegExp(`^(?:${compile(ast)})(?![\\s\\S])`, 'd');
  const names = slots.map((slot) => slot.name);
  function match(text: string): readonly Argument[] | null {
    const result = regexp.exec(text);
    return result
      ? slots.map((slot) => buildArgument(buildGroup(slot.capture, result), slot.type))
      : null;
  }
  return {
    source,
    ast,
    regexp,
    match,
    async matchValues(text, world) {
      const args = match(text);
      return args === null ? null : transformArguments(args, names, world);
    },
  };
}
