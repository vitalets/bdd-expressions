import { parseExpression, ExpressionError, type Node } from './parser.ts';
import {
  createParameterTypeRegistry,
  type ParameterType,
  type ParameterTypeRegistry,
} from './cucumber-expressions/parameter-types.ts';
import { escapeRegexp, normalizePattern } from './regexp.ts';
import { captureTree, type Capture } from './cucumber-expressions/capture-tree.ts';
import { buildArgument, buildGroup, type Argument } from './cucumber-expressions/matching.ts';
import { transformArguments, type Values } from './matching.ts';

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

export class BddExpression implements Expression {
  readonly source: string;
  readonly ast: Node;
  readonly regexp: RegExp;
  private readonly slots: readonly Slot[];
  private readonly names: readonly (string | undefined)[];

  constructor(pattern: string, parameterTypeRegistry: ParameterTypeRegistry) {
    this.source = pattern;
    const compiled = compileExpression(pattern, parameterTypeRegistry);
    this.ast = compiled.ast;
    this.regexp = compiled.regexp;
    this.slots = compiled.slots;
    this.names = this.slots.map((slot) => slot.name);
  }

  match(text: string): readonly Argument[] | null {
    const result = this.regexp.exec(text);
    return result
      ? this.slots.map((slot) => buildArgument(buildGroup(slot.capture, result), slot.type))
      : null;
  }

  async matchValues(text: string, world?: unknown): Promise<Values | null> {
    const args = this.match(text);
    return args === null ? null : transformArguments(args, this.names, world);
  }
}

export function createExpression(
  source: string,
  registry: ParameterTypeRegistry = createParameterTypeRegistry(),
): BddExpression {
  return new BddExpression(source, registry);
}

function compileExpression(source: string, registry: ParameterTypeRegistry) {
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
  return { ast, regexp, slots };
}
