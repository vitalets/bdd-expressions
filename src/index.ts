/**
 * Provides expression matching and value resolution through the public package API.
 */

import type { IDataTable } from './parameter-types/data-table.ts';
import type { StepArguments } from './step-arguments.ts';
import { parseExpression, type Node } from './parser.ts';
import type { ParameterTypeRegistry } from './parameter-types/registry.ts';
import { compileExpressionVariants, selectExpressionVariant } from './variants.ts';
import { buildArgument, buildGroup, type Argument } from './cucumber-expressions/matching.ts';
import { resolveParams } from './resolve-params.ts';
import type { InferBddParams, InferBddStepArguments } from './infer-params.ts';

export type BddExpressionResult<
  Params extends object = Record<string, unknown>,
  Table = IDataTable,
  Source extends string = string,
> = unknown[] & {
  readonly params: Params;
} & InferBddStepArguments<Source, Table>;

export { parseExpression, ExpressionError } from './parser.ts';
export type { Node, SourceRange } from './parser.ts';
export { createParameterType } from './parameter-types/create-type.ts';
export { createParameterTypeRegistry } from './parameter-types/registry.ts';
export type {
  ParameterType,
  ParameterTypeOptions,
  TextParameterType,
  TextParameterTypeOptions,
} from './parameter-types/create-type.ts';
export type {
  DataTableParameterType,
  DataTableParameterTypeOptions,
} from './parameter-types/data-table.ts';
export type {
  DocStringParameterType,
  DocStringParameterTypeOptions,
} from './parameter-types/doc-string.ts';
export type {
  ParameterTypeRegistry,
  MutableParameterTypeRegistry,
} from './parameter-types/registry.ts';
export type { Argument, Group } from './cucumber-expressions/matching.ts';
export type { InferBddParams } from './infer-params.ts';
export type { StepArguments } from './step-arguments.ts';

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
  private readonly slots: ReturnType<typeof compileExpressionVariants>['textOnly']['slots'];
  private readonly variants: ReturnType<typeof compileExpressionVariants>;

  constructor(pattern: Source, parameterTypeRegistry: ParameterTypeRegistry<Table>) {
    this.source = pattern;
    const ast = parseExpression(pattern);
    this.variants = compileExpressionVariants(pattern, parameterTypeRegistry, ast);
    const compiled = this.variants.textOnly;
    this.ast = compiled.ast;
    this.regexp = compiled.regexp;
    this.slots = compiled.slots;
  }

  /**
   * Matches the whole input and retains metadata for absent parameters.
   */
  match(text: string, inputs: StepArguments<Table> = {}) {
    const variant = selectExpressionVariant(this.variants, inputs);
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
  async matchAndResolve(text: string, world?: unknown, inputs: StepArguments<Table> = {}) {
    const args = this.match(text, inputs);
    if (args === null) return null;
    const { positional, named } = await resolveParams(args, world);
    Object.defineProperties(positional, {
      params: { value: named, enumerable: false },
      docString: { value: inputs.docString, enumerable: false },
      dataTable: { value: inputs.dataTable, enumerable: false },
    });
    return positional as BddExpressionResult<Values, Table, Source>;
  }
}
