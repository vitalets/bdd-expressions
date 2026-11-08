/**
 * Prepares and selects named expression variants for external block arguments.
 */

import type { BlockArguments } from '../block-argument.ts';
import { analyzeBlockArguments } from './analyze.ts';
import { getExpressionVariant, type ExpressionVariant } from './definitions.ts';
import { compileExpression } from '../compiler.ts';
import type { Node } from '../parser.ts';
import type { ParameterTypeRegistry } from '../param-types/registry.ts';

export { getExpressionVariant } from './definitions.ts';

/**
 * Compiles supported block argument combinations during expression construction.
 * Always compiles the baseline for metadata; unavailable variants remain undefined.
 */
export function compileExpressionVariants<Table>(
  source: string,
  registry: ParameterTypeRegistry<Table>,
  ast: Node,
) {
  const analysis = analyzeBlockArguments(ast, registry, source);
  const withoutBlockArguments = compileVariant('withoutBlockArguments');
  // Check combinations along individual expression paths, including optional groups.
  const { supportedVariants } = analysis.byNode.get(ast)!;

  return {
    withoutBlockArguments,
    withDataTable: supportedVariants.has('withDataTable')
      ? compileVariant('withDataTable')
      : undefined,
    withDocString: supportedVariants.has('withDocString')
      ? compileVariant('withDocString')
      : undefined,
    withBoth: supportedVariants.has('withBoth') ? compileVariant('withBoth') : undefined,
  };

  function compileVariant(variant: ExpressionVariant) {
    return compileExpression(source, registry, ast, analysis, variant);
  }
}

/**
 * Selects by block argument presence, including empty DocStrings as present.
 */
export function selectExpressionVariant(
  variants: ReturnType<typeof compileExpressionVariants>,
  blockArguments: BlockArguments<unknown>,
) {
  const variant = getExpressionVariant({
    hasDataTable: blockArguments.dataTable !== undefined,
    hasDocString: blockArguments.docString !== undefined,
  });
  return variants[variant];
}
