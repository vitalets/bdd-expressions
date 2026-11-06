/**
 * Prepares and selects named expression variants for external step arguments.
 */

import type { StepArguments } from '../step-argument.ts';
import { analyzeStepArguments } from './analyze.ts';
import { getExpressionVariant, type ExpressionVariant } from './definitions.ts';
import { compileExpression } from '../compiler.ts';
import type { Node } from '../parser.ts';
import type { ParameterTypeRegistry } from '../param-types/registry.ts';

export { getExpressionVariant } from './definitions.ts';

/**
 * Compiles supported step argument combinations during expression construction.
 * Always compiles the baseline for metadata; unavailable variants remain undefined.
 */
export function compileExpressionVariants<Table>(
  source: string,
  registry: ParameterTypeRegistry<Table>,
  ast: Node,
) {
  const analysis = analyzeStepArguments(ast, registry, source);
  const withoutStepArguments = compileVariant('withoutStepArguments');
  // Check combinations along individual expression paths, including optional groups.
  const { supportedVariants } = analysis.byNode.get(ast)!;

  return {
    withoutStepArguments,
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
 * Selects by step argument presence, including empty DocStrings as present.
 */
export function selectExpressionVariant(
  variants: ReturnType<typeof compileExpressionVariants>,
  stepArguments: StepArguments<unknown>,
) {
  const variant = getExpressionVariant({
    hasDataTable: stepArguments.dataTable !== undefined,
    hasDocString: stepArguments.docString !== undefined,
  });
  return variants[variant];
}
