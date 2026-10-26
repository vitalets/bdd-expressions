/**
 * Evaluates expressions away from the UI thread and formats their built-in values.
 */

import { BddExpression, createParameterTypeRegistry, ExpressionError } from '../../src/index.ts';

export type Evaluation = {
  state: 'match' | 'miss' | 'error';
  message: string;
  positional: string;
  named: string;
  regexp: string;
};

self.onmessage = async (event: MessageEvent<{ expression: string; input: string }>) => {
  const result = await evaluate(event.data.expression, event.data.input);
  self.postMessage(result);
};

async function evaluate(source: string, input: string) {
  try {
    const expression = new BddExpression(source, createParameterTypeRegistry());
    const values = await expression.matchValues(input);
    return {
      state: values === null ? 'miss' : 'match',
      message:
        values === null ? 'The expression does not match this input.' : 'The entire input matches.',
      positional: values === null ? '—' : formatValue(values),
      named: values === null ? '—' : formatValue(values.params),
      regexp: String(expression.regexp),
    };
  } catch (error) {
    const location = error instanceof ExpressionError ? ` (position ${error.start + 1})` : '';
    return {
      state: 'error',
      message: `${error instanceof Error ? error.message : String(error)}${location}`,
      positional: '—',
      named: '—',
      regexp: '—',
    };
  }
}

function formatValue(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (typeof value === 'bigint') return `${value}n`;
  if (Array.isArray(value)) return `[${value.map(formatValue).join(', ')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    return entries.length
      ? `{\n${entries.map(([key, item]) => `  ${JSON.stringify(key)}: ${formatValue(item)}`).join(',\n')}\n}`
      : '{}';
  }
  return JSON.stringify(value);
}
