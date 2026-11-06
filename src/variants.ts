/**
 * Prepares and selects named expression variants for external step arguments.
 */

import { analyzeStepArguments, type StepArguments } from './step-arguments.ts';
import { compileExpression } from './compiler.ts';
import type { Node } from './parser.ts';
import type { ParameterTypeRegistry } from './param-types/registry.ts';

/**
 * Defines the step argument presence required by each expression variant.
 */
const EXPRESSION_VARIANTS = {
  withoutStepArguments: { dataTable: false, docString: false },
  withDataTable: { dataTable: true, docString: false },
  withDocString: { dataTable: false, docString: true },
  withBoth: { dataTable: true, docString: true },
} as const;

/**
 * Compiles supported step argument combinations during expression construction.
 * Always compiles the baseline for metadata; unavailable variants remain undefined.
 */
export function compileExpressionVariants<Table>(
  source: string,
  registry: ParameterTypeRegistry<Table>,
  ast: Node,
) {
  const plan = analyzeStepArguments(ast, registry, source);
  const withoutStepArguments = compileVariant(EXPRESSION_VARIANTS.withoutStepArguments);
  // Check combinations along individual expression paths, including optional groups.
  const containsDataTableOnly = plan.masks.get(ast)!.has(1);
  const containsDocStringOnly = plan.masks.get(ast)!.has(2);
  const containsBoth = plan.masks.get(ast)!.has(3);

  return {
    withoutStepArguments,
    withDataTable: containsDataTableOnly
      ? compileVariant(EXPRESSION_VARIANTS.withDataTable)
      : undefined,
    withDocString: containsDocStringOnly
      ? compileVariant(EXPRESSION_VARIANTS.withDocString)
      : undefined,
    withBoth: containsBoth ? compileVariant(EXPRESSION_VARIANTS.withBoth) : undefined,
  };

  function compileVariant(stepArguments: { dataTable: boolean; docString: boolean }) {
    return compileExpression(source, registry, ast, plan, stepArguments);
  }
}

/**
 * Selects by step argument presence, including empty DocStrings as present.
 */
export function selectExpressionVariant(
  variants: ReturnType<typeof compileExpressionVariants>,
  stepArguments: StepArguments<unknown>,
) {
  if (stepArguments.dataTable !== undefined) {
    return stepArguments.docString !== undefined ? variants.withBoth : variants.withDataTable;
  }
  return stepArguments.docString !== undefined
    ? variants.withDocString
    : variants.withoutStepArguments;
}
