/**
 * Analyzes step argument presence and validates trailing step argument sections without
 * mixing external values into the text matched by regular expressions.
 */

import type { IDataTable } from './param-types/data-table.ts';
import { ExpressionError, type Node } from './parser.ts';
import type { ParameterTypeRegistry } from './param-types/registry.ts';

/**
 * Carries external step argument values; the table generic supports runner-specific
 * classes or alternative representations while defaulting to the common class shape.
 */
export type StepArguments<Table = IDataTable> = {
  dataTable?: Table;
  docString?: string;
};
export type StepArgumentPlan = {
  masks: ReadonlyMap<Node, ReadonlySet<number>>;
  kinds: ReadonlyMap<Node, number>;
  all: number;
};

/**
 * Resolves step argument types and computes possible input-presence masks per AST node.
 */
export function analyzeStepArguments<Table>(
  ast: Node,
  registry: ParameterTypeRegistry<Table>,
  source: string,
): StepArgumentPlan {
  const masks = new Map<Node, Set<number>>();
  const kinds = new Map<Node, number>();
  let all = 0;
  visit(ast);
  const endings = validate(ast, new Set([0]));
  if (endings.has(2)) fail(ast, 'Text cannot follow a step argument parameter');
  return { masks, kinds, all };

  function fail(node: Node, message: string): never {
    throw new ExpressionError(message, source, node.start, node.end);
  }

  function visit(node: Node): Set<number> {
    let values: Set<number>;
    if (node.kind === 'parameter') {
      const type = node.alternatives ? undefined : registry.lookupByTypeName(node.type);
      const kind = type && 'dataTable' in type ? 1 : type && 'docString' in type ? 2 : 0;
      if (kind && all & kind) fail(node, 'Each step argument kind may appear only once');
      all |= kind;
      kinds.set(node, kind);
      values = new Set([kind]);
    } else if (node.kind === 'sequence') {
      values = new Set([0]);
      for (const child of node.children) {
        const childValues = visit(child);
        values = new Set([...values].flatMap((a) => [...childValues].map((b) => a | b)));
      }
    } else if (node.kind === 'choice') {
      values = new Set(node.branches.flatMap((branch) => [...visit(branch)]));
    } else if (node.kind === 'optional') {
      values = new Set([0, ...visit(node.body)]);
    } else values = new Set([0]);
    masks.set(node, values);
    return values;
  }

  // State 0 is title text; 1 follows a step argument; 2 is punctuation awaiting
  // another step argument. Validate every path, including omitted optional groups.
  function validate(node: Node, states: Set<number>): Set<number> {
    if (node.kind === 'sequence') {
      for (const child of node.children) states = validate(child, states);
      return states;
    }
    if (node.kind === 'choice')
      return new Set(node.branches.flatMap((branch) => [...validate(branch, states)]));
    if (node.kind === 'optional') return new Set([...states, ...validate(node.body, states)]);
    if (node.kind === 'parameter' && kinds.get(node)) return new Set([1]);
    if (node.kind === 'literal' && !node.value) return states;
    if ([...states].some((state) => state > 0)) {
      if (node.kind === 'parameter' || !/^[\s:]*$/.test(node.value))
        fail(node, 'Step argument parameters must be last');
      return new Set([...states].map((state) => (state === 0 ? 0 : 2)));
    }
    return states;
  }
}
