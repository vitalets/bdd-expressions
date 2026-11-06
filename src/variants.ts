/**
 * Prepares and selects named expression variants for external attachments.
 */

import { analyzeAttachments, type AttachmentInputs } from './attachments.ts';
import { compileExpression } from './compiler.ts';
import type { Node } from './parser.ts';
import type { ParameterTypeRegistry } from './parameter-types/registry.ts';

/**
 * Defines the attachment presence required by each expression variant.
 */
const EXPRESSION_VARIANTS = {
  textOnly: { dataTable: false, docString: false },
  withDataTable: { dataTable: true, docString: false },
  withDocString: { dataTable: false, docString: true },
  withBoth: { dataTable: true, docString: true },
} as const;

/**
 * Compiles the four attachment combinations during expression construction.
 * Expressions without attachment parameters reject all supplied attachments.
 */
export function compileExpressionVariants<Table>(
  source: string,
  registry: ParameterTypeRegistry<Table>,
  ast: Node,
) {
  const plan = analyzeAttachments(ast, registry, source);
  const textOnly = compileExpression(source, registry, ast, plan, EXPRESSION_VARIANTS.textOnly);
  return {
    textOnly,
    withDataTable: compileAttached(EXPRESSION_VARIANTS.withDataTable),
    withDocString: compileAttached(EXPRESSION_VARIANTS.withDocString),
    withBoth: compileAttached(EXPRESSION_VARIANTS.withBoth),
  };

  function compileAttached(attachments: { dataTable?: boolean; docString?: boolean }) {
    if (!plan.all) return { ...textOnly, regexp: /(?!)/ };
    return compileExpression(source, registry, ast, plan, attachments);
  }
}

/**
 * Selects by attachment presence, including empty DocStrings as present.
 */
export function selectExpressionVariant(
  variants: ReturnType<typeof compileExpressionVariants>,
  inputs: AttachmentInputs<unknown>,
) {
  if (inputs.dataTable !== undefined) {
    return inputs.docString !== undefined ? variants.withBoth : variants.withDataTable;
  }
  return inputs.docString !== undefined ? variants.withDocString : variants.textOnly;
}
