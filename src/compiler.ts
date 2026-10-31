/**
 * Compiles expression syntax into whole-input regexps and connects matches to values.
 * Parses the source, resolves parameter types, and maps captures to argument slots.
 *
 * Input:  I have :count{int} cucumbers + a parameter type registry
 * Compiled output (abbreviated):
 *   {
 *     ast: { kind: 'sequence', children: [...] },
 *     regexp: /^(?:I have ((?:-?\d+)|(?:\d+)) cucumbers)(?![\s\S])/d,
 *     slots: [{ name: 'count', type: { name: 'int', ... },
 *               capture: { index: 1, children: [] } }]
 *   }
 */

import { parseExpression, ExpressionError, type Node } from './parser.ts';
import {
  normalizeParameterPattern,
  type ParameterType,
  type ParameterTypeRegistry,
} from './cucumber-expressions/parameter-types.ts';
import { escapeRegexp } from './utils/regexp.ts';
import { captureTree, type Capture } from './cucumber-expressions/capture-tree.ts';
import { buildArgument, buildGroup, type Argument } from './cucumber-expressions/matching.ts';
import { resolveParams } from './resolve-params.ts';
import type { InferBddParams } from './infer-params.ts';

export type MatchValues<Params extends object = Record<string, unknown>> = unknown[] & {
  readonly params: Params;
};

type Slot = {
  name?: string;
  type: ParameterType;
  capture: Capture;
};

/**
 * Matches a parsed expression using a compiled regexp and source-ordered parameters.
 * Infers named values from expression literals unless a Params contract is supplied.
 * An explicit Params type bypasses inference and must match the expression and registry.
 * Values resolves that choice once, keeping instances assignable to BddExpression
 * without requiring their source literal in type annotations.
 */
export class BddExpression<
  Params extends object = never,
  Source extends string = string,
  Values extends object = [Params] extends [never] ? InferBddParams<Source> : Params,
> {
  readonly source: string;
  readonly ast: Node;
  readonly regexp: RegExp;
  private readonly slots: readonly Slot[];
  private readonly names: readonly (string | undefined)[];

  constructor(pattern: Source, parameterTypeRegistry: ParameterTypeRegistry) {
    this.source = pattern;
    const compiled = compileExpression(pattern, parameterTypeRegistry);
    this.ast = compiled.ast;
    this.regexp = compiled.regexp;
    this.slots = compiled.slots;
    this.names = this.slots.map((slot) => slot.name);
  }

  /**
   * Matches the whole input and retains metadata for absent parameters.
   */
  match(text: string) {
    const result = this.regexp.exec(text);
    const args: readonly Argument[] | null = result
      ? this.slots.map((slot) => buildArgument(buildGroup(slot.capture, result), slot.type))
      : null;
    return args;
  }

  /**
   * Resolves positional and named values with the supplied transformer context.
   */
  async matchValues(text: string, world?: unknown) {
    const args = this.match(text);
    if (args === null) return null;
    const { positional, named } = await resolveParams(args, this.names, world);
    Object.defineProperty(positional, 'params', { value: named, enumerable: false });
    return positional as MatchValues<Values>;
  }
}

function compileExpression(source: string, registry: ParameterTypeRegistry) {
  const ast = parseExpression(source);
  const slots: Slot[] = [];
  let captureCount = 0;
  const regexp = new RegExp(`^(?:${compile(ast)})(?![\\s\\S])`, 'd');
  return { ast, regexp, slots };

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
        const { type, pattern } = compileParameter(node, source, registry);
        const tree = captureTree(pattern, captureCount);
        captureCount += tree.count;
        slots.push({ name: node.name, type, capture: tree.roots[0]! });
        return pattern;
      }
    }
  }
}

function compileParameter(
  node: Extract<Node, { kind: 'parameter' }>,
  source: string,
  registry: ParameterTypeRegistry,
) {
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
    if (!type.regexpStrings.length) throw new Error('A parameter type needs at least one regexp');
    pattern = `(${type.regexpStrings.map((p) => `(?:${normalizeParameterPattern(p)})`).join('|')})`;
    new RegExp(pattern);
  } catch (error) {
    throw new ExpressionError(
      `Invalid regexp for "${node.type}": ${(error as Error).message}`,
      source,
      node.start,
      node.end,
    );
  }
  return { type, pattern };
}
