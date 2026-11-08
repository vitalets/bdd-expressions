/**
 * Analyzes external block argument combinations and validates their placement.
 */

import { ExpressionError, type Node } from '../parser.ts';
import type { ParameterTypeRegistry } from '../param-types/registry.ts';
import {
  EXPRESSION_VARIANTS,
  getExpressionVariant,
  type ExpressionVariant,
} from './definitions.ts';

export type BlockArgumentKind = 'dataTable' | 'docString';

export type NodeBlockArguments = {
  parameterKind?: BlockArgumentKind;
  supportedVariants: ReadonlySet<ExpressionVariant>;
};

export type BlockArgumentAnalysis = {
  byNode: ReadonlyMap<Node, NodeBlockArguments>;
};

/**
 * Resolves block argument types and determines supported expression variants per AST node.
 */
export function analyzeBlockArguments<Table>(
  ast: Node,
  registry: ParameterTypeRegistry<Table>,
  source: string,
) {
  const byNode = new Map<Node, NodeBlockArguments>();
  const declaredKinds = new Set<BlockArgumentKind>();
  visit(ast);
  const endings = validate(ast, new Set([0]));
  if (endings.has(2)) fail(ast, 'Text cannot follow a DocString or DataTable parameter');
  return { byNode } satisfies BlockArgumentAnalysis;

  function fail(node: Node, message: string): never {
    throw new ExpressionError(message, source, node.start, node.end);
  }

  function visit(node: Node): Set<ExpressionVariant> {
    let supportedVariants: Set<ExpressionVariant>;
    let parameterKind: BlockArgumentKind | undefined;
    if (node.kind === 'parameter') {
      const type = node.alternatives ? undefined : registry.lookupByTypeName(node.type);
      parameterKind =
        type && 'dataTable' in type
          ? 'dataTable'
          : type && 'docString' in type
            ? 'docString'
            : undefined;
      if (parameterKind) {
        if (declaredKinds.has(parameterKind))
          fail(node, 'DocString and DataTable parameters may each appear only once');
        declaredKinds.add(parameterKind);
      }
      supportedVariants = new Set([
        getExpressionVariant({
          hasDataTable: parameterKind === 'dataTable',
          hasDocString: parameterKind === 'docString',
        }),
      ]);
    } else if (node.kind === 'sequence') {
      supportedVariants = new Set(['withoutBlockArguments']);
      for (const child of node.children) {
        supportedVariants = combineVariants(supportedVariants, visit(child));
      }
    } else if (node.kind === 'choice') {
      supportedVariants = new Set(node.branches.flatMap((branch) => [...visit(branch)]));
    } else if (node.kind === 'optional') {
      supportedVariants = new Set(['withoutBlockArguments', ...visit(node.body)]);
    } else supportedVariants = new Set(['withoutBlockArguments']);
    byNode.set(node, { parameterKind, supportedVariants });
    return supportedVariants;
  }

  // State 0 is title text; 1 follows a block argument; 2 is punctuation awaiting
  // another block argument. Validate every path, including omitted optional groups.
  function validate(node: Node, states: Set<number>): Set<number> {
    if (node.kind === 'sequence') {
      for (const child of node.children) states = validate(child, states);
      return states;
    }
    if (node.kind === 'choice')
      return new Set(node.branches.flatMap((branch) => [...validate(branch, states)]));
    if (node.kind === 'optional') return new Set([...states, ...validate(node.body, states)]);
    if (node.kind === 'parameter' && byNode.get(node)!.parameterKind) return new Set([1]);
    if (node.kind === 'literal' && !node.value) return states;
    if ([...states].some((state) => state > 0)) {
      if (node.kind === 'parameter' || !/^[\s:]*$/.test(node.value))
        fail(node, 'DocString and DataTable parameters must be last');
      return new Set([...states].map((state) => (state === 0 ? 0 : 2)));
    }
    return states;
  }
}

function combineVariants(left: Set<ExpressionVariant>, right: Set<ExpressionVariant>) {
  const combined = new Set<ExpressionVariant>();
  for (const leftVariant of left) {
    for (const rightVariant of right) {
      const a = EXPRESSION_VARIANTS[leftVariant];
      const b = EXPRESSION_VARIANTS[rightVariant];
      combined.add(
        getExpressionVariant({
          hasDataTable: a.dataTable || b.dataTable,
          hasDocString: a.docString || b.docString,
        }),
      );
    }
  }
  return combined;
}
