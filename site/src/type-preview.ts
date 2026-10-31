/**
 * Formats named parameter types from the parsed expression for the built-in registry.
 * Mirrors InferBddParams without loading a TypeScript compiler in the browser.
 */

import type { Node } from '../../src/parser.ts';

/**
 * TypeScript results of the built-in parameter transformers.
 */
const builtinTypes: Record<string, string> = {
  int: 'number',
  byte: 'number',
  short: 'number',
  long: 'number',
  float: 'number',
  double: 'number',
  biginteger: 'bigint',
  bigdecimal: 'string',
  word: 'string',
  string: 'string',
  '': 'string',
};

/**
 * Shows the named parameter shape independently of whether the input matches.
 * Long expressions use the same inference budget as InferBddParams.
 */
export function formatTypePreview(ast: Node, source: string) {
  if (source.length > 256) return 'Record<string, unknown>';
  const properties: string[] = [];
  visit(ast, false);
  return properties.length ? `{\n${properties.join('\n')}\n}` : '{}';

  function visit(node: Node, optional: boolean) {
    switch (node.kind) {
      case 'sequence':
        node.children.forEach((child) => visit(child, optional));
        break;
      case 'optional':
        visit(node.body, true);
        break;
      case 'choice':
        node.branches.forEach((branch) => visit(branch, true));
        break;
      case 'parameter': {
        if (!node.name) return;
        const type = node.alternatives
          ? [...new Set(node.alternatives)].map((value) => JSON.stringify(value)).join(' | ')
          : (builtinTypes[node.type] ?? 'unknown');
        properties.push(`  ${node.name}: ${type}${optional ? ' | undefined' : ''};`);
        break;
      }
    }
  }
}
