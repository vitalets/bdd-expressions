/**
 * Compiles parsed expression syntax into whole-input regexps.
 * Resolves parameter types and maps captures to argument slots.
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

import {
  EXPRESSION_VARIANTS,
  getExpressionVariant,
  type ExpressionVariant,
} from './variants/definitions.ts';
import type { BlockArgumentAnalysis } from './variants/analyze.ts';
import { ExpressionError, type Node } from './parser.ts';
import { normalizeParameterPattern } from './param-types/normalize-pattern.ts';
import type { ParameterType, TextParameterType } from './param-types/create-type.ts';
import type { ParameterTypeRegistry } from './param-types/registry.ts';
import { escapeRegexp } from './utils/regexp.ts';
import { captureTree, type Capture } from './cucumber-expressions/capture-tree.ts';
export type Slot = {
  name?: string;
  type: ParameterType;
  capture: Capture;
};

/**
 * Compiles an expression for a specific combination of available block arguments.
 */
export function compileExpression<Table>(
  source: string,
  registry: ParameterTypeRegistry<Table>,
  ast: Node,
  analysis: BlockArgumentAnalysis,
  variant: ExpressionVariant,
) {
  const blockArguments = EXPRESSION_VARIANTS[variant];
  const slots: Slot[] = [];
  let captureCount = 0;
  const regexp = new RegExp(`^(?:${compile(ast)})(?![\\s\\S])`, 'd');
  return { ast, regexp, slots };

  function compile(node: Node, requiredVariant?: ExpressionVariant): string {
    const { supportedVariants } = analysis.byNode.get(node)!;
    const possibleInputs = [...supportedVariants].map((name) => EXPRESSION_VARIANTS[name]);
    const wanted =
      requiredVariant ??
      (node === ast
        ? variant
        : getExpressionVariant({
            hasDataTable:
              blockArguments.dataTable && possibleInputs.some((input) => input.dataTable),
            hasDocString:
              blockArguments.docString && possibleInputs.some((input) => input.docString),
          }));
    const pattern = compileNode(node, wanted);
    return supportedVariants.has(wanted) ? pattern : `(?!)${pattern}`;
  }

  function compileNode(node: Node, wanted: ExpressionVariant): string {
    switch (node.kind) {
      case 'literal':
        return escapeRegexp(node.value);
      case 'sequence':
        return node.children.map((child) => compile(child)).join('');
      case 'optional':
        return wanted !== 'withoutBlockArguments'
          ? `(?:${compile(node.body)})`
          : `(?:${compile(node.body)})?`;
      case 'choice':
        return `(?:${node.branches.map((branch) => compile(branch, wanted)).join('|')})`;
      case 'parameter': {
        const { type, pattern } = compileParameter(node, source, registry);
        const blockArgument = analysis.byNode.get(node)!.parameterKind;
        const resolvedPattern = blockArgument
          ? blockArguments[blockArgument]
            ? '()'
            : '((?!))'
          : pattern;
        const tree = captureTree(resolvedPattern, captureCount);
        captureCount += tree.count;
        slots.push({ name: node.name, type, capture: tree.roots[0]! });
        return resolvedPattern;
      }
    }
  }
}

function compileParameter<Table>(
  node: Extract<Node, { kind: 'parameter' }>,
  source: string,
  registry: ParameterTypeRegistry<Table>,
) {
  const type: ParameterType<unknown, Table> | undefined = node.alternatives
    ? ({
        name: 'inline-choice',
        regexpStrings: node.alternatives.map(escapeRegexp),
        transform: (_world, values) => values?.[0],
      } satisfies TextParameterType)
    : registry.lookupByTypeName(node.type);
  if (!type)
    throw new ExpressionError(
      `Unknown parameter type "${node.type}"`,
      source,
      node.start,
      node.end,
    );
  if ('dataTable' in type || 'docString' in type) return { type, pattern: '()' };
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
