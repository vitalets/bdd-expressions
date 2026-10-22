/**
 * Intentional exclusions from upstream compatibility, asserted as local contracts.
 * Keep test case names and expressions explicit so upstream changes require review.
 */

type Difference = {
  expression: string;
  reason: string;
  outcome: 'accept' | 'reject';
};

/**
 * These test cases still run, but assert the documented local syntax rule.
 */
export const differences: Record<string, Difference> = {
  'allows-escaped-optional-parameter-types.yaml': {
    expression: String.raw`\({int})`,
    reason: 'Unescaped closing parentheses are rejected.',
    outcome: 'reject',
  },
  'matches-escaped-parenthesis-1.yaml': {
    expression: String.raw`three \(exceptionally) \{string} mice`,
    reason: 'Unescaped closing parentheses are rejected.',
    outcome: 'reject',
  },
  'matches-escaped-parenthesis-2.yaml': {
    expression: String.raw`three \((exceptionally)) \{{string}} mice`,
    reason: 'Unescaped closing parentheses are rejected.',
    outcome: 'reject',
  },
  'matches-escaped-parenthesis-3.yaml': {
    expression: String.raw`three \((exceptionally)) \{{string}} mice`,
    reason: 'Unescaped closing parentheses are rejected.',
    outcome: 'reject',
  },
  'does-not-allow-alternation-in-optional.yaml': {
    expression: 'three( brown/black) mice',
    reason: 'Alternatives inside optional groups are supported.',
    outcome: 'accept',
  },
  'does-not-allow-empty-optional.yaml': {
    expression: 'three () mice',
    reason: 'Empty optional groups are supported.',
    outcome: 'accept',
  },
  'does-not-allow-nested-optional.yaml': {
    expression: '(a(b))',
    reason: 'Nested optional groups are supported.',
    outcome: 'accept',
  },
  'does-not-allow-optional-parameter-types.yaml': {
    expression: '({int})',
    reason: 'Parameters inside optional groups are supported.',
    outcome: 'accept',
  },
};
