/**
 * Provides expression matching and value resolution through the public package API.
 */

import type { Slot } from './compiler.ts';
import type { IDataTable } from './param-types/data-table.ts';
import type { BlockArguments } from './block-argument.ts';
import { parseExpression, type Node } from './parser.ts';
import type { ParameterTypeRegistry } from './param-types/registry.ts';
import { compileExpressionVariants, selectExpressionVariant } from './variants/index.ts';
import { buildArgumentForSlot, resolveParams, type Argument } from './argument.ts';
import type { InferBddParams, InferBddBlockArguments } from './infer-params.ts';

export type BddExpressionResult<
  Params extends object = Record<string, unknown>,
  Table = IDataTable,
  Source extends string = string,
> = unknown[] & {
  readonly params: Params;
} & InferBddBlockArguments<Source, Table>;

export { parseExpression, ExpressionError } from './parser.ts';
export type { Node, SourceRange } from './parser.ts';
export { createParameterType } from './param-types/create-type.ts';
export { createParameterTypeRegistry } from './param-types/registry.ts';
export type {
  ParameterType,
  ParameterTypeOptions,
  TextParameterType,
  TextParameterTypeOptions,
} from './param-types/create-type.ts';
export type {
  DataTableParameterType,
  DataTableParameterTypeOptions,
} from './param-types/data-table.ts';
export type {
  DocStringParameterType,
  DocStringParameterTypeOptions,
} from './param-types/doc-string.ts';
export type {
  ParameterTypeRegistry,
  MutableParameterTypeRegistry,
} from './param-types/registry.ts';
export type { Argument } from './argument.ts';
export type { Group } from './cucumber-expressions/group.ts';
export type { InferBddParams } from './infer-params.ts';
export type { BlockArguments } from './block-argument.ts';

/**
 * Matches a parsed expression using a compiled regexp and source-ordered parameters.
 * Table is inferred from the registry so block arguments and table transformers agree
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
  readonly slots: readonly Slot[];
  private readonly variants: ReturnType<typeof compileExpressionVariants>;

  constructor(pattern: Source, parameterTypeRegistry: ParameterTypeRegistry<Table>) {
    this.source = pattern;
    const ast = parseExpression(pattern);
    this.variants = compileExpressionVariants(pattern, parameterTypeRegistry, ast);
    const compiled = this.variants.withoutBlockArguments;
    this.ast = compiled.ast;
    this.regexp = compiled.regexp;
    this.slots = compiled.slots;
  }

  /**
   * Whether the expression declares a DocString parameter anywhere,
   * including optional groups, alternatives, and custom types.
   */
  get hasDocString() {
    return Boolean(this.variants.withDocString || this.variants.withBoth);
  }

  /**
   * Whether the expression declares a DataTable parameter anywhere,
   * including optional groups, alternatives, and custom types.
   */
  get hasDataTable() {
    return Boolean(this.variants.withDataTable || this.variants.withBoth);
  }

  /**
   * Matches the whole input and retains metadata for absent parameters.
   */
  match(text: string, blockArguments: BlockArguments<Table> = {}) {
    const variant = selectExpressionVariant(this.variants, blockArguments);
    if (!variant) return null;
    const result = variant.regexp.exec(text);
    if (!result) return null;
    const args: readonly Argument[] = variant.slots.map((slot) =>
      buildArgumentForSlot(slot, result, blockArguments),
    );
    return args;
  }

  /**
   * Resolves positional and named values with the supplied transformer context.
   */
  async matchAndResolve(text: string, options: BlockArguments<Table> & { world?: unknown } = {}) {
    const args = this.match(text, options);
    if (args === null) return null;
    const { positional, named } = await resolveParams(args, options.world);
    Object.defineProperties(positional, {
      params: { value: named, enumerable: false },
      docString: { value: options.docString, enumerable: false },
      dataTable: { value: options.dataTable, enumerable: false },
    });
    return positional as BddExpressionResult<Values, Table, Source>;
  }
}
