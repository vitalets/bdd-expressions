/**
 * Compiles expression syntax into whole-input regexps and connects matches to values.
 * Parses the source, resolves parameter types, and maps captures to argument slots.
 *
 * Input:  I have :count{int} cucumbers + a parameter type registry
 * Compiled output (abbreviated):
 *   {
 *     ast: { kind: 'sequence', children: [...] },
 *     regexp: /^(?:I have ((?:-?\d+)|(?:\d+)) cucumbers)(?![\s\S])/d,
 *     slots: [{ name: 'count', type: { name: 'int', ... },
 *               capture: { index: 1, children: [] } }]
 *   }
 */

import type { IDataTable } from './parameter-types/data-table.ts';
import {
  analyzeAttachments,
  attachmentMask,
  type AttachmentInputs,
  type AttachmentPlan,
} from './attachments.ts';
import { parseExpression, ExpressionError, type Node } from './parser.ts';
import { normalizeParameterPattern } from './parameter-types/normalize-pattern.ts';
import type { ParameterType, TextParameterType } from './parameter-types/create-type.ts';
import type { ParameterTypeRegistry } from './parameter-types/registry.ts';
import { escapeRegexp } from './utils/regexp.ts';
import { captureTree, type Capture } from './cucumber-expressions/capture-tree.ts';
import { buildArgument, buildGroup, type Argument } from './cucumber-expressions/matching.ts';
import { resolveParams } from './resolve-params.ts';
import type { InferBddParams } from './infer-params.ts';

export type BddExpressionResult<Params extends object = Record<string, unknown>> = unknown[] & {
  readonly params: Params;
};

type Slot = {
  name?: string;
  type: ParameterType;
  capture: Capture;
};

/**
 * Matches a parsed expression using a compiled regexp and source-ordered parameters.
 * Table is inferred from the registry so match inputs and table transformers agree
 * without requiring the library to import or construct a runner's DataTable class.
 * Infers named values from expression literals unless a Params contract is supplied.
 * An explicit Params type bypasses inference and must match the expression and registry.
 * Values resolves that choice once, keeping instances assignable to BddExpression
 * without requiring their source literal in type annotations.
 */
export class BddExpression<
  Params extends object = never,
  Source extends string = string,
  Table = IDataTable,
  Values extends object = [Params] extends [never]
    ? InferBddParams<Source, { DataTable: Table }>
    : Params,
> {
  readonly source: string;
  readonly ast: Node;
  readonly regexp: RegExp;
  private readonly slots: readonly Slot[];
  private readonly variants: ReturnType<typeof compileExpression>[];

  constructor(pattern: Source, parameterTypeRegistry: ParameterTypeRegistry<Table>) {
    this.source = pattern;
    const ast = parseExpression(pattern);
    const plan = analyzeAttachments(ast, parameterTypeRegistry, pattern);
    const base = compileExpression(pattern, parameterTypeRegistry, ast, plan, 0);
    this.variants = plan.all
      ? [
          base,
          ...[1, 2, 3].map((mask) =>
            compileExpression(pattern, parameterTypeRegistry, ast, plan, mask),
          ),
        ]
      : [base, ...[1, 2, 3].map(() => ({ ...base, regexp: /(?!)/ }))];
    const compiled = this.variants[0]!;
    this.ast = compiled.ast;
    this.regexp = compiled.regexp;
    this.slots = compiled.slots;
  }

  /**
   * Matches the whole input and retains metadata for absent parameters.
   */
  match(text: string, inputs: AttachmentInputs<Table> = {}) {
    const variant = this.variants[attachmentMask(inputs)]!;
    const result = variant.regexp.exec(text);
    const args: readonly Argument[] | null = result
      ? variant.slots.map((slot) => {
          const group = buildGroup(slot.capture, result);
          const type = slot.type;
          if ('regexpStrings' in type) return buildArgument(group, type, slot.name);
          return {
            name: slot.name,
            parameterType: type,
            getParameterType: () => type,
            group: {
              value: undefined,
              start: undefined,
              end: undefined,
              children: undefined,
              values: [undefined],
            },
            getValue(world?: unknown) {
              if (group.value === undefined) return undefined;
              if ('dataTable' in type) {
                return inputs.dataTable === undefined
                  ? undefined
                  : type.transform(world, inputs.dataTable);
              }
              return inputs.docString === undefined
                ? undefined
                : type.transform(world, inputs.docString);
            },
          };
        })
      : null;
    return args;
  }

  /**
   * Resolves positional and named values with the supplied transformer context.
   */
  async matchAndResolve(text: string, world?: unknown, inputs: AttachmentInputs<Table> = {}) {
    const args = this.match(text, inputs);
    if (args === null) return null;
    const { positional, named } = await resolveParams(args, world);
    Object.defineProperty(positional, 'params', { value: named, enumerable: false });
    return positional as BddExpressionResult<Values>;
  }
}

function compileExpression<Table>(
  source: string,
  registry: ParameterTypeRegistry<Table>,
  ast: Node,
  plan: AttachmentPlan,
  mask: number,
) {
  const slots: Slot[] = [];
  let captureCount = 0;
  const regexp = new RegExp(`^(?:${compile(ast)})(?![\\s\\S])`, 'd');
  return { ast, regexp, slots };

  function compile(node: Node, requiredMask?: number): string {
    const possible = plan.masks.get(node)!;
    const subtreeKinds = [...possible].reduce((a, b) => a | b, 0);
    const wanted = requiredMask ?? mask & subtreeKinds;
    const disabled = !possible.has(wanted) || (node === ast && (mask & ~plan.all) !== 0);
    const pattern = compileNode(node, wanted);
    return disabled ? `(?!)${pattern}` : pattern;
  }

  function compileNode(node: Node, wanted: number): string {
    switch (node.kind) {
      case 'literal':
        return escapeRegexp(node.value);
      case 'sequence':
        return node.children.map((child) => compile(child)).join('');
      case 'optional':
        return wanted ? `(?:${compile(node.body)})` : `(?:${compile(node.body)})?`;
      case 'choice':
        return `(?:${node.branches.map((branch) => compile(branch, wanted)).join('|')})`;
      case 'parameter': {
        const { type, pattern } = compileParameter(node, source, registry);
        const attachment = plan.kinds.get(node);
        const resolvedPattern = attachment ? (mask & attachment ? '()' : '((?!))') : pattern;
        const tree = captureTree(resolvedPattern, captureCount);
        captureCount += tree.count;
        slots.push({ name: node.name, type, capture: tree.roots[0]! });
        return resolvedPattern;
      }
    }
  }
}

function compileParameter<Table>(
  node: Extract<Node, { kind: 'parameter' }>,
  source: string,
  registry: ParameterTypeRegistry<Table>,
) {
  const type: ParameterType<unknown, Table> | undefined = node.alternatives
    ? ({
        name: 'inline-choice',
        regexpStrings: node.alternatives.map(escapeRegexp),
        transform: (_world, values) => values?.[0],
      } satisfies TextParameterType)
    : registry.lookupByTypeName(node.type);
  if (!type)
    throw new ExpressionError(
      `Unknown parameter type "${node.type}"`,
      source,
      node.start,
      node.end,
    );
  if ('dataTable' in type || 'docString' in type) return { type, pattern: '()' };
  let pattern: string;
  try {
    if (!type.regexpStrings.length) throw new Error('A parameter type needs at least one regexp');
    pattern = `(${type.regexpStrings.map((p) => `(?:${normalizeParameterPattern(p)})`).join('|')})`;
    new RegExp(pattern);
  } catch (error) {
    throw new ExpressionError(
      `Invalid regexp for "${node.type}": ${(error as Error).message}`,
      source,
      node.start,
      node.end,
    );
  }
  return { type, pattern };
}
