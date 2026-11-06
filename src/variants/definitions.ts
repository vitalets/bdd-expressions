/**
 * Maps named expression variants to external step argument presence.
 */

/**
 * Defines the step argument presence required by each expression variant.
 */
export const EXPRESSION_VARIANTS = {
  withoutStepArguments: { dataTable: false, docString: false },
  withDataTable: { dataTable: true, docString: false },
  withDocString: { dataTable: false, docString: true },
  withBoth: { dataTable: true, docString: true },
} as const;

export type ExpressionVariant = keyof typeof EXPRESSION_VARIANTS;

export type StepArgumentPresence = {
  hasDataTable: boolean;
  hasDocString: boolean;
};

/**
 * Finds the named variant for a combination of external step arguments.
 */
export function getExpressionVariant(presence: StepArgumentPresence) {
  return (Object.keys(EXPRESSION_VARIANTS) as ExpressionVariant[]).find((variant) => {
    const expected = EXPRESSION_VARIANTS[variant];
    return (
      expected.dataTable === presence.hasDataTable && expected.docString === presence.hasDocString
    );
  })!;
}
