/**
 * Prepares and selects named expression variants for external step arguments.
 */

import { analyzeStepArguments, type StepArguments } from './step-arguments.ts';
import { compileExpression } from './compiler.ts';
import type { Node } from './parser.ts';
import type { ParameterTypeRegistry } from './parameter-types/registry.ts';

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
 * Compiles the four step argument combinations during expression construction.
 * Expressions without step argument parameters reject all supplied step arguments.
 */
export function compileExpressionVariants<Table>(
  source: string,
  registry: ParameterTypeRegistry<Table>,
  ast: Node,
) {
  const plan = analyzeStepArguments(ast, registry, source);
  const withoutStepArguments = compileExpression(
    source,
    registry,
    ast,
    plan,
    EXPRESSION_VARIANTS.withoutStepArguments,
  );
  return {
    withoutStepArguments,
    withDataTable: compileWithStepArguments(EXPRESSION_VARIANTS.withDataTable),
    withDocString: compileWithStepArguments(EXPRESSION_VARIANTS.withDocString),
    withBoth: compileWithStepArguments(EXPRESSION_VARIANTS.withBoth),
  };

  function compileWithStepArguments(stepArguments: { dataTable?: boolean; docString?: boolean }) {
    if (!plan.all) return { ...withoutStepArguments, regexp: /(?!)/ };
    return compileExpression(source, registry, ast, plan, stepArguments);
  }
}

/**
 * Selects by step argument presence, including empty DocStrings as present.
 */
export function selectExpressionVariant(
  variants: ReturnType<typeof compileExpressionVariants>,
  inputs: StepArguments<unknown>,
) {
  if (inputs.dataTable !== undefined) {
    return inputs.docString !== undefined ? variants.withBoth : variants.withDataTable;
  }
  return inputs.docString !== undefined ? variants.withDocString : variants.withoutStepArguments;
}
